# ACET SkillUp

A learning management system for Achariya College of Engineering Technology (ACET), Puducherry.
Each semester's syllabus becomes an interactive concept map. Every topic has a six-step learning page,
quizzes and spaced revision. A local LLM drafts content and faculty approve it.

- Product and phase plan: `ACET_SkillUp_Master_Prompt.md`, `CLAUDE.md`
- API reference: `docs/api.md`
- Decisions: `docs/decisions/`

## Stack

Plain JavaScript (ES modules) in an npm-workspaces monorepo:

| Folder | What it is |
|---|---|
| `apps/api` | Node.js 20 + Express + Mongoose REST API (`/api/v1`) |
| `apps/worker` | Agenda job runner (no HTTP) |
| `apps/web` | React 18 + Vite + Tailwind |
| `packages/shared` | zod schemas, enums and design tokens used by all apps |

## Run it without Docker (Windows, Linux, macOS)

Needs Node.js 20.12 or newer.

```bash
npm install
cp apps/api/.env.example apps/api/.env        # then set the two JWT secrets
cp apps/worker/.env.example apps/worker/.env

npm run db:dev          # terminal 1: local MongoDB replica set on :27017 (data in .data/mongo)
npm run seed            # once: demo users and the DBMS subject
npm run dev             # terminal 2: api :4000, worker, web :5173
```

On Windows PowerShell use `Copy-Item` instead of `cp`.
Generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Open http://localhost:5173. The page should show **API: ok, Mongo: ok**.

### Seeded accounts

All use the password `Acet@2025`.

| Role | Email |
|---|---|
| Admin (HOD) | admin@acet.test |
| Faculty | faculty1@acet.test, faculty2@acet.test |
| Mentor | mentor@acet.test |
| Students | student01@acet.test … student10@acet.test |

Run `npm run seed -- --reset` to wipe and reseed a development database.

## Run it with Docker

```bash
cp .env.example .env                          # set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET
docker compose up --build
docker compose run --rm ollama-pull           # first time: downloads the LLM models
docker compose exec api node src/db/seed.js   # first time: demo data
```

Web on http://localhost:5173, API on http://localhost:4000/api/v1/health.

## Local LLM

Ollama is the default provider (`LLM_PROVIDER=ollama`). Pull the models with `npm run ai:pull`
(Ollama running locally) or the `ollama-pull` compose service.

Hardware: a 7–8B model such as `qwen2.5:7b-instruct` needs roughly 8 GB of RAM or VRAM.
CPU-only works but is slow; expect tens of seconds per generation. The app works without the LLM;
AI features arrive in Phase A1 onwards.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | API, worker and web together |
| `npm test` | All test suites (API tests use an in-memory MongoDB, no setup needed) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run db:dev` | Local MongoDB without Docker |
| `npm run seed` | Demo data (A.9) |
| `npm run ai:pull` | Pull the chat and embedding models into Ollama |

The first `npm test` downloads a MongoDB binary (about 100 MB) into `.cache/`.
