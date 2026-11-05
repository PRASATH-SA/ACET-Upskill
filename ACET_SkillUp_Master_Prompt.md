# ACET SkillUp — Master Build Prompt

**For:** Claude Opus 5.5 (Claude Code or any agentic coding session)
**Stack:** React (Vite) · Node.js + Express · MongoDB · Local LLM (Ollama / any OpenAI-compatible local server)
**Structure:** 1 master context + 18 phase prompts in 4 tracks (Foundation, Backend, AI orchestration, Frontend) + final hardening

---

## How to use this file

1. **Start every new session by pasting Part A (Master Context)** in full. It holds the product, stack, rules and contracts that every phase depends on.
2. **Then paste one phase prompt from Part B** — one phase per session (or per long turn). Don't paste all phases at once; the model does better work on a focused scope.
3. **Follow the execution order** in Part C. Backend and AI phases come before the frontend screens that use them.
4. At the end of each phase the model must stop and give you a **Phase Report** (template in A.12). Check the acceptance criteria yourself, then commit and move on.
5. Keep `requirements.md` (from earlier in this conversation) in the repo root at `docs/requirements.md`. Every phase prompt tells the model to read it.

---

# PART A — MASTER CONTEXT (paste at the start of every session)

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
| Language | TypeScript everywhere (strict mode). Plain JavaScript only if the user says so |
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
│  │     modules/<name>/{model.ts,schema.ts,service.ts,controller.ts,routes.ts,*.test.ts}
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

- TypeScript strict; no `any` except at clearly marked boundaries.
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

# PART B — PHASE PROMPTS

Paste **one** of these after Part A.

---

## TRACK 0 — FOUNDATION

### Phase 0 — Monorepo, infrastructure and seed

```text
PHASE 0: Foundation.

Goal: a running skeleton where web, api, worker, mongo and ollama start with one command.

Tasks:
1. Create the monorepo exactly as in A.4 with npm workspaces, TypeScript project references,
   ESLint, Prettier and a root `npm test`, `npm run lint`, `npm run typecheck`, `npm run dev`.
2. packages/shared: set up zod, export enums (Role, ContentStatus, LinkType, MasteryState,
   ResourceKind, JobStatus) and an empty schemas index.
3. apps/api: Express app with helmet, cors (web origin from env), json limit, pino-http,
   rate limiting, a central error handler producing the A.6 error shape, a 404 handler,
   env validation with zod, a Mongo connection with retry, and GET /api/v1/health returning
   { status, mongo, version }.
4. apps/worker: connects to Mongo, starts Agenda, registers a sample "noop" job, graceful shutdown.
5. apps/web: Vite + React + TS + Tailwind, with the A.8 tokens in tailwind.config and Montserrat +
   Inter loaded; a placeholder page that calls /api/v1/health and shows the status.
6. docker-compose.yml: mongo (with a volume), ollama (with a volume, port 11434, optional
   GPU section commented), api, worker, web. Add a one-shot "ollama-pull" service or a script
   `npm run ai:pull` that pulls LLM_CHAT_MODEL and LLM_EMBED_MODEL.
7. .env.example for each app; README with setup steps for Windows/Linux/macOS, including
   hardware notes: a 7–8B model needs roughly 8 GB RAM/VRAM; CPU-only works but is slow.
8. CI: GitHub Actions workflow running lint, typecheck and tests on every push and pull request.

Acceptance criteria:
- `docker compose up` → web on :5173 shows "API: ok, Mongo: ok".
- `npm run ai:pull` downloads both models; `curl localhost:11434/api/tags` lists them.
- `npm test`, `npm run lint`, `npm run typecheck` all pass on a clean clone.
```

---

## TRACK B — BACKEND (Express + MongoDB)

### Phase B1 — Auth, users and access control

