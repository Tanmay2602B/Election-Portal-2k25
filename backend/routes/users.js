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
