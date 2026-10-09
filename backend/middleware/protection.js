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
 *    - 200 requests / 15 min per IP across all endpoints
 *    - Protects every route with a single app.use()
 *
 * 3. Auth endpoint limiter
 *    - 20 requests / 15 min per IP on /api/auth (login brute-force)
 *
 * 4. Vote endpoint limiter
 *    - 10 submissions / 15 min per IP on POST /api/votes
 *    - Prevents ballot stuffing / scripted vote flooding
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
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 500,                    // raised: admin dashboards make many API calls
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests from this IP, please try again after 15 minutes.'
    }
});

// ─── 3. Auth endpoint limiter ─────────────────────────────────────────────────
// 500 req / 15 min per IP — generous ceiling for bulk campus logins.
// The custom handler mirrors the Origin header so CORS never swallows a 429.
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const origin = req.headers.origin;
        if (origin) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Credentials', 'true');
        }
        res.status(429).json({
            error: 'Too many login attempts from your network. Please wait 15 minutes before trying again.'
        });
    }
});

// ─── 3a. Login concurrency queue ──────────────────────────────────────────────
// When hundreds of students log in simultaneously, bcrypt.compare() saturates
// the CPU thread pool and responses slow to a crawl. This middleware queues
// excess requests and drains them in FIFO order — nobody is rejected, they
// just wait their turn (typically < 1–2 s extra per student).
//
// MAX_CONCURRENT_LOGINS: how many bcrypt operations run in parallel.
// QUEUE_TIMEOUT_MS:      max time a queued request will wait before we give
//                        up and return a 503 (prevents memory leak on DDoS).
const MAX_CONCURRENT_LOGINS = 20;   // tune: higher = more RAM, lower = slower
const QUEUE_TIMEOUT_MS      = 30_000; // 30 s — students won't notice < 2 s

let activeLogins = 0;
const loginQueue = [];              // [ { run: fn, timer: TimeoutId } ]

function drainLoginQueue() {
    while (activeLogins < MAX_CONCURRENT_LOGINS && loginQueue.length > 0) {
        const { run, timer } = loginQueue.shift();
        clearTimeout(timer);
        activeLogins++;
        run();
    }
}

export const loginQueueGate = (req, res, next) => {
    if (activeLogins < MAX_CONCURRENT_LOGINS) {
        // Slot available — go straight through
        activeLogins++;
        res.on('finish', () => { activeLogins = Math.max(0, activeLogins - 1); drainLoginQueue(); });
        res.on('close',  () => { activeLogins = Math.max(0, activeLogins - 1); drainLoginQueue(); });
        return next();
    }

    // No slot — enqueue and wait
    let entry;
    const timer = setTimeout(() => {
        // Remove from queue if still waiting after timeout
        const idx = loginQueue.indexOf(entry);
        if (idx !== -1) loginQueue.splice(idx, 1);
        const origin = req.headers.origin;
        if (origin) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Credentials', 'true');
        }
        res.status(503).json({ error: 'Login server is busy. Please try again in a moment.' });
    }, QUEUE_TIMEOUT_MS);

    entry = {
        timer,
        run: () => {
            res.on('finish', () => { activeLogins = Math.max(0, activeLogins - 1); drainLoginQueue(); });
            res.on('close',  () => { activeLogins = Math.max(0, activeLogins - 1); drainLoginQueue(); });
            next();
        }
    };
    loginQueue.push(entry);
};

// ─── 4. Vote submission limiter ───────────────────────────────────────────────
export const voteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many vote submissions from this IP. Please wait before trying again.'
    }
});

// ─── Admin/settings limiter (generous — admin does many writes) ───────────────
export const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,                   // admin can do many saves, polls, etc.
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

    // Release the slot when the response finishes (success or error)
    res.on('finish', () => { activeVoters = Math.max(0, activeVoters - 1); });
    res.on('close',  () => { activeVoters = Math.max(0, activeVoters - 1); });

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
