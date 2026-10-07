import express from 'express';
import mongoose from 'mongoose';
import Vote from '../models/Vote.js';
import User from '../models/User.js';
import Position from '../models/Position.js';
import Candidate from '../models/Candidate.js';
import Setting from '../models/Settings.js';
import VotingBatch from '../models/VotingBatch.js';
import auth from '../middleware/auth.js';
import {
    voteLimiter,
    concurrentVoteGate,
    startClassCooldown,
    getCooldownState,
    clearClassCooldown
} from '../middleware/protection.js';

const router = express.Router();

// ─── PUBLIC — landing page stats ─────────────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const totalVoters = await User.countDocuments({ role: 'student' });
        const totalVoted  = await User.countDocuments({ role: 'student', hasVoted: true });
        const turnoutPercentage = totalVoters > 0
            ? parseFloat(((totalVoted / totalVoters) * 100).toFixed(1))
            : 0;
        res.json({ totalVoters, totalVoted, turnoutPercentage });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// ─── PUBLIC — per-position results for landing page ──────────────────────────
router.get('/results', async (req, res) => {
    try {
        const [positions, candidates] = await Promise.all([
            Position.find().lean(),
            Candidate.find().lean()
        ]);

        const voteCounts = await Vote.aggregate([
            { $group: { _id: { positionId: '$positionId', candidateId: '$candidateId' }, count: { $sum: 1 } } }
        ]);

        const countMap = {};
        const totalByPosition = {};
        for (const vc of voteCounts) {
            const key = `${vc._id.positionId}_${vc._id.candidateId}`;
            countMap[key] = vc.count;
            const posKey = String(vc._id.positionId);
            totalByPosition[posKey] = (totalByPosition[posKey] || 0) + vc.count;
        }

        const results = positions.map(position => {
            const posId = String(position._id);
            const positionCandidates = candidates
                .filter(c => String(c.positionId) === posId)
                .map(c => {
                    const votes = countMap[`${posId}_${c._id}`] || 0;
                    const total = totalByPosition[posId] || 0;
                    return {
                        candidate: {
                            _id: c._id,
                            name: c.name,
                            class: c.class,
                            photoURL: c.photoURL || null
                        },
                        votes,
                        percentage: total > 0
                            ? parseFloat(((votes / total) * 100).toFixed(1))
                            : 0
                    };
                })
                .sort((a, b) => b.votes - a.votes);

            const winner = positionCandidates.length > 0 && positionCandidates[0].votes > 0
                ? positionCandidates[0]
                : null;

            return {
                position: { _id: position._id, id: position._id, name: position.name },
                winner,
                totalVotes: totalByPosition[posId] || 0,
                allCandidates: positionCandidates
            };
        }).filter(r => r.winner !== null);

        res.json(results);
    } catch (err) {
        console.error('Results error:', err);
        res.status(500).send('Server Error');
    }
});

// ─── ADMIN — raw vote records ─────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        const votes = await Vote.find();
        res.json(votes);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// ─── ADMIN — class cooldown status ───────────────────────────────────────────
/**
 * GET /api/votes/cooldown
 * Returns the current cooldown state for all classes in cooldown.
 */
router.get('/cooldown', auth, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    res.json(getCooldownState());
});

// ─── ADMIN — clear a class cooldown early ────────────────────────────────────
/**
 * DELETE /api/votes/cooldown/:className
 * Immediately lifts the cooldown for a class (e.g. if admin is ready early).
 */
router.delete('/cooldown/:className', auth, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    clearClassCooldown(req.params.className);
    res.json({ msg: `Cooldown cleared for class "${req.params.className}"` });
});

// ─── ADMIN — manually start a class cooldown (called when admin stops a batch) ─
/**
 * POST /api/votes/cooldown/start
 * Starts a 2-minute cooldown for a given class.
 * Body: { className: "BBA" }
 */
router.post('/cooldown/start', auth, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    const { className } = req.body;
    if (!className) return res.status(400).json({ msg: 'className is required' });
    startClassCooldown(className, 'batch');
    const state = getCooldownState();
    res.json({
        msg: `2-minute cooldown started for class "${className}"`,
        cooldown: state[className] || null
    });
});

// ─── STUDENT — individual vote submission ─────────────────────────────────────
/**
 * POST /api/votes
 * Rate-limited to 10/15min per IP, concurrent cap 100.
 * Guarded by inline VotingBatch check (must be in an open batch).
 */
