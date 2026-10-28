# 0014 — Dark mode

Date: 2026-10-27 · Status: accepted

## Decision
- A sun/moon button in the top bar (and on the login page) switches light and dark. The first
  visit follows the device setting; a click is remembered per browser (`acet:theme` in
  localStorage, `useUi().theme` in `lib/uiStore.js`). `main.jsx` applies it before the first render.
- Tailwind `darkMode: 'class'`. The colours that must flip — `navy` (headings), `body`, `line`,
  `surface`, `card`, `gold.tint`, `brand.soft`, `success`, `success.soft`, `warning.dark`,
  `red.dark`, `ink.*` — are CSS variables (`rgb(var(--c-…) / <alpha-value>)`, so opacity modifiers
  still work). Both palettes live in `THEME_COLORS` in `@acet/shared` design tokens; a Tailwind
  plugin writes them on `:root` and `.dark`. Brand magenta, gold, CTA and medal colours stay fixed.
- `index.css` has a short list of dark overrides for classes that are fixed on purpose: `bg-navy`
  panels keep a dark fill (white text), `bg-white` becomes the card colour, yellow fills keep navy
  text, and magenta text/links are lightened for contrast.
- Concept-map nodes keep their light fills and navy text in both themes; the dot grid uses the
  theme line colour.

## Consequences
New components get dark mode for free when they use the token classes (`bg-card`, `text-navy`,
`border-line` …). A hard-coded hex colour needs a `dark:` variant.
