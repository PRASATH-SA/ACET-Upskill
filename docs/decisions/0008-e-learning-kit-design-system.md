# ADR 0008 — Adopt the "E-Learning Kit" design system

- Status: accepted (2026-10-23)
- Supersedes: A.8 palette and type, and ADR 0004 (liquid-glass UI)

## Context

The user asked for the web UI to follow the "E-Learning Kit" design system
(https://claude.ai/artifact/7fDNcgvGJAYNY2MqEsxnz6): white cards on a pale lavender page, one
saturated violet (`brand`) for primary actions and progress, cyan (`accent`) for play, Poppins,
1px hairlines, two elevation levels and pill buttons.

## Decision

The tokens live in `packages/shared/src/design-tokens.js` as before. The A.8 key names are kept so
the existing utility classes across ~65 screens restyle in place:

| A.8 name | Now | Kit token |
| --- | --- | --- |
| `navy` | `#1C1A33` | `ink` |
| `blue` | `#6236F5` | `brand` |
| `red` | `#F04438` | `danger` (most `red` usages are error states) |
| `body` / `text` | `#6B6A85` | `ink-muted` |
| `line` / `border` | `#ECEAF5` | `line` |
| `surface` | `#F6F5FC` | `surface-alt` |
| `card` | `#FFFFFF` | `surface` |

The kit's own names are also available in Tailwind: `brand` (`deep`, `soft`), `accent` (`ink`),
`ink` (`muted`, `subtle`), `rating`, `success-soft`, `grad-start` / `grad-end`, `shadow-card`,
`shadow-cta`.

- **Type:** Poppins 400–700 for headings and body (line-height 1.6). Sizes stay at the app's web
  scale: the kit's 10–12px mobile sizes are too small for long reading and for WCAG at 360px.
- **Shape:** tags 6px, inputs and rows 10px, cards 14px, sheets 20px, buttons and tabs pills.
- **Surfaces:** the `.glass*` classes are kept as names but are now solid kit cards (no blur):
  `.glass` = white + `line` + `shadow-card`; `.glass-navy` = the deep violet feature panel;
  `.glass-blue` = `brand-soft` tint.
- **Buttons:** `primary` is solid `brand` (6.2:1). The kit's CTA gradient is available as
  `variant="gradient"` for large full-width buttons only, because white on it is 3.1–3.6:1.
- **Primary/active marks:** active tab, sidebar item and chip use `brand`; the red rule under the
  top bar and the red nav markers are gone.
- **Focus:** 2px `brand` ring with 2px offset.
- **Map:** current topic and unlocked borders are `brand`; related links `brand` dashed;
  cross-unit related links `accent-ink` dashed (was red), so they stay distinct.
- **Gold** for mastered topics and achievements is kept: the kit has no mastery colour and the
  map's node-state semantics (A.8) depend on it.
- **Play button** on videos uses `accent`.

## Consequences

- A.8 in CLAUDE.md no longer describes the live palette; this ADR does.
- Screens that hard-coded translucent white or old RGB triplets were swept to kit values; any
  remaining `bg-white/NN` on the lavender page reads as a soft white tile, which is acceptable.
- Known contrast gaps from the kit: white on the CTA gradient (3.1–3.6:1) and white glyph on
  `accent` (2.5:1, the play button has an accessible label and a visible title nearby).