```text
PHASE B1: Authentication, users and role-based access.

Tasks:
1. Models: users, departments, syllabusVersions (basic), auditLogs.
2. Auth: POST /auth/register (admin-only creation, plus bulk CSV import of students),
   POST /auth/login, POST /auth/refresh, POST /auth/logout, GET /auth/me.
   Access JWT 15 min in memory on the client; refresh token rotated in an httpOnly, secure,
   sameSite=strict cookie; refresh tokens stored hashed so they can be revoked.
3. Middleware: requireAuth, requireRole, plus ownership helpers
   (canAccessSubject, canAccessStudent).
4. Users CRUD for admin; student self-profile; password change; account deactivate.
5. Audit log on login, role change and every access to another user's data.
6. Seed script (A.9).
7. Leave an OAuth adapter interface stub (college Google/Microsoft) for later; no implementation.

Acceptance criteria:
- A student calling an admin route gets 403; an expired access token gets 401, then refresh works.
- A faculty member cannot read a student who is not in their subject's batch.
- Login is rate-limited (e.g. 5 per minute per IP+email).
- Tests cover login, refresh rotation, role guard and ownership guard.
```

### Phase B2 — Syllabus hierarchy and concept graph

```text
PHASE B2: Syllabus, subjects, units, topics and the concept graph.

Tasks:
1. Models: syllabusVersions, subjects, units, topics (with subtopics via parentTopicId), topicLinks.
2. CRUD endpoints for faculty/admin, scoped by ownership. Topic reorder and position
   (x, y) save in bulk: PATCH /subjects/:id/map with nodes and edges in one transaction.
3. GET /subjects/:id/map → { units, topics, links } ready for React Flow, with ONLY approved
   topics and links for students, and everything for faculty.
4. Graph rules in a service: no self-links, no duplicate links, NO CYCLES in prerequisite links
   (reject with a clear error naming the cycle); related links may form cycles.
5. Graph queries: prerequisitesOf(topic), unlocks(topic), learningOrder(subject)
   (topological sort), crossUnitLinks(subject).
6. Syllabus versioning: a student only sees subjects of their syllabusVersionId.
7. Map approval: PATCH /subjects/:id/map/approve moves all draft topics and links to approved.

Acceptance criteria:
- Creating a prerequisite cycle A→B→C→A returns 422 and names the cycle.
- learningOrder returns a valid topological order for the seeded DBMS subject.
- A student never receives draft topics or links (test it).
```

### Phase B3 — Content, materials and the review workflow

```text
PHASE B3: Topic content, file uploads and the approval workflow.

Tasks:
1. Models: resources, flashcards, questions, materials, workshops.
2. Uploads (multer): PDF, PPTX, images, up to 25 MB, stored on local disk under
   UPLOAD_DIR behind a StorageService interface (S3 adapter later). Extract text from PDFs on
   upload (pdf-parse) and save it to materials.extractedText; flag scanned PDFs with no text.
3. Content CRUD per topic for each resource kind; markdown bodies; video as a URL
   (YouTube/unlisted) or an uploaded file.
4. Status machine in one service: draft → inReview → approved → published (plus back to draft).
   Only faculty owning the subject can approve or publish. Every change sets approvedBy/at
   and writes an audit log.
5. Review queue: GET /review-queue?subjectId=&kind=&source=ai → paginated list of drafts.
   Bulk approve / reject.
6. Student topic page: GET /topics/:id/page → curiosity, video, easy, tenMark, realWorld,
   workshop, flashcard count, question count, pyqs, prerequisites, unlocks — published only.
   Missing kinds are omitted, not null-filled.

Acceptance criteria:
- A draft resource never appears in /topics/:id/page (test).
- Uploading a text PDF stores extracted text; a scanned PDF returns a clear warning.
- Bulk approval of 20 AI flashcards works and is audited.
```

### Phase B4 — Quizzes, flashcards, spaced revision and mastery

