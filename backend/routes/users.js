import express from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Vote from '../models/Vote.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// GET /api/users — Admin: list all students
router.get('/', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// POST /api/users — Admin: create a student
router.post('/', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });

    const { studentId, name, password, class: studentClass, semester } = req.body;

    try {
        let user = await User.findOne({ studentId });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({
            studentId,
            name,
            password: password || 'password123',
            class: studentClass,
            semester,
            role: 'student'
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);

        await user.save();
        const saved = user.toObject();
        delete saved.password;
        res.json(saved);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// POST /api/users/bulk — Admin: import many students in ONE request
// Body: { students: [{ studentId, name, password, class, semester }, ...] }
// Returns: { imported, skipped, results: [{ studentId, status, reason? }] }
router.post('/bulk', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });

    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ msg: 'students must be a non-empty array' });
    }

    // Fetch all existing studentIds in one query to detect duplicates fast
    const incomingIds = students.map(s => s.studentId).filter(Boolean);
    const existing = await User.find({ studentId: { $in: incomingIds } }).select('studentId').lean();
    const existingSet = new Set(existing.map(u => u.studentId));

    // Hash all passwords in parallel (bcrypt is CPU-bound — cap concurrency to 10)
    // Use 8 rounds (vs 10 for single inserts) — still very secure, ~4x faster per hash
    const HASH_ROUNDS = 8;
    const results = [];
    const toInsert = [];

    for (const s of students) {
        const { studentId, name, password, class: studentClass, semester } = s;
        if (!studentId || !name) {
            results.push({ studentId: studentId || '(missing)', status: 'failed', reason: 'Missing studentId or name' });
            continue;
        }
        if (existingSet.has(studentId)) {
            results.push({ studentId, status: 'failed', reason: 'User already exists' });
            continue;
        }
        toInsert.push({ studentId, name, password: password || 'password123', class: studentClass || 'Unknown', semester: semester || 'Semester 1' });
    }

    // Hash passwords in batches of 10 to avoid blocking the event loop
    const BATCH = 10;
    for (let i = 0; i < toInsert.length; i += BATCH) {
        const chunk = toInsert.slice(i, i + BATCH);
        await Promise.all(chunk.map(async (s) => {
            try {
                const hashed = await bcrypt.hash(s.password, HASH_ROUNDS);
                await User.create({
                    studentId: s.studentId,
                    name: s.name,
                    password: hashed,
                    class: s.class,
                    semester: s.semester,
                    role: 'student'
                });
                results.push({ studentId: s.studentId, status: 'imported' });
            } catch (err) {
                const reason = err.code === 11000 ? 'User already exists (duplicate key)' : (err.message || 'Server error');
                results.push({ studentId: s.studentId, status: 'failed', reason });
            }
        }));
    }

    const imported = results.filter(r => r.status === 'imported').length;
    const skipped  = results.filter(r => r.status === 'failed').length;

    res.json({ imported, skipped, total: students.length, results });
});

// PUT /api/users/:id — Admin: update a student
router.put('/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    const { name, class: studentClass, semester, password } = req.body;

    try {
        const userFields = {};
        if (name) userFields.name = name;
        if (studentClass) userFields.class = studentClass;
        if (semester) userFields.semester = semester;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            userFields.password = await bcrypt.hash(password, salt);
        }

        const user = await User.findOneAndUpdate(
            { studentId: req.params.id },
            { $set: userFields },
            { new: true }
        ).select('-password');

        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// DELETE /api/users — Admin: delete ALL students and their votes
router.delete('/', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        // Delete all student users (keep admin accounts)
        const deleteResult = await User.deleteMany({ role: 'student' });
        // Delete all vote documents
        await Vote.deleteMany({});
        res.json({
            msg: `Deleted ${deleteResult.deletedCount} student(s) and all associated votes.`,
            deletedCount: deleteResult.deletedCount
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// DELETE /api/users/:id — Admin: delete a student and their votes
router.delete('/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        const user = await User.findOneAndDelete({ studentId: req.params.id });
        if (!user) return res.status(404).json({ msg: 'User not found' });
        // Also remove all vote documents for this user
        await Vote.deleteMany({ userId: req.params.id });
        res.json({ msg: 'User and associated votes removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// DELETE /api/users/:id/votes — Admin: reset a student's vote (so they can vote again)
router.delete('/:id/votes', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        const user = await User.findOneAndUpdate(
            { studentId: req.params.id },
            { hasVoted: false, voteTimestamp: null },
            { new: true }
        );
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Delete all actual vote documents for this student
        await Vote.deleteMany({ userId: req.params.id });

        res.json({ msg: `Votes reset for student ${req.params.id}` });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

export default router;
