# ACET SkillUp — API Reference

Base path: `/api/v1`. JSON only, except file uploads (multipart) and downloads.

## Conventions (A.6)

| Item | Rule |
|---|---|
| Success | `{ "data": ..., "meta"?: ... }` |
| Error | `{ "error": { "code", "message", "details"? } }` with the matching HTTP status |
| Pagination | `?page=&limit=` (limit max 100) → `meta: { page, limit, total }` |
| Validation | Body, query and params are validated with zod schemas from `@acet/shared` |
| Auth | `Authorization: Bearer <accessToken>` on every route except `/health` and `/auth/login|refresh|logout` |
| Ownership | Faculty: only subjects they are assigned to. Mentor: only assigned students. Student: only self and their syllabus version |
| Visibility | Students only ever receive `published` content and `approved` topics/links. This is enforced in services |
| Long work | LLM calls (Phase A) create an `aiJobs` record and return `202 { data: { jobId } }` |

### Error codes

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Bad body, query, params, file type or id |
| `UNAUTHORIZED` | 401 | Missing, invalid or expired token. Expired tokens include `details.reason = "expired"` |
| `FORBIDDEN` | 403 | Wrong role or not the owner |
| `NOT_FOUND` | 404 | Unknown record or route. Draft topics are reported as 404 to students |
| `CONFLICT` | 409 | Duplicate record or link, or a delete blocked by dependants |
| `PAYLOAD_TOO_LARGE` | 413 | Upload over `UPLOAD_MAX_MB` |
| `UNPROCESSABLE` | 422 | Business rule broken: prerequisite cycle, invalid status move, self-link |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL` | 500 | Unexpected error (details are logged, never returned) |

Unknown routes return 401 to anonymous callers and 404 to signed-in users.

---

## Health

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/health` | public | `{ status: "ok"\|"degraded", mongo, version }`; 503 when Mongo is down |

## Auth (B1)

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | `LoginSchema`. Returns `{ accessToken, expiresIn, user }` and sets the `acet_rt` refresh cookie (httpOnly, Secure, SameSite=Strict, path `/api/v1/auth`). Limited to 5/min per IP + email |
| POST | `/auth/refresh` | public (cookie) | Rotates the refresh token. Reusing an old token revokes the whole session family |
| POST | `/auth/logout` | public (cookie) | Revokes the session family and clears the cookie |
| GET | `/auth/me` | any | Current user |
| POST | `/auth/register` | admin | `RegisterUserSchema`. Creates any role |
| POST | `/auth/import-students` | admin | Multipart `file` (CSV `name,email[,password][,batch]`) plus optional `departmentId`, `syllabusVersionId`, `batch`, `mentorId`. Returns created users, per-row errors and one-time temporary passwords |

## Users (B1)

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/users` | admin | `?role&departmentId&syllabusVersionId&q&page&limit` |
| GET | `/users/:id` | any | Self, admin, the student's mentor, or faculty teaching the student's syllabus version. Access to another user is audited |
| PATCH | `/users/:id` | admin | `AdminUpdateUserSchema`. Role changes are audited. Deactivation revokes sessions |
| DELETE | `/users/:id` | admin | Deactivates (soft delete) |
| PATCH | `/users/me` | any | `{ name }` |
| POST | `/users/me/password` | any | `{ currentPassword, newPassword }`. Logs out other sessions |

## Departments and syllabus versions

| Method | Path | Roles |
|---|---|---|
| GET | `/departments`, `/syllabus-versions` | any |
| POST, PATCH `/:id`, DELETE `/:id` | `/departments`, `/syllabus-versions` | admin |

## Syllabus and concept map (B2)

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/search?q=&limit=` | any | Subjects and topics the user may open, matched on title/code (plain text, not a regex). Students: approved topics of their syllabus version only (F1 top-bar search) |
| GET | `/subjects` | any | Students: their syllabus version only. Faculty: own subjects. `?syllabusVersionId&semester` |
| POST | `/subjects` | admin | `CreateSubjectSchema` (assign `facultyIds`) |
| GET, PATCH, DELETE | `/subjects/:id` | read: any with access; write: admin | |
| GET | `/subjects/:id/map` | any with access | `{ subject, units, topics, links }`. Topics and links carry `status` and `source` (`ai` drafts are outlined in the studio). Links include `crossUnit`. Students get approved items only |
| PATCH | `/subjects/:id/map` | owning faculty, admin | `SaveMapSchema`: node positions/order/unit/title plus edge upserts and deletes, validated as a whole and written in one transaction |
| PATCH | `/subjects/:id/map/approve` | owning faculty, admin | Every draft topic and link → approved |
| GET | `/subjects/:id/learning-order` | any with access | Topological order, ties broken by unit then topic order |
| GET | `/subjects/:id/cross-unit-links` | any with access | |
| GET, POST | `/subjects/:id/units` | read / owning faculty, admin | |
| PATCH, DELETE | `/units/:id` | owning faculty, admin | Delete refuses while the unit has topics |
| POST | `/units/:id/topics` | owning faculty, admin | `CreateTopicSchema`; `parentTopicId` for subtopics |
| PATCH, DELETE | `/topics/:id` | owning faculty, admin | Delete refuses when the topic has content or student progress; removes its links |
| GET | `/topics/:id/prerequisites`, `/topics/:id/unlocks` | any with access | Each with the link reason |
| POST | `/subjects/:id/links` | owning faculty, admin | `CreateLinkSchema`. 422 on self-links or prerequisite cycles (message names the cycle); 409 on duplicates. Related links are undirected and may form cycles |
| PATCH, DELETE | `/links/:id` | owning faculty, admin | |