```text
PHASE B4: Practice engine.

Tasks:
1. Quiz: GET /topics/:id/quiz (randomized published questions, without answers),
   POST /quiz/submit → per-question correctness plus explanation and option explanations.
   Store attempts.
2. Spaced revision: implement FSRS (use the `ts-fsrs` package) behind a SchedulerService
   interface. Ratings: again / hard / good / easy. Flashcards and missed questions enter
   the review schedule automatically after a topic quiz.
3. GET /revision/today → due items grouped by topic, with counts; POST /revision/:itemId/rate.
4. Mastery service (pure functions, fully unit-tested):
   - notStarted → learning when the topic page is opened
   - learning → practicing after the first quiz attempt
   - practicing → confident when the latest quiz is ≥ 80% AND at least one revision was passed
   - confident → needsRevision when a due review is overdue by more than 3 days or is failed
   Thresholds live in config.
5. Map state for a student: GET /subjects/:id/map/me → node state per topic (mastered,
   current, unlocked, locked, needsRevision). A topic is "unlocked" when all its
   prerequisites are practicing or above; "current" is the next unlocked topic in
   learningOrder that isn't confident yet.

Acceptance criteria:
- A unit test suite covers every mastery transition and the unlock rules.
- An "again" rating makes the card due sooner than "easy".
- Quiz answers are never sent to the client before submission.
```

### Phase B5 — Exam prep, workshops, insights and CO–PO reports

```text
PHASE B5: PYQs, workshops, faculty insights, mentor notes, CO–PO attainment.

Tasks:
1. PYQs: upload a question paper (materials kind pyqPaper), save PYQs, tag them to topics
   (manual tagging now; AI tagging comes in A3), and frequency per topic over the last N years.
   GET /subjects/:id/exam-prep with a filter by unit, marks and frequency.
2. Workshops: faculty create a brief and due date per topic; students submit a file or text;
   faculty score and give feedback.
3. Faculty insights: GET /subjects/:id/insights → per-topic average quiz score, % of students
   not started, students in needsRevision, weakest 5 topics. Aggregation pipelines with indexes.
4. Mentor: list assigned students with a risk signal (many needsRevision topics or no activity
   for 7 days), notes and follow-ups.
5. CO–PO: map topics to course outcomes; attainment per CO = % of students scoring above a
   threshold on that CO's topics' quizzes (threshold configurable). Export to CSV and PDF
   (pdfkit).
6. Admin usage overview: weekly active students, topics published, AI drafts approved vs rejected.

Acceptance criteria:
- The insights endpoint responds in under 500 ms for 500 students × 30 topics of seeded data.
- The CO report numbers match a hand calculation in a test.
- A mentor sees only assigned students.
```

---

## TRACK A — AI ORCHESTRATION (local LLM)

### Phase A1 — LLM gateway and provider adapters

```text
PHASE A1: The AI gateway. Read rules A.7 carefully — they are non-negotiable.

Tasks:
1. apps/api/src/ai/gateway:
   - LLMProvider interface: chat({messages, schema?, temperature, maxTokens, stream?}),
     embed(texts[]), health(), listModels().
   - OllamaProvider (native API: /api/chat with `format` = JSON schema for structured output,
     /api/embed, /api/tags) and OpenAICompatibleProvider (/v1/chat/completions with
     response_format json_schema, /v1/embeddings, /v1/models).
   - Factory picks the provider from env.
2. generateStructured<T>(task, input, zodSchema): loads the prompt template, renders it, calls
   chat with the JSON schema, parses, validates with zod, makes one repair retry with the
   errors, and returns { data, meta: { model, promptVersion, latencyMs, attempts } } or throws
   AIValidationError.
3. A prompt registry reading prompts/*.md with front-matter (task, version, inputSchema,
   outputSchema). Simple {{variable}} rendering only. No string concatenation of prompts
   in code.
4. Concurrency limiter, timeouts, retries with backoff on network errors only, and a circuit
   breaker that marks the AI as offline after repeated failures and probes every 30 s.
5. GET /api/v1/ai/health → { provider, reachable, chatModel, embedModel, modelsPulled: bool }.
6. aiJobs model + JobService (create, update progress, append log, finish, fail, cancel) and
   GET /ai/jobs/:id plus SSE GET /ai/jobs/:id/events.
7. Write docs/ai.md: architecture, env vars, how to switch to LM Studio or llama.cpp, and how
   to add a prompt.
8. Tests: mock providers (no real LLM in CI), and contract tests for both adapters against
   recorded fixtures.

Acceptance criteria:
- Switching LLM_PROVIDER from ollama to openai-compatible (pointed at LM Studio) needs zero
  code changes.
- Invalid JSON from the model triggers exactly one repair attempt, then a typed error.
- With Ollama stopped, /ai/health reports unreachable and the rest of the API still works.
```

