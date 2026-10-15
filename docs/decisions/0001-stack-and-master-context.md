# ADR 0001 — Stack and master context

- **Status:** Accepted
- **Date:** 2026-10-14

## Context
`requirements.md` originally proposed FastAPI and PostgreSQL. The master build prompt fixes a different stack.

## Decision
Use the stack in `CLAUDE.md` A.3: TypeScript everywhere, React + Vite, Node 20 + Express, MongoDB with Mongoose,
Agenda for jobs, and a local LLM (Ollama by default) behind a provider-agnostic gateway.
The master context (Part A) lives in `CLAUDE.md` so every coding session loads it automatically.
Shared contracts (enums, API envelope, design tokens, env names) live in `packages/shared`.

## Consequences
- The repo root is the project folder itself rather than a nested `acet-skillup/` directory.
- Changing the stack requires a new ADR and an update to `CLAUDE.md`.
