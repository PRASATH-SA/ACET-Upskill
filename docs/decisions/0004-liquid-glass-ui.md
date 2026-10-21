# ADR 0004 — "Liquid glass" visual refresh

- **Status:** Accepted
- **Date:** 2026-10-16

The user asked for a modern, gamified look with liquid-glass surfaces and new corner radii,
keeping the A.8 colour palette unchanged. Every colour is still an A.8 token (or a support
shade), sometimes at reduced alpha.

| A.8 says | Now | Why |
|---|---|---|
| 20px card radius | 28px cards, 32px sheets/dialogs, 22px inner tiles, 16px inputs; pills unchanged (`RADIUS` in `design-tokens.js`) | Larger, concentric corners match the requested reference UI. The Tailwind radius scale is remapped, so `rounded-xl`/`rounded-2xl` changed everywhere. |
| 1px borders instead of heavy shadows | 1px light rim + soft navy-tinted elevation (`shadow-glass`) | A glass surface needs a rim highlight and a soft lift to read as a layer. Shadows stay soft, never heavy. |
| Avoid gradient washes | A faint fixed backdrop (three low-alpha pools of blue, gold and red plus a dot grid) behind all glass; a subtle top sheen on surfaces | Backdrop blur shows nothing over a flat colour. Alphas stay ≤ 0.2 so body-text contrast is unchanged. |
| — | Gamified pills: a 3–4px "press" edge that collapses on click; glossy XP-style progress bars; progress rings; a quest-path step tracker; glow pulse on the current step and map node | Requested "gamified" feel, using only palette colours. |

**Learning path (roadmap view).** Students now land on a Duolingo-style path
(`features/student/map/RoadmapView.jsx`): a sticky banner per unit, then topic "coins" in
learning order along an S-curve, ending in a unit trophy. Tapping a coin opens a card with the
next action. The concept map (A.1) is one tap away (Path / Map / List toggle, `?view=map`), and
staff still default to the map. Coins use the A.8 node states and colours; the dotted trail
turns gold where walked and flows blue into the current topic.

Accessibility safeguards:

- `prefers-reduced-transparency` and browsers without `backdrop-filter` get solid surfaces.
- `prefers-reduced-motion` already disables the new animations (global rule in `index.css`).
- Overlays (dialog, menu, toast) use the more opaque `glass-strong` so text stays readable.
- Print hides the backdrop and flattens glass to white.

Where it lives: `.glass*` classes and the backdrop in `apps/web/src/index.css`, tokens in
`apps/web/tailwind.config.js` and `packages/shared/src/design-tokens.js`. Legacy `bg-card`
surfaces become glass through one override in `index.css`, so screens did not need rewriting.
