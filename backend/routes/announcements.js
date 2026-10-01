import express from 'express';
import Announcement from '../models/Announcement.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// PUBLIC — returns active, non-expired announcements (latest first)
router.get('/', async (req, res) => {
    try {
        const now = new Date();
        const announcements = await Announcement.find({
            isActive: true,
            $or: [
                { startDate: null },
                { startDate: { $lte: now } }
            ]
        }).then(docs => docs.filter(a =>
            !a.expiryDate || new Date(a.expiryDate) > now
        ));

        // Sort latest first
        announcements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(announcements);
    } catch (err) {
        console.error('Announcements fetch error:', err);
        res.status(500).send('Server Error');
    }
});

// ADMIN — returns ALL announcements including inactive/expired
router.get('/all', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        const announcements = await Announcement.find().sort({ createdAt: -1 });
        res.json(announcements);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// ADMIN — create announcement
router.post('/', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        const announcement = new Announcement(req.body);
        await announcement.save();
        res.json(announcement);
    } catch (err) {
        res.status(400).json({ msg: err.message });
    }
});

// ADMIN — update announcement
router.put('/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        const announcement = await Announcement.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!announcement) return res.status(404).json({ msg: 'Not found' });
        res.json(announcement);
    } catch (err) {
        res.status(400).json({ msg: err.message });
    }
});

// ADMIN — delete announcement
router.delete('/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Announcement deleted' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

export default router;
