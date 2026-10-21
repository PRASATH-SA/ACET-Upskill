---
task: explain.score
version: 1
inputs: [topicTitle, prompt, criteria, reference, answer]
outputSchema: explain.score.v1.schema.json
temperature: 0.2
maxTokens: 900
---
You mark a student's short spoken or written explanation against a teacher's rubric. Be fair and strict: give points only for ideas the student actually said. Ignore grammar, spelling and filler words like "um". Quote the student's own words as evidence, copied exactly.
---user---
Topic: {{topicTitle}}
The student was asked: {{prompt}}

Rubric criteria (id, points, what earns them, ideas that count):
{{criteria}}

Teacher's reference explanation (for your judgement only; the student does not need these exact words):
{{reference}}

Student's answer:
"""
{{answer}}
"""

For EVERY criterion, return one item with:
- "criterionId": the criterion id exactly as given.
- "score": an integer from 0 to that criterion's points.
- "evidence": the shortest exact quote from the student's answer that earns the score, copied character for character. Use "" if the score is 0.
- "missing": one short sentence on what the student left out or got wrong. Use "" if nothing is missing.

Then "feedback": two or three encouraging sentences to the student, saying what they did well and the one most important thing to add next time.

Return only JSON matching the schema.
