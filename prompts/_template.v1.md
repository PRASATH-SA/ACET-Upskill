---
task: _template
version: 1
inputs: [topicTitle, syllabusLine, chunks]
outputSchema: _template.v1.schema.json
temperature: 0.3
---
You are helping a college faculty member prepare study material.
Use ONLY the material below. If the material does not cover the topic, return {"needsMaterial": true}.

Topic: {{topicTitle}}
Syllabus line: {{syllabusLine}}

Material:
{{chunks}}

Return JSON that matches the schema exactly. No extra text.
