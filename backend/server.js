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
import votingBatchRoutes from './routes/votingBatch.js';
import {
    helmetMiddleware,
    globalLimiter,
    adminLimiter
} from './middleware/protection.js';
import { attachMongoCommandLogging } from './lib/mongoCommandLogging.js';
import { ensureVoterIds } from './lib/studentIdentity.js';

dotenv.config();

const app = express();

// ─── Security headers (helmet) ────────────────────────────────────────────────
app.use(helmetMiddleware);

// ─── Trust proxy (needed for accurate IP detection on Render / Vercel) ────────
app.set('trust proxy', 1);

// ─── Health check endpoints (exempt from rate limits) ────────────────────────
app.get(['/health', '/api/health', '/ping'], (req, res) => {
    const uptimeSecs = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSecs / 3600);
    const minutes = Math.floor((uptimeSecs % 3600) / 60);
    const seconds = uptimeSecs % 60;
    const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'connecting/disconnected';

    console.log(
        `[Health Check] 🟢 Heartbeat received at ${new Date().toLocaleTimeString()} | IP: ${req.ip || 'unknown'} | Uptime: ${uptimeStr} | DB: ${dbStatus}`
    );

    res.status(200).json({
        status: 'ok',
        uptime: uptimeStr,
        uptimeSeconds: uptimeSecs,
        timestamp: new Date().toISOString(),
        database: dbStatus,
        message: 'Render backend is active and healthy'
    });
});

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

mongoose.connect(MONGODB_URI, { monitorCommands: true })
    .then(async () => {
        console.log('Connected to MongoDB');
        attachMongoCommandLogging(mongoose.connection.getClient());
        // Ensure all existing students have Voter IDs (idempotent migration)
        await ensureVoterIds().catch(err => console.error('[VoterID] Migration warning:', err.message));
    })
    .catch((err) => console.error('MongoDB connection error:', err));

// ─── Routes ──────────────────────────────────────────────────────────────────
// Auth gets its own tighter limiter (brute-force login protection)
app.use('/api/auth', authRoutes);

// Admin-operated routes get a generous limiter (dashboard makes many calls)
app.use('/api/users',         adminLimiter, userRoutes);
app.use('/api/positions',     adminLimiter, positionRoutes);
app.use('/api/candidates',    adminLimiter, candidateRoutes);
app.use('/api/settings',      adminLimiter, settingRoutes);
app.use('/api/announcements', adminLimiter, announcementRoutes);

// Votes: uses its own internal per-route limiters (voteLimiter, concurrentVoteGate)
app.use('/api/votes', voteRoutes);

// Voting Batch: class-by-class supervised voting sessions
app.use('/api/voting-batch', adminLimiter, votingBatchRoutes);

// ─── 404 fallback ────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // ─── Auto keep-alive pinger (prevents Render free-tier from idling) ──────
    const backendUrl =
        process.env.RENDER_EXTERNAL_URL ||
        process.env.KEEP_ALIVE_URL ||
        'https://council-selections-portal.onrender.com';
    const intervalMinutes = parseInt(process.env.KEEP_ALIVE_INTERVAL_MINUTES || '10', 10);
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
    const shouldAutoPing = process.env.AUTO_KEEP_ALIVE === 'true' || isProduction;

    if (shouldAutoPing && backendUrl) {
        console.log(`[Keep-Alive] 🛡️  Internal keep-alive service initialized.`);
        console.log(`[Keep-Alive] Pinging ${backendUrl}/health every ${intervalMinutes} min to prevent Render spindown.`);

        setInterval(async () => {
            const pingUrl = `${backendUrl.replace(/\/+$/, '')}/health`;
            const startTime = Date.now();
            try {
                const response = await fetch(pingUrl, {
                    headers: { 'User-Agent': 'Render-Internal-KeepAlive/1.0' }
                });
                const duration = Date.now() - startTime;
                if (response.ok) {
                    console.log(`[Keep-Alive] 🟢 Self-ping successful (Status: ${response.status}, ${duration}ms) at ${new Date().toLocaleTimeString()}`);
                } else {
                    console.warn(`[Keep-Alive] ⚠️ Self-ping returned HTTP ${response.status} (${duration}ms)`);
                }
            } catch (err) {
                console.error(`[Keep-Alive] ❌ Self-ping failed: ${err.message}`);
            }
        }, intervalMinutes * 60 * 1000);
    }
});
