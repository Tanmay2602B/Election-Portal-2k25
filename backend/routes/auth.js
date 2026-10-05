import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

router.post('/login', async (req, res) => {
    const { studentId, password } = req.body;

    try {
        const user = await User.findOne({ studentId });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        let isMatch = false;
        if (user.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = password === user.password;
        }

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const payload = {
            user: {
                id: user.studentId,
                role: user.role,
                class: user.class,
                name: user.name
            }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '4h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: payload.user });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.get('/user', auth, async (req, res) => {
    try {
        const user = await User.findOne({ studentId: req.user.id }).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.post('/seed-admin', async (req, res) => {
    try {
        const exists = await User.findOne({ studentId: 'admin' });
        if (exists) return res.status(400).json({ msg: 'Admin already exists' });

        const hashedPassword = await bcrypt.hash('admin123', 10);
        const admin = new User({
            studentId: 'admin',
            name: 'System Admin',
            password: hashedPassword,
            role: 'admin'
        });
        await admin.save();
        res.json({ msg: 'Admin created' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ADMIN ONLY — create a new admin account
router.post('/create-admin', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });

    const { studentId, name, password } = req.body;
    if (!studentId || !name || !password) {
        return res.status(400).json({ msg: 'studentId, name and password are all required' });
    }
    if (password.length < 6) {
        return res.status(400).json({ msg: 'Password must be at least 6 characters' });
    }

    try {
        const exists = await User.findOne({ studentId });
        if (exists) return res.status(400).json({ msg: 'A user with that ID already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const admin = new User({ studentId, name, password: hashedPassword, role: 'admin' });
        await admin.save();
        res.json({ msg: 'Admin created successfully', studentId, name });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ADMIN ONLY — change password for any account (by studentId)
router.post('/change-password', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });

    const { studentId, newPassword } = req.body;
    if (!studentId || !newPassword) {
        return res.status(400).json({ msg: 'studentId and newPassword are required' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ msg: 'Password must be at least 6 characters' });
    }

    try {
        const user = await User.findOne({ studentId });
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.json({ msg: `Password updated for ${studentId}` });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ADMIN ONLY — delete an admin account (cannot delete yourself)
router.delete('/delete-admin/:studentId', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    if (req.params.studentId === req.user.id) {
        return res.status(400).json({ msg: 'You cannot delete your own account' });
    }

    try {
        const user = await User.findOne({ studentId: req.params.studentId, role: 'admin' });
        if (!user) return res.status(404).json({ msg: 'Admin not found' });

        await User.deleteOne({ studentId: req.params.studentId });
        res.json({ msg: `Admin "${req.params.studentId}" deleted` });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ADMIN ONLY — list all admin accounts
router.get('/admins', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        const admins = await User.find({ role: 'admin' }).select('-password').sort({ createdAt: 1 });
        res.json(admins);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

export default router;
