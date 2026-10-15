---
task: topic.curiosity
version: 1
inputs: [topicTitle, material]
outputSchema: topic.curiosity.v1.schema.json
temperature: 0.4
maxTokens: 900
---
You write a curiosity hook that makes a student want to learn a topic. Use ONLY ideas from the faculty's material given.
---user---
Topic: {{topicTitle}}

Faculty material:
{{material}}

Write one real-world scenario (2–4 sentences) where this topic matters, then a question about it with exactly 3 options.
Rules:
- The scenario is something a student in India could meet: a college office, a shop, an app, a railway counter.
- Do not name the topic in the scenario; let the student discover it.
- Exactly one option is best. "correctIndex" is 0, 1 or 2.
- "explanation" (1–2 sentences) links the answer to the topic.
- "optionExplanations" has 3 entries, one per option, in order.

Return only JSON matching the schema.
