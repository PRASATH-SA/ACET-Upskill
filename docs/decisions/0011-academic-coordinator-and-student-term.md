# ADR 0011 — Academic Coordinator role and per-student year and semester

- Status: accepted (2026-10-25)
- Extends: A.2 (roles), A.5 (`users`)

## Context

The user asked for three things:

1. The learn page should open on "My subjects" for the student's current semester and year,
   not on the level/XP card.
2. The HOD of a department chooses each student's semester and year.
3. An Academic Coordinator manages every HOD and student as a super admin.

When asked, the user chose to set the term **per student** (not per year group or per department
term), and to limit a HOD to **their own department** now that a coordinator exists.

## Decision

- **Role `coordinator`** is added to `ROLES`. `roleAllows(role, allowed)` in `@acet/shared` lets the
  coordinator pass every check that admits `admin`. The API `requireRole` and the web `RequireRole`
  both use it, so existing routes keep listing only `admin`. Service checks use `isAdminRole`.
- **HOD scope** (`apps/api/src/modules/users/service.js`): a HOD lists, creates, edits, imports and
  deactivates users only in their own department. A HOD cannot create, edit or assign `admin`/`coordinator`
  accounts, and cannot move users to another department. A HOD with no department gets 403 and is told
  to ask the coordinator. Only the coordinator creates, renames or deletes departments.
- **Student term**: `users.yearOfStudy` (1–4) and `users.semester` (1–8). Year *y* spans semesters
  2*y*−1 and 2*y*; the shared schemas reject other pairs, and partial updates are checked against the
  stored values. `POST /users/term` sets the term of many students at once (the users page has
  checkboxes and a "Set term" bar).
- **Scoping**: `GET /subjects` and `/me/progress` for a student use the student's `semester` when it is
  set. Students with no semester see every subject of their version, as before, so existing accounts
  and the seeded students keep working. Direct links to other semesters' subjects still work (revision
  of earlier subjects), and `?semester=` lists them.
- **Learn page**: the `LevelCard` is removed. The page shows "Year III · Semester 5", then My subjects,
  then Continue learning, revision and the stats. The small level badge in the top bar is unchanged.

## Consequences

- The seed adds `coordinator@acet.test` (no department). For an existing database,
  `npm run create:coordinator -- <email> [name]` creates the first coordinator (temporary password
  printed once) or promotes an existing user. The seeded students have no term, so the
  e2e flows that use both DBMS (Sem 5) and PSPP (Sem 1) are unaffected.
- Reports such as `/admin/usage` and audit logs are still college-wide for a HOD; per-department
  reports are a follow-up.