router.post(
    '/',
    auth,
    voteLimiter,
    concurrentVoteGate,
    async (req, res) => {
        const votesArray = req.body;
        const userId = req.user.id;

        try {
            // ── Inline VotingBatch guard ──────────────────────────────────────
            // 1. Fetch the batch singleton
            const batch = await VotingBatch.findById('current');

            // 2. Batch must be open
            if (!batch || batch.status !== 'open') {
                return res.status(429).json({ error: 'batch_not_open' });
            }

            // 2.5 Schedule must not be over
            const scheduleSetting = await Setting.findOne({ key: 'votingSchedule' }).lean();
            if (scheduleSetting?.value?.votingEnd) {
                if (new Date() > new Date(scheduleSetting.value.votingEnd)) {
                    return res.status(403).json({ error: 'voting_ended', msg: 'Voting schedule has ended' });
                }
            }

            // 3. Student must be listed in this batch
            if (!batch.studentIds.includes(userId)) {
                return res.status(403).json({ error: 'not_in_batch' });
            }

            // 4. Atomic slot claim — fails if batch is already at capacity
            const slotClaimed = await VotingBatch.findOneAndUpdate(
                { _id: 'current', status: 'open', batchNumber: batch.batchNumber, activeSubmissions: { $lt: 100 } },
                { $inc: { activeSubmissions: 1 } },
                { new: true }
            );
            if (!slotClaimed) {
                return res.status(429).json({ error: 'batch_at_capacity' });
            }
            // ── End VotingBatch guard ─────────────────────────────────────────

            const user = await User.findOne({ studentId: userId });
            if (!user) return res.status(404).json({ msg: 'Student not found' });
            if (user.hasVoted) {
                // Release the slot we just claimed
                await VotingBatch.findOneAndUpdate(
                    { _id: 'current', batchNumber: batch.batchNumber },
                    { $inc: { activeSubmissions: -1 } }
                );
                return res.status(400).json({ msg: 'You have already voted' });
            }

            const voteDocuments = votesArray.map(v => ({
                userId: userId,
                positionId: v.positionId,
                candidateId: v.candidateId,
                studentClass: user.class
            }));

            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                await Vote.insertMany(voteDocuments, { session });
                await User.findOneAndUpdate(
                    { studentId: userId },
                    { hasVoted: true, voteTimestamp: new Date() },
                    { session }
                );
                await session.commitTransaction();
            } catch (err) {
                await session.abortTransaction();
                throw err;
            } finally {
                session.endSession();
            }

            // Release the active submissions slot
            await VotingBatch.findOneAndUpdate(
                { _id: 'current', batchNumber: batch.batchNumber },
                { $inc: { activeSubmissions: -1 } }
            );

            // Auto-close: if no unvoted students remain in this batch, start cooldown
            const remaining = await User.countDocuments({
                studentId: { $in: batch.studentIds },
                hasVoted: false
            });
            if (remaining === 0) {
                await VotingBatch.findOneAndUpdate(
                    { _id: 'current', status: 'open', batchNumber: batch.batchNumber },
                    {
                        $set: {
                            status: 'cooldown',
                            cooldownUntil: new Date(Date.now() + 120_000),
                            lastUpdatedAt: new Date()
                        }
                    }
                );
            }

            res.json({ msg: 'Votes submitted successfully' });

        } catch (err) {
            console.error(err);
            res.status(500).send('Server Error');
        }
    }
);

// ─── ADMIN — batch vote submission ────────────────────────────────────────────
/**
 * POST /api/votes/batch
 * Class Voting Batch — process up to 100 ballot submissions simultaneously.
 *
 * Body:
 * {
 *   submissions: [
 *     { studentId: "2024-001", votes: [{ positionId, candidateId }, ...] },
 *     ...
 *   ]
 * }
 *
 * - Hard capped at 100 submissions (matches concurrent voter limit)
 * - Respects admin-configured batchSize and batchClassFilter from settings
 * - Triggers a 2-minute class cooldown after all submissions are processed
 * - Concurrent gate applied so batch counts against the 100-voter cap
 */
