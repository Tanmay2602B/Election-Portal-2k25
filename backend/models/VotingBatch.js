import mongoose from 'mongoose';

const votingBatchSchema = new mongoose.Schema({
    _id: { type: String, default: 'current' },
    status: {
        type: String,
        enum: ['idle', 'open', 'cooldown'],
        default: 'idle'
    },
    className: { type: String, default: null },
    studentIds: { type: [String], default: [] },
    activeSubmissions: { type: Number, default: 0 },
    batchNumber: { type: Number, default: 0 },
    openedAt: { type: Date, default: null },
    cooldownUntil: { type: Date, default: null },
    lastUpdatedAt: { type: Date, default: null }
}, { _id: false });

export default mongoose.model('VotingBatch', votingBatchSchema);