### Phase A2 — Ingestion, chunking, embeddings and retrieval (RAG)

```text
PHASE A2: Material ingestion and retrieval.

Tasks:
1. Ingestion job (Agenda, in the worker): on material upload → clean text → chunk
   (~500–800 tokens, 80-token overlap, split on headings/paragraphs first) → embed in
   batches → save to `chunks` with topicId/subjectId/materialId and the embedding model name.
2. Re-embedding: if LLM_EMBED_MODEL changes, a job re-embeds all chunks (chunks store the model).
3. VectorStore interface with a MongoCosineVectorStore implementation: pre-filter by
   subjectId/topicId in Mongo, cosine similarity in Node, top-k. Keep it simple and correct;
   document that Atlas Vector Search or Qdrant can replace it.
4. retrieve({ query, topicId?, subjectId?, k, minScore }) → chunks with scores. Topic-scoped
   retrieval first; fall back to subject scope only when the caller allows it.
5. Material coverage check: hasEnoughMaterial(topicId) → boolean plus a reason (used by A3 to
   return needsMaterial).
6. Tests with a fake embedder (deterministic vectors).

Acceptance criteria:
- Uploading faculty notes for "Normalization" produces chunks with embeddings within one job.
- retrieve("why do we split tables", topicId=Normalization) returns Normalization chunks first.
- Changing the embedding model triggers re-embedding, and mixed-model search is prevented.
```

### Phase A3 — Generation pipelines (map drafting, content drafting, PYQ tagging)

```text
PHASE A3: AI pipelines. All run as Agenda jobs, report progress over SSE, and save as draft/ai.

Write a versioned prompt plus zod schema for each task in prompts/. Keep prompts short and
explicit for 7–8B local models. Use batching and map-reduce.

Pipelines:
1. syllabus.toMap
   Input: a syllabus PDF's extracted text for one subject.
   Steps: (a) split by unit → (b) per unit, extract topics and subtopics with a one-line
   summary → (c) per unit, propose prerequisite links between its topics with reasons →
   (d) one pass across units to propose cross-unit related links → (e) dedupe by normalized
   title → (f) run the B2 cycle check and drop the weakest link in any cycle →
   (g) auto-layout positions (dagre, left-to-right) → save topics and links as draft.
2. topic.draftContent
   Input: topicId plus selected kinds.
   Steps: hasEnoughMaterial? else finish with needsMaterial → retrieve the top chunks →
   generate, each as a separate small call:
   - easy explanation (≤ 180 words, simple English, 1 analogy)
   - tenMark answer (definition, need, explanation with points, example/diagram description,
     advantages, conclusion; about 450–600 words)
   - flashcards (5 per call, up to 15)
   - quiz MCQs (5 per call: 4 options, correctIndex, explanation, one explanation per option)
   - curiosity question (a real-world scenario with 3 options)
   - realWorld uses (3–5 bullets) and a workshop brief
   Save each with aiMeta.sourceChunkIds.
3. Self-check pass (cheap): for every MCQ, a second call answers it from the chunks only;
   if its answer ≠ correctIndex, flag the item "needsAttention" in the review queue rather
   than discarding it.
4. pyq.tag
   Input: PYQ text plus the subject's topic list. Output: topicIds[] with a confidence score.
   Use embeddings for top-5 candidate topics first, then the LLM picks from those
   candidates only (no free-text topic names).
5. Endpoints: POST /ai/subjects/:id/draft-map, POST /ai/topics/:id/draft-content {kinds},
   POST /ai/pyqs/tag {subjectId}; each returns 202 { jobId }. Cancel: POST /ai/jobs/:id/cancel.
6. Idempotency: re-running a draft for a topic replaces only previous *unapproved* AI drafts
   of the same kind, never approved or faculty-written content.

Acceptance criteria:
- With the seeded DBMS syllabus text, draft-map creates units, topics and links with no
  prerequisite cycles and a readable layout.
- draft-content for a topic with no material ends with status succeeded + result needsMaterial,
  and creates nothing.
- Every saved AI item has status draft, source ai, promptVersion and sourceChunkIds.
- A golden-file test (mock LLM) checks each pipeline's orchestration and saving logic.
```

