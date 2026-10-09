/**
 * protection.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Central module for DDoS protection, rate limiting, and class-voting cooldown.
 *
 * Features
 * ──────────
 * 1. Helmet — sets secure HTTP headers (XSS, clickjacking, MIME-sniff, etc.)
 *
 * 2. Global rate limiter
 *    - 3,000 requests / minute per IP across all endpoints
 *    - Protects every route with a single app.use()
 *
 * 3. Auth endpoint limiter
 *    - 500 attempts / minute per IP on POST /api/auth/login
 *
 * 4. Vote endpoint limiter
 *    - 10 submissions / 15 min per authenticated voter on POST /api/votes
 *    - Students on shared campus Wi-Fi have separate submission quotas
 *
 * 5. Concurrent vote gate (in-memory semaphore)
 *    - MAX_CONCURRENT_VOTERS (100) simultaneous POST /votes requests
 *    - Excess requests get a 429 with a Retry-After header
 *
 * 6. Class voting cooldown
 *    - After a batch/class finishes voting, that class is put in a 2-minute
 *      cooldown so the next class can be seated before voting resumes
 *    - Enforced on POST /votes (individual) and POST /votes/batch
 *    - Admin can clear a class cooldown early via DELETE /api/votes/cooldown/:class
 *    - GET /api/votes/cooldown returns current cooldown state (admin-only)
 */

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// ─── 1. Helmet ────────────────────────────────────────────────────────────────
export const helmetMiddleware = helmet();

// ─── 2. Global rate limiter ───────────────────────────────────────────────────
export const globalLimiter = rateLimit({
    windowMs: 60 * 1000,         // 1 minute
    max: 3000,                   // room for 300 six-request student flows plus headroom
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests from this network. Please wait 1 minute before trying again.'
    }
});

// ─── 3. Device-lock login middleware ──────────────────────────────────────────
// Problem: Campus mein sab ka IP same hota hai — pure IP se block nahi ho sakta.
// Solution: IP + User-Agent = device fingerprint (alag device = alag fingerprint).
//
// Rules enforced:
//  A) Ek device pe ek VoterID login kiya → us device se koi AUR VoterID nahi
//     (2 min tak). Physical device passing rokta hai.
//  B) Ek VoterID ek baar hi login kar sakti hai (2 min cooldown).
//
// Both maps are self-cleaning — entries auto-delete after the window expires.
const LOGIN_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

// fingerprint → { credential, expiresAt }   (device locked to a voterId)
const deviceLockMap = new Map();
// credential  → expiresAt                   (voterId cooldown)
const credCooldownMap = new Map();

function corsHeaders(req, res) {
    const origin = req.headers.origin;
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
    }
}

export const deviceLoginCooldown = (req, res, next) => {
    const { voterId, studentId } = req.body || {};
    const credential = (voterId || studentId || '').toString().trim().toUpperCase();

    if (!credential) return next(); // missing credential — let route return 400

    // Build a device fingerprint from IP + User-Agent
    const ip        = req.ip || req.connection?.remoteAddress || 'unknown';
    const ua        = req.headers['user-agent'] || 'unknown';
    const fingerprint = `${ip}||${ua}`;

    const now = Date.now();

    // ── Rule A: Is this device already locked to a DIFFERENT voterId? ──────────
    const deviceLock = deviceLockMap.get(fingerprint);
    if (deviceLock && deviceLock.expiresAt > now) {
        if (deviceLock.credential !== credential) {
            const remainingSecs = Math.ceil((deviceLock.expiresAt - now) / 1000);
            corsHeaders(req, res);
            return res.status(429).json({
                error: `This device was already used to log in with another voter ID. Please wait ${remainingSecs} second(s) or use a different device.`,
                retryAfterSeconds: remainingSecs
            });
        }
    }

    // ── Rule B: Is this voterId still in its own cooldown? ────────────────────
    const credExpiry = credCooldownMap.get(credential);
    if (credExpiry && credExpiry > now) {
        const remainingSecs = Math.ceil((credExpiry - now) / 1000);
        corsHeaders(req, res);
        return res.status(429).json({
            error: `This voter ID already logged in recently. Please wait ${remainingSecs} second(s) before trying again.`,
            retryAfterSeconds: remainingSecs
        });
    }

    // ── All clear — record device lock + credential cooldown ─────────────────
    const expiresAt = now + LOGIN_COOLDOWN_MS;

    deviceLockMap.set(fingerprint, { credential, expiresAt });
    credCooldownMap.set(credential, expiresAt);

    setTimeout(() => deviceLockMap.delete(fingerprint),  LOGIN_COOLDOWN_MS);
    setTimeout(() => credCooldownMap.delete(credential), LOGIN_COOLDOWN_MS);

    next();
};

// ─── 3a. Auth endpoint limiter ────────────────────────────────────────────────
// 500 login attempts / minute per IP; the global quota also applies.
// CORS runs first so browsers can read blocked responses.
export const authLimiter = rateLimit({
    windowMs: 60 * 1000,   // 1 minute
    max: 500,              // 500 login attempts per minute
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const retryAfterSeconds = Number(res.getHeader('Retry-After')) || 60;
        res.status(429).json({
            error: 'Too many login attempts from your network. Please wait before trying again.',
            retryAfterSeconds
        });
    }
});



// ─── 4. Vote submission limiter ───────────────────────────────────────────────
export const voteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    // Mounted after auth: use the verified JWT identity, never client-supplied IDs.
    keyGenerator: (req) => `voter:${req.user?._id || req.user?.id || 'unknown'}`,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const retryAfterSeconds = Number(res.getHeader('Retry-After')) || 15 * 60;
        res.status(429).json({
            error: 'Too many vote attempts for your account. Please wait before trying again.',
            retryAfterSeconds
        });
    }
});

