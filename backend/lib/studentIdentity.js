import { randomInt } from 'node:crypto';
import User from '../models/User.js';

const VOTER_ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generate a cryptographically random 6-character alphanumeric Voter ID.
 */
export function generateVoterId() {
    return Array.from({ length: 6 }, () =>
        VOTER_ID_ALPHABET[randomInt(VOTER_ID_ALPHABET.length)]
    ).join('');
}

/**
 * Ensure every existing student has a unique 6-char Voter ID.
 * Safe to call on every server startup — idempotent.
 */
export async function ensureVoterIds() {
    const students = await User.find({ role: 'student', voterId: { $in: [null, '', undefined] } })
        .select('_id voterId').lean();

    if (students.length === 0) return;

    const existingIds = new Set(
        (await User.find({ role: 'student', voterId: { $exists: true, $ne: null } })
            .select('voterId').lean()).map(u => u.voterId)
    );

    let assigned = 0;
    for (const student of students) {
        let vId;
        do { vId = generateVoterId(); } while (existingIds.has(vId));
        existingIds.add(vId);
        await User.updateOne({ _id: student._id }, { $set: { voterId: vId } });
        assigned++;
    }

    if (assigned > 0) {
        console.log(`[VoterID] Assigned new Voter IDs to ${assigned} existing student(s).`);
    }
}
