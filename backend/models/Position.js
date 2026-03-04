import mongoose from 'mongoose';

const positionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Position', positionSchema);
