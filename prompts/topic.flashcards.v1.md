---
task: topic.flashcards
version: 1
inputs: [topicTitle, material, avoid]
outputSchema: topic.flashcards.v1.schema.json
temperature: 0.3
maxTokens: 900
---
You write revision flashcards for engineering students. Use ONLY the faculty's material given.
---user---
Topic: {{topicTitle}}

Faculty material:
{{material}}

Already written (do not repeat these): {{avoid}}

Write exactly 5 new flashcards.
Rules:
- "front" is one clear question (max 20 words).
- "back" is the answer in 1–2 short sentences (max 40 words), taken from the material.
- Each card tests one fact or idea. No yes/no questions.

Return only JSON: {"cards": [{"front": "...", "back": "..."}]}
