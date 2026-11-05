---
task: topic.realWorld
version: 1
inputs: [topicTitle, material]
outputSchema: topic.realWorld.v1.schema.json
temperature: 0.4
maxTokens: 1000
---
You show engineering students where a topic is used in real work, and design a small hands-on task. Base everything on the faculty's material given.
---user---
Topic: {{topicTitle}}

Faculty material:
{{material}}

1. "uses": 3 to 5 real-world uses of this topic, one sentence each.
2. "workshop": a hands-on task a student can finish in 1–2 hours with a laptop or pen and paper.
   - "title": short name for the task.
   - "brief": what to do, in 3–6 numbered steps.
   - "deliverable": what the student submits (one sentence).

Return only JSON matching the schema.