### Phase A4 — "Ask why" tutor (grounded, streaming)

```text
PHASE A4: The topic tutor.

Tasks:
1. POST /ai/tutor/ask { topicId, question, history[] (max 6 turns) } → SSE stream of tokens,
   then a final event with citations (resource/chunk ids and titles).
2. Grounding: retrieve from the topic's PUBLISHED resources and approved material chunks,
   plus the prerequisite topics' published easy explanations. The system prompt says: answer
   only from the context; if the answer isn't there, say so and point to the related topic;
   simple English; give one analogy; end with one short check-your-understanding question.
3. Guardrails: an off-topic or unsafe question gets a short refusal; no student personal data
   in prompts; maximum question length; a per-student rate limit (e.g. 20 per hour).
4. Log question, topicId, latency and the grounded/not-grounded flag (no student name) for the
   faculty "common doubts" view.
5. Faculty view: GET /subjects/:id/tutor/common-questions (clustered by embedding similarity).

Acceptance criteria:
- Asking about a topic's content streams an answer with at least one citation.
- Asking something unrelated (e.g. a cricket score) returns the refusal, not an invented answer.
- The tutor never cites unpublished content (test).
```

### Phase A5 — AI quality evaluation and admin controls

```text
PHASE A5: Evaluation and control.

Tasks:
1. evals/ folder: a small golden dataset (≥ 10 DBMS topics with faculty-style notes) and a
   script `npm run ai:eval` that runs each pipeline against the configured local model and
   reports: JSON validity rate, repair rate, MCQ self-check agreement, average latency,
   and the share of drafts that cite sources.
2. A comparison mode: run the eval on two models (e.g. qwen2.5:7b vs llama3.1:8b) and output a
   markdown table into docs/ai-eval.md.
3. Admin AI settings page API: view health, models, queue size, recent failures; change the
   chat/embed model at runtime from the pulled models list (persisted in a settings collection,
   env as default).
4. Faculty feedback signals: approve / edit / reject counts per prompt version, shown in the
   admin usage overview.

Acceptance criteria:
- `npm run ai:eval` runs end to end on a laptop with Ollama and writes docs/ai-eval.md.
- Changing the model in settings takes effect for new jobs without a restart.
```

---

## TRACK F — FRONTEND (React)

### Phase F1 — Design system and app shell

```text
PHASE F1: Design system and layout.

Tasks:
1. Tailwind theme from A.8 tokens; global type scale (Montserrat headings, Inter body).
2. Components in apps/web/src/components/ui with variants and accessibility built in:
   Button (primary red pill, secondary navy outline, ghost), IconButton (aria-label required),
   Card, EyebrowHeading (red eyebrow + navy heading), Badge/Chip, Tabs, Input, Select,
   Textarea, Dialog, Drawer, Toast, ProgressBar, Skeleton, EmptyState, Avatar, Tooltip,
   StepTracker (6 steps), StatTile.
3. App shell: top bar (logo "SkillUp", role-based nav, search, profile menu) with a 2px red
   rule under it; collapsible left sidebar on desktop; bottom tab bar on mobile (< 768px).
4. A /design route (dev only) showing every component in every state.
5. API client: fetch wrapper with an access token in memory, automatic refresh on 401,
   and typed calls using packages/shared schemas; TanStack Query setup with sensible
   staleTime; global error toast.

Acceptance criteria:
- /design renders all components; keyboard navigation and focus rings work everywhere.
- Lighthouse accessibility ≥ 95 on /design.
- The layout works at 360px, 768px and 1440px.
```

