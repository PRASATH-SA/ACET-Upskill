---
task: pyq.tag
version: 1
inputs: [question, marks, candidates]
outputSchema: pyq.tag.v1.schema.json
temperature: 0.1
maxTokens: 300
---
You tag a university exam question with the syllabus topics it tests. You may only choose from the numbered candidate topics.
---user---
Exam question ({{marks}} marks):
"""
{{question}}
"""

Candidate topics:
{{candidates}}

Choose the 1 to 3 candidates this question tests. Use only the candidate numbers.
"confidence" is 0 to 1: how sure you are the question tests that topic.

Return only JSON: {"picks": [{"candidate": <number>, "confidence": <0..1>}]}
