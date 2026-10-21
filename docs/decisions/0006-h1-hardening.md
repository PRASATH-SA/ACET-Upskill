# ADR 0006 — H1 hardening decisions

- **Status:** Accepted
- **Date:** 2026-10-21

## Rate limits per user, not per IP

The old limit was 300 requests/min **per IP**. A college network puts every student behind one
public (NAT) address, so one lab of students would share 300 requests and most would get 429s.
Now: `API_RATE_LIMIT_PER_MIN` (300) per signed-in user, mounted after `requireAuth`, plus a high
per-IP flood ceiling (`API_IP_RATE_LIMIT_PER_MIN`, 20,000). Login keeps its per IP + email limit.
Counters are in memory per process; a shared store (MongoDB/Redis) is a later option if strict
global limits are needed.

## One API process per core

The load test (500 students, quiz submit + revision rating) failed with one process: p95 8.8 s,
about 100 req/s. CPU profiling showed no hot spot: the cost was spread across Express, the MongoDB
driver and BSON, on one core of a 16-core machine. `API_WORKERS` (0 = one per core) runs the API
with `node:cluster`; with 8 processes the same test passed (quiz submit p95 414 ms, revision rate
p95 185 ms, ~430 req/s, 0 errors), on the same machine that also ran MongoDB and the load
generator. Production uses `API_WORKERS=0`.

## Dependency audit

Production dependencies are gated in CI with `npm audit --omit=dev --audit-level=high`.

- `react-router-dom` 6.30.6, `csv-parse` 7.0.3: upgraded.
- `react-router` open redirect via backslash paths (fixed only in v7): the one place a URL-derived
  path is navigated to (post-login return) goes through `safeReturnPath`, which rejects
  protocol-relative, backslash and encoded forms.
- `file-type` ASF infinite loop (fixed only in v22, which needs Node 22; A.3 fixes Node 20): all
  sniffing goes through `detectFileType`, which refuses ASF input before the parser, and an ESLint
  rule forbids importing `file-type` anywhere else. Remove when the runtime moves to Node 22.
- Dev-only tooling (vite 5, vitest 2, tailwind 3, esbuild) has advisories whose fixes are major
  rewrites (vite 8, vitest 5, tailwind 4). They never run in production (the web app ships as
  static files), so they are accepted for v1 and tracked as follow-up work.

**Node 20 reached end of life in April 2026.** A.3 fixes Node 20, so the runtime was not changed
here; moving the Docker images to Node 22 LTS is recommended and would also allow file-type 22.

## Production compose is standalone

`docker-compose.prod.yml` is a separate file, not an override: Compose merges `ports` lists, so an
override would keep the development file's published MongoDB and Ollama ports. MongoDB runs with
`--auth` and a replica-set key file; the app and backup users have least-privilege roles.

## Frontend on Vercel

The user asked for Vercel hosting and chose to deploy only the web app there for now. The API
can't run on Vercel unchanged: it needs the Agenda worker, persistent uploads (up to 200 MB
videos; Vercel caps requests at 4.5 MB) and a local LLM. `apps/web/vercel.json` serves the SPA
with the same security headers as nginx; `apps/web/api/[...path].js` answers 503 until `/api` is
rewritten to a public API URL.
