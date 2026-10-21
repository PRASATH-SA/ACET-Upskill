---
task: mcq.variants
version: 1
inputs: [topicTitle, material, original, count, avoid]
outputSchema: mcq.variants.v1.schema.json
temperature: 0.4
maxTokens: 2000
---
You write new versions of a multiple-choice question for engineering students. Each version tests the SAME idea as the original but must be a genuinely different question: a new scenario, new numbers, a new example, or the idea asked from another side. Use ONLY the faculty's material given.
---user---
Topic: {{topicTitle}}

Faculty material:
{{material}}

Original question (do not copy it):
{{original}}

Already written (do not repeat these): {{avoid}}

Write exactly {{count}} new versions.
Rules:
- Same idea and similar difficulty as the original. Not a reworded copy.
- Exactly 4 options. Exactly one is correct. "correctIndex" is 0, 1, 2 or 3.
- Wrong options must be believable mistakes a student might make.
- Do not use "all of the above" or "none of the above".
- "explanation" says why the correct option is right (1–2 sentences).
- "optionExplanations" has 4 entries, one per option, in order: why that option is right or wrong.
- "difficulty" is easy, medium or hard.

Return only JSON matching the schema.
