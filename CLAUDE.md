# CLAUDE.md — ACET SkillUp

This file is the **Master Context (Part A)** from `ACET_SkillUp_Master_Prompt.md`. Claude Code loads it
automatically in every session, so you no longer need to paste Part A by hand. Paste only the phase
prompt (Part B) you want built.

Repo-specific notes (added on top of Part A):
- **Language: JavaScript only.** The user asked for plain JavaScript instead of TypeScript. This overrides
  A.3 and A.9. There is no `typecheck` script; use `npm run lint` and `npm test`.
- The repo root is this folder (it plays the role of `acet-skillup/` in A.4).
- Shared contracts already exist in `packages/shared/src`: enums (A.2, A.5), API envelope and
  pagination schemas (A.6), design tokens (A.8), env-variable names (A.3, A.7) and collection names (A.5).
  Import from `@acet/shared`; extend these files rather than redefining values elsewhere.
- **Design system (2026-10-23):** the UI follows the "E-Learning Kit" design system (violet `brand`,
  Poppins, white hairline cards on lavender), which replaces the A.8 palette/fonts and the liquid-glass
  look. The A.8 token names are kept and remapped — see `docs/decisions/0008-e-learning-kit-design-system.md`.
- **Brand (2026-10-23):** colours come from the Achariya "25 years" logo (`apps/web/public/brand/`):
  magenta brand `#C81D78`, navy `#22355E`, sunburst yellow, orange, cream page — see
  `docs/decisions/0010-achariya-brand-palette.md` (supersedes ADR 0008's colours, not its structure).
- **Motion and game layer (2026-10-23):** every UI component animates with framer-motion (presets in
  `apps/web/src/lib/motion.js`); students get XP, levels, achievements, combos and confetti derived from
  `/me/progress` by `gamify()` in `@acet/shared` — see `docs/decisions/0009-motion-and-gamification.md`.
- **Roles and term (2026-10-25):** `coordinator` (Academic Coordinator) is a super admin that passes every
  `admin` check (`roleAllows` in `@acet/shared`); a HOD (`admin`) manages only their own department's users.
  Students carry `yearOfStudy`/`semester`, set per student by the HOD; the learn page and `/me/progress` follow
  that semester — see `docs/decisions/0011-academic-coordinator-and-student-term.md`.
- **Theory and practical subjects (2026-10-26):** `subjects.kind` is `theory` or `practical`. A lab links a
  theory subject (`theorySubjectId`), has no topics, and places experiments (`labExperiments`, linking code-lab
  problems) on the theory roadmap. Student home splits Theory/Practical; `/labs/:id` and studio `/studio/labs/:id`.
  Seeded labs: Python Programming Lab (CSC26P03) and DBMS Lab (CS P53) — see `docs/decisions/0012-practical-lab-subjects.md`.
- **Leaderboard and progress reports (2026-10-27):** `GET /leaderboard`, `/reports/progress`, `/reports/students/:id`
  rank students by mastery XP (same as `gamify()`), scoped by role (class / faculty subjects / mentees / HOD department).
  Pages `/leaderboard`, `/studio/students[/:id]`, `/admin/progress` — see `docs/decisions/0013-leaderboard-and-cohort-progress.md`.
- **Dark mode (2026-10-27):** top-bar sun/moon toggle; themeable colours are CSS variables from `THEME_COLORS`
  in `@acet/shared` (Tailwind `darkMode: 'class'`). Use token classes, not hex — see `docs/decisions/0014-dark-mode.md`.
- **Form Studio and notifications (2026-10-27):** faculty/HOD build Google-Forms-style forms at `/studio/forms`
  (sections, branching, quiz mode, validation, file uploads, CSV export); the share link is `/forms/:id`.
  Publishing notifies the audience through the top-bar bell (`notifications`); students see `/forms`. Branching,
  answer checks and scoring are shared in `packages/shared/src/forms.js` — see `docs/decisions/0015-form-studio-and-notifications.md`.
- **Topic cheat sheet (2026-10-27):** a "Cheat sheet" tab in the Remember step (beside Flashcards) shows a downloadable study-poster PNG in the faculty reference style (navy title bar, numbered pastel cards with tables, steps, flowcharts and code from `blocksOf()`; `cheatPoster()` in `@acet/shared`, `CheatSheetPoster.jsx`, html-to-image)
  derived from the published page by `buildCheatSheet()` in `@acet/shared` (no stored content, no approval step);
  `/topics/:id#cheat-sheet` opens it — see `docs/decisions/0016-topic-cheat-sheet.md`.
- `docs/requirements.md` is a placeholder until the real requirements document is added.
- **Status (2026-10-21):** Phase 0, B1–B5, A1–A5 and F1–F7 are built and tested, plus extras outside Part B
  (question variants/quiz sessions, video learning, explain-it-back, liquid-glass UI — ADR 0004, and the
  LeetCode-style SQL code lab — ADR 0005, the subject root page/overview, and the Python code lab — ADR 0007).
  H1 is in progress: the route audit test is done.
- Three seeded subjects with full content: DBMS (`apps/api/src/db/dbmsContent.js`, SQL problems), PSPP
  CSC26103 Units 1–2 (`psppSyllabus.js`, `psppContent.js`, Python problems; no PYQs yet) and Biology for
  Computer Engineers BOT26105, Sem 1, Units I–V (`biologySyllabus.js` with CO1–CO5, `biologyContent*.js`
  one file per unit, YouTube video per topic; no code lab, no PYQs). `npm run seed:content` adds PSPP,
  Biology and any missing content to an existing database without touching faculty edits.
- Student pages that span subjects (exam prep, code lab, revision) are split per subject with `SubjectTabs`.
- E2E: `npm run e2e` (Playwright starts its own API on :4100, dev web on :5174 and preview on :5175).
- Run tests with `npm test`. API tests use an in-memory MongoDB replica set (no Docker needed).
  Local dev without Docker: `npm run db:dev`, then `npm run seed`, then `npm run dev`. Seed password `Acet@2025`.
- Deviations from Part A (pdfjs-dist instead of pdf-parse, bcryptjs, opaque refresh tokens, etc.) are listed in
  `docs/decisions/0003-backend-deviations.md`.

---

```text
You are a senior full-stack engineer and AI systems engineer building "ACET SkillUp", a learning
management system for Achariya College of Engineering Technology (ACET), Puducherry, affiliated to
Pondicherry University. You write production-quality, tested, well-structured code. You work in
phases. You only build the phase you are given, you never silently skip a requirement, and you stop
at the end of the phase with a Phase Report.

Read docs/requirements.md before starting any phase. It is the source of truth for product scope.
If this prompt and requirements.md disagree on the tech stack, THIS PROMPT WINS (the stack below
replaces the FastAPI/PostgreSQL stack in requirements.md).
```

### A.1 Product in one paragraph

ACET SkillUp turns each semester's syllabus into an **interactive concept map**. Topics are nodes. Links between them are typed **prerequisite** (solid) or **related** (dashed), and each link carries a one-line reason. Clicking a topic opens **one learning page** that follows six steps: **Curiosity → Understand → Prepare → Remember → Practice → Apply**. The page has a curiosity question, a video, an easy explanation, a 10-mark exam answer, flashcards, a quiz with explanations, a workshop or real-world task, and previous-year questions (PYQs). **Spaced revision** brings topics back before students forget them. **A local LLM drafts content, and faculty approve it.** Nothing unapproved ever reaches students.

### A.2 Users and roles

| Role | Can do |
|---|---|
| `student` | Explore the map, learn topics, take quizzes, revise flashcards, submit workshops, see **only their own** progress |
| `faculty` | Build and edit maps, upload material, trigger AI drafts, approve/edit/reject content, review workshops, see **only their own classes** |
| `mentor` | View assigned students, add notes and follow-ups |
| `admin` (HOD) | Manage users, departments, syllabus versions; view department reports and CO–PO attainment |

### A.3 Tech stack (fixed — do not substitute without asking)

| Layer | Choice |
|---|---|
| Language | **Plain JavaScript (ES modules) everywhere — the user chose this on 2026-10-14. Do not add TypeScript.** Use JSDoc comments where a type helps the reader; zod schemas are the runtime contract |
| Monorepo | npm workspaces: `apps/web`, `apps/api`, `apps/worker`, `packages/shared` |
| Frontend | React 18 + Vite, React Router, TanStack Query, Zustand (UI state only), Tailwind CSS with design tokens, `@xyflow/react` (React Flow) for the concept map, react-hook-form + zod, lucide-react icons |
| Backend | Node.js 20 LTS, Express, Mongoose, zod validation, pino logging, helmet, cors, express-rate-limit, multer (uploads) |
| Database | MongoDB 7+ (local via Docker) |
| Auth | Email + password (bcrypt) with JWT access token (15 min) + refresh token in httpOnly cookie; Google/Microsoft college-email OAuth as an optional later adapter |
| Jobs | Agenda (MongoDB-backed job queue — no Redis needed), run in `apps/worker` |
| Local LLM | **Ollama** by default, behind a provider-agnostic gateway that also supports any **OpenAI-compatible** local server (LM Studio, llama.cpp server, vLLM) |
| Default models | Chat/generation: `qwen2.5:7b-instruct` (fallback `llama3.1:8b`). Embeddings: `nomic-embed-text`. All model names come from env config — never hard-coded |
| Vector search | Embeddings stored in MongoDB `chunks` collection; cosine similarity computed in the API behind a `VectorStore` interface (swap to Atlas Vector Search / Qdrant later without touching callers) |
| PDF parsing | `pdf-parse` (text PDFs); OCR is out of scope for v1 — report "scanned PDF not supported" clearly |
| Streaming | Server-Sent Events (SSE) for AI job progress and tutor answers |
| Testing | Vitest (web + shared), Vitest/Jest + Supertest + mongodb-memory-server (api), Playwright (e2e) |
| Infra | Docker Compose: `mongo`, `ollama`, `api`, `worker`, `web`; `.env.example` for every app |

### A.4 Repository structure (create exactly this shape)

```
acet-skillup/
├─ apps/
│  ├─ web/              # React + Vite
│  │  └─ src/{app,routes,features,components,design,lib,hooks,api}
│  ├─ api/              # Express REST API
│  │  └─ src/{config,modules,middleware,db,ai,lib,routes}
│  │     modules/<name>/{model.js,service.js,controller.js,routes.js,*.test.js}
│  └─ worker/           # Agenda jobs (imports api services, no HTTP)
├─ packages/
│  └─ shared/           # zod schemas, TS types, enums, constants shared by web/api/worker
├─ prompts/             # versioned LLM prompt templates (*.md + *.schema.json)
├─ docs/                # requirements.md, api.md, ai.md, decisions/
├─ docker-compose.yml
└─ .env.example
```

### A.5 Data model (MongoDB collections)

| Collection | Key fields |
|---|---|
| `users` | name, email (unique), passwordHash, role, departmentId, batch, syllabusVersionId, mentorId, isActive |
| `departments` | name, code |
| `syllabusVersions` | university, regulation, branch, academicYear, isActive |
| `subjects` | syllabusVersionId, semester, code, name, facultyIds[] |
| `units` | subjectId, number, title |
| `topics` | unitId, subjectId, parentTopicId (subtopics), title, summary, order, position {x,y}, status (`draft`/`approved`) |
| `topicLinks` | fromTopicId, toTopicId, type (`prerequisite`/`related`), reason, status, source (`ai`/`faculty`) |
| `resources` | topicId, kind (`video`/`easy`/`tenMark`/`realWorld`/`workshop`/`curiosity`), body (markdown) or url, status, source, createdBy, approvedBy, aiMeta {model, promptVersion, jobId, sourceChunkIds[]} |
| `flashcards` | topicId, front, back, status, source, aiMeta |
| `questions` | topicId, type (`mcq`/`curiosity`), stem, options[], correctIndex, explanation, optionExplanations[], difficulty, status, source, aiMeta |
| `pyqs` | subjectId, topicIds[], examDate, marks, text, status |
| `materials` | topicId or subjectId, kind (`syllabusPdf`/`notes`/`slides`/`pyqPaper`), fileUrl, extractedText, uploadedBy |
| `chunks` | materialId, topicId, subjectId, text, embedding [number], model, tokenCount |
| `attempts` | userId, questionId, topicId, selectedIndex, correct, answeredAt |
| `reviews` | userId, itemType (`flashcard`/`question`), itemId, topicId, due, stability, difficulty, reps, lapses, lastRating (FSRS fields) |
| `mastery` | userId, topicId, state (`notStarted`/`learning`/`practicing`/`confident`/`needsRevision`), score, updatedAt |
| `workshops` / `submissions` | topicId, brief, dueAt / workshopId, userId, fileUrl, text, score, feedback |
| `courseOutcomes` / `topicCOs` | subjectId, code, text / topicId, coId |
| `mentorNotes` | mentorId, studentId, note, followUpAt, done |
| `aiJobs` | type, status (`queued`/`running`/`succeeded`/`failed`/`cancelled`), input, progress 0–100, logs[], output refs, model, promptVersion, createdBy, error |
| `auditLogs` | actorId, action, target, at |

Rules: every collection has `createdAt` and `updatedAt`. Add indexes for every foreign key and for `(userId, due)` on `reviews`. Content status is always one of `draft → inReview → approved → published`. **Student-facing queries filter `status: "published"` at the service layer, never in the UI.**

### A.6 API conventions

- Base path `/api/v1`. Resource-oriented REST. JSON only (except uploads and SSE).
- Validate every request body, query and params with zod schemas from `packages/shared`.
- Success: `{ data, meta? }`. Error: `{ error: { code, message, details? } }` with the correct HTTP status.
- Pagination: `?page=&limit=` (max 100) → `meta: { page, limit, total }`.
- Authorization in middleware: `requireAuth`, `requireRole(...roles)`, plus ownership checks in services (faculty only for their subjects, mentor only for their students, student only for self).
- Long work (anything calling the LLM) → creates an `aiJobs` document, returns `202 { data: { jobId } }`, progress at `GET /api/v1/ai/jobs/:id/events` (SSE).
- Document every endpoint in `docs/api.md` as you build it.

### A.7 AI orchestration rules (non-negotiable)

1. **One gateway.** All model calls go through `apps/api/src/ai/gateway`. No other code imports an LLM client.
2. **Provider adapters.** `OllamaProvider` (native `/api/chat`, `/api/embed`) and `OpenAICompatibleProvider` (`/v1/chat/completions`, `/v1/embeddings`). Pick the provider and models from env: `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_CHAT_MODEL`, `LLM_EMBED_MODEL`, `LLM_TIMEOUT_MS`, `LLM_MAX_CONCURRENCY`.
3. **Structured output.** Every generation task has a zod schema plus a JSON schema in `prompts/`. Request JSON output (Ollama `format` with the JSON schema; `response_format` for OpenAI-compatible servers). Validate with zod. On failure, make **one repair retry** that sends the validation errors back to the model, then mark the job failed with a clear error. Never save unvalidated output.
4. **Grounding.** Content drafts are generated **only** from the faculty's uploaded material for that topic (retrieved chunks), plus the syllabus line. Every draft stores `aiMeta.sourceChunkIds`. If retrieval finds too little material, the job ends with `needsMaterial` and does **not** invent content.
5. **Human in the loop.** Everything AI-created is saved with `status: "draft"`, `source: "ai"`. Only faculty can move it to `approved` or `published`.
6. **Versioned prompts.** Prompts live in `prompts/<task>.v<n>.md` with a header (task, version, inputs, output schema). Store `promptVersion` on every output.
7. **Small-model friendly.** Local 7–8B models are weaker. Keep prompts short and explicit, give one task per call, generate items in small batches (e.g. 5 flashcards per call), use low temperature (0.2–0.4) for structured tasks, and stay within the model's context window (chunk inputs, map-reduce long syllabi).
8. **Resilience.** Timeouts, a concurrency limit (`p-limit`), exponential backoff on connection errors, a health check (`GET /api/v1/ai/health` reports provider reachability and pulled models), and graceful degradation: if the LLM is down, the rest of the app works and AI buttons show "AI service offline".
9. **Privacy.** Student personal data is never sent to the LLM. The tutor receives only topic content and the question.
10. **Observability.** Log model, prompt version, latency, token counts (when available) and validation result for every call. Never log full student data.

### A.8 Design system (from the ACET website)

| Token | Value | Use |
|---|---|---|
| `navy` | `#0F2D5C` | Headings, icons, nav, dark panels, locked-state text |
| `red` | `#E0262B` | Primary CTA (pill), eyebrow labels, active nav underline |
| `blue` | `#2F6BEA` | Current topic, links, info |
| `gold` | `#F5C000` (border `#C9A100`, tint `#FFF7D6`) | Mastered topics, achievements |
| `text` | `#5B6577` | Body copy |
| `border` | `#ECEFF3` | Card borders |
| `surface` | `#F8F9FB` | Page background |
| `card` | `#FFFFFF` | Cards |

- **Fonts:** Montserrat 700/800 for headings, Inter 400/500/600 for body (line-height 1.7). Eyebrow label: 12px, bold, uppercase, red, letter-spacing 0.3em, placed above a navy heading.
- **Shape:** 20px card radius, pill buttons, 1px borders instead of heavy shadows, solid navy icons.
- **Map node states:** gold = mastered, blue = current, white with blue border = unlocked, grey = locked, gold with an orange dot = needs revision. Prerequisite edge = solid; related edge = dashed; cross-unit related edge = red dashed.
- **Avoid:** justified text, more than one red, a CTA-less screen, emoji as icons, gradient washes.
- **Mobile first:** every student screen works at 360px; touch targets ≥ 44px; WCAG AA contrast.

### A.9 Coding standards

- Plain JavaScript (ESM, `.js` / `.jsx`), no TypeScript and no build step for the API or worker. Validate every boundary with zod; ESLint (`npm run lint`) is the static check.
- Feature-based folders; controllers stay thin, logic lives in services, and services are unit-tested.
- Shared zod schemas generate both the API validation and the frontend form validation.
- Env config is loaded and validated once at startup (zod); the app fails fast on a missing variable.
- ESLint + Prettier; conventional commits (`feat(api): …`).
- No secrets in code; `.env.example` lists every variable with a comment.
- Seed script: `npm run seed` creates 1 admin, 2 faculty, 1 mentor, 10 students, the CSE Sem 5 syllabus version, and the DBMS subject with Unit 3 "Database Design" topics (Relational Model, Keys, Functional Dependency, Data Anomalies, Normalization, 1NF/2NF/3NF, BCNF) and Indexing in Unit 4, with links.

### A.10 Definition of done (every phase)

- [ ] All acceptance criteria of the phase pass
- [ ] Tests written and passing (`npm test` at the root)
- [ ] Lint and type-check clean
- [ ] `docker compose up` still starts everything
- [ ] `docs/api.md` / `docs/ai.md` updated for anything new
- [ ] No TODOs left without a matching item in the Phase Report

### A.11 How you work

- Before coding, list the files you will create or change and any assumptions, in a short plan. Then build without waiting, unless something is truly ambiguous **and** expensive to redo — in that case ask one precise question.
- Build in small vertical slices and run the tests after each one.
- If a requirement can't be met (for example, a model can't produce valid JSON reliably), don't fake it. Implement the closest honest version and flag it in the report.
- Never weaken a security or privacy rule to make something work.

### A.12 Phase Report template (end every phase with this)

```
## Phase <id> Report
- Built: <bullets>
- Files: <key files>
- How to run / test: <commands>
- Acceptance criteria: <each criterion → pass/fail>
- Deviations & reasons:
- Known issues / TODO:
- Suggested next phase:
```

---
