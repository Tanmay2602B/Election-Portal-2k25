import express from 'express';
import Position from '../models/Position.js';
import Candidate from '../models/Candidate.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const positions = await Position.find();
        res.json(positions);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.post('/', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        const newPosition = new Position(req.body);
        const position = await newPosition.save();
        res.json(position);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.put('/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        const position = await Position.findByIdAndUpdate(req.params.id,
            { $set: req.body }, { new: true });
        res.json(position);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.delete('/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        await Position.findByIdAndDelete(req.params.id);
        await Candidate.deleteMany({ positionId: req.params.id });
        res.json({ msg: 'Position deleted' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

export default router;
