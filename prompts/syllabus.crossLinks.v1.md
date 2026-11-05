---
task: syllabus.crossLinks
version: 1
inputs: [subjectName, topicList]
outputSchema: syllabus.crossLinks.v1.schema.json
temperature: 0.2
maxTokens: 1000
---
You find useful connections between topics that sit in different units of a syllabus. Refer to topics only by their number.
---user---
Subject: {{subjectName}}

Topics (with their unit):
{{topicList}}

Find topics in DIFFERENT units that a student should connect in their mind.
Rules:
- Only link topics from different units. Only use numbers from the list.
- At most 8 links. Prefer the strongest, most useful connections.
- "reason" is one short sentence (max 20 words) explaining the connection.
- "confidence" is 0 to 1.

Return only JSON matching the schema.
