# ACET SkillUp — AI Orchestration

The rules in `CLAUDE.md` section A.7 are non-negotiable. This file documents how they are implemented.

## Rules summary

1. One gateway: all model calls go through `apps/api/src/ai/gateway`.
2. Provider adapters: Ollama and any OpenAI-compatible local server, chosen by env.
3. Structured output validated with zod, one repair retry, never save unvalidated output.
4. Grounding only in faculty-uploaded material; store `aiMeta.sourceChunkIds`; return `needsMaterial` when material is thin.
5. Everything AI-created is saved as `status: draft`, `source: ai`.
6. Versioned prompts in `prompts/<task>.v<n>.md`; store `promptVersion` on every output.
7. Small-model friendly prompts, small batches, low temperature.
8. Timeouts, concurrency limit, backoff, health check, graceful degradation.
9. No student personal data is ever sent to the model.
10. Log model, prompt version, latency, tokens and validation result for every call.

## Architecture (A1)

```
 web ──HTTP──► api ──────────────► aiJobs (Mongo) ◄──── SSE /ai/jobs/:id/events
                │  createJob()          ▲
                │  queue.enqueue()      │ progress, logs, result
                ▼                       │
          agendaJobs (Mongo) ──► worker: "ai.run" → runAiJob(jobId) → pipeline
                                                         │
                                                         ▼
                                   apps/api/src/ai/gateway (the only LLM client)
                                     ├─ resilience: p-limit, timeout, backoff, circuit breaker
                                     ├─ generateStructured: prompt → JSON schema → zod → 1 repair
                                     └─ provider: Ollama | OpenAI-compatible | mock (tests)
```

| Piece | File |
|---|---|
| Gateway (chat, chatStream, embed, generateStructured, health) | `apps/api/src/ai/gateway/index.js` |
| Provider adapters | `apps/api/src/ai/gateway/providers/{ollama,openaiCompatible,mock}.js` |
| Concurrency, timeout, retry, circuit breaker | `apps/api/src/ai/gateway/resilience.js` |
| Prompt registry | `apps/api/src/ai/prompts.js` |
| aiJobs model, JobService, queue, runner | `apps/api/src/modules/ai/{model,jobs,queue,runner}.js` |
| Routes (`/ai/health`, `/ai/jobs…`) | `apps/api/src/modules/ai/routes.js` |
| Pipelines (A2, A3) | `apps/api/src/ai/pipelines/` |

### Resilience (A.7.8)

- **Concurrency**: at most `LLM_MAX_CONCURRENCY` calls at once per process (`p-limit`). Streams hold a slot until they end.
- **Timeout**: every call is aborted after `LLM_TIMEOUT_MS`. A timeout is not retried (it already waited the whole budget).
- **Retries**: connection errors only (refused, reset, DNS), twice, with exponential backoff and jitter. HTTP errors such as "model not found" are not retried.
- **Circuit breaker**: after 3 consecutive connection failures the AI is marked offline and calls fail at once with `AI_OFFLINE` (503). One probe call is let through every 30 seconds; a success closes the circuit.
- **Degradation**: nothing outside `/ai/*` depends on the model. `GET /ai/health` returns `reachable: false` and the web app shows "AI service offline" on AI buttons.

### Structured output (A.7.3)

`generateStructured(task, input, zodSchema)`:

