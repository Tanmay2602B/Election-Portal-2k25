import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { randomBytes } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { globalLimiter, authLimiter, adminLimiter, voteLimiter, concurrentVoteGate } from '../middleware/protection.js';

// Ephemeral credentials for loopback-only fixtures; no production DB or accounts.
process.env.JWT_SECRET = randomBytes(32).toString('hex');
const { default: auth } = await import('../middleware/auth.js');

const origin = 'https://council-selections-portal.vercel.app';
const ip = '127.0.0.1';

async function withFixture(middleware, routes, run) {
    await globalLimiter.resetKey(ip);
    await authLimiter.resetKey(ip);
    await adminLimiter.resetKey(ip);
    const app = express();
    app.use(cors({
        origin: (value, callback) => callback(null, value === origin),
        credentials: true
    }));
    app.use(middleware);
    app.use(express.json());
    routes(app);
    const server = await new Promise(resolve => {
        const instance = app.listen(0, ip, () => resolve(instance));
    });
    const baseURL = `http://${ip}:${server.address().port}`;
    try {
        await run(async (path, method = 'GET', requestOrigin = origin, token, jsonBody) => {
            const headers = { Origin: requestOrigin };
            if (method === 'OPTIONS') headers['Access-Control-Request-Method'] = 'POST';
            if (token) headers.Authorization = `Bearer ${token}`;
            if (jsonBody !== undefined) headers['Content-Type'] = 'application/json';
            const bodyToSend = jsonBody === undefined ? undefined : JSON.stringify(jsonBody);
            const response = await fetch(baseURL + path, { method, headers, body: bodyToSend });
            const body = await response.text();
            return { status: response.status, headers: response.headers, body };
        });
    } finally {
        await new Promise(resolve => server.close(resolve));
        await globalLimiter.resetKey(ip);
        await authLimiter.resetKey(ip);
        await adminLimiter.resetKey(ip);
    }
}

function assertMinuteWindow(headers, limit = 500) {
    assert.equal(headers.get('ratelimit-limit'), String(limit));
    const remainingSeconds = Number(headers.get('ratelimit-reset'));
    assert.ok(remainingSeconds > 0 && remainingSeconds <= 60);
}

test('campus traffic shares 3000/minute; student reads bypass the admin write quota and preflights are free', async () => {
    await withFixture(globalLimiter, app => {
        app.use('/api/settings', adminLimiter);
        app.get('/api/settings/test', (req, res) => res.json({ testOnly: true }));
        app.post('/api/auth/login', authLimiter, (req, res) => res.json({ testOnly: true }));
    }, async request => {
        for (let n = 0; n < 10; n++) {
            assert.equal((await request('/api/auth/login', 'OPTIONS')).status, 204);
        }
        for (let n = 1; n <= 2999; n++) {
            const result = await request('/api/settings/test');
            assert.equal(result.status, 200);
            if (n === 1) {
                assertMinuteWindow(result.headers, 3000);
                assert.equal(result.headers.get('ratelimit-remaining'), '2999');
            }
        }
        assert.equal((await request('/api/auth/login', 'POST')).status, 200);
        const blocked = await request('/api/auth/login', 'POST');
        assert.equal(blocked.status, 429);
        assert.equal(blocked.headers.get('access-control-allow-origin'), origin);
        assert.ok(Number(blocked.headers.get('retry-after')) <= 60);
        assert.match(JSON.parse(blocked.body).error, /1 minute/);
    });
});

