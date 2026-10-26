# Anonymous portfolio marks

This is a small opt-in guestbook counter, not visitor analytics or a count of
unique people. The static portfolio remains on GitHub Pages. A dedicated free
Supabase project (`qrqgipnjlxjrbqgzrevj`, `abhikhur-portfolio`, us-east-2) stores
the marks. No paid plan, add-on, sign-in, email, name, or personal profile is used.

## API

Endpoint: `https://qrqgipnjlxjrbqgzrevj.supabase.co/functions/v1/visitor-marks`

Pass the public `apikey` from `../visitor-config.mjs`, not an Authorization token.

- `GET`: `{ "count": 0 }`. Loading the page does not create a mark.
- `POST`, JSON `{ "visitorId": "<random UUID v4>" }`: returns
  `{ "count": 1, "marked": true, "alreadyMarked": false }`.
- Retrying the same UUID returns `alreadyMarked: true` without another increment.
- Errors use 400/401/403/405/413/415/429/503 and do not claim a successful mark.

The frontend keeps its random UUID locally. Clearing storage, changing browser,
or another device can create another mark. There is no fingerprinting. A SHA-256
digest of a scoped high-entropy UUID is retained for idempotency, not the raw UUID.
Neither usernames nor messages are accepted. Normal infrastructure request logs
are controlled by Supabase; application code does not log bodies or IP addresses.

## Access and abuse boundaries

All three tables live in `portfolio_private`, outside the public Data API schema,
with RLS enabled and no `anon`/`authenticated` grants or policies. Only the server
`service_role` may execute the two **SECURITY INVOKER** RPCs. There is no public
table insert, increment function, or read access to mark/rate-limit records.

The Edge Function verifies a modern publishable API key in its body. Its platform
JWT check is disabled because modern keys are not JWTs. It reads a modern secret
key internally from Supabase's injected `SUPABASE_SECRET_KEYS`; that key is never
retrieved by deployment tooling, returned, logged, or checked into source.

CORS allows only abhikhur.com, www.abhikhur.com, the GitHub Pages alias, and local
preview on localhost/127.0.0.1:8765. Writes require an allowed Origin, exactly one
UUID field, JSON content type, and at most 256 bytes. A transaction/advisory lock
makes duplicate detection, quota checks, and increments atomic under concurrency.

Abuse mitigation is intentionally modest: 30 new marks/hour per HMAC network
bucket, 1,000 new marks/day globally, and 1,000,000 all-time. Network addresses are
used only in memory and stored only as a daily keyed HMAC, not raw IPs or user
agents. The HMAC key is derived from the runtime secret key, so rotating that key
also resets network buckets, **not** UUID deduplication. The rate table is capped
at 10,000 rows; each write deletes up to 256 expired rows older than two days.

Origin and publishable keys are public and forgeable by non-browser clients.
Proxy IP headers/NATs are imperfect, and changing UUID/browser bypasses individual
deduplication. This is not CAPTCHA-grade bot protection or a unique-human metric.
The global quotas bound database writes, not invocation/GET denial-of-service.
Free-tier limits or inactivity pausing can make the counter temporarily unavailable;
the portfolio still works and the UI must not fabricate a count or successful mark.

## Deployment and verification

Migration was created with Supabase CLI 2.122.0 `migration new
visitor_mark_counter`, then applied through the connected `apply_migration` tool.
For future schema edits create a new migration rather than rewriting history.
Deploy `functions/visitor-marks/index.ts` as `visitor-marks`, `verify_jwt: false`.
No extra secret setup or runtime package dependency is required.

Run `tests/visitor-counter.sql` in a transaction against this dedicated database;
it rolls back its synthetic marks. The HTTP smoke test in `tests/http-smoke.mjs`
uses only the public key, verifies deduplication/concurrency and rejection cases,
and prints the exact UUID/digest list needed for targeted admin test cleanup.
Never clear real visitor marks to reset tests. Check Supabase security advisors
after migrations. Read the test instructions before running the live smoke test.

With Node.js 24+, run the dependency-free handler tests with
`node --test supabase/tests/handler.test.mjs`. The live smoke test is
`node supabase/tests/http-smoke.mjs`; it adds four marks and requires targeted
admin cleanup afterward. Do not schedule that live test or treat it as a health
check. A normal GET is the non-mutating health check.

Initial deployment verification: all seven handler tests passed; live duplicate
and distinct concurrent writes passed; invalid origin/key/body requests failed
without increments; anonymous direct RPC access returned 401 and a private schema
request returned 406. SQL transaction tests passed and rolled back. Exactly four
live synthetic marks were removed, leaving the public count at zero. Advisors
reported no security warning/error; the three `RLS enabled, no policy` information
notices are expected for these intentionally private deny-all tables.

Primary references (checked 2026-10-26):

- https://supabase.com/docs/guides/functions/auth
- https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/docs/guides/api/securing-your-api
