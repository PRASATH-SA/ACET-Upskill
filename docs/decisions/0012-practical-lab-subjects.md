# ADR 0012 — Practical (lab) subjects on the theory roadmap

- Status: accepted (2026-10-26)
- Extends: A.5 (`subjects`), ADR 0005 and 0007 (code lab)

## Context

The user asked for the student home to be split into **Theory** and **Practical** sections, with
each practical following "the same roadmap" as its theory subject. When asked, the user chose
**separate lab subjects** (each lab has its own course code, as in the university scheme) over a
practical view of the theory subjects.

## Decision

- **Subject kind.** `subjects.kind` is `theory` (default) or `practical`. A practical subject has
  `theorySubjectId`: a theory subject in the same syllabus version. Rules (syllabus service):
  - a practical subject needs a theory link, cannot link another lab, and cannot have units;
  - a theory subject with linked labs cannot be deleted or turned into a lab;
  - a lab with experiments cannot be turned back into a theory subject.
- **Same roadmap.** A lab has no topics. `GET /subjects/:id/lab` returns the theory roadmap (units
  and topics; students only see approved topics) with the lab's experiments. The roadmap is embedded
  because lab faculty often do not teach the theory subject and so cannot read it directly.
- **Experiments** (`labExperiments`): number (unique in the lab), title, aim, procedure (markdown),
  the theory `topicId` it sits on, and optional `challengeIds` — published code-lab problems of that
  topic. Created as drafts by lab staff; only the lab's faculty publish (the HOD cannot), as for all
  content (A.7.5). Students see published experiments only.
- **Done.** An experiment is done when every linked problem is solved (`codeSubmissions.passed`), or
  when the student marks it done (`labCompletions`, for work done in the lab room).
- **Progress.** `/me/progress` ignores labs, so theory mastery numbers are unchanged. Lab progress is
  experiments done / total, shown on the practical card and the lab page.
- **UI.**
  - Student home: *Theory* and *Practical* sections; topic-based pages (map tree, exam prep, code
    lab tabs) list theory subjects only.
  - `/labs/:id`: the theory roadmap trimmed to the topics that have experiments, coloured by
    experiment progress (no topic is ever locked in a lab), an experiment panel per topic, and an
    "All experiments" list. `RoadmapView` takes an optional `action` that replaces the node card's
    learning call to action.
  - Studio `/studio/labs/:id`: add, edit, publish and delete experiments.
  - Admin → Syllabus: subject type and the theory subject a lab uses.
- **Seed.** `Python Programming Lab` (CSC26P03 → PSPP) and `Database Management Systems Lab`
  (CS P53 → DBMS), one published experiment per theory topic that has code-lab problems.
  `npm run seed:content` adds them to existing databases. The lab codes follow the university's
  T/P pattern but are placeholders; the HOD can rename them.

## Consequences

- Lab marks, viva and record submission are out of scope; workshops (B5) remain the place for
  graded submissions.
- Experiments are not in the review queue; the lab editor is where they are published.
