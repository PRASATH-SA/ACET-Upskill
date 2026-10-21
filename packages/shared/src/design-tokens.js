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

/**
 * Supporting shades (F1), not in A.8. Darker variants keep small text on tinted backgrounds
 * above WCAG AA 4.5:1; success and warning are for status badges and the revision dot only.
 */
export const SUPPORT_COLORS = {
  navyDark: '#0B2247',
  redDark: '#B3191E',
  blueDark: '#1F4FB8',
  success: '#1C6B3C',
  warning: '#F28C28',
  warningDark: '#8A4A0B',
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

/**
 * Radius scale (2026-10-16 "liquid glass" refresh). Large, soft corners: cards 28px, inner
 * tiles 22px, controls 16px, buttons and chips stay pills. Nested surfaces step down one size
 * so the corners stay concentric.
 */
export const RADIUS = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  '2xl': 22,
  card: 28,
  sheet: 32,
};

/**
 * Liquid-glass surfaces. Translucent white over a soft ambient backdrop, blurred and saturated,
 * with a bright top rim. Colours are the A.8 palette at reduced alpha; nothing new is introduced.
 */
export const GLASS = {
  blurPx: 20,
  saturate: 1.8,
  fill: 'rgb(255 255 255 / 0.58)',
  fillStrong: 'rgb(255 255 255 / 0.82)',
  fillNavy: 'rgb(15 45 92 / 0.86)',
  rim: 'rgb(255 255 255 / 0.75)',
};

export const SHAPE = {
  cardRadiusPx: RADIUS.card,
  borderWidthPx: 1,
  minTouchTargetPx: 44,
  mobileMinWidthPx: 360,
  mobileBreakpointPx: 768,
};

/**
 * A.8 — map node colours per state. Locked text is navy (A.8: "locked-state text"), which keeps
 * it above AA contrast on the grey fill. The revision dot is the warning orange.
 */
export const MAP_NODE_STYLE = {
  mastered: { fill: COLORS.gold, border: COLORS.goldBorder, text: COLORS.navy },
  current: { fill: COLORS.blue, border: COLORS.blue, text: COLORS.card },
  unlocked: { fill: COLORS.card, border: COLORS.blue, text: COLORS.navy },
  locked: { fill: '#E5E7EB', border: '#C7CCD4', text: COLORS.navy },
  needsRevision: {
    fill: COLORS.gold,
    border: COLORS.goldBorder,
    text: COLORS.navy,
    dot: SUPPORT_COLORS.warning,
  },
};

/** A.8 — map edge styles. Cross-unit related links are red dashed. */
export const MAP_EDGE_STYLE = {
  prerequisite: { stroke: COLORS.navy, dashed: false, arrow: true },
  related: { stroke: COLORS.blue, dashed: true, arrow: false },
  crossUnitRelated: { stroke: COLORS.red, dashed: true, arrow: false },
};
