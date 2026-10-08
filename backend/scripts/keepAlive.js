#!/usr/bin/env node
/**
 * Render Backend Keep-Alive Script
 * ==============================================================================
 * Periodically pings the Render backend health check endpoint to prevent
 * the free-tier instance from sleeping (spins down after 15 mins of inactivity).
 *
 * Zero external dependencies required (uses native Node.js fetch & fs).
 *
 * Usage:
 *   npm run keep-alive
 *   node backend/scripts/keepAlive.js [URL] [--interval <minutes>] [--once]
 *
 * Examples:
 *   node backend/scripts/keepAlive.js
 *   node backend/scripts/keepAlive.js https://council-selections-portal.onrender.com
 *   node backend/scripts/keepAlive.js --interval 5
 *   node backend/scripts/keepAlive.js --once
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Zero-dependency .env loader
function loadEnvFile(envPath) {
    try {
        if (typeof process.loadEnvFile === 'function') {
            if (fs.existsSync(envPath)) {
                process.loadEnvFile(envPath);
                return;
            }
        }
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            for (const line of content.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                const eqIdx = trimmed.indexOf('=');
                if (eqIdx !== -1) {
                    const key = trimmed.slice(0, eqIdx).trim();
                    let val = trimmed.slice(eqIdx + 1).trim();
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.slice(1, -1);
                    }
                    if (!process.env[key]) {
                        process.env[key] = val;
                    }
                }
            }
        }
    } catch {
        // Ignore if unable to read .env
    }
}

// Attempt to load .env from backend and root
loadEnvFile(path.resolve(__dirname, '../.env'));
loadEnvFile(path.resolve(__dirname, '../../.env'));

// ANSI Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    gray: '\x1b[90m',
};

// Parse command line arguments
const args = process.argv.slice(2);
let customUrl = null;
let intervalMinutes = 10; // Default: 10 minutes (Render sleeps after 15 min)
let runOnce = false;

for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--once') {
        runOnce = true;
    } else if (arg === '--interval' || arg === '-i') {
        const val = parseFloat(args[i + 1]);
        if (!isNaN(val) && val > 0) {
            intervalMinutes = val;
            i++;
        }
    } else if (!arg.startsWith('-')) {
        customUrl = arg;
    }
}

// Target URL resolution
const rawUrl =
    customUrl ||
    process.env.KEEP_ALIVE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    'https://council-selections-portal.onrender.com';

const sanitizedBase = rawUrl.replace(/\/+$/, '');
const targetEndpoint = sanitizedBase.endsWith('/health') || sanitizedBase.endsWith('/api/health')
    ? sanitizedBase
    : `${sanitizedBase}/health`;

let pingCount = 0;
let successCount = 0;
let failCount = 0;
let countdownTimer = null;
let nextPingTime = 0;

function formatTimestamp() {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function clearLine() {
    if (process.stdout.isTTY) {
        process.stdout.write('\r\x1b[K');
    }
}

async function sendHealthCheck() {
    pingCount++;
    const startTime = Date.now();
    const timeStr = formatTimestamp();

    clearLine();
    console.log(
        `${colors.cyan}[${timeStr}]${colors.reset} ${colors.yellow}⚡ [#${pingCount}] Pinging backend:${colors.reset} ${colors.dim}${targetEndpoint}${colors.reset}`
    );

    try {
        const controller = new AbortController();
        // 60-second timeout to handle Render cold-boot
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(targetEndpoint, {
            method: 'GET',
            headers: {
                'User-Agent': 'Render-KeepAlive-Terminal-Client/1.0',
                'Accept': 'application/json, text/plain, */*'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;
        let data = null;

        try {
            data = await response.json();
        } catch {
            // Not JSON
        }

        if (response.ok) {
            successCount++;
            const uptime = data?.uptime ? ` | Uptime: ${data.uptime}` : '';
            const db = data?.database ? ` | DB: ${data.database}` : '';

            console.log(
                `${colors.green}✔ [${formatTimestamp()}] [Status: ${response.status} OK] Response time: ${durationMs}ms${uptime}${db}${colors.reset}`
            );
            console.log(
                `${colors.gray}   Backend is ALIVE & ACTIVE (Render 15-min idle timer reset).${colors.reset}\n`
            );
        } else {
            failCount++;
            console.log(
                `${colors.red}✖ [${formatTimestamp()}] [Status: ${response.status} ${response.statusText}] Response time: ${durationMs}ms${colors.reset}`
            );
            if (response.status === 404) {
                console.log(
                    `${colors.yellow}   Note: Route returned 404. Backend is reachable, deploy new backend commit for full /health telemetry.${colors.reset}\n`
                );
            }
        }
    } catch (err) {
        failCount++;
        const durationMs = Date.now() - startTime;
        if (err.name === 'AbortError') {
            console.log(
                `${colors.red}✖ [${formatTimestamp()}] Request timed out after ${durationMs}ms. Backend might still be waking up.${colors.reset}\n`
            );
        } else {
            console.log(
                `${colors.red}✖ [${formatTimestamp()}] Ping failed (${durationMs}ms): ${err.message}${colors.reset}\n`
            );
        }
    }

    if (runOnce) {
        process.exit(failCount > 0 ? 1 : 0);
    }

    startCountdown();
}

function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);

    const intervalMs = intervalMinutes * 60 * 1000;
    nextPingTime = Date.now() + intervalMs;

    countdownTimer = setInterval(() => {
        const remainingMs = Math.max(0, nextPingTime - Date.now());
        const totalSecs = Math.floor(remainingMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        if (process.stdout.isTTY) {
            process.stdout.write(
                `\r${colors.magenta}⏱  Next health check in: ${colors.bright}${timeStr}${colors.reset} ${colors.gray}(Total pings: ${pingCount} | Success: ${successCount} | Failed: ${failCount})${colors.reset} `
            );
        }

        if (remainingMs <= 0) {
            clearInterval(countdownTimer);
            sendHealthCheck();
        }
    }, 1000);
}

// Banner display
console.log(`${colors.cyan}${colors.bright}`);
console.log(`=============================================================`);
console.log(`       🚀 RENDER BACKEND HEALTH-CHECK & KEEP-ALIVE           `);
console.log(`=============================================================${colors.reset}`);
console.log(`${colors.gray}Target URL :${colors.reset} ${colors.bright}${targetEndpoint}${colors.reset}`);
console.log(`${colors.gray}Interval   :${colors.reset} Every ${intervalMinutes} minutes`);
console.log(`${colors.gray}Mode       :${colors.reset} ${runOnce ? 'One-time check' : 'Continuous Keep-Alive loop'}`);
console.log(`${colors.gray}Render Rule:${colors.reset} Free tier sleeps after 15 min of inactivity.\n`);

// Handle graceful exit
process.on('SIGINT', () => {
    clearLine();
    console.log(`\n${colors.yellow}🛑 Stopping Keep-Alive script. Summary:${colors.reset}`);
    console.log(`   Total pings: ${pingCount} | Successful: ${successCount} | Failed: ${failCount}`);
    process.exit(0);
});

// Trigger initial ping immediately
sendHealthCheck();
