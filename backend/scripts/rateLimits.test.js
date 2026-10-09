import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cors from 'cors';
import { globalLimiter, authLimiter } from '../middleware/protection.js';

const origin = 'https://council-selections-portal.vercel.app';
const ip = '127.0.0.1';

async function withFixture(middleware, routes, run) {
    globalLimiter.resetKey(ip);
    authLimiter.resetKey(ip);
    const app = express();
    app.use(cors({
        origin: (value, callback) => callback(null, value === origin),
        credentials: true
    }));
    app.use(middleware);
    routes(app);
    const server = await new Promise(resolve => {
        const instance = app.listen(0, ip, () => resolve(instance));
    });
    const baseURL = `http://${ip}:${server.address().port}`;
    try {
        await run(async (path, method = 'GET', requestOrigin = origin) => {
            const headers = { Origin: requestOrigin };
            if (method === 'OPTIONS') headers['Access-Control-Request-Method'] = 'POST';
            const response = await fetch(baseURL + path, { method, headers });
            const body = await response.text();
            return { status: response.status, headers: response.headers, body };
        });
    } finally {
        await new Promise(resolve => server.close(resolve));
        globalLimiter.resetKey(ip);
        authLimiter.resetKey(ip);
    }
}

function assertMinuteWindow(headers) {
    assert.equal(headers.get('ratelimit-limit'), '500');
    const remainingSeconds = Number(headers.get('ratelimit-reset'));
    assert.ok(remainingSeconds > 0 && remainingSeconds <= 60);
}

test('campus traffic shares a 500/minute quota; preflights are free and blocked login is readable', async () => {
    await withFixture(globalLimiter, app => {
        app.get('/api/settings/test', (req, res) => res.json({ testOnly: true }));
        app.post('/api/auth/login', authLimiter, (req, res) => res.json({ testOnly: true }));
    }, async request => {
        for (let n = 0; n < 10; n++) {
            assert.equal((await request('/api/auth/login', 'OPTIONS')).status, 204);
        }
        for (let n = 1; n <= 499; n++) {
            const result = await request('/api/settings/test');
            assert.equal(result.status, 200);
            if (n === 1) {
                assertMinuteWindow(result.headers);
                assert.equal(result.headers.get('ratelimit-remaining'), '499');
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
