/** A.8 — ACET design tokens. The Tailwind config (Phase 0 / F1) imports these values. */
export const COLORS = {
  navy: '#0F2D5C',
  red: '#E0262B',
  blue: '#2F6BEA',
  gold: '#F5C000',
  goldBorder: '#C9A100',
  goldTint: '#FFF7D6',
  text: '#5B6577',
  border: '#ECEFF3',
  surface: '#F8F9FB',
  card: '#FFFFFF',
};

export const FONTS = {
  heading: { family: 'Montserrat', weights: [700, 800] },
  body: { family: 'Inter', weights: [400, 500, 600], lineHeight: 1.7 },
};

/** Eyebrow label placed above a navy heading. */
export const EYEBROW = {
  fontSizePx: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.3em',
  color: COLORS.red,
};

export const SHAPE = {
  cardRadiusPx: 20,
  borderWidthPx: 1,
  minTouchTargetPx: 44,
  mobileMinWidthPx: 360,
  mobileBreakpointPx: 768,
};

/** A.8 — map node colours per state. Locked greys and the revision dot are not in A.8 and may be tuned in F3. */
export const MAP_NODE_STYLE = {
  mastered: { fill: COLORS.gold, border: COLORS.goldBorder, text: COLORS.navy },
  current: { fill: COLORS.blue, border: COLORS.blue, text: COLORS.card },
  unlocked: { fill: COLORS.card, border: COLORS.blue, text: COLORS.navy },
  locked: { fill: '#E5E7EB', border: '#C7CCD4', text: '#6B7280' },
  needsRevision: {
    fill: COLORS.gold,
    border: COLORS.goldBorder,
    text: COLORS.navy,
    dot: '#F28C28',
  },
};

/** A.8 — map edge styles. Cross-unit related links are red dashed. */
export const MAP_EDGE_STYLE = {
  prerequisite: { stroke: COLORS.navy, dashed: false, arrow: true },
  related: { stroke: COLORS.blue, dashed: true, arrow: false },
  crossUnitRelated: { stroke: COLORS.red, dashed: true, arrow: false },
};
