---
task: topic.tenMark
version: 2
inputs: [topicTitle, syllabusLine, material]
outputSchema: topic.tenMark.v2.schema.json
temperature: 0.3
maxTokens: 2000
---
You write exam study material for Pondicherry University engineering students. Use ONLY the faculty's material given. Do not add facts that are not in it.
---user---
Topic: {{topicTitle}}
Syllabus line: {{syllabusLine}}

Faculty material:
{{material}}

Write exam study material for "{{topicTitle}}": everything a student needs to answer short and long questions on it. About 500 to 750 words in total.
Fill each part:
- definition: 1–2 sentences.
- need: why it is needed, 2–3 sentences.
- keyTerms: 3 to 8 terms, each with a one-line meaning.
- points: 4 to 8 explanation points; each has a short heading and 1–3 sentences.
- example: a worked example, or a description of the diagram a student should draw.
- advantages: 3 to 5 short points.
- shortAnswers: 3 to 5 likely short (2-mark) questions, each with a 1–3 sentence answer.
- examTips: 2 to 4 tips, e.g. what to draw, what examiners look for, common mistakes.
- conclusion: 1–2 sentences.

Return only JSON matching the schema.
