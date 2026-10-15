# AI evaluation

**No real-model results yet.** This file is overwritten by the eval script. It has not yet been run
against a real local model: the development machine used to build A5 had no Ollama install. The
harness itself is tested with the mock model (`npm run ai:eval -- --mock`).

Run it on a machine with Ollama and both candidate models pulled:

```bash
ollama pull qwen2.5:7b-instruct
ollama pull llama3.1:8b
ollama pull nomic-embed-text
npm run ai:eval -- --models qwen2.5:7b-instruct,llama3.1:8b
```

It evaluates the A3 content tasks (`topic.easy`, `topic.tenMark`, `topic.flashcards`,
`topic.mcqs` plus an MCQ self-check) on the 12-topic golden DBMS set in `evals/dataset.json`
and reports, per model: valid JSON on the first try, repair rate, failures after repair, MCQ
self-check agreement, the share of grounded texts, and average latency. Expect roughly 15–40
minutes per model on a CPU-only laptop.

Use the result to pick `LLM_CHAT_MODEL` (or the admin AI settings page), and to tune
`TUTOR_MIN_RELEVANCE` / `TUTOR_MIN_PASSAGE_SCORE` if you change the embedding model.
