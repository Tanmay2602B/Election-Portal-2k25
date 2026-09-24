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

dotenv.config();

const app = express();

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

// Handle CORS preflight for ALL routes before any other middleware
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/settings', settingRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
