import express from 'express';
import Vote from '../models/Vote.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Access denied' });
    try {
        const votes = await Vote.find();
        res.json(votes);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.post('/', auth, async (req, res) => {
    const votesArray = req.body;
    const userId = req.user.id;

    try {
        const user = await User.findOne({ studentId: userId });
        if (user.hasVoted) {
            return res.status(400).json({ msg: 'You have already voted' });
        }

        const voteDocuments = votesArray.map(v => ({
            userId: userId,
            positionId: v.positionId,
            candidateId: v.candidateId,
            studentClass: user.class
        }));

        await Vote.insertMany(voteDocuments);

        await User.findOneAndUpdate(
            { studentId: userId },
            {
                hasVoted: true,
                voteTimestamp: new Date()
            }
        );

        res.json({ msg: 'Votes submitted successfully' });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

export default router;
