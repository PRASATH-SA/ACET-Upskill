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

### Rate limits (H1)

- Per signed-in user: `API_RATE_LIMIT_PER_MIN` (default 300) requests per minute on every route after sign-in. A college network puts all students behind one public IP, so limits follow the user, not the address.
- Per IP: `API_IP_RATE_LIMIT_PER_MIN` (default 20,000), a flood ceiling only.
- Login: `LOGIN_RATE_LIMIT_PER_MIN` (default 5) per IP + email. Tutor and code lab have their own per-user limits (see their sections).
- Limits are kept in memory per API process; with `API_WORKERS > 1` each process counts separately.
- Exceeding a limit returns `429 RATE_LIMITED`.

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
| POST | `/auth/register` | admin | `RegisterUserSchema` (incl. `yearOfStudy`, `semester`). A HOD creates student/faculty/mentor users, always in the HOD's department; only the coordinator creates `admin`/`coordinator` accounts or picks the department |
| POST | `/auth/import-students` | admin | Multipart `file` (CSV `name,email[,password][,batch]`) plus optional `syllabusVersionId`, `batch`, `mentorId`, `yearOfStudy`, `semester` and (coordinator only) `departmentId`; a HOD's imports join the HOD's department. Returns created users, per-row errors and one-time temporary passwords |

## Users (B1)

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/users` | admin | `?role&departmentId&syllabusVersionId&yearOfStudy&semester&q&page&limit`. A HOD sees only their department (never coordinators); the coordinator sees everyone. A HOD without a department gets 403 |
| GET | `/users/:id` | any | Self, admin, the student's mentor, or faculty teaching the student's syllabus version. Access to another user is audited |
| PATCH | `/users/:id` | admin | `AdminUpdateUserSchema`. Role changes are audited. Deactivation revokes sessions. A HOD edits only their department's non-HOD users and cannot move them out of it; `semester` must belong to `yearOfStudy` (year y → 2y−1 or 2y), checked against stored values on partial updates |
| DELETE | `/users/:id` | admin | Deactivates (soft delete). Same scope as PATCH |
| POST | `/users/term` | admin | `SetStudentTermSchema` `{ userIds[], yearOfStudy, semester }`. Sets the term of many students; ids outside the HOD's department or not students are skipped. Returns `{ updated, skipped }`. Audited as `user.setTerm` |
| PATCH | `/users/me` | any | `{ name }` |
| POST | `/users/me/password` | any | `{ currentPassword, newPassword }`. Logs out other sessions |

## Departments and syllabus versions

| Method | Path | Roles |
|---|---|---|
| GET | `/departments`, `/syllabus-versions` | any |
| POST, PATCH `/:id`, DELETE `/:id` | `/departments` | coordinator |
| POST, PATCH `/:id`, DELETE `/:id` | `/syllabus-versions` | admin |

Roles: `admin` is a department's HOD; `coordinator` (Academic Coordinator) passes every `admin` check and also manages departments and HOD accounts.

## Syllabus and concept map (B2)

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/search?q=&limit=` | any | Subjects and topics the user may open, matched on title/code (plain text, not a regex). Students: approved topics of their syllabus version only (F1 top-bar search) |
| GET | `/subjects` | any | Students: their syllabus version only, and only their current `semester` once the HOD has set one (`?semester=` reaches other semesters). Faculty: own subjects. `?syllabusVersionId&semester` |
| POST | `/subjects` | admin | `CreateSubjectSchema` (assign `facultyIds`). `kind: theory|practical`; a practical subject needs `theorySubjectId` (a theory subject of the same version) and cannot have units (ADR 0012) |
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

