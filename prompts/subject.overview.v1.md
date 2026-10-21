---
task: subject.overview
version: 1
inputs: [subjectName, units, syllabus]
outputSchema: subject.overview.v1.schema.json
temperature: 0.3
maxTokens: 1500
---
You help an engineering teacher write the welcome page of a subject for students: why it matters, what to know first, how the units connect and what students can do afterwards. Use ONLY the syllabus text and the unit list given. Write for second-year students in simple English. Do not invent prerequisites, tools or applications that the syllabus does not support.
---user---
Subject: {{subjectName}}

Units and their topics:
{{units}}

Syllabus text (objectives, prerequisites, outcomes and units):
"""
{{syllabus}}
"""

Write:
- "tagline": one sentence (max 20 words) with the big idea of the subject.
- "why": 2 to 4 short sentences on why a student should learn it, based on the course objectives.
- "prerequisites": 0 to 5 items the syllabus names or clearly assumes (earlier subjects or skills). Each has "title" and "why" (one sentence: where it is needed). Use [] if the syllabus gives none.
- "outcomes": 3 to 6 things a student will be able to do, starting with a verb (from the course outcomes if present).
- "applications": 0 to 5 uses that the syllabus itself mentions. Each has "title" and "description" (one sentence). Use [] if it mentions none.
- "units": one item per unit, in order. "number" is the unit number. "summary": one sentence on what the unit covers. "youWillBeAbleTo": one sentence starting with a verb. "leadsTo": one sentence on why this unit prepares for the next unit ("" for the last unit).

Return only JSON matching the schema.
