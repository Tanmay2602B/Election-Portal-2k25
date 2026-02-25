import express from 'express';
import Setting from '../models/Settings.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/:key', async (req, res) => {
    try {
        const setting = await Setting.findOne({ key: req.params.key });
        if (!setting) return res.json({});
        res.json(setting.value);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.post('/', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });

    const { key, value } = req.body;

    try {
        const setting = await Setting.findOneAndUpdate(
            { key },
            { value },
            { new: true, upsert: true }
        );
        res.json(setting);
    } catch (err) {
        res.status(500).send('Server Error: ' + err.message);
    }
});

export default router;
