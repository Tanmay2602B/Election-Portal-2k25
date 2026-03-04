import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    class: { type: String, required: true },
    positionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Position', required: true },
    bio: { type: String },
    photoURL: { type: String },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Candidate', candidateSchema);
