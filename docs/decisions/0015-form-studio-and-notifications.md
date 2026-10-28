# 0015 — Form Studio and in-app notifications

Date: 2026-10-27 · Status: accepted

## Context
Faculty and HODs wanted a Google-Forms-style form builder inside SkillUp (feedback, registrations, quick
quizzes) with a shareable link. Students wanted those forms on a page of their own, with a notification
when a new one arrives.

## Decision
- **Forms** (`forms`, `formResponses` collections; `apps/api/src/modules/forms`). A form has sections; each
  section has items. Input types: short answer, paragraph, multiple choice, checkboxes, dropdown, linear
  scale, rating, date, time, multiple-choice grid, tick-box grid, file upload. Display items: title and
  description, image (by link), YouTube video. Per question: required, description, "Other" option, shuffle
  options, response validation (number, whole number, email, URL, length, regex, select at least/most/
  exactly), allowed file types and file count.
- **Branching:** each section has a `next` (continue / go to section / submit), and multiple-choice and
  dropdown questions with `branching` set a `goTo` per option. `formPath()` in `@acet/shared` walks the
  path. A jump back to a section already visited ends the form, so there are no loops. Only answers on the
  path are stored.
- **Quiz mode:** points, answer key and right/wrong feedback. Short-answer, choice and checkbox questions
  are marked automatically (`scoreResponse()`); paragraph and file questions are marked by hand. Marks are
  released immediately or later, through a "Release scores" action that notifies each respondent. Settings
  choose whether students see missed questions, correct answers and point values. The answer key is never
  sent to respondents.
- **Settings:** accepting responses, opens/closes at, response limit, one response per student, allow
  editing, anonymous responses (staff see answers without names), respondents may see the summary, progress
  bar, shuffle question order, confirmation message, header colour.
- **Shared logic, server authority.** Answer checks, branching and scoring live in
  `packages/shared/src/forms.js`. The browser uses them for instant feedback, and the API runs them again
  on submit.
- **Who edits:** the creator, collaborators they add by email (faculty or HOD), the HOD of the creator's
  department and the coordinator. Only the owner, that HOD or the coordinator can delete a form.
- **Audience:** department(s), year(s), semester(s) and batch(es); an empty list means any. A HOD's forms
  always target their own department. Students outside the audience get a 403 on the link.
- **The link** is `/forms/:id` in the web app. Signed-out visitors log in and land back on it. Editors who
  open it get a preview that records nothing.
- **Notifications** (`notifications` collection; `apps/api/src/modules/notifications`): at most one per
  (user, type, ref). Publishing notifies every active student in the audience. Publishing again, or widening
  the audience, reaches only students who were not notified yet. The top-bar bell polls every minute,
  shows the unread count and toasts new arrivals. Students also get a "Forms" nav item with a to-do count.
- **Files** go through `StorageService` under `form-uploads/`, with their type sniffed from the bytes.
  Storage keys never reach clients: `/forms/:id/responses/:responseId/files/:fileId` streams a file to the
  form's editors and to the respondent.

## Consequences
- No public (signed-out) responses. Every respondent is a signed-in student, which is what makes "one
  response per student" and audiences work. Staff cannot respond; they can only preview.
- No email notifications yet; the bell is in-app only.
- Responses are listed in full, without pagination. That is fine for class-sized forms; revisit it if a
  form passes a few thousand responses.
- Images are linked by URL, not uploaded.
