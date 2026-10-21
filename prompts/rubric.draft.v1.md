---
task: rubric.draft
version: 1
inputs: [topicTitle, syllabusLine, material]
outputSchema: rubric.draft.v1.schema.json
temperature: 0.3
maxTokens: 900
---
You help an engineering teacher write a short marking rubric for "explain it back": a student explains a topic in 30 seconds of speech or three written lines. Use ONLY the faculty's material given.
---user---
Topic: {{topicTitle}}
Syllabus line: {{syllabusLine}}

Faculty material:
{{material}}

Write:
- "prompt": one question that asks the student to explain the core idea in their own words, as if to a classmate (under 200 characters).
- "criteria": 2 to 4 criteria that a 30-second answer can realistically meet. Each has "text" (what earns the points, one sentence), "points" (1 to 3) and "keyIdeas" (2 to 4 short phrases from the material that show the idea).
- "passScore": the points a student needs to show they understood (about 60% of the total, rounded up).

Return only JSON matching the schema.
