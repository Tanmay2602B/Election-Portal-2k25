import mongoose from 'mongoose';
import { generateVoterId } from '../lib/studentIdentity.js';

const userSchema = new mongoose.Schema({
    studentId: { type: String, required: true },
    voterId:   { type: String, default: null },
    name:      { type: String, required: true },
    password:  { type: String, required: true },
    role:      { type: String, enum: ['student', 'admin'], default: 'student' },
    class:     { type: String },
    semester:  { type: String },
    hasVoted:  { type: Boolean, default: false },
    voteTimestamp: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

// Keep the original unique-studentId index for admin accounts; students can share IDs
userSchema.index({ studentId: 1 });

// Voter ID must be unique across students
userSchema.index({ voterId: 1 }, {
    unique: true,
    sparse: true, // allow null for admin accounts
    name: 'student_voter_id_unique'
});

// Auto-generate a Voter ID for new student accounts if not supplied
userSchema.pre('save', async function () {
    if (this.role !== 'student') return;
    if (this.voterId) return; // already set

    // Retry on collision (extremely rare with 36^6 = 2.18 billion combos)
    for (let attempt = 0; attempt < 10; attempt++) {
        const id = generateVoterId();
        const exists = await mongoose.model('User').exists({ voterId: id });
        if (!exists) { this.voterId = id; return; }
    }
    throw new Error('Could not generate a unique Voter ID. Please try again.');
});

export default mongoose.model('User', userSchema);