### Phase F2 — Auth and role-based routing

```text
PHASE F2: Login and role routing.

Tasks:
1. Login page in ACET style: split layout, a navy brand panel with the tagline
   "Learn the flow, not the list", form on white.
2. Auth context: silent refresh on load, logout, and redirect by role:
   student → /learn, faculty → /studio, mentor → /mentor, admin → /admin.
3. Route guards per role; a 403 page; a session-expired toast.
4. Profile page (name, batch, syllabus version, change password).

Acceptance criteria:
- Refreshing the browser keeps the user logged in (refresh cookie).
- A student typing /studio sees the 403 page.
- Playwright e2e: login → role home for each role.
```

### Phase F3 — Student concept map

```text
PHASE F3: The concept map (the product's signature screen). Match the "Syllabus Map UI" mockup.

Layout (desktop): left = semester → subjects → units tree with subject progress; centre =
React Flow map; right = selected-topic panel. Mobile: the map is full-screen; the tree becomes
a drawer; the panel becomes a bottom sheet.

Tasks:
1. Data from GET /subjects/:id/map/me. Custom node component per state (A.8 colours):
   mastered (gold), current (blue filled + soft ring + "YOU ARE HERE"), unlocked, locked (grey,
   lock icon), needsRevision (orange dot). Custom edges: prerequisite solid with an arrow,
   related dashed, cross-unit red dashed.
2. Interactions: pan/zoom, fit view, a "focus current topic" button, a unit filter, search that
   centres and highlights a node, clicking an edge shows its "why connected" reason in a
   tooltip, a legend card, and a minimap on desktop.
3. Selected-topic panel: eyebrow "SELECTED TOPIC", title, summary, Builds on / Unlocks lists
   (clickable), an exam insight card (navy: "asked N× in 5 years"), and a red "Start topic"
   CTA (shows "Review topic" if confident). Locked topics show "Finish X first" with links.
4. List view toggle: an accessible ordered list by learningOrder with state badges (the
   screen-reader-friendly alternative to the map).
5. Home /learn: continue learning (current topic), today's revision count, subject cards with
   progress.

Acceptance criteria:
- 60 nodes render and pan smoothly on a mid-range phone (no layout jank).
- Every node is reachable by keyboard; list view announces states.
- Visual states match the mockup colours exactly.
```

### Phase F4 — Topic learning page

```text
PHASE F4: The topic page. Match the "Topic page" mockup.

Tasks:
1. Header: breadcrumb (Subject / Unit / Topic), title, mastery badge, Back to map.
2. StepTracker: Curiosity → Understand → Prepare → Remember → Practice → Apply; the current
   step is highlighted; steps scroll to their section; done steps are gold.
3. Sections (each a card, hidden if the content is missing):
   - Curiosity challenge (navy panel, 3 options, reveal with explanation)
   - Understand: video player (lazy-loaded: in low-data mode, a thumbnail until tapped) +
     "In simple words" box
   - Prepare: 10-mark answer rendered from markdown with a print-friendly view
   - Remember: an inline flashcard deck (flip, again/hard/good/easy)
   - Practice: CTA to the quiz (F5)
   - Apply: real-world uses + workshop brief and submission
   - Side column: connections, previous-year questions with date and marks
4. "Ask why" tutor drawer (A4): streaming answer, citations as chips linking to sections,
   "AI answer from your faculty's material" label, and an offline state.
5. Opening the page marks the topic as learning (B4).

Acceptance criteria:
- Only published content shows; empty kinds are hidden with no empty cards.
- The page is fully usable at 360px; the video doesn't load until tapped in low-data mode.
- Tutor tokens stream visibly; citations scroll to the right section.
```

