import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
        type: String,
        enum: ['General', 'Important', 'Election Update', 'Result Update'],
        default: 'General'
    },
    badge: {
        type: String,
        enum: ['IMPORTANT', 'NEW', ''],
        default: ''
    },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('Announcement', announcementSchema);
