import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    positionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Position', required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    studentClass: { type: String },
    timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Vote', voteSchema);