1. Renders `prompts/<task>.v<latest>.md` with `{{variables}}`.
2. Sends the prompt's JSON schema to the model (Ollama `format`, OpenAI `response_format: json_schema`).
3. Parses the reply (tolerating ```json fences) and validates it with zod.
4. On failure, sends **one** repair message listing the validation errors.
5. If the repair also fails, throws `AIValidationError` (`AI_VALIDATION_FAILED`, 502). The job fails with that message. Unvalidated output is never saved.

Returns `{ data, meta: { task, model, promptVersion, latencyMs, attempts } }`.

### Observability (A.7.10)

Every call logs `task`, `model`, `promptVersion`, `latencyMs`, `promptTokens`, `completionTokens` and, for structured calls, `attempt` and `valid`. Prompts and outputs are not logged, so no student data reaches the logs.

## Ingestion and retrieval (A2)

```
upload notes (PDF) ─► text extracted on upload ─► job "material.ingest"
   clean text ─► split on headings/paragraphs ─► pack 500–800 tokens, 80-token overlap
   ─► embed in batches of 16 ─► chunks { materialId, topicId, subjectId, text, embedding, model }
```

| Piece | File |
|---|---|
| Cleaning and chunking | `apps/api/src/ai/rag/chunk.js` |
| `chunks` model | `apps/api/src/ai/rag/model.js` |
| VectorStore interface + `MongoCosineVectorStore` | `apps/api/src/ai/rag/vectorStore.js` |
| `retrieve()`, `hasEnoughMaterial()` | `apps/api/src/ai/rag/retrieve.js` |
| Ingest and re-embed pipelines | `apps/api/src/ai/pipelines/ingest.js` |

- **What is ingested**: notes, slides and syllabus PDFs with extractable text. PYQ papers, scans and images are marked `skipped`. PPTX/DOCX text extraction is not built yet; upload a PDF export.
- **Tokens** are estimated as 1.3 × words; good enough for budgeting a local model's context.
- **Vector search**: `MongoCosineVectorStore` pre-filters in Mongo by topic (or subject) **and embedding model**, then scores cosine similarity in Node and returns the top k above `RAG_MIN_SCORE`. It suits a college-sized corpus (thousands of chunks per subject). To scale, implement the same `upsert / search / deleteByMaterial` interface over Atlas Vector Search (`$vectorSearch` with a `filter` on `topicId` and `model`) or Qdrant (payload filter), and call `setVectorStore()`; callers do not change.
- **Retrieval** searches the topic first. It falls back to the whole subject only when the caller passes `allowSubjectFallback: true`.
- **Coverage**: `hasEnoughMaterial(topicId)` needs at least `RAG_MIN_CHUNKS` chunks and `RAG_MIN_WORDS` words of current-model chunks. A3 ends a job with `needsMaterial` otherwise.
- **Changing the embedding model**: every chunk stores the model that embedded it, and searches only use current-model chunks, so vectors from two models are never compared. When the worker starts (or the A5 setting changes) and finds stale chunks, it queues one `embeddings.reembed` job. Admins can also call `POST /ai/reembed`.

| Variable | Default | Purpose |
|---|---|---|
| `RAG_TOP_K` | `6` | Chunks returned by retrieval |
| `RAG_MIN_SCORE` | `0.35` | Minimum cosine similarity |
| `RAG_MIN_CHUNKS` | `1` | Coverage: chunks needed per topic |
| `RAG_MIN_WORDS` | `150` | Coverage: words needed per topic |

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `LLM_PROVIDER` | `ollama` | `ollama`, `openai-compatible`, or `mock` (tests only; refused when `NODE_ENV=production`) |
| `LLM_BASE_URL` | `http://localhost:11434` | Provider base URL. For OpenAI-compatible servers, with or without `/v1` |
| `LLM_API_KEY` | (unset) | Optional bearer token for OpenAI-compatible servers that need one |
| `LLM_CHAT_MODEL` | `qwen2.5:7b-instruct` | Generation model |
| `LLM_EMBED_MODEL` | `nomic-embed-text` | Embedding model |
| `LLM_TIMEOUT_MS` | `120000` | Per-call timeout |
| `LLM_MAX_CONCURRENCY` | `2` | Parallel call limit |
| `AI_JOB_RUNNER` | `agenda` | `agenda` (worker runs jobs) or `inline` (this process; tests and e2e) |
| `PROMPTS_DIR` | `<repo>/prompts` | Prompt templates folder |

## Switching the model server

No code changes are needed; only env.

**Ollama (default)**

```bash
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434
LLM_CHAT_MODEL=qwen2.5:7b-instruct
LLM_EMBED_MODEL=nomic-embed-text
npm run ai:pull
```

**LM Studio**: start the local server (Developer tab → Start server, port 1234) and load a chat model and an embedding model.

```bash
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=http://localhost:1234
LLM_CHAT_MODEL=qwen2.5-7b-instruct            # the id shown by GET /v1/models
LLM_EMBED_MODEL=text-embedding-nomic-embed-text-v1.5
```

**llama.cpp server**: `llama-server -m qwen2.5-7b-instruct-q4_k_m.gguf --port 8080 --embeddings`, then `LLM_PROVIDER=openai-compatible` and `LLM_BASE_URL=http://localhost:8080`. A single llama.cpp process serves one model; run a second instance for embeddings, or use Ollama for embeddings.

**vLLM**: `LLM_BASE_URL=http://<host>:8000`. vLLM supports `response_format` json_schema through guided decoding.

Check the result with `GET /api/v1/ai/health`: `reachable` and `modelsPulled` should both be `true`.

## Adding a prompt

1. Create `prompts/<task>.v1.md` with the front-matter header (see `prompts/README.md`) and `prompts/<task>.v1.schema.json`.
2. Put a system part and a user part in the file, separated by a line `---user---`, or put only the user part.
3. Write the matching zod schema next to the pipeline that calls it, and call `gateway().generateStructured('<task>', input, schema)`.
4. Store `meta.promptVersion` on everything you save (`aiMeta.promptVersion`).
5. To change a prompt, copy it to `v<n+1>`. Never edit a published version; old outputs record which version produced them.

## Tests

No real LLM runs in CI. `LLM_PROVIDER=mock` gives deterministic answers: a scripted reply per task (`provider.on(task, …)`), otherwise schema-valid sample data, and bag-of-words embeddings. The adapters have contract tests against recorded Ollama and OpenAI-compatible responses in `apps/api/test/fixtures/llm/`.

## Generation pipelines (A3)

| Job type | File | Steps |
|---|---|---|
| `syllabus.toMap` | `ai/pipelines/draftMap.js` | split units (regex, no model call) → `syllabus.topics` per unit (long units map-reduced in ~1,800-token parts and merged) → dedupe by normalised title → `syllabus.prereqs` per unit → one `syllabus.crossLinks` pass over ≤ 40 topics → drop the lowest-confidence link of every prerequisite cycle → dagre layout → save drafts |
| `topic.draftContent` | `ai/pipelines/draftContent.js` | `hasEnoughMaterial` (else `needsMaterial`) → retrieve top chunks (≤ 2,400 tokens) → one call per kind: `topic.easy`, `topic.tenMark`, `topic.flashcards` ×3 (5 each), `topic.mcqs` ×2 (5 each), `topic.curiosity`, `topic.realWorld` → `mcq.selfCheck` per MCQ |
| `pyq.tag` | `ai/pipelines/tagPyqs.js` | embed topics and questions → 5 nearest topics per question → `pyq.tag` picks among those numbers only → keep picks with confidence ≥ 0.4 |

Design choices for 7–8B models:
- The model never invents ids or topic names in link and tag tasks: it answers with numbers from a list the pipeline gave it, and out-of-range numbers are dropped.
- Unit splitting and title de-duplication are deterministic code, not model calls.
- A kind that fails validation after its one repair attempt fails the job with a message naming the kind; drafts already saved for other kinds stay (they passed validation) and are listed in the job output.
- If the model server drops mid-job, the job stops and fails with `AI_OFFLINE`.

Prompts: `prompts/syllabus.{topics,prereqs,crossLinks}.v1`, `prompts/topic.{easy,tenMark,flashcards,mcqs,curiosity,realWorld}.v1`, `prompts/mcq.selfCheck.v1`, `prompts/pyq.tag.v1`, each with a JSON schema. The matching zod schemas are in `apps/api/src/ai/schemas.js`.

Tests (`ai/pipelines/pipelines.test.js`) script the mock model and compare each pipeline's saved result with golden files in `apps/api/test/fixtures/ai/`. Regenerate them after an intended change with `UPDATE_GOLDEN=1 npx vitest run src/ai/pipelines` and review the diff.
