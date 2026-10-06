import express from 'express';
import VotingBatch from '../models/VotingBatch.js';
import User from '../models/User.js';
import Setting from '../models/Settings.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Admin-only guard helper
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    next();
};

// ─── GET / — Admin: get current batch + full roster ───────────────────────────
router.get('/', auth, adminOnly, async (req, res) => {
    try {
        // Upsert: ensure the singleton doc always exists
        const batch = await VotingBatch.findOneAndUpdate(
            { _id: 'current' },
            {
                $setOnInsert: {
                    status: 'idle',
                    className: null,
                    studentIds: [],
                    activeSubmissions: 0,
                    batchNumber: 0,
                    openedAt: null,
                    cooldownUntil: null,
                    lastUpdatedAt: null
                }
            },
            { upsert: true, new: true }
        );

        // Build roster from studentIds
        let roster = [];
        if (batch.studentIds && batch.studentIds.length > 0) {
            const users = await User.find(
                { studentId: { $in: batch.studentIds } },
                { studentId: 1, name: 1, hasVoted: 1, class: 1 }
            ).lean();

            // Preserve order from studentIds
            const userMap = {};
            for (const u of users) {
                userMap[u.studentId] = u;
            }
            roster = batch.studentIds.map(id => {
                const u = userMap[id];
                return u
                    ? { studentId: u.studentId, name: u.name, class: u.class, hasVoted: u.hasVoted }
                    : { studentId: id, name: 'Unknown', class: null, hasVoted: false };
            });
        }

        const remainingCount = roster.filter(r => !r.hasVoted).length;

        res.json({ batch, roster, remainingCount });
    } catch (err) {
        console.error('GET /voting-batch error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── GET /status — Any authenticated user: check if this student can vote ─────
router.get('/status', auth, async (req, res) => {
    try {
        const batch = await VotingBatch.findById('current').lean();

        if (!batch || batch.status !== 'open') {
            return res.json({
                allowed: false,
                reason: 'batch_not_open',
                batch: batch
                    ? { status: batch.status, className: batch.className, batchNumber: batch.batchNumber }
                    : { status: 'idle', className: null, batchNumber: 0 }
            });
        }

        if (!batch.studentIds.includes(req.user.id)) {
            return res.json({
                allowed: false,
                reason: 'not_in_batch',
                batch: { status: batch.status, className: batch.className, batchNumber: batch.batchNumber }
            });
        }

        return res.json({
            allowed: true,
            reason: null,
            batch: { status: batch.status, className: batch.className, batchNumber: batch.batchNumber }
        });
    } catch (err) {
        console.error('GET /voting-batch/status error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── POST / — Admin: open a new batch ────────────────────────────────────────
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { className, studentIds } = req.body;

        // (a) Validate voting is active
        const scheduleSetting = await Setting.findOne({ key: 'votingSchedule' }).lean();
        if (!scheduleSetting?.value?.isActive) {
            return res.status(400).json({
                error: 'voting_not_active',
                msg: 'Voting is not currently active. Enable voting in the election status panel first.'
            });
        }

        // (b) Validate no batch is already open
        const existing = await VotingBatch.findById('current').lean();
        if (existing && existing.status !== 'idle') {
            const reason = existing.status === 'open'
                ? 'A batch is already open. Close it before opening a new one.'
                : `A 2-minute cooldown is in progress. Wait until ${new Date(existing.cooldownUntil).toLocaleTimeString()} before opening the next batch.`;
            return res.status(409).json({ error: 'batch_not_idle', msg: reason, batch: existing });
        }

        // (c) Validate studentIds array
        if (!Array.isArray(studentIds) || studentIds.length < 1 || studentIds.length > 100) {
            return res.status(400).json({
                error: 'invalid_student_ids',
                msg: 'studentIds must be an array of 1 to 100 student IDs.'
            });
        }

        if (!className || typeof className !== 'string' || !className.trim()) {
            return res.status(400).json({
                error: 'invalid_class_name',
                msg: 'className is required.'
            });
        }

        // (d) All studentIds must exist
        const users = await User.find({ studentId: { $in: studentIds } }).lean();
        const foundIds = users.map(u => u.studentId);
        const missingIds = studentIds.filter(id => !foundIds.includes(id));
        if (missingIds.length > 0) {
            return res.status(400).json({
                error: 'students_not_found',
                msg: 'Some student IDs were not found.',
                missing: missingIds
            });
        }

        // (e) All students must belong to className
        const mismatched = users.filter(u => u.class !== className);
        if (mismatched.length > 0) {
            return res.status(400).json({
                error: 'class_mismatch',
                msg: `Some students do not belong to class "${className}".`,
                mismatched: mismatched.map(u => ({ studentId: u.studentId, name: u.name, class: u.class }))
            });
        }

        // (f) None can have already voted
        const alreadyVoted = users.filter(u => u.hasVoted);
        if (alreadyVoted.length > 0) {
            return res.status(400).json({
                error: 'already_voted',
                msg: 'Some students have already voted.',
                alreadyVoted: alreadyVoted.map(u => ({ studentId: u.studentId, name: u.name }))
            });
        }

        // Open the batch
        const prevBatch = existing;
        const newBatchNumber = (prevBatch?.batchNumber || 0) + 1;
        const now = new Date();

        const updatedBatch = await VotingBatch.findOneAndUpdate(
            { _id: 'current' },
            {
                $set: {
                    status: 'open',
                    className: className.trim(),
                    studentIds,
                    activeSubmissions: 0,
                    batchNumber: newBatchNumber,
                    openedAt: now,
                    cooldownUntil: null,
                    lastUpdatedAt: now
                }
            },
            { upsert: true, new: true }
        );

        res.json({ msg: 'Batch opened successfully.', batch: updatedBatch });
    } catch (err) {
        console.error('POST /voting-batch error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── POST /close — Admin: close open batch, start cooldown ───────────────────
router.post('/close', auth, adminOnly, async (req, res) => {
    try {
        const batch = await VotingBatch.findById('current').lean();
        if (!batch || batch.status !== 'open') {
            return res.status(400).json({
                error: 'batch_not_open',
                msg: 'No batch is currently open.'
            });
        }

        const now = new Date();
        const cooldownUntil = new Date(now.getTime() + 120_000); // 2 minutes

        const updatedBatch = await VotingBatch.findOneAndUpdate(
            { _id: 'current' },
            {
                $set: {
                    status: 'cooldown',
                    cooldownUntil,
                    lastUpdatedAt: now
                }
            },
            { new: true }
        );

        res.json({ msg: 'Batch closed. 2-minute cooldown started.', batch: updatedBatch });
    } catch (err) {
        console.error('POST /voting-batch/close error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── POST /clear-cooldown — Admin: end cooldown early ────────────────────────
router.post('/clear-cooldown', auth, adminOnly, async (req, res) => {
    try {
        const batch = await VotingBatch.findById('current').lean();
        if (!batch || batch.status !== 'cooldown') {
            return res.status(400).json({
                error: 'not_in_cooldown',
                msg: 'The batch is not currently in cooldown.'
            });
        }

        const now = new Date();
        const updatedBatch = await VotingBatch.findOneAndUpdate(
            { _id: 'current' },
            {
                $set: {
                    status: 'idle',
                    cooldownUntil: null,
                    lastUpdatedAt: now
                }
            },
            { new: true }
        );

        res.json({ msg: 'Cooldown cleared. Ready for next batch.', batch: updatedBatch });
    } catch (err) {
        console.error('POST /voting-batch/clear-cooldown error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