### Phase F5 — Quiz, revision and exam prep

```text
PHASE F5: Practice screens.

Tasks:
1. Quiz player: one question per screen, progress bar, select → submit → per-question result
   with the explanation and why the chosen option was wrong; a summary screen with score,
   mastery change and "Revise these" items. Keyboard shortcuts 1–4.
2. Revision /revision: today's due items grouped by topic; a focused card session with
   again/hard/good/easy; an end-of-session summary; an empty state "All caught up".
3. Exam prep /exam-prep/:subjectId: PYQs by unit, filters (marks, frequency), "most asked"
   ranking, links to the topic's 10-mark answer.
4. Progress /me/progress: mastery per subject (counts per state), revision streak shown
   lightly (not as the main goal), and weakest topics.

Acceptance criteria:
- Answers are never visible in the network payload before submit (verify).
- A full revision session works offline after the items have loaded (cache in memory) and
  syncs ratings when back online.
```

### Phase F6 — Faculty studio

```text
PHASE F6: Faculty tools. This is where AI orchestration meets the UI.

Tasks:
1. /studio home: my subjects, review-queue count, AI health indicator, recent AI jobs.
2. Subject builder: upload the syllabus PDF → "Draft map with AI" → a live job progress panel
   (SSE: step names, %, logs) → an editable React Flow map: add/rename/delete topics, drag to
   link, toggle the link type, edit the link reason, auto-layout, undo/redo (last 20 actions),
   AI-drafted items outlined with a dashed "AI draft" tag. "Approve map" when ready.
3. Topic content editor: tabs per kind; a markdown editor with preview; upload notes/slides
   (shows ingestion status); "Draft with AI" with kind checkboxes; a needsMaterial message
   with an upload prompt.
4. Review queue: a table filterable by subject/kind/source/needsAttention; side-by-side view
   of the draft and its source chunks (highlighted); approve / edit-then-approve / reject with
   a reason; bulk actions; keyboard shortcuts (a = approve, r = reject, j/k = next/prev).
5. Question bank and workshop review screens.
6. Class insights: weakest topics bar list, students not started, needsRevision list,
   tutor common questions.

Acceptance criteria:
- A faculty member can go from syllabus PDF to an approved map without touching the API
  manually.
- Job progress updates live and survives a page refresh (resume SSE by jobId).
- Approving an item makes it appear on the student topic page with no other step.
- NFR: a new faculty member can publish one topic in under 15 minutes (do a timed walkthrough
  and report it).
```

### Phase F7 — Mentor, admin and PWA

```text
PHASE F7: Remaining roles and mobile polish.

Tasks:
1. Mentor: my students with risk signals, a student detail page (mastery per subject,
   activity), notes and follow-ups with due dates.
2. Admin: users (table, CSV import, role change), departments, syllabus versions, subject
   faculty assignment, CO mapping editor, CO–PO report with export buttons, usage overview,
   AI settings (A5: health, model picker, queue, failures).
3. PWA: manifest, icons, service worker (cache the app shell and static assets; network-first
   for the API), installable prompt, and a low-data mode toggle in the profile.
4. Empty, loading and error states reviewed on every screen.

Acceptance criteria:
- The app installs on Android Chrome and opens to /learn offline with a clear offline banner.
- An admin can onboard a new batch via CSV and assign it a syllabus version end to end.
```

---

## TRACK H — HARDENING

### Phase H1 — Integration, testing, security and deployment

