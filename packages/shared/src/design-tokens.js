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

/**
 * Themeable colours (dark mode, ADR 0014). The web app turns each key into a CSS variable, so
 * `bg-card`, `text-navy`, `border-line` … switch with the `dark` class on <html>. Brand magenta,
 * gold and the CTA colours do not change. Dark values keep text above WCAG AA on `card`.
 */
export const THEME_COLORS = {
  light: {
    navy: COLORS.navy,
    body: COLORS.text,
    line: COLORS.border,
    surface: COLORS.surface,
    card: COLORS.card,
    goldTint: COLORS.goldTint,
    brandSoft: BRAND_COLORS.brandSoft,
    successSoft: BRAND_COLORS.successSoft,
    inkSubtle: BRAND_COLORS.inkSubtle,
    success: SUPPORT_COLORS.success,
    warningDark: SUPPORT_COLORS.warningDark,
    redDark: SUPPORT_COLORS.redDark,
  },
  dark: {
    navy: '#ECEAF5', // headings and strong text (14.6:1 on card)
    body: '#BAB7C8', // body copy (8.4:1 on card)
    line: '#34303F',
    surface: '#131118', // page
    card: '#1E1B26',
    goldTint: '#3A3016',
    brandSoft: '#3E1B30',
    successSoft: '#17361E',
    inkSubtle: '#8A879A',
    success: '#5BC266',
    warningDark: '#F5A25B',
    redDark: '#FF8A80',
  },
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

/** "#22355E" → "34 53 94", for rgb(var(--x) / <alpha-value>) so opacity modifiers keep working. */
const channels = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' ');
};
/** The CSS variable behind a themeable colour: `cardHover` → `--c-card-hover`. */
export const themeCssVar = (key) => `--c-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
/** A palette from THEME_COLORS as CSS variables (Tailwind base styles, or an inline style). */
export const themeCssVars = (palette) =>
  Object.fromEntries(Object.entries(palette).map(([k, v]) => [themeCssVar(k), channels(v)]));

/**
 * Pastel card colours of the cheat-sheet poster image (ADR 0016). The poster is always drawn on
 * white, so these are fixed values, not theme variables. `ink` keeps WCAG AA on `tint`; `wash` is
 * the card body, `tint` its header and inner boxes.
 */
export const CHEAT_POSTER_COLORS = {
  blue: { wash: '#F5F8FF', tint: '#E8F0FE', border: '#BFD3FB', ink: '#1D4ED8' },
  green: { wash: '#F4FBF6', tint: '#E6F6EC', border: '#B5E3C5', ink: '#15803D' },
  orange: { wash: '#FFF9F2', tint: '#FFF0E0', border: '#FBD2A6', ink: '#C2410C' },
  purple: { wash: '#F9F6FF', tint: '#F1EAFE', border: '#D5C3FA', ink: '#6D28D9' },
  sky: { wash: '#F3FAFD', tint: '#E3F5FC', border: '#AEE0F4', ink: '#0369A1' },
  pink: { wash: '#FFF5F9', tint: '#FDE8F1', border: '#F7BCD6', ink: '#BE185D' },
  yellow: { wash: '#FFFCF0', tint: '#FFF8DB', border: '#F5DE85', ink: '#A16207' },
  mint: { wash: '#F3FCF8', tint: '#E3F8EF', border: '#A8E6C9', ink: '#047857' },
  marker: '#FDE047',
  /** The title bar: navy with the key words in marker yellow, and pink pills. */
  bar: { bg: '#14254A', pill: '#F9A8D4', pillText: '#14254A' },
  code: { keyword: '#1D4ED8', string: '#DC2626', number: '#15803D', comment: '#64748B' },
};