test('300 authenticated voters on one IP have separate quotas; changing token or body cannot reset one voter', async () => {
    const voterIds = Array.from({ length: 300 }, (_, index) => `fixture-voter-${index}`);
    const tokenFor = id => jwt.sign({ user: { _id: id, id: id, role: 'student' } }, process.env.JWT_SECRET, {
        expiresIn: '5m', jwtid: randomBytes(8).toString('hex')
    });
    const resetVoters = async () => {
        for (const id of voterIds) await voteLimiter.resetKey(`voter:${id}`);
    };
    await resetVoters();
    try {
        await withFixture(globalLimiter, app => {
            app.post('/api/votes', auth, voteLimiter, (req, res) => res.json({ testOnly: true }));
        }, async request => {
            assert.equal((await request('/api/votes', 'POST')).status, 401);
            assert.equal((await request('/api/votes', 'POST', origin, 'invalid-token')).status, 401);
            for (const id of voterIds) {
                const result = await request('/api/votes', 'POST', origin, tokenFor(id));
                assert.equal(result.status, 200);
                assert.equal(result.headers.get('ratelimit-limit'), '10');
                assert.equal(result.headers.get('ratelimit-remaining'), '9');
            }
            const firstVoter = voterIds[0];
            for (let n = 2; n <= 10; n++) {
                assert.equal((await request('/api/votes', 'POST', origin, tokenFor(firstVoter))).status, 200);
            }
            const blocked = await request('/api/votes', 'POST', origin, tokenFor(firstVoter), {
                user: { _id: 'forged-voter' }, voterId: 'forged-voter'
            });
            assert.equal(blocked.status, 429);
            assert.equal(blocked.headers.get('access-control-allow-origin'), origin);
            assert.match(JSON.parse(blocked.body).error, /your account/);
            assert.equal(JSON.parse(blocked.body).retryAfterSeconds, Number(blocked.headers.get('retry-after')));
            assert.equal((await request('/api/votes', 'POST', origin, tokenFor(voterIds[1]))).status, 200);
        });
    } finally {
        await resetVoters();
    }
});

test('admin writes still stop at 1000 per 15 minutes; reads work after the write quota is exhausted', async () => {
    await withFixture(adminLimiter, app => {
        app.post('/api/settings/test', (req, res) => res.json({ testOnly: true }));
        app.get('/api/settings/test', (req, res) => res.json({ testOnly: true }));
    }, async request => {
        for (let n = 0; n < 1000; n++) {
            assert.equal((await request('/api/settings/test', 'POST')).status, 200);
        }
        assert.equal((await request('/api/settings/test', 'POST')).status, 429);
        assert.equal((await request('/api/settings/test')).status, 200);
        assert.equal((await request('/api/settings/test', 'HEAD')).status, 200);
    });
});

test('vote concurrency stays capped at 100 when finish and close both fire or a client disconnects', () => {
    const admitted = [];
    const attempt = () => {
        const response = new EventEmitter();
        response.headers = {};
        response.set = (key, value) => { response.headers[key] = value; return response; };
        response.status = value => { response.statusCode = value; return response; };
        response.json = body => { response.body = body; return response; };
        concurrentVoteGate({}, response, () => admitted.push(response));
        return response;
    };
    const assertBlocked = () => {
        const blocked = attempt();
        assert.equal(blocked.statusCode, 429);
        assert.equal(blocked.headers['Retry-After'], '30');
    };
    try {
        for (let n = 0; n < 100; n++) attempt();
        assert.equal(admitted.length, 100);
        assertBlocked();
        admitted[0].emit('finish');
        admitted[0].emit('close');
        assert.equal(attempt().statusCode, undefined);
        assertBlocked(); // Exactly one replacement, even though both events fired.
        admitted[1].emit('close');
        assert.equal(attempt().statusCode, undefined);
        assertBlocked();
    } finally {
        for (const response of admitted) {
            response.emit('finish');
            response.emit('close');
        }
    }
});

test('login limiter allows 500 attempts, reports retry delay, and does not reflect an unapproved origin', async () => {
    await withFixture(authLimiter, app => {
        app.post('/api/auth/login', (req, res) => res.json({ testOnly: true }));
    }, async request => {
        for (let n = 1; n <= 500; n++) {
            const result = await request('/api/auth/login', 'POST');
            assert.equal(result.status, 200);
            if (n === 1) assertMinuteWindow(result.headers);
        }
        const blocked = await request('/api/auth/login', 'POST');
        assert.equal(blocked.status, 429);
        assert.equal(blocked.headers.get('access-control-allow-origin'), origin);
        const retryDelay = JSON.parse(blocked.body).retryAfterSeconds;
        assert.ok(retryDelay > 0 && retryDelay <= 60);
        assert.equal(retryDelay, Number(blocked.headers.get('retry-after')));
        const unapproved = await request('/api/auth/login', 'POST', 'https://unapproved.example');
        assert.equal(unapproved.status, 429);
        assert.equal(unapproved.headers.get('access-control-allow-origin'), null);
    });
});
