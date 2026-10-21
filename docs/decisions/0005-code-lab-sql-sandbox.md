# ADR 0005 — Code lab: server-graded SQL in a WebAssembly sandbox

- **Status:** Accepted
- **Date:** 2026-10-21

The user asked for "real-time learning with code (like LeetCode)" on every topic. For DBMS the
natural language is SQL, so each topic gets small SQL problems on realistic college data.

## Decision

- **Engine:** `sql.js` (SQLite compiled to WebAssembly) in the API, in a pool of worker threads.
  It is pure JS + WASM, so it runs the same on Node 20 (Docker) and Node 22, needs no native
  build and no database server. `node:sqlite` was rejected because Node 20 does not have it.
- **Isolation:** every run gets a fresh in-memory database built from the problem's setup SQL.
  sql.js has no file-system or network access (`ATTACH` only sees an empty in-memory FS).
  A run that passes 2 s has its worker terminated and replaced; SQLite's heap is capped at
  64 MB with `PRAGMA hard_heap_limit`, which a query can lower but never raise. Runs and
  submits are rate-limited per user.
- **Grading on the server, not in the browser:** the reference solution, the hidden test rows
  and the check query never leave the server, so the answer cannot be read from DevTools.
  Results are compared by value (column aliases don't matter; order only when the problem says
  so). Hidden rows catch hard-coded answers, like LeetCode's hidden test cases.
- **Schema tasks** (UPDATE, CREATE INDEX) are graded with an optional check query that reads
  the database after the student's code, e.g. `pragma_index_list`.
- **Review workflow:** problems are ordinary content (`codeChallenges`, draft → published,
  review queue, audit log). Saving runs the solution first, so a broken problem cannot be
  published. Only published problems reach students (A.5).

## Consequences

- Each run costs a few milliseconds of CPU in the API process; two workers per process serve a
  class easily. Raise `CODE_LAB_LIMITS.workers` in `packages/shared/src/schemas/codelab.js`
  for bigger loads, or move the pool into its own service later.
- SQLite dialect: students learn standard SQL, but vendor-specific syntax (e.g. MySQL
  `LIMIT a, b` works; `AUTO_INCREMENT` does not) follows SQLite.
- Other languages (Python, C) would need a real process sandbox and are out of scope for v1.
