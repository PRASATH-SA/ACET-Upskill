# 0013 — Leaderboard and cohort progress reports

Date: 2026-10-27 · Status: accepted

## Context
Students asked for a leaderboard; faculty need their classes' progress on the studio home and a page per
student; the HOD needs overall department progress.

## Decision
- **Score = mastery XP** from `XP_PER_STATE` (`xpForCounts` in `@acet/shared`), the same XP the student's
  level card shows, so the leaderboard never disagrees with `gamify()`. Ties break on topics mastered, then
  average latest quiz score, then name; students level on XP and mastered share a rank (1, 2, 2, 4).
- **One scoring pass** (`apps/api/src/modules/leaderboard/service.js`) serves `GET /leaderboard`,
  `GET /reports/progress` and `GET /reports/students/:id`. A student counts a subject when it is in their
  syllabus version and (once set) their semester; labs are excluded (their code-lab solves are counted
  separately as `codeSolved`).
- **Cohort by role:** student → their class (same version, semester, department); faculty → students of
  their subjects; mentor → mentees; HOD → their department only (`departmentId` is ignored);
  coordinator → every department or one.
- **What students see of classmates:** rank, name, department, year, batch, XP, level badge and topics
  mastered. Never email, quiz scores, weak topics or activity. This is a deliberate, limited exception to
  "students see only their own progress" (A.2).
- Every row shows department, year (`yearOfStudy`, or derived from the semester) and a level badge.

## Consequences
- The report does not run the overdue sweep for every student, so a topic may show `confident` for a
  student until their own next visit flips it to `needsRevision`.
- Web: `/leaderboard` (all roles), `/studio/students` and `/studio/students/:id` (faculty, HOD),
  `/admin/progress` (HOD, coordinator); progress panels on the studio home and the HOD overview.