## Content, materials and review (B3)

`<type>` is `resources`, `flashcards` or `questions`.

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/topics/:id/<type>` | any with access | Staff see all statuses. Others see published only. Questions are staff-only (students use the quiz). `?status&kind&type` |
| POST | `/topics/:id/<type>` | owning faculty, admin | Created as `draft`, `source: faculty` |
| GET, PATCH, DELETE | `/<type>/:id` | owning faculty, admin | Editing clears a rejection and marks AI drafts as edited |
| POST | `/<type>/:id/status` | see note | `{ status }`. Approve and publish: owning faculty only. Draft and inReview: owning faculty or admin. `published` from draft steps through approved |
| POST | `/resources/:id/file` | owning faculty, admin | Multipart video (mp4, webm) for a `video` resource |
| GET | `/resources/:id/file` | any with access | Students: only when published |
| POST | `/materials` | owning faculty, admin | Multipart `file`, `kind`, `topicId` or `subjectId`. File type is sniffed from bytes. PDF text is extracted on upload. Scanned PDFs return `scanned: true` and a warning |
| GET | `/materials?topicId=\|subjectId=` | owning faculty, admin | Without the extracted text |
| GET, DELETE | `/materials/:id` | owning faculty, admin | |
| GET | `/materials/:id/file` | owning faculty, admin | |
| POST | `/materials/:id/ingest` | owning faculty, admin | Re-run chunking and embedding (A2). Materials also carry `ingestStatus` (`queued`, `running`, `done`, `failed`, `skipped`), `chunkCount` and `ingestJobId` |
| GET | `/review-queue` | faculty (own subjects), admin | Drafts across resources, flashcards, questions and PYQs. `?subjectId&topicId&kind&source&status&needsAttention&includeRejected&page&limit` |
| POST | `/review-queue/bulk` | faculty, admin | `{ action: approve\|publish\|reject, reason?, items: [{ type, id }] }`. All-or-nothing; every change is audited |
| GET | `/topics/:id/page` | any with access | Student topic page: `topic`, `curiosity`, `video`, `easy`, `tenMark`, `realWorld`, `workshop`, `workshops`, `pyqs`, `flashcardCount`, `questionCount`, `prerequisites`, `unlocks`. Published only; missing kinds are omitted |

## Practice engine (B4)

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/topics/:id/open` | any with access | Students: notStarted → learning |
| GET | `/topics/:id/quiz?limit=10` | any with access | Random published MCQs with `id, stem, options, difficulty` only. Never answers |
| POST | `/flashcards/:id/rate` | student | `{ rating }` from the topic page deck (F4). Enrols the published card in revision if needed, then reschedules it with FSRS |
| POST | `/quiz/submit` | student | `SubmitQuizSchema`. Returns score, per-question correctness, explanations, `whyWrong`, the mastery change, and how many items entered revision |
| GET | `/revision/today` | student | Due items grouped by topic, each with front/back |
| POST | `/revision/:id/rate` | student | `{ rating: again\|hard\|good\|easy }` → next due date (FSRS) and mastery |
| GET | `/subjects/:id/map/me` | student | Node state per topic: `mastered`, `current`, `unlocked`, `locked`, `needsRevision`, plus `missingPrerequisites` |
| GET | `/me/progress` | student | Mastery counts per subject, revision due and streak, weakest topics |
| GET | `/subjects/:id/map/students/:studentId` | faculty, mentor, admin | Ownership-checked and audited |
| GET | `/students/:id/progress` | faculty, mentor, admin | Ownership-checked and audited |

