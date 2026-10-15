// Import the token file directly (it has no imports) so Tailwind can load it without a build step.
import { COLORS, FONTS, SHAPE } from '../../packages/shared/src/design-tokens.js';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: COLORS.navy,
        red: COLORS.red,
        blue: COLORS.blue,
        gold: { DEFAULT: COLORS.gold, border: COLORS.goldBorder, tint: COLORS.goldTint },
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
    },
  },
  plugins: [],
};