router.post('/batch', auth, concurrentVoteGate, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied: batch endpoint is admin-only' });
    }

    const { submissions } = req.body;

    if (!Array.isArray(submissions) || submissions.length === 0) {
        return res.status(400).json({ msg: 'submissions must be a non-empty array' });
    }

    // Hard cap of 100 simultaneous submissions
    const HARD_CAP = 100;
    if (submissions.length > HARD_CAP) {
        return res.status(400).json({
            msg: `Batch size ${submissions.length} exceeds the maximum of ${HARD_CAP} simultaneous submissions.`
        });
    }

    // Read admin-configured batchSize + batchClassFilter
    let allowedClasses = [];
    try {
        const scheduleSetting = await Setting.findOne({ key: 'votingSchedule' });
        
        if (scheduleSetting?.value?.votingEnd) {
            if (new Date() > new Date(scheduleSetting.value.votingEnd)) {
                return res.status(403).json({ error: 'voting_ended', msg: 'Voting schedule has ended' });
            }
        }
        if (scheduleSetting?.value?.batchVotingEnabled) {
            if (scheduleSetting.value.batchSize) {
                const configuredMax = Math.min(scheduleSetting.value.batchSize, HARD_CAP);
                if (submissions.length > configuredMax) {
                    return res.status(400).json({
                        msg: `Batch size ${submissions.length} exceeds the configured limit of ${configuredMax}.`
                    });
                }
            }
            if (Array.isArray(scheduleSetting.value.batchClassFilter) && scheduleSetting.value.batchClassFilter.length > 0) {
                allowedClasses = scheduleSetting.value.batchClassFilter;
            }
        }
    } catch (_) { /* fall back to hard cap only */ }

    // Check if any of the target classes are in cooldown before processing
    const classesInBatch = [...new Set(
        submissions.map(s => s.studentClass).filter(Boolean)
    )];
    // If studentClass isn't pre-sent, we'll detect it per-submission below.
    // Check pre-declared classes first for a fast rejection.
    for (const cls of classesInBatch) {
        const { getClassCooldown: check } = await import('../middleware/protection.js');
        const cd = check(cls);
        if (cd) {
            const remainingSecs = Math.ceil(cd.remainingMs / 1000);
            res.set('Retry-After', String(remainingSecs));
            return res.status(429).json({
                error: `Class "${cls}" is in a 2-minute cooldown. Please wait ${remainingSecs}s before starting the next batch.`,
                cooldownEndsAt: cd.endsAt,
                remainingSeconds: remainingSecs
            });
        }
    }

    // Process all submissions in parallel
    const affectedClasses = new Set();

    const results = await Promise.allSettled(
        submissions.map(async ({ studentId, votes: ballotVotes }) => {
            if (!studentId || !Array.isArray(ballotVotes) || ballotVotes.length === 0) {
                throw new Error(`Invalid submission for studentId: ${studentId}`);
            }

            const user = await User.findOne({ studentId });
            if (!user) throw new Error(`Student not found: ${studentId}`);
            if (user.hasVoted) throw new Error(`${studentId} has already voted`);

            // Per-submission cooldown check (catches classes not pre-declared)
            const cd = getClassCooldown(user.class);
            if (cd) {
                throw new Error(`Class "${user.class}" is in cooldown for ${Math.ceil(cd.remainingMs / 1000)}s`);
            }

            // Class filter
            if (allowedClasses.length > 0 && !allowedClasses.includes(user.class)) {
                throw new Error(`${studentId} (class: ${user.class}) is not in the allowed batch classes`);
            }

            const voteDocuments = ballotVotes.map(v => ({
                userId: studentId,
                positionId: v.positionId,
                candidateId: v.candidateId,
                studentClass: user.class
            }));

            await Vote.insertMany(voteDocuments);
            await User.findOneAndUpdate(
                { studentId },
                { hasVoted: true, voteTimestamp: new Date() }
            );

            affectedClasses.add(user.class);
            return { studentId, status: 'success' };
        })
    );

    // Start 2-minute cooldown for every class that had successful votes
    for (const cls of affectedClasses) {
        startClassCooldown(cls, 'batch');
    }

    const summary = results.map((r, i) => {
        if (r.status === 'fulfilled') {
            return { studentId: submissions[i].studentId, status: 'success' };
        }
        return {
            studentId: submissions[i].studentId,
            status: 'failed',
            reason: r.reason?.message || 'Unknown error'
        };
    });

    const succeeded = summary.filter(s => s.status === 'success').length;
    const failed    = summary.filter(s => s.status === 'failed').length;

    res.json({
        msg: `Batch complete: ${succeeded} succeeded, ${failed} failed`,
        total: submissions.length,
        succeeded,
        failed,
        results: summary,
        cooldownStarted: [...affectedClasses],
        cooldownDurationSeconds: 120
    });
});

export default router;