Mastery rules and thresholds (`MASTERY_*` env vars) are documented in `apps/api/src/modules/practice/mastery.js`.

## Exam prep and PYQs (B5)

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/subjects/:id/pyqs` | any with access | Students: published only |
| POST | `/subjects/:id/pyqs`, `/subjects/:id/pyqs/bulk` | owning faculty, admin | Optional `materialId` of an uploaded `pyqPaper`. Topic tags must belong to the subject |
| PATCH, DELETE | `/pyqs/:id` | owning faculty, admin | Re-tag with `topicIds` |
| POST | `/pyqs/:id/status` | as for content | |
| GET | `/subjects/:id/exam-prep` | any with access | Published PYQs per topic over the last `years` (default 5), most asked first. `?unitId&marks&minFrequency&years` |

## Workshops (B5)

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/topics/:id/workshops` | any with access | |
| POST | `/topics/:id/workshops` | owning faculty, admin | `{ brief, dueAt }` |
| PATCH, DELETE | `/workshops/:id` | owning faculty, admin | Delete refuses once there are submissions |
| POST | `/workshops/:id/submissions` | student | Multipart `text` and/or `file` (pdf, docx, pptx, images). Replaces an ungraded submission. `late` is set after `dueAt` |
| GET | `/workshops/:id/submissions` | owning faculty, admin | |
| GET | `/subjects/:id/workshops` | owning faculty, admin | Every workshop of the subject with `topicTitle`, `submitted` and `graded` counts (F6) |
| GET | `/me/submissions` | student | |
| GET | `/submissions/:id/file` | the student or owning faculty | |
| PATCH | `/submissions/:id/grade` | owning faculty, admin | `{ score, feedback }`, audited |

