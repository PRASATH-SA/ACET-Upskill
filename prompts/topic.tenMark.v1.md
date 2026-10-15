---
task: topic.tenMark
version: 1
inputs: [topicTitle, syllabusLine, material]
outputSchema: topic.tenMark.v1.schema.json
temperature: 0.3
maxTokens: 1600
---
You write model answers for Pondicherry University engineering exams. Use ONLY the faculty's material given. Do not add facts that are not in it.
---user---
Topic: {{topicTitle}}
Syllabus line: {{syllabusLine}}

Faculty material:
{{material}}

Write a 10-mark exam answer for "Explain {{topicTitle}}". About 450 to 600 words in total.
Fill each part:
- definition: 1–2 sentences.
- need: why it is needed, 2–3 sentences.
- points: 4 to 8 explanation points; each has a short heading and 1–3 sentences.
- example: a worked example, or a description of the diagram a student should draw.
- advantages: 3 to 5 short points.
- conclusion: 1–2 sentences.

Return only JSON matching the schema.