```text
PHASE H1: Production readiness.

Tasks:
1. Playwright e2e for the core journeys:
   (a) faculty: syllabus PDF → AI map → approve → notes → AI content → approve;
   (b) student: login → map → topic → quiz → revision → mastery changes on the map;
   (c) tutor question with a citation;
   (d) admin CO report export.
   Use a mock LLM provider in CI and the real Ollama in a manual "local-ai" test run.
2. Load test (k6): 500 virtual students doing quiz submits and revision ratings; insights
   under load. Fix slow queries with indexes; report p95 latencies.
3. Security pass: helmet config, CORS, rate limits, input validation coverage, file-type
   sniffing on uploads, path traversal checks, auth on every route (auto-generated route
   audit test), dependency audit, no secrets in the repo.
4. Backups: a mongodump cron container with 30-day retention, plus a documented, tested
   restore procedure.
5. Production docker-compose (or compose override): built web served by nginx, api behind
   nginx with HTTPS (certificate paths configurable), worker, mongo with auth enabled, and
   ollama with GPU notes.
6. Final docs: README, docs/api.md, docs/ai.md, docs/deploy.md, docs/user-guide-faculty.md,
   docs/user-guide-student.md.

Acceptance criteria:
- All e2e journeys pass in CI with the mock LLM and locally with Ollama.
- k6: p95 < 500 ms for quiz submit and revision rate at 500 virtual users.
- A fresh server reaches a running HTTPS deployment by following docs/deploy.md alone.
```

---

# PART C — EXECUTION ORDER

Run the phases in this order. Each depends on the ones before it.

| # | Phase | Why here |
|---|---|---|
| 1 | **0** Foundation | Everything runs on it |
| 2 | **B1** Auth | Every route needs roles |
| 3 | **F1** Design system + shell | UI base for every screen |
| 4 | **F2** Login + routing | Can now sign in as each role |
| 5 | **B2** Syllabus + graph | Data for the map |
| 6 | **F3** Concept map | Signature screen, demo-able early with seeded data |
| 7 | **B3** Content + review | Topic page data |
| 8 | **B4** Practice engine | Quiz, revision, mastery |
| 9 | **F4** Topic page | Student learning flow is complete (no AI yet) |
| 10 | **F5** Quiz, revision, exam prep | **MVP checkpoint: demo to faculty** |
| 11 | **A1** LLM gateway | AI foundation |
| 12 | **A2** Ingestion + RAG | Grounding for all AI |
| 13 | **A3** Generation pipelines | AI drafts maps and content |
| 14 | **F6** Faculty studio | **AI checkpoint: syllabus PDF → published topic** |
| 15 | **B5** Exam prep, insights, CO–PO | Faculty and HOD value |
| 16 | **A4** Tutor | Grounded Q&A |
| 17 | **A5** AI evaluation | Choose the best local model with data |
| 18 | **F7** Mentor, admin, PWA | Remaining roles and mobile |
| 19 | **H1** Hardening + deploy | **Pilot ready** |

---

# PART D — REUSABLE MINI-PROMPTS

Use these inside any phase session when needed.

**Continue after a break**
```text
Continue Phase <id>. First, read the repo state and the last Phase Report (or git log), list
what is done vs remaining against the phase's acceptance criteria, then continue with the
remaining items only.
```

**Fix failing tests**
```text
Tests are failing: <paste output>. Find the root cause (don't just patch the test). Explain
the cause in two lines, fix it, run the full test suite, and report.
```

**Review a phase before moving on**
```text
Act as a strict reviewer who did not write this code. Review Phase <id> against its acceptance
criteria, the A.7 AI rules and the A.5 data-model rules. List concrete defects with file:line,
ranked by severity. Then fix the high-severity ones.
```

**Improve a weak AI output**
```text
The <task> prompt (version <n>) produces <problem> with <model>. Here are 3 bad outputs:
<paste>. Create prompt version n+1: tighten the instructions, add one short example, keep it
small-model friendly. Run `npm run ai:eval -- --task <task>` before and after, and report the
numbers. Do not delete version n.
```

**Add a new feature**
```text
Add feature <F-id / description> from docs/requirements.md. Follow Part A conventions. Write a
short plan (data, API, AI, UI changes), implement backend → AI → frontend, add tests, update
docs, and end with a Phase Report.
```
