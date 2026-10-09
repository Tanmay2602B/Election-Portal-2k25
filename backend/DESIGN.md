# Login rate limits

## Problem addressed

Previously the global limiter allowed 500 requests per 15 minutes per network IP and ran before CORS. Login-specific middleware was exported but not mounted, so login requests had no separate auth limit. The global limit still applied. Campus Wi-Fi can put many students behind the same IP, and dashboard traffic consumed that same quota. A global rejection lacked the normal CORS response headers, which could make the login page show a generic network error.

## Implementation

The global window is one minute with a maximum of 500 requests per IP. All API requests, including login, continue to count toward this shared quota. A separate 500-attempts-per-minute limiter runs on POST /api/auth/login before authRoutes. This does not exempt login from the global limiter or create an additional independent 500-request allowance.

CORS runs before the limiters so browsers can read HTTP 429 responses. Allowed OPTIONS preflights complete before consuming the quota. The existing origin allowlist, credential checks, voting eligibility checks, health exemptions, admin limits, voting limits, and one-hop proxy setting remain in effect. The login-specific error response includes the actual retry delay and does not independently reflect unapproved origins.

## Security and capacity

A finite shared-network cap still limits floods and guessing, but changing the window from 15 minutes to one minute permits up to 15 times more sustained requests from an IP. The small Render Free instance may not be able to process 500 password comparisons per minute. A fixed window also permits a burst of 500 requests, and different IPs each receive a quota. This is a request allowance, not a measured server capacity.

Measure sustainable throughput using representative hashed test accounts and an isolated database on equivalent hosting. Do not stress-test the active election or connect a local test server to production data. Track successful logins, latency, HTTP 429/5xx rates, and CPU/memory where available. The current in-memory limiter resets when its process restarts and would need a shared store if deployed across multiple instances.
