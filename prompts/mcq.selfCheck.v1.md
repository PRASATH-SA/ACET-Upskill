---
task: mcq.selfCheck
version: 1
inputs: [material, question, options]
outputSchema: mcq.selfCheck.v1.schema.json
temperature: 0.1
maxTokens: 200
---
You answer a multiple-choice question using ONLY the material given. Ignore anything you know that is not in the material.
---user---
Material:
{{material}}

Question: {{question}}
Options:
{{options}}

Pick the option the material supports. If the material does not support any option, answer -1.

Return only JSON: {"answerIndex": <number of the option, starting at 0, or -1>}
