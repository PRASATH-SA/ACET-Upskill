# ACET SkillUp — AI Orchestration

The rules in `CLAUDE.md` section A.7 are non-negotiable. This file documents how they are implemented.
Phase A1 fills in the architecture, provider switching and prompt-authoring guide.

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

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `LLM_PROVIDER` | `ollama` | `ollama` or `openai-compatible` |
| `LLM_BASE_URL` | `http://localhost:11434` | Provider base URL |
| `LLM_CHAT_MODEL` | `qwen2.5:7b-instruct` | Generation model |
| `LLM_EMBED_MODEL` | `nomic-embed-text` | Embedding model |
| `LLM_TIMEOUT_MS` | `120000` | Per-call timeout |
| `LLM_MAX_CONCURRENCY` | `2` | Parallel call limit |
