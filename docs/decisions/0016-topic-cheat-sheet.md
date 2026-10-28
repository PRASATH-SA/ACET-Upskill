# 0016 — Infographic cheat sheet per topic

Date: 2026-10-27 · Status: accepted

## Context

Students asked for a one-page infographic summary of each topic for quick revision. Writing a
separate cheat sheet for every topic (by faculty or the LLM) would need authoring and an approval
pass for 50+ topics, and would drift from the notes it summarises.

## Decision

- The cheat sheet is **derived, not stored**. `buildCheatSheet(page)` in `@acet/shared`
  (`packages/shared/src/cheatSheet.js`) turns the student topic page (`GET /topics/:id/page`) into
  the sheet. That page carries only published content, so the "nothing unpublished reaches
  students" rule holds without a new status or approval step.
- Mapping:
  - **Big idea:** the topic summary. If there is none, the "Definition"/"Introduction" section of
    the 10-mark notes, then the easy explanation's first sentence.
  - **Numbered tiles (max 6):** the other sections of the 10-mark notes. Each tile shows at most
    4 points; list items and table rows become points, and a section with only code shows a
    short code snippet. Without notes, the tiles come from the easy explanation's sections.
  - **Quick recall:** up to 4 flashcards. **In the real world:** up to 3 real-world uses.
  - **Exam radar:** how many past-paper questions (PYQs) there are, and their marks.
  - **Flow strip:** what the topic builds on and what it unlocks.
  - **Remember:** the "Conclusion"/"Summary" section.
- A topic with only a summary (no notes, easy explanation or flashcards) has no sheet, and no
  button appears.
- UI: the sheet (`CheatSheet.jsx`) is a **Cheat sheet** tab in the **Remember** step, beside the
  Flashcards tab. A topic with a sheet but no flashcards still gets the Remember step, showing just
  the sheet. The **Cheat sheet** button in the header and a `/topics/:id#cheat-sheet` link both
  open that tab and scroll to it. **Print** prints only the sheet, with its
  colour fills kept (`print-color-adjust: exact`).
- **The tab shows the sheet as a study-poster image** in the style of the faculty's reference
  answer posters (2026-10-28; replaces the 2026-10-27 header/callout layout). `blocksOf(md)` in
  `@acet/shared` keeps the structure of each note section as blocks: paragraph text (two sentences),
  bullets, numbered steps, tables (header + up to 6 rows × 4 columns), flowcharts and code.
  A line such as "Stages: A → B → C" (three or more short parts) becomes a flowchart; formulas
  ("if X → Y then …"), pair lists ("A → B, C → D") and arrows inside brackets do not.
  `cheatPoster(sheet)` lays it out and `CheatSheetPoster.jsx` draws it 1500 CSS px wide (as tall as
  its cards) in fixed pastel colours (`CHEAT_POSTER_COLORS`):
  - A navy title bar: a pink unit pill, the title in capitals with its key words in yellow
    (`titleParts`: the part before a colon or before "in/of/for/…") and "(10 MARKS)" when there
    are exam notes, and a pink pill: "Asked N× · 2 & 10 marks" from the PYQs, else "Exam ready".
  - Numbered cards with a circle badge (pink, blue, green, orange, purple, sky, mint, yellow):
    **Introduction** (summary + definition sentences as bullets), one card per note section
    (up to 10 cards in all), **Key points to remember** (flashcards, with check marks),
    **In the real world** when there is room, and a pink **Conclusion**.
  - Cards pack in order into rows of four columns; a card with a 3+ column table, or a lot of
    content, spans two, and the cards of a row share its width and height.
  - Pictures such as the references' molecule drawings are not drawn: the notes hold none.
- `CheatSheetImage.jsx` mounts the poster off-screen (always the light palette, via
  `themeCssVars(THEME_COLORS.light)`) and turns it into a PNG at 2x with `html-to-image`, in the
  browser; the web fonts are embedded once per session (`getFontEmbedCSS`), so a draw takes a
  few seconds at most. Students tap it to enlarge, **Download image** (`<code>-<topic>-cheat-sheet.png`),
  **Share** (Web Share with a file, where supported) or print it. **Text version** shows the same
  sheet as HTML for screen readers and copying, and is the fallback if drawing fails. Drawn images
  are cached in memory per sheet content for the session.

## Consequences

- Every topic with published notes gets a sheet immediately, and editing the notes updates it.
- The sheet's quality follows the notes' structure (`##` headings, bullet lists, `**Term:**`
  points); notes written as long paragraphs give thinner tiles.
- The image is generated on each device rather than stored, so it is never stale; the cost is one
  new web dependency (`html-to-image`) and a short "drawing" skeleton the first time a topic's
  tab opens.
- The poster is only as rich as the notes: tables, numbered lists and arrow chains in the notes
  become tables, steps and flowcharts; long paragraphs give plain text cards. Illustrations
  would need a stored, structured `cheatSheet` resource (LLM-drafted from the material,
  faculty-approved) — not built.
- No API, data-model or AI change. A future faculty-curated or AI-drafted sheet could still be
  added as a `cheatSheet` resource kind that overrides the derived one.
