# Election traffic limits

## Problem addressed

Campus Wi-Fi can put many students behind the same IP. A 500-request/minute global quota can be consumed by normal student traffic: login, four voting-page reads, and submission require at least six requests. The shared 10-submission/15-minute IP quota prevented other students on that network from voting. Election-data reads also consumed the admin limiter's shared 1,000-request/15-minute quota.

## Implementation

| Scope | Allowance | Identity |
| --- | --- | --- |
| All API traffic | 3,000 requests/minute | Network IP |
| Login | 500 attempts/minute | Network IP |
| Individual vote submission | 10 attempts/15 minutes | Authenticated voter |
| Writes on admin/settings routes | 1,000 requests/15 minutes | Network IP |
| Concurrent vote requests | 100 in flight | Single server process |

The allowances target an election with 500–1,000 total students and bursts of 200–300 students. Three hundred basic six-request student flows need 1,800 API requests; the global quota leaves 1,200 requests for additional reads and retries. The 500-attempt login quota remains sufficient for the stated 300-student burst without increasing password-comparison traffic further. All login requests still count toward the global quota.

The vote limiter runs after JWT authentication. Its key is the verified MongoDB user ID, with the signed student ID as a legacy fallback; request bodies, user agents, IP addresses, and raw token strings cannot select or reset a voter's quota. GET and HEAD requests skip the admin write quota but still consume the global quota. Writes retain their existing limit and authorization checks.

CORS runs before the limiters so browsers can read HTTP 429 responses. Allowed OPTIONS preflights complete before consuming the quota. The origin allowlist, credential checks, voting eligibility and batch checks, database transactions, health exemptions, and one-hop proxy setting remain in effect. Login and voter-specific rejections include the actual retry delay and do not independently reflect unapproved origins.

The concurrency guard releases each slot once, even when both response finish and close events fire. The cap protects concurrent request count, not a measured number of voters per second; an admin batch request can contain multiple ballots and remains subject to its existing batch limits.

## Security and capacity

Finite network and voter quotas limit floods, repeated submissions, and login guessing while avoiding a single shared vote counter for a campus. Verified JWT identity is the trust boundary for the voter quota; the deployment's proxy configuration supplies the network IP. Existing eligibility checks and database state still determine whether a vote is accepted. The request quota does not grant extra ballots.

The global quota permits six times the sustained traffic of the previous 500/minute configuration. Fixed windows permit bursts, and different IPs each receive a quota. The small Render Free instance may not sustain these allowances or 200–300 simultaneous logins. These are policy allowances, not measured server capacity. Excess concurrent vote requests receive HTTP 429 and Retry-After; the limit is deliberately not raised with the population size. No compute-plan upgrade is included in this change.

Measure sustainable throughput using representative hashed test accounts and an isolated database on equivalent hosting. Do not stress-test the active election or connect a local test server to production data. Track successful logins, latency, HTTP 429/5xx rates, and CPU/memory where available. The current in-memory limiter resets when its process restarts and would need a shared store if deployed across multiple instances.
