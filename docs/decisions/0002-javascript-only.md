# ADR 0002 — JavaScript only

- **Status:** Accepted
- **Date:** 2026-10-14

## Context
The master prompt (A.3) chose TypeScript, but allowed plain JavaScript if the user asked for it.
The user asked for JavaScript only.

## Decision
All code is plain JavaScript (ES modules): `packages/shared`, `apps/api`, `apps/worker` and `apps/web` (`.jsx`).
The code already written in TypeScript was converted by stripping types, keeping comments and layout.

## Consequences
- The API and worker run directly with `node`. There is no build step and no `typecheck` script.
- zod schemas in `@acet/shared` remain the runtime contract for every request and response.
- ESLint (`npm run lint`) is the main static check, alongside the test suites.
- JSDoc comments may describe types where that helps the reader.
