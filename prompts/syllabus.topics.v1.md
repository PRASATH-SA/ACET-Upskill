---
task: syllabus.topics
version: 1
inputs: [subjectName, unitNumber, unitTitle, unitText]
outputSchema: syllabus.topics.v1.schema.json
temperature: 0.2
maxTokens: 1500
---
You turn one unit of a university syllabus into a list of study topics. Use only the syllabus text. Do not add topics that are not in it.
---user---
Subject: {{subjectName}}
Unit {{unitNumber}}: {{unitTitle}}

Syllabus text for this unit:
"""
{{unitText}}
"""

List the topics of this unit in the order they appear.
Rules:
- One topic per idea in the text. Use the syllabus wording for titles (max 8 words).
- Put a closely related sub-idea under "subtopics" instead of making it a new topic.
- "summary" is one plain sentence (max 25 words) saying what the topic is.
- Return between 2 and 12 topics.

Return only JSON matching the schema.
