// Import the token file directly (it has no imports) so Tailwind can load it without a build step.
import { COLORS, FONTS, SHAPE, SUPPORT_COLORS } from '../../packages/shared/src/design-tokens.js';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: COLORS.navy, dark: SUPPORT_COLORS.navyDark },
        red: { DEFAULT: COLORS.red, dark: SUPPORT_COLORS.redDark },
        blue: { DEFAULT: COLORS.blue, dark: SUPPORT_COLORS.blueDark },
        gold: { DEFAULT: COLORS.gold, border: COLORS.goldBorder, tint: COLORS.goldTint },
        success: SUPPORT_COLORS.success,
        warning: { DEFAULT: SUPPORT_COLORS.warning, dark: SUPPORT_COLORS.warningDark },
        body: COLORS.text,
        line: COLORS.border,
        surface: COLORS.surface,
        card: COLORS.card,
      },
      fontFamily: {
        heading: [FONTS.heading.family, 'system-ui', 'sans-serif'],
        sans: [FONTS.body.family, 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: `${SHAPE.cardRadiusPx}px` },
      lineHeight: { body: String(FONTS.body.lineHeight) },
      minHeight: { touch: `${SHAPE.minTouchTargetPx}px` },
      minWidth: { touch: `${SHAPE.minTouchTargetPx}px` },
      screens: { xs: `${SHAPE.mobileMinWidthPx}px` },
    },
  },
  plugins: [],
};
