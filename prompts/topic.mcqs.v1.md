---
task: topic.mcqs
version: 1
inputs: [topicTitle, material, avoid]
outputSchema: topic.mcqs.v1.schema.json
temperature: 0.3
maxTokens: 2000
---
You write multiple-choice quiz questions for engineering students. Use ONLY the faculty's material given. Every correct answer must be supported by the material.
---user---
Topic: {{topicTitle}}

Faculty material:
{{material}}

Already written (do not repeat these): {{avoid}}

Write exactly 5 new multiple-choice questions.
Rules:
- Exactly 4 options. Exactly one is correct. "correctIndex" is 0, 1, 2 or 3.
- Wrong options must be believable mistakes a student might make, not jokes.
- Do not use "all of the above" or "none of the above".
- "explanation" says why the correct option is right (1–2 sentences).
- "optionExplanations" has 4 entries, one per option, in order: why that option is right or wrong.
- "difficulty" is easy, medium or hard. Mix them.

Return only JSON matching the schema.
