import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import positionRoutes from './routes/positions.js';
import candidateRoutes from './routes/candidates.js';
import voteRoutes from './routes/votes.js';
import settingRoutes from './routes/settings.js';
import announcementRoutes from './routes/announcements.js';
import {
    helmetMiddleware,
    globalLimiter,
    authLimiter
} from './middleware/protection.js';

dotenv.config();

const app = express();

// ─── Security headers (helmet) ────────────────────────────────────────────────
app.use(helmetMiddleware);

// ─── Trust proxy (needed for accurate IP detection on Render / Vercel) ────────
app.set('trust proxy', 1);

// ─── Global DDoS / flood rate limiter — 200 req / 15 min per IP ──────────────
app.use(globalLimiter);

// ---------------------------------------------------------------------------
// CORS — allow Vercel deployments, localhost dev, and any explicit overrides
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [];

const PRODUCTION_ORIGINS = [
    'https://council-selections-portal.vercel.app',
];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
        if (!origin) return callback(null, true);

        if (
            PRODUCTION_ORIGINS.includes(origin) ||   // exact production URL
            origin.endsWith('.vercel.app') ||          // Vercel preview deployments
            origin.startsWith('http://localhost:') ||  // local dev (http)
            origin.startsWith('https://localhost:') || // local dev (https)
            origin.startsWith('http://127.0.0.1:') ||
            origin.startsWith('https://127.0.0.1:') ||
            ALLOWED_ORIGINS.includes(origin)           // any extra origins via env var
        ) {
            return callback(null, true);
        }

        // Return null (not an Error) — gives the browser a clean 403 instead of a crash
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// ─── Routes ──────────────────────────────────────────────────────────────────
// Auth gets its own tighter limiter (brute-force login protection)
app.use('/api/auth', authLimiter, authRoutes);

app.use('/api/users', userRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/announcements', announcementRoutes);

// ─── 404 fallback ────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
