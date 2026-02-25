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

export default router;