// ─── Admin/settings write limiter ────────────────────────────────────────────
export const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,                   // admin can do many saves, polls, etc.
    // Student election-data reads are already covered by the global quota.
    skip: (req) => req.method === 'GET' || req.method === 'HEAD',
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many admin requests. Please wait before trying again.'
    }
});

// ─── 5. Concurrent vote gate (semaphore) ──────────────────────────────────────
const MAX_CONCURRENT_VOTERS = 100;  // matches batch size cap
let activeVoters = 0;

export const concurrentVoteGate = (req, res, next) => {
    if (activeVoters >= MAX_CONCURRENT_VOTERS) {
        res.set('Retry-After', '30');
        return res.status(429).json({
            error: 'Voting system is at capacity (100 simultaneous voters). Please wait a moment and try again.',
            retryAfterSeconds: 30
        });
    }
    activeVoters++;

    // A normal response can emit both events; release each slot exactly once.
    let released = false;
    const release = () => {
        if (released) return;
        released = true;
        activeVoters = Math.max(0, activeVoters - 1);
    };
    res.once('finish', release);
    res.once('close', release);

    next();
};

// ─── 6. Class voting cooldown ─────────────────────────────────────────────────
// Map: className → { endsAt: Date, triggeredBy: 'batch'|'auto' }
const classCooldowns = new Map();

const COOLDOWN_MS = 2 * 60 * 1000;   // 2 minutes

/**
 * Start a 2-minute cooldown for a class.
 * @param {string} className
 * @param {'batch'|'auto'} triggeredBy
 */
export const startClassCooldown = (className, triggeredBy = 'auto') => {
    if (!className) return;
    classCooldowns.set(className, {
        endsAt: new Date(Date.now() + COOLDOWN_MS),
        triggeredBy
    });
    // Auto-remove from map once it expires (prevents unbounded growth)
    setTimeout(() => {
        const entry = classCooldowns.get(className);
        if (entry && entry.endsAt <= new Date()) {
            classCooldowns.delete(className);
        }
    }, COOLDOWN_MS + 500);
};

/**
 * Check whether a class is currently in cooldown.
 * Returns null if not in cooldown, or { endsAt, remainingMs } if it is.
 */
export const getClassCooldown = (className) => {
    const entry = classCooldowns.get(className);
    if (!entry) return null;
    const remainingMs = entry.endsAt - Date.now();
    if (remainingMs <= 0) {
        classCooldowns.delete(className);
        return null;
    }
    return { endsAt: entry.endsAt, remainingMs, triggeredBy: entry.triggeredBy };
};

/**
 * Express middleware: blocks POST /votes if the student's class is in cooldown.
 * Attach after auth middleware so req.user is available.
 * Works for both individual votes (looks up the student's class from DB)
 * and is called directly in the batch route with an explicit class list.
 */
export const classVoteCooldownGate = async (req, res, next) => {
    try {
        // For individual votes, look up the student to get their class
        const User = (await import('../models/User.js')).default;
        const user = await User.findOne({ studentId: req.user.id }).lean();
        if (!user) return next(); // let the route handler deal with missing user

        const cooldown = getClassCooldown(user.class);
        if (cooldown) {
            const remainingSecs = Math.ceil(cooldown.remainingMs / 1000);
            res.set('Retry-After', String(remainingSecs));
            return res.status(429).json({
                error: `Class "${user.class}" is in a 2-minute cooldown between voting sessions. Please wait ${remainingSecs} second(s) before voting.`,
                cooldownEndsAt: cooldown.endsAt,
                remainingSeconds: remainingSecs
            });
        }
        next();
    } catch (err) {
        // Non-fatal: let the request through if cooldown check fails
        next();
    }
};

/**
 * batchClassGate — blocks individual vote submissions from students whose class
 * is not in the currently open batch (batchClassFilter).
 *
 * Logic:
 *  - If batchVotingEnabled is false → no restriction (open election)
 *  - If batchClassFilter is empty   → no restriction (all classes allowed)
 *  - If batchClassFilter has entries → only those classes may vote; others get 403
 */
export const batchClassGate = async (req, res, next) => {
    try {
        const Setting = (await import('../models/Settings.js')).default;
        const scheduleSetting = await Setting.findOne({ key: 'votingSchedule' }).lean();

        // If batch mode isn't enabled or no filter is set, allow everyone
        if (
            !scheduleSetting?.value?.batchVotingEnabled ||
            !Array.isArray(scheduleSetting.value.batchClassFilter) ||
            scheduleSetting.value.batchClassFilter.length === 0
        ) {
            return next();
        }

        const allowedClasses = scheduleSetting.value.batchClassFilter;

        // Look up the student's class
        const User = (await import('../models/User.js')).default;
        const user = await User.findOne({ studentId: req.user.id }).lean();
        if (!user) return next(); // let the route handler deal with missing user

        if (!allowedClasses.includes(user.class)) {
            return res.status(403).json({
                error: 'batch_not_open',
                msg: `Voting is currently open for ${allowedClasses.join(', ')} only. Your class (${user.class}) is not in the active batch.`,
                allowedClasses,
                yourClass: user.class
            });
        }

        next();
    } catch (err) {
        // Non-fatal: if settings can't be read, let the request through
        next();
    }
};
export const getCooldownState = () => {
    const state = {};
    for (const [cls, entry] of classCooldowns.entries()) {
        const remainingMs = entry.endsAt - Date.now();
        if (remainingMs > 0) {
            state[cls] = {
                endsAt: entry.endsAt,
                remainingSeconds: Math.ceil(remainingMs / 1000),
                triggeredBy: entry.triggeredBy
            };
        }
    }
    return state;
};

export const clearClassCooldown = (className) => {
    classCooldowns.delete(className);
};