`<type>` is `resources`, `flashcards`, `questions`, `rubrics` (explain-it-back, see below) or `code-challenges` (code lab, see below).

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/topics/:id/<type>` | any with access | Staff see all statuses. Others see published only. Questions are staff-only (students use the quiz). `?status&kind&type` |
| POST | `/topics/:id/<type>` | owning faculty, admin | Created as `draft`, `source: faculty` |
| GET, PATCH, DELETE | `/<type>/:id` | owning faculty, admin | Editing clears a rejection and marks AI drafts as edited |
| POST | `/<type>/:id/status` | see note | `{ status }`. Approve and publish: owning faculty only. Draft and inReview: owning faculty or admin. `published` from draft steps through approved |
| POST | `/resources/:id/file` | owning faculty, admin | Multipart video (mp4, webm) for a `video` resource. Streamed to disk, up to `VIDEO_MAX_MB` |
| GET | `/resources/:id/file` | any with access | Students: only when published |
| GET | `/topics/:id/question-pools` | owning faculty, admin | MCQs grouped by `conceptKey`, with variant and published counts per pool. A pool with one published variant repeats for every student |
| POST | `/materials` | owning faculty, admin | Multipart `file`, `kind`, `topicId` or `subjectId`. File type is sniffed from bytes. PDF text is extracted on upload. Scanned PDFs return `scanned: true` and a warning |
| GET | `/materials?topicId=\|subjectId=` | owning faculty, admin | Without the extracted text |
| GET, DELETE | `/materials/:id` | owning faculty, admin | |
| GET | `/materials/:id/file` | owning faculty, admin | |
| POST | `/materials/:id/ingest` | owning faculty, admin | Re-run chunking and embedding (A2). Materials also carry `ingestStatus` (`queued`, `running`, `done`, `failed`, `skipped`), `chunkCount` and `ingestJobId` |
| GET | `/review-queue` | faculty (own subjects), admin | Drafts across resources, flashcards, questions and PYQs. `?subjectId&topicId&kind&source&status&needsAttention&includeRejected&page&limit` |
| POST | `/review-queue/bulk` | faculty, admin | `{ action: approve\|publish\|reject, reason?, items: [{ type, id }] }`. All-or-nothing; every change is audited |
| GET | `/topics/:id/page` | any with access | Student topic page: `topic`, `curiosity`, `video`, `easy`, `tenMark` (exam study material), `shortAnswers` (published flashcards as quick Q&A, up to 10), `realWorld`, `workshop`, `workshops`, `pyqs`, `flashcardCount`, `questionCount`, `prerequisites`, `unlocks`. Published only; missing kinds are omitted |

### Content & quiz CSV (per unit, separated by topics)

One row per item: a lesson resource (`curiosity`, `video`, `easy`, `tenMark`, `realWorld`, `workshop`), a `curiosity_question`, a `flashcard` or an `mcq`. Columns are `CONTENT_CSV_COLUMNS` in `@acet/shared` (`unit, unit_title, topic, type, id, status, title, url, body, front, back, question, option_a…option_f, correct, explanation, why_a…why_f, difficulty`). Export and import use the same file, so a download can be edited and uploaded back. Cells that look like spreadsheet formulas (`= + - @`) are written with a leading `'`, which import removes. Studio page: `/studio/subjects/:id/content`.

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/subjects/:id/content.csv?unitId&template` | owning faculty, admin | The whole subject in one file (or one unit), every topic in unit and map order, all statuses, with quiz answers. A topic with no content gets one empty row; `template=true` adds a blank row per missing type |
| POST | `/subjects/:id/content-import?unitId&publish` | owning faculty, admin | Multipart `file` (max 5 MB, 5000 rows). Topics are matched by title (and `unit` when given; with `unitId` every row must be in that unit). A row updates the item named by `id`, else the topic's item of the same kind / flashcard front / question text, else creates a `draft` (`source: faculty`). Blank template rows are skipped; nothing is deleted. Every row is checked first: any bad row → 422 `details.errors: [{ row, topic, message }]` and nothing is saved. `publish=true` (owning faculty only, else 403) then publishes every imported item through the review rules, so MCQs need `explanation` and every `why_`. Returns `{ summary: { created, updated, unchanged, skipped, published }, byType }`; audited as `content.csvImport` |

## Practice engine (B4)

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/topics/:id/open` | any with access | Students: notStarted → learning. Returns `{ mastery, steps: { done[], last, offset } }` so the topic page resumes where the student stopped |
| PUT | `/topics/:id/steps` | student | `TopicStepsSchema` `{ done?: step[], last?: step, offset?: px }`. Adds finished steps (never removes) and remembers the step being read and how far into it. Returns `{ done, last, offset }` |
| GET | `/topics/:id/quiz?limit=10` | any with access | Random published MCQs with `id, stem, options, difficulty` only. Never answers |
| POST | `/topics/:id/quiz-sessions` | any with access | `{ limit? }` (1–30, default 10). One published question per concept pool, preferring variants the student has not seen in 30 days, options shuffled per student. `201` with the session and its questions (no answers). Expires after 3 hours |
| GET | `/quiz-sessions/:id` | the session's owner | Resume a session: the same questions in the same option order |
| POST | `/quiz-sessions/:id/submit` | student | `{ answers: [{ questionId, selectedIndex }] }`, where `selectedIndex` is the position the student saw. Only questions served in the session are accepted; a session is submitted once. Result as for `/quiz/submit` |
| GET | `/topics/:id/flashcards/deck` | any with access | Published cards, each with the student's next due date. Staff get the cards without schedules |
| POST | `/flashcards/:id/rate` | student | `{ rating }` from the topic page deck (F4). Enrols the published card in revision if needed, then reschedules it with FSRS |
| POST | `/quiz/submit` | student | `SubmitQuizSchema`. Returns score, per-question correctness, explanations, `whyWrong`, the mastery change, and how many items entered revision |
| GET | `/revision/today` | student | Due items grouped by topic, each with front/back |
| POST | `/revision/:id/rate` | student | `{ rating: again\|hard\|good\|easy }` → next due date (FSRS) and mastery |
| GET | `/subjects/:id/map/me` | student | Node state per topic: `mastered`, `current`, `unlocked`, `locked`, `needsRevision`, plus `missingPrerequisites` |
| GET | `/me/progress` | student | Mastery counts per subject (the student's current semester once set), revision due and streak, weakest topics |
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
| GET | `/leaderboard?subjectId&semester&batch&departmentId&limit` | student, faculty, mentor, admin | Cohort ranked by mastery XP (ADR 0013). Student: own class (same version, semester, department); rows show rank, name, department, year, batch, XP, level, mastered, plus `me`. Faculty: students of their subjects (403 for a subject they don't teach). Mentor: mentees. HOD: own department; coordinator: all or `departmentId`. Staff rows add email, progress %, quiz average, code solved, last active, risk |
| GET | `/reports/progress?subjectId&semester&batch&departmentId` | faculty, admin | Same cohort rules. `summary` (students, active this week, average XP / mastery % / progress % / quiz score, at risk, state totals), `bySubject`, `bySemester`, `byBatch`, ranked `students` |
| GET | `/reports/students/:id` | faculty, mentor, admin | One student: profile, `/me/progress` payload, `standing` (rank in the viewer's cohort, XP, quiz average, code solved, risk), `mySubjectIds`. HOD only for their department. Audited |

## Video learning (feature 3)

Students reach only published videos of topics they can read. Captions are stored as WebVTT.

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/resources/:id/playback` | any with access | Signed links for the video and each caption track (see `/media`), plus chapters and duration |
| POST | `/resources/:id/captions` | owning faculty, admin | Multipart `file` (SRT or WebVTT, under 512 KB), `lang` (`en`, `ta`, …), `label`. Replaces that language's track. SRT is converted to WebVTT; a file with no cues is refused |
| DELETE | `/resources/:id/captions/:lang` | owning faculty, admin | |
| PUT | `/resources/:id/chapters` | owning faculty, admin | `{ chapters: [{ startSec, title }] }` in time order (max 50). A chapter may not start after the end of the video |
| POST | `/resources/:id/progress` | student | Player heartbeat `{ positionSec, seenBuckets, ended }`. Counts 10-second slices played; completed at 90 % of slices or when the player reports the end |
| GET | `/resources/:id/progress/me` | student | Resume position, share watched, completed |

## Practical (lab) subjects (ADR 0012)

A lab is a subject with `kind: practical` and a `theorySubjectId`. It has no units or topics: its experiments sit on topics of the theory subject's roadmap. `/me/progress` ignores labs.

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/subjects/:id/lab` | any with access to the lab | `{ subject, theorySubject, roadmap: { units, topics }, experiments, summary }`. Experiments: `number, title, aim, procedure, topicId, challenges[]`. Students: published experiments on approved topics, with `challenges[].solved`, `markedDone`, `done` and `summary.done`. Lab staff: every experiment with `status`, plus `availableChallenges` (published problems of each theory topic). 400 for a theory subject |
| POST | `/subjects/:id/experiments` | lab faculty, admin | `CreateExperimentSchema`. Created as `draft`; `number` defaults to the next one (409 if taken). `topicId` must be a theory topic; `challengeIds` must be problems of that topic |
| PATCH, DELETE | `/experiments/:id` | lab faculty, admin | Changing `topicId` without `challengeIds` clears the linked problems |
| POST | `/experiments/:id/status` | see note | `{ status: draft|published }`. Publishing: faculty assigned to the lab only |
| POST | `/experiments/:id/done` | student | `{ done }`. Marks a published experiment done (work done in the lab). An experiment is also done when all its linked problems are solved |

## Code lab (LeetCode-style SQL and Python practice)

Problems are authored with the content routes (`<type>` = `code-challenges`; body `CreateCodeChallengeSchema`: `language: sql|python, title, prompt, difficulty, setupSql?, hiddenSql?, tests?, starterCode?, solution, checkSql?, orderMatters?, hints?`) and go through the normal draft → published review and the review queue (`kind=challenge`). SQL problems need `setupSql`; Python problems need `tests` (`[{ input, hidden }]`, at most 10, at least one visible). Saving runs the solution against every case and returns 400 with the error if it fails. Students never receive `solution`, `hiddenSql`, `checkSql` or hidden test inputs; the generic `GET /topics/:id/code-challenges` is staff-only (403 for students).

SQL runs in a sandbox: SQLite compiled to WebAssembly (sql.js) in worker threads, a fresh in-memory database per run, a 2 s time limit (the worker is killed and replaced), a 64 MB SQLite heap cap and no file-system or network access.

Python runs in Pyodide (CPython compiled to WebAssembly) inside a separate Node process started with the permission model (it may read only the Pyodide files), an empty environment, no JavaScript bridge, and `os`/`subprocess`/`socket`-style modules blocked. Interpreter state is reset between runs, the process is killed and replaced after 3 s, output is capped at 64 KB, and the process is recycled after 100 runs and stopped after 10 idle minutes. Details: [ADR 0007](decisions/0007-python-code-lab.md). Runs and submits share a limit of 40 per user per minute.

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/topics/:id/code-lab` | any with access | Published problems of the topic with my `solved` and `attempts` |
| GET | `/subjects/:id/code-lab` | any with access | All published problems grouped by topic in syllabus order, plus `total` and `solved` |
| GET | `/code-lab/subjects` | student | `[{ subjectId, total }]` for the student's subjects that have published problems; the code lab shows tabs only for these (non-coding subjects such as Biology get none) |
| GET | `/code-lab/:id` | any with access | Problem, `language`, `starterCode`, `hints`, `lastSubmission`. SQL: `tables` (columns, primary keys, first 5 rows, row count). Python: `examples` (visible inputs with expected output) and `hiddenTestCount`. Drafts: subject staff only (`preview: true`) |
| POST | `/code-lab/:id/run` | any with access | SQL: `{ code }` → `{ ok, columns, rows, rowCount, truncated, timeMs }` on the sample data. Python: `{ code, input? }` → `{ ok, stdout, truncated, timeMs }` with `input` as stdin. Errors and timeouts → `{ ok: false, stage, error }` (still 200) |
| POST | `/code-lab/:id/submit` | any with access | `{ code }` → `{ passed, verdict: accepted|wrongAnswer|hiddenTests|error|timeout, cases, timeMs, firstSolve }`. SQL is compared by value (column names ignored; row order only when `orderMatters`). Python compares stdout with the solution's output after normalising line endings, trailing spaces and trailing blank lines. Visible cases show expected vs actual; hidden cases show only pass/fail and a reason. Students' submissions are stored (`codeSubmissions`); staff runs are previews and are not stored |

`GET /topics/:id/page` also returns `codeChallengeCount`.

## Subject root page (overview)

Every subject has a root page (`/subjects/:id` in the web app). The unit journey, topic counts, cross-unit links, course outcomes and the student's progress are computed; the written part (tagline, why, prerequisites, outcomes, applications, careers, per-unit summaries) is one `subjectOverviews` document per subject with the usual draft → published review. Students only get a published overview and approved topics and links.

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/subjects/:id/overview` | any with access | `{ subject, overview, units: [{ id, number, title, topics, topicCount, summary, youWillBeAbleTo, leadsTo, progress? }], unitLinks: [{ fromUnitId, toUnitId, type: next|prerequisite|related, reasons: [{ fromTopic, toTopic, type, reason }] }], courseOutcomes, progress?, canEdit }`. `overview` is `null` until published (students); staff also see `status`, `source` and the written `units`. Every unit links to the next; topic links that cross units add the reasons |
| PUT | `/subjects/:id/overview` | owning faculty, admin | `SubjectOverviewSchema`. Creates a draft or updates in place (status unchanged). Unit ids must belong to the subject |
| POST | `/subject-overviews/:id/status` | see content status rules | `{ status }`. Approve and publish: owning faculty only |
| POST | `/ai/subjects/:id/draft-overview` | owning faculty, admin | `202 { jobId }` (`subject.overview` job). Drafted from the syllabus PDF and the unit/topic list only; no readable syllabus → `result: "needsMaterial"`. A faculty-written, edited or approved overview is never replaced (`result: "skipped"`) |

## Form Studio and notifications (ADR 0015)

Faculty, HODs and the coordinator build forms; students in a form's audience fill them. The body of
`PUT /forms/:id` is `UpdateFormSchema` in `packages/shared/src/forms.js` (title, description, headerColor,
sections[].questions[], settings, audience). "Editors" = owner, collaborators, the owner's HOD, coordinator.

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/forms` | faculty, admin | Forms the user owns or collaborates on (HOD: also their department's; coordinator: all), with `responseCount` and `open: { open, reason }` |
| POST | `/forms` | faculty, admin | `{ title?, description? }` → a draft with one question. The audience defaults to the creator's department |
| GET | `/forms/:id` | editors | Full form with answer key, `owner`, `collaborators`, `responseCount`, `open` |
| PUT | `/forms/:id` | editors | Saves the whole form (the editor autosaves). Branch targets must exist. A HOD's audience stays in their department (403 otherwise). Widening a published form's audience notifies the new students (`notified`) |
| DELETE | `/forms/:id` | owner, their HOD, coordinator | Deletes the form, its responses, files and notifications |
| POST | `/forms/:id/publish` | editors | Needs at least one titled question. Notifies each student in the audience once: `{ ...form, notified }` |
| POST | `/forms/:id/unpublish` | editors | Back to draft; students no longer see it |
| POST | `/forms/:id/duplicate` | editors | `201`, "Copy of …" as a draft owned by the caller |
| POST | `/forms/:id/collaborators` | editors | `{ email }` of an active faculty or HOD account |
| DELETE | `/forms/:id/collaborators/:userId` | editors | |
| GET | `/forms/:id/responses` | editors | `{ total, anonymous, summary: { [questionId]: { answered, counts?, average?, grid?, texts?, files? } }, quiz: { maxScore, average, median, correctByQuestion } or null, responses[] }`. Anonymous forms omit `student` |
| GET | `/forms/:id/export` | editors | CSV (UTF-8 BOM), one column per question and per grid row; cells that look like formulas are escaped |
| DELETE | `/forms/:id/responses` | editors | Deletes every response and file: `{ deleted }` |
| DELETE | `/forms/:id/responses/:responseId` | editors | |
| PATCH | `/forms/:id/responses/:responseId/grade` | editors | `{ grades: { [questionId]: points or null }, feedback? }` → `{ score, maxScore }` |
| POST | `/forms/:id/release-scores` | editors | Quiz only. Releases marks and notifies each respondent: `{ released, notified }` |
| GET | `/forms/:id/view` | students in the audience; editors (preview) | `{ form (no answer key), open, preview, myResponse, canRespond, canEdit, confirmationMessage }`. Draft → 404, not in the audience → 403 |
| POST | `/forms/:id/responses` | student in the audience | JSON `{ answers }`, or multipart with an `answers` JSON field and `file:<questionId>` parts. Only answers on the section path are kept. `400` with `details.errors[questionId]`; `409` if already responded (one response, no editing); `403` when closed. With "allow edit", submitting again replaces the response (`200`, `edited: true`) |
| GET | `/forms/:id/summary` | respondents (when the form shares results), editors | `{ total, summary }` |
| GET | `/forms/:id/responses/:responseId/files/:fileId` | editors, the respondent | Streams the uploaded file |
| GET | `/me/forms` | student | Published forms for the student: `{ open, responded, submittedAt, canEdit, score? }` |
| GET | `/notifications?limit=` | any | The caller's own `{ items: [{ id, type, title, body, link, readAt, updatedAt }], unread }` |
| POST | `/notifications/:id/read` | owner | 404 for someone else's notification |
| POST | `/notifications/read-all` | any | `{ updated }` |

## Media links

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/media/:token` | the token | **Not behind `requireAuth`**: `<video>`, `<track>` and `<audio>` cannot send a Bearer header. The token is issued only after the normal access checks, names one file and the user it was issued to, is signed with a key derived from (but not usable as) the access-token secret, and expires after `MEDIA_URL_TTL_SEC`. Supports HTTP Range for seeking |

## Explain-it-back (feature 13)

A student explains a topic in their own words (up to 30 seconds of voice, or 80–600 characters of text). The AI marks it against the teacher's published rubric; teachers spot-check flagged answers and their score replaces the AI's. Rubrics use the content routes above (`<type>` = `rubrics`): `{ prompt, criteria: [{ id, text, points, keyIdeas }], passScore }`, with the usual draft → published review. Students never see `keyIdeas`.

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/topics/:id/explain` | any with access | The published prompt and criteria, whether voice is available, limits, and the student's last 5 attempts |
| POST | `/topics/:id/explanations` | student | JSON `{ text }`, or multipart `audio` (type sniffed from bytes, ≤ 1.5 MB) + `durationSec`. `202 { explanationId, jobId }`; scoring runs as an `explain.score` AI job. 422 when no rubric is published, 429 past 5 attempts per topic per day, 503 `AI_OFFLINE` while the circuit is open |
| GET | `/explanations/:id` | the student, owning faculty, admin | Per-criterion score with evidence quotes and what was missing; the final score is the teacher's when spot-checked |
| GET | `/explanations/:id/audio-url` | as above | Signed link to the recording while it is kept (`AUDIO_RETENTION_DAYS`). Staff listening is audited |
| GET | `/explanations` | faculty (own subjects), admin | Teacher queue of scored answers. `?subjectId&topicId&flagged&checked&page&limit` |
| POST | `/explanations/:id/spot-check` | subject faculty | `{ agree, perCriterion?, note? }`. Disagreeing needs per-criterion scores; the teacher's score becomes final |

## AI (A1, A2)

Every model call goes through the gateway (`docs/ai.md`). AI endpoints return `503 AI_OFFLINE` when the model server is unreachable; nothing outside `/ai/*` depends on it.

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/ai/health` | any | `{ provider, reachable, chatModel, embedModel, models, chatModelPulled, embedModelPulled, modelsPulled, circuit, stt }` (`stt`: the speech-to-text provider and whether it is reachable). Always 200; `reachable: false` when the server is down |
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

All of these run as background jobs (`202 { data: { jobId } }`); follow them with `GET /ai/jobs/:id/events`. They return `503 AI_OFFLINE` at once while the circuit breaker is open. Everything they create is `status: draft`, `source: ai` with `aiMeta { model, promptVersion, jobId, sourceChunkIds }`.

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/ai/subjects/:id/draft-map` | owning faculty, admin | `{ materialId? }` (default: the subject's latest syllabus PDF). Units, topics (with subtopics) and prerequisite/related links as drafts, cycle-free, laid out left to right. No readable syllabus → `result: "needsMaterial"` |
| POST | `/ai/topics/:id/draft-content` | owning faculty, admin | `{ kinds?: ["easy","tenMark","flashcards","mcq","curiosity","realWorld"] }` (default all). Too little material → `result: "needsMaterial"`, nothing created. MCQs the self-check disagrees with get `needsAttention: true` |
| POST | `/ai/pyqs/tag` | owning faculty, admin | `{ subjectId }`. Tags untagged **draft** PYQs with 1–3 topics chosen from the 5 nearest by embedding; stores `tagConfidence` per topic |
| POST | `/ai/questions/:id/variants` | owning faculty, admin | `{ count? }` (1–5, default 3). New MCQs on the same concept (same `conceptKey`), grounded in the topic's material and self-checked. Too little material → `result: "needsMaterial"` |
| POST | `/ai/topics/:id/draft-rubric` | owning faculty, admin | Drafts an explain-it-back rubric from the topic's material. Too little material → `result: "needsMaterial"` |

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
