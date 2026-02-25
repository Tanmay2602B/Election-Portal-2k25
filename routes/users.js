import express from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
// import Vote from '../models/Vote.js'; // Dynamic import or top level? Top level fine.

const router = express.Router();

router.get('/', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

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
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

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

        let user = await User.findOneAndUpdate(
            { studentId: req.params.id },
            { $set: userFields },
            { new: true }
        ).select('-password');

        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.delete('/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        const user = await User.findOneAndDelete({ studentId: req.params.id });
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json({ msg: 'User removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.delete('/:id/votes', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        await User.findOneAndUpdate({ studentId: req.params.id }, { hasVoted: false });
        // Assume separate vote cleanup logic handled elsewhere or here if model imported
        // import Vote from '../models/Vote.js'; // to do proper cleanup
        res.json({ msg: 'Votes reset' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

export default router;
