import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    studentId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    class: { type: String },
    semester: { type: String },
    hasVoted: { type: Boolean, default: false },
    voteTimestamp: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);
