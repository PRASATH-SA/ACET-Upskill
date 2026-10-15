# Prompt templates

Rule A.7.6: every LLM prompt lives here as `<task>.v<n>.md` with a matching `<task>.v<n>.schema.json`.
Never edit a published version in place. Copy it to `v<n+1>` and change the copy.
Code never concatenates prompt strings. It loads a template and renders `{{variable}}` placeholders.

## File header (front-matter)

```markdown
---
task: topic.easyExplanation      # dotted task id
version: 1                       # integer, stored on every output as promptVersion
inputs: [topicTitle, syllabusLine, chunks]
outputSchema: topic.easyExplanation.v1.schema.json
temperature: 0.3
---
```

## Small-model checklist (A.7.7)
- One task per call, short explicit instructions.
- Small batches, for example 5 flashcards per call.
- Temperature 0.2–0.4 for structured tasks.
- Stay inside the model's context window. Chunk or map-reduce long inputs.
- Answer only from the provided material. Say so when the material is missing.

`_template.v1.md` is a starting point for new prompts.