## Insights, mentor and reports (B5)

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/subjects/:id/insights` | owning faculty, admin | Per-topic average latest quiz score, % not started, needsRevision counts, weakest 5 topics, students needing revision |
| GET | `/mentor/students` | mentor (admin: `?mentorId`) | Assigned students with `risk: { level, reasons }`, riskiest first |
| GET | `/mentor/students/:id` | mentor, admin | Profile, progress and notes. Audited |
| GET, POST | `/mentor/students/:id/notes` | mentor (POST), mentor/admin (GET) | `{ note, followUpAt? }` |
| PATCH, DELETE | `/mentor/notes/:id` | the note's mentor | `{ note?, followUpAt?, done? }` |
| GET | `/mentor/follow-ups?before=` | mentor | Open follow-ups, soonest first |
| GET, POST | `/subjects/:id/course-outcomes` | owning faculty, admin | `{ code: "CO1", text, poMappings: [{ po: "PO1", level: 1-3 }] }` |
| PATCH, DELETE | `/course-outcomes/:id` | owning faculty, admin | |
| PUT | `/course-outcomes/:id/topics` | owning faculty, admin | `{ topicIds }` replaces the mapping |
| GET | `/subjects/:id/co-attainment?threshold=` | owning faculty, admin | Per CO: students assessed and attained, %, level 0–3. Per PO: correlation-weighted level. Method in `outcomes/attainment.js` |
| GET | `/subjects/:id/co-attainment/export?format=csv\|pdf` | owning faculty, admin | File download, audited |
| GET | `/admin/usage` | admin | Users by role, weekly active students (8 weeks), topics published, AI drafts approved/rejected/edited by prompt version |
| GET | `/admin/audit-logs` | admin | `?action&actorId&targetId&page&limit` |

## AI (A1, A2)

Every model call goes through the gateway (`docs/ai.md`). AI endpoints return `503 AI_OFFLINE` when the model server is unreachable; nothing outside `/ai/*` depends on it.

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/ai/health` | any | `{ provider, reachable, chatModel, embedModel, models, chatModelPulled, embedModelPulled, modelsPulled, circuit }`. Always 200; `reachable: false` when the server is down |
| GET | `/ai/jobs?subjectId=&limit=` | faculty, admin | Recent jobs (own jobs, or a subject's jobs for its faculty) |
| GET | `/ai/jobs/:id` | job owner, subject faculty, admin | `{ id, type, status, progress, step, result, output, error, logs, promptVersions, … }` |
| GET | `/ai/jobs/:id/events` | as above | **SSE.** `snapshot` once, then `progress` (changed fields and new log lines), then `done`. Comment heartbeats every 15 s. Reconnecting resumes from a fresh snapshot |
| POST | `/ai/jobs/:id/cancel` | faculty, admin | Queued jobs stop at once; running jobs stop at their next step. 422 if already finished |
| POST | `/ai/retrieve` | owning faculty, admin | `{ query, topicId? , subjectId?, k?, allowSubjectFallback? }` → `{ chunks: [{ id, text, heading, score, … }], scope, model }` |
| GET | `/ai/topics/:id/coverage` | owning faculty, admin | `hasEnoughMaterial`: `{ enough, reason, chunkCount, words, staleChunks }` |
| GET | `/ai/chunks?ids=a,b` | owning faculty, admin | Source chunks (text, heading, file name; no vectors) for the review queue side-by-side view (F6) |
| POST | `/ai/reembed` | admin | `202 { jobId }`. Re-embeds chunks made with another embedding model |

Job statuses: `queued → running → succeeded | failed | cancelled`. A job can succeed with `result: "needsMaterial"` and create nothing (A3).

### AI generation (A3)

All three run as background jobs (`202 { data: { jobId } }`); follow them with `GET /ai/jobs/:id/events`. They return `503 AI_OFFLINE` at once while the circuit breaker is open. Everything they create is `status: draft`, `source: ai` with `aiMeta { model, promptVersion, jobId, sourceChunkIds }`.

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/ai/subjects/:id/draft-map` | owning faculty, admin | `{ materialId? }` (default: the subject's latest syllabus PDF). Units, topics (with subtopics) and prerequisite/related links as drafts, cycle-free, laid out left to right. No readable syllabus → `result: "needsMaterial"` |
| POST | `/ai/topics/:id/draft-content` | owning faculty, admin | `{ kinds?: ["easy","tenMark","flashcards","mcq","curiosity","realWorld"] }` (default all). Too little material → `result: "needsMaterial"`, nothing created. MCQs the self-check disagrees with get `needsAttention: true` |
| POST | `/ai/pyqs/tag` | owning faculty, admin | `{ subjectId }`. Tags untagged **draft** PYQs with 1–3 topics chosen from the 5 nearest by embedding; stores `tagConfidence` per topic |

Re-running a draft replaces only earlier AI drafts of the same kind that are unapproved and unedited. Approved, published, faculty-written and faculty-edited items are never touched.

### Tutor (A4)

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/ai/tutor/ask` | any with access to the topic | `{ topicId, question, history? }` (history: last 6 turns as `{ role, content }`). **SSE**: `token` events `{ text }`, then `done` `{ grounded, refused, reason?, citations: [{ kind: resource\|chunk\|prerequisite, id, title, section }] }`, or `error` `{ code, message }`. Before streaming: 400 when the question is too long, 429 `RATE_LIMITED` past the hourly limit (students), 503 `AI_OFFLINE` while the circuit is open |
| GET | `/subjects/:id/tutor/common-questions` | owning faculty, admin | Last 60 days of tutor questions grouped by meaning: `{ clusters: [{ representative, count, notGrounded, topicTitle, examples }], total }` |

### Admin AI settings (A5)

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/admin/ai` | admin | `{ health, settings: { chatModel, embedModel, overrides, defaults, provider }, queue: { queued, running }, recentFailures, lastWeek }` |
| PUT | `/admin/ai/settings` | admin | `{ chatModel?, embedModel? }` (`null` = back to the env default). Must be pulled on the model server (400 otherwise). Applies to new calls and jobs without a restart; changing the embedding model also returns `reembedJobId` |

Faculty feedback per prompt version (approved / edited / rejected / pending) is in `GET /admin/usage` → `aiDrafts`.
