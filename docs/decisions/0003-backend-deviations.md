# ADR 0003 — Backend deviations from the master prompt

- **Status:** Accepted
- **Date:** 2026-10-14

| Master prompt says | Built instead | Why |
|---|---|---|
| `pdf-parse` for PDF text (A.3) | `pdfjs-dist` 4 (Mozilla pdf.js) with `isEvalSupported: false` | `pdf-parse` bundles pdf.js 1.10 from 2018. It failed with "bad XRef entry" on PDFs from current tools in testing. |
| `bcrypt` (A.3) | `bcryptjs` | Same algorithm and hash format, no native build step. Native `bcrypt` often fails to compile on Windows lab machines. |
| Refresh token as a JWT (implied) | Opaque random token, stored as a SHA-256 hash, rotated with reuse detection | Hash-only storage lets tokens be revoked, and a leaked database cannot be replayed. |
| Content status `draft → inReview → approved → published` | Same, plus `rejectedAt`/`rejectReason` on a draft | A rejected draft needs a reason and must leave the review queue without a fifth status. |
| "Faculty cannot read a student outside their subject's batch" | Faculty may read students whose syllabus version matches a subject they teach | Subjects have no batch field (A.5). A syllabus version is per branch and year, so it acts as the batch. |
| MongoDB through Docker only | Docker, or `npm run db:dev` (in-process MongoDB 7 replica set, data in `.data/mongo`) | Some machines have no Docker. Transactions need a replica set, so the dev script starts one. |
| Separate `controller.js` per module (A.4) | Small modules (practice, exam, workshops, outcomes, mentor, insights) keep their thin handlers in `routes.js` | Each handler is one line that calls a service. Logic stays in services as A.9 requires. |
