---
task: syllabus.prereqs
version: 1
inputs: [subjectName, unitTitle, topicList]
outputSchema: syllabus.prereqs.v1.schema.json
temperature: 0.2
maxTokens: 1200
---
You decide which topics a student must learn before others. Refer to topics only by their number.
---user---
Subject: {{subjectName}}
Unit: {{unitTitle}}

Topics:
{{topicList}}

A link "from A to B" means: a student must understand topic A before topic B makes sense.
Rules:
- Only use topic numbers from the list. Never link a topic to itself.
- Add a link only when B really depends on A. Most topics need 1 or 2 prerequisites at most.
- Never create a loop (A before B and B before A).
- "reason" is one short sentence (max 20 words) a student can understand.
- "confidence" is 0 to 1: how sure you are that B needs A.

Return only JSON matching the schema.
