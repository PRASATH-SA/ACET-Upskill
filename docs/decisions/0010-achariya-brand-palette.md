# ADR 0010 — Achariya logo and brand palette

- Status: accepted (2026-10-23)
- Supersedes: the colours in ADR 0008 (the E-Learning Kit's structure — Poppins, radii, hairline
  cards, two elevations, pill buttons — stays)

## Context

The user supplied the Achariya "25 years · World Class Education" logo and asked for the UI to
use it and its colours. The logo is stored at `apps/web/public/brand/achariya-25.png` (source,
474×475); the UI loads a 320px WebP (`achariya-25-320.webp`, 18 KB).

## Palette

Sampled from the logo's pixels (canvas), then adjusted only where WCAG AA needed it.

| Role | Token (A.8 name) | Value | Note |
| --- | --- | --- | --- |
| Brand magenta (buttons, active, current topic, focus) | `brand` (`blue`) | `#C81D78` | Logo magenta `#E02888` deepened: white text 5.4:1 (the exact logo colour is 4.4:1) |
| Logo magenta (decoration, large type only) | `brand-logo` | `#E02888` | |
| Brand deep (feature panel, pressed) | `brand-deep` | `#9E1360` | |
| Brand soft (selected tint) | `brand-soft` | `#FDE8F3` | |
| Navy ("World Class Education") | `navy` / `ink` | `#22355E` | Headings and body, 11.9:1 |
| Muted text | `body` / `ink-muted` | `#5B6478` | 5.9:1 on white |
| Sunburst yellow (mastered, achievements) | `gold` | `#F2C014` | Navy on it 7:1 |
| Orange glow (play, stars, highlights) | `accent` / `rating` | `#F29F1B` | Icons only; as text use `accent-ink` `#A85C00` |
| Tagline red → CTA gradient end | `grad-end` | `#E0452C` | Gradient `#C81D78 → #E0452C` |
| Underline green (success) | `success` | `#2E7D32` | 5.1:1 |
| Danger (errors only) | `red` | `#D92D20` | Kept distinct from the brand magenta |
| Page | `surface` | `#FFF8EC` | Warm cream from the logo's yellow |
| Hairline | `line` | `#F1E4CC` | |

Shadows are tinted with the brand magenta. Map: current topic magenta, mastered yellow, related
links magenta dashed, cross-unit links orange-ink dashed.

## Logo use

- Top bar: 40px logo, then "SkillUp" and "ACET".
- Login: the brand panel is a `.bg-sunburst` (the logo's yellow-to-orange rays) with navy text
  and the logo in a white frame.
- App icons (favicon, apple-touch, 192, 512, maskable on the logo yellow with a 10% safe zone)
  are generated from the logo. The service worker cache version is bumped to `v2` so installed
  apps pick them up.

## Consequences

- The logo is the college's own mark, used as supplied; it is not redrawn or recoloured.
- The Design System artifact (E-Learning Kit) still documents the violet palette; this ADR is
  the source of truth for colours in the app.
