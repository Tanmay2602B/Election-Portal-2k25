import express from 'express';
import Candidate from '../models/Candidate.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const candidates = await Candidate.find();
        res.json(candidates);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.post('/', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        const newCandidate = new Candidate(req.body);
        const candidate = await newCandidate.save();
        res.json(candidate);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.put('/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        const candidate = await Candidate.findByIdAndUpdate(req.params.id,
            { $set: req.body }, { new: true });
        res.json(candidate);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.delete('/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        await Candidate.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Candidate deleted' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

export default router;
