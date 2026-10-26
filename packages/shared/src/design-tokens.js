/**
 * Design tokens: the Achariya "25 years" brand palette (ADR 0010, 2026-10-23), sampled from the
 * logo in apps/web/public/brand/achariya-25.png, on the E-Learning Kit structure (ADR 0008).
 * The Tailwind config imports these values.
 *
 * The A.8 key names (navy, red, blue, …) are kept so every existing utility class keeps working:
 * `navy` is the logo's navy, `blue` its magenta (`brand`), `red` the danger red, `gold` its yellow.
 */
export const COLORS = {
  navy: '#22355E', // logo "World Class Education" navy — headings, body copy (11.9:1 on white)
  red: '#D92D20', // danger — destructive actions and error states only
  blue: '#C81D78', // brand magenta, deepened for AA — current topic, links, focus (5.4:1 with white)
  gold: '#F2C014', // logo sunburst yellow — mastered topics and achievements
  goldBorder: '#C99A00',
  goldTint: '#FFF6D6',
  text: '#5B6478', // ink-muted — secondary copy (5.9:1 on white, 5.5:1 on surface)
  border: '#F1E4CC', // warm hairline
  surface: '#FFF8EC', // warm cream page background (from the logo's yellow)
  card: '#FFFFFF',
};

/** The rest of the brand palette. */
export const BRAND_COLORS = {
  brand: '#C81D78', // buttons and active states (white on it 5.4:1)
  brandLogo: '#E02888', // the logo's exact magenta: decoration and large type only (white 4.4:1)
  brandDeep: '#9E1360',
  brandSoft: '#FDE8F3',
  gradStart: '#C81D78', // CTA gradient: magenta → tagline red, like the logo's lettering
  gradEnd: '#E0452C',
  accent: '#F29F1B', // logo orange glow: play button, sunburst, highlights (icons only)
  accentInk: '#A85C00', // orange as text (5.0:1 on white)
  rating: '#F29F1B',
  successSoft: '#E8F5E9',
  inkSubtle: '#9AA0B0',
  onBrand: '#FFFFFF',
};

/**
 * Supporting shades. Darker variants keep small text on tinted backgrounds above WCAG AA 4.5:1;
 * success and warning are for status badges and the revision dot only.
 */
export const SUPPORT_COLORS = {
  navyDark: '#16233F',
  redDark: '#B42318', // danger as small text (6.6:1 on white)
  blueDark: BRAND_COLORS.brandDeep,
  success: '#2E7D32', // logo underline green, deepened (5.1:1 on white)
  warning: '#F28C28',
  warningDark: '#8A4A0B',
};

/** One family, Poppins, for headings and body. */
export const FONTS = {
  heading: { family: 'Poppins', weights: [600, 700] },
  body: { family: 'Poppins', weights: [400, 500, 600], lineHeight: 1.6 },
};

/** Small label placed above a heading, in the brand magenta. */
export const EYEBROW = {
  fontSizePx: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: BRAND_COLORS.brand,
};

/**
 * Radius scale: tags and thumbnails 6px, inputs and rows 10px, cards, tiles and the player
 * 14px; buttons, tabs, progress bars and the FAB stay pills.
 */
export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 10,
  xl: 10,
  '2xl': 14,
  card: 14,
  sheet: 20,
};

/** Two elevation levels, tinted with the brand magenta. */
export const SHADOWS = {
  card: '0 4px 16px rgba(158, 19, 96, 0.07)',
  cta: '0 8px 20px rgba(200, 29, 120, 0.30)',
};

export const SHAPE = {
  cardRadiusPx: RADIUS.card,
  borderWidthPx: 1,
  minTouchTargetPx: 44,
  mobileMinWidthPx: 360,
  mobileBreakpointPx: 768,
};

/**
 * Map node colours per state. Locked text is navy, which keeps it above AA contrast on the grey
 * fill. The revision dot is the warning orange.
 */
export const MAP_NODE_STYLE = {
  mastered: { fill: COLORS.gold, border: COLORS.goldBorder, text: COLORS.navy },
  current: { fill: COLORS.blue, border: COLORS.blue, text: COLORS.card },
  unlocked: { fill: COLORS.card, border: COLORS.blue, text: COLORS.navy },
  locked: { fill: '#EFEBE4', border: '#D6CFC2', text: COLORS.navy },
  needsRevision: {
    fill: COLORS.gold,
    border: COLORS.goldBorder,
    text: COLORS.navy,
    dot: SUPPORT_COLORS.warning,
  },
};

/** Map edge styles. Cross-unit related links are dashed in the orange accent ink. */
export const MAP_EDGE_STYLE = {
  prerequisite: { stroke: COLORS.navy, dashed: false, arrow: true },
  related: { stroke: COLORS.blue, dashed: true, arrow: false },
  crossUnitRelated: { stroke: BRAND_COLORS.accentInk, dashed: true, arrow: false },
};
