# Implementation Plan — Class Voting Batch System (Full Replacement)

## Codebase findings

- **Backend**: ESM (`"type":"module"`), Express 5, Mongoose 9. No test runner configured; verification is `node server.js` (startup without errors) plus manual API spot-checks.
- **Auth**: `middleware/auth.js` populates `req.user = { id, role }` (JWT payload `.user` field).
- **User model**: fields include `studentId`, `class`, `hasVoted`, `voteTimestamp`.
- **Settings model**: generic `{ key, value }` — `votingSchedule` key holds `isActive`, timing, and the old batch fields.
- **protection.js**: exports `voteLimiter`, `concurrentVoteGate`, `batchClassGate`, `classVoteCooldownGate`, `startClassCooldown`, `getCooldownState`, `clearClassCooldown`, `adminLimiter`, `globalLimiter`, `authLimiter`, `helmetMiddleware`.
- **votes.js POST /**: currently chains `batchClassGate` + `classVoteCooldownGate` middleware — these must be removed and replaced with the inline VotingBatch guard.
- **AdminSchedule.jsx**: `ClassVotingBatchPanel` receives `votingSchedule`, `setVotingSchedule`, `availableClasses`, `studentCountByClass`, `students`. The parent derives `availableClasses` and `studentCountByClass` from `students` and passes them in — the new panel can use the same props.
- **VotingPage.jsx**: already has a `batchBlocked` state with a "Please Wait" screen; the new check must be added at load time (not just on submit error).
- **api.js**: Axios instance with `baseURL` pointing to `/api` — all frontend calls use paths like `/voting-batch`, `/voting-batch/status`.
- **server.js**: route order matters; new `/api/voting-batch` must be added before the 404 handler.

---

## Implementation Plan

- [ ] 1. **Create `VotingBatch` Mongoose model**
      Singleton document (`_id: 'current'`) with fields: `status` (enum `['idle','open','cooldown']`, default `'idle'`), `className` (String), `studentIds` ([String], default []), `activeSubmissions` (Number, default 0), `batchNumber` (Number, default 0), `openedAt` (Date), `cooldownUntil` (Date), `lastUpdatedAt` (Date, auto-set via `pre('save')` hook or explicit set in routes).
      Files: `e:\election-portaltab\backend\models\VotingBatch.js`
      Verify: `node -e "import('./models/VotingBatch.js').then(m=>console.log('OK',m.default.modelName))"` from `backend/` directory exits with `OK VotingBatch`.

- [ ] 2. **Create `votingBatch.js` Express router**
      ESM module. Five routes, all using the `auth` middleware from `../middleware/auth.js`:
      - `GET /` — admin only. Fetches VotingBatch doc (upsert `{_id:'current'}` with defaults if missing). Queries all students in `batch.studentIds` from `User`. For each, looks up whether they have voted via `User.hasVoted`. Returns `{ batch, roster:[{studentId,name,hasVoted}], remainingCount }`.
      - `GET /status` — any authenticated user. Fetches VotingBatch. Checks: (1) batch exists and `status==='open'`; (2) `req.user.id` is in `batch.studentIds`. Returns `{ allowed: bool, reason: string|null, batch:{status,className,batchNumber} }`. Possible `reason` values: `'batch_not_open'`, `'not_in_batch'`.
      - `POST /` — admin only. Body: `{ className, studentIds[] }`. Validates: (a) fetch `votingSchedule` Setting, check `isActive===true` — 400 if not; (b) fetch VotingBatch, check `status==='idle'` — 409 if not; (c) `studentIds.length` between 1 and 100 — 400 if not; (d) all `studentIds` exist in `User` collection — 400 with list of missing; (e) all found users have `user.class === className` — 400 with mismatched list; (f) none have `hasVoted: true` — 400 with already-voted list. On success, upserts VotingBatch: `status:'open'`, `className`, `studentIds`, `activeSubmissions:0`, `batchNumber: (prev.batchNumber||0)+1`, `openedAt: new Date()`, `cooldownUntil: null`, `lastUpdatedAt: new Date()`.
      - `POST /close` — admin only. Fetches VotingBatch, checks `status==='open'` — 400 if not. Sets `status:'cooldown'`, `cooldownUntil: new Date(Date.now()+120000)`, `lastUpdatedAt: new Date()`. Returns updated doc.
      - `POST /clear-cooldown` — admin only. Fetches VotingBatch, checks `status==='cooldown'` — 400 if not. Sets `status:'idle'`, `cooldownUntil: null`, `lastUpdatedAt: new Date()`. Returns updated doc.
      Files: `e:\election-portaltab\backend\routes\votingBatch.js`
      Verify: `node --input-type=module < <(echo "import './routes/votingBatch.js'")` — no syntax errors. Full route testing happens in item 4 verification.

- [ ] 3. **Modify `votes.js` — replace POST / middleware chain with inline VotingBatch guard**
      a. Remove `batchClassGate` and `classVoteCooldownGate` from the import list at the top.
      b. Add `import VotingBatch from '../models/VotingBatch.js';` at the top.
      c. On the `POST /` route: remove `batchClassGate` and `classVoteCooldownGate` from the middleware array.
      d. At the start of the `POST /` async handler (before the `User.findOne` call), add the inline guard:
         1. `const batch = await VotingBatch.findById('current');`
         2. If `!batch || batch.status !== 'open'` → return `res.status(429).json({ error:'batch_not_open' })`.
         3. If `!batch.studentIds.includes(req.user.id)` → return `res.status(403).json({ error:'not_in_batch' })`.
         4. Atomic increment: `const updated = await VotingBatch.findOneAndUpdate({ _id:'current', status:'open', activeSubmissions:{$lt:100} }, { $inc:{activeSubmissions:1} }, {new:true}); if (!updated) return res.status(429).json({ error:'batch_at_capacity' });`
      e. After `User.findOneAndUpdate(…{hasVoted:true…})` succeeds, add:
         - `await VotingBatch.findByIdAndUpdate('current', { $inc:{ activeSubmissions:-1 } });`
         - Check if remaining voters = 0: `const remaining = await User.countDocuments({ studentId:{$in:batch.studentIds}, hasVoted:false });` — if `remaining === 0`, auto-close: `await VotingBatch.findByIdAndUpdate('current', { status:'cooldown', cooldownUntil:new Date(Date.now()+120000), lastUpdatedAt:new Date() });`
      f. Keep `startClassCooldown` and `getClassCooldown` import lines (still used by other routes like `/cooldown/start`, `/batch`). Only remove the two middleware imports `classVoteCooldownGate` and `batchClassGate`.
      Files: `e:\election-portaltab\backend\routes\votes.js`
      Verify: Server starts without import errors. Existing routes (`GET /stats`, `GET /results`, `GET /cooldown`, `POST /batch`) remain untouched.

- [ ] 4. **Register `votingBatchRoutes` in `server.js`**
      Import: `import votingBatchRoutes from './routes/votingBatch.js';`
      Register before the 404 handler: `app.use('/api/voting-batch', adminLimiter, votingBatchRoutes);`
      Note: `adminLimiter` is already imported from `./middleware/protection.js` — no new import needed.
      Files: `e:\election-portaltab\backend\server.js`
      Verify: `node server.js` starts without errors and logs `Server running on port 5000`. Curl `GET /api/voting-batch` with an admin token returns a JSON batch object. Curl `GET /api/voting-batch/status` with a student token returns `{ allowed, reason, batch }`.

- [ ] 5. **Replace `ClassVotingBatchPanel` in `AdminSchedule.jsx` with new `VotingBatchPanel`**
      The component name in the JSX render call at the bottom of `AdminSchedule` must change from `<ClassVotingBatchPanel …>` to `<VotingBatchPanel …>` (same props: `votingSchedule`, `setVotingSchedule`, `availableClasses`, `studentCountByClass`, `students`).
      
      New `VotingBatchPanel` logic:
      - On mount: `GET /voting-batch` to load current batch state. Store as `batchData = { batch, roster, remainingCount }`. Derive `batchStatus` from `batchData.batch.status` ('idle'|'open'|'cooldown').
      - Auto-refresh: `useEffect` interval of 5000ms, only when `batchStatus === 'open'`. Clears on unmount.
      - Cooldown countdown: `useEffect` that reads `batch.cooldownUntil` and ticks every second; when countdown hits 0, re-fetches batch to sync status.
      - Remove the old toggle (no `batchVotingEnabled` toggle — the new system is always the mechanism). Remove the `batchSize` input widget.
      
      **IDLE view**: class dropdown (derived from `students` prop, sorted, same pattern as old panel), checkbox list of unvoted students for selected class (filter `students` where `class===selectedClass && !hasVoted` — need to cross-reference with votes; use `roster` from API data when a class is selected; pre-load by calling `GET /voting-batch` which includes roster, OR do a lightweight approach: on class change, fetch the roster only for that class via a separate call to `GET /api/voting-batch` while batch is idle will return empty roster — instead, derive unvoted students from `students` prop filtered by `class===selectedClass && !s.hasVoted`). "Select All" toggle. "Open Batch (N students)" button → `POST /voting-batch` with `{ className, studentIds }`. Show error if rejected.
      
      **OPEN view** (green border): show `className`, `batchNumber`, `openedAt` formatted, `remainingCount`. Roster table: columns Name, Student ID, Status (✅ Voted / ⏳ Waiting). "Close Batch" button → `POST /voting-batch/close`. Auto-refresh roster every 5s.
      
      **COOLDOWN view** (amber): live MM:SS countdown from `cooldownUntil`. Progress bar draining. "Clear Cooldown Early" button → `POST /voting-batch/clear-cooldown`. When countdown reaches 0 — re-fetch batch (it should now be idle after admin action or just show "Select next batch").
      
      Disabled state: if `votingSchedule.isActive === false`, disable the "Open Batch" button and show hint "Start voting in the election status panel first."
      
      Files: `e:\election-portaltab\frontend\src\components\admin\AdminSchedule.jsx`
      Verify: `npm run build` in `frontend/` completes without errors. Visual check in browser: Schedule tab shows the new panel with three views based on batch state returned from API.

- [ ] 6. **Modify `VotingPage.jsx` — add batch status check at load time**
      In `loadElectionData`, after the existing `Promise.all` resolves, add a call to `GET /voting-batch/status`. If `allowed === false`:
      - Set a new state `batchStatus = { allowed: false, reason: data.reason, batch: data.batch }`.
      - Map reason to human-readable messages:
        - `'batch_not_open'` → `'No voting batch is currently open. Please wait for the admin to open a batch.'`
        - `'not_in_batch'` → `'You are not in the current voting batch. Your teacher will let you know when it is your turn.'`
      - Add a render guard before the existing `batchBlocked` check: if `batchStatus?.allowed === false`, render a "Please Wait" screen using the existing amber `batchBlocked` screen pattern (reuse the same JSX structure already in the file, with `Clock` icon and amber styling), showing the mapped message.
      - Keep the existing `batchBlocked` state (for the submit-time error path — the error response now uses `error:'batch_not_open'` or `error:'not_in_batch'` from the new route, so update the error-handler condition from `err.response?.data?.error === 'batch_not_open'` to also catch `'not_in_batch'`).
      Files: `e:\election-portaltab\frontend\src\components\VotingPage.jsx`
      Verify: `npm run build` completes without errors. Student who is not in any batch sees the "Please Wait" screen on page load instead of the ballot.

---

## Key decisions

1. **VotingBatch as a MongoDB singleton** (not in-memory): survives server restarts, works correctly if multiple server instances run (important for Render deployments). The `_id:'current'` pattern matches the task spec and avoids any extra index or query complexity.

2. **Atomic `activeSubmissions` counter via `findOneAndUpdate` with `$lt:100` condition** rather than a transaction: this is sufficient for the cap — if the condition fails, the slot was taken by a concurrent request. A full MongoDB transaction for the entire vote submission would require a replica set; keeping it out avoids that constraint.

3. **Inline guard in `votes.js POST /`** (not a middleware): the guard needs to both check and atomically increment `activeSubmissions` in one step, which doesn't compose cleanly as re-usable middleware without passing state. Inline is simpler and more explicit.

4. **`batchClassGate` and `classVoteCooldownGate` removed from `POST /`**: they become dead code for the POST handler once the VotingBatch guard is in place. The imports of `startClassCooldown`/`getCooldownState`/`clearClassCooldown` remain because they are used by `POST /cooldown/start`, `GET /cooldown`, `DELETE /cooldown/:className`, and `POST /batch`.

5. **Frontend idle-view unvoted list**: derives from `students` prop (already loaded in parent) filtered by `class===selectedClass && !s.hasVoted`, not from a separate API call — this avoids an extra round-trip and the `students` prop already has `hasVoted` populated (fetched by `AdminDashboard`).
