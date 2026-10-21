// Import the token file directly (it has no imports) so Tailwind can load it without a build step.
import {
  COLORS,
  FONTS,
  RADIUS,
  SHAPE,
  SUPPORT_COLORS,
} from '../../packages/shared/src/design-tokens.js';

const px = (n) => `${n}px`;

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
      // The whole radius scale is remapped, so existing rounded-xl / rounded-2xl usages pick it up.
      borderRadius: {
        sm: px(RADIUS.sm - 4),
        md: px(RADIUS.sm),
        lg: px(RADIUS.lg),
        xl: px(RADIUS.xl),
        '2xl': px(RADIUS['2xl']),
        '3xl': px(RADIUS.sheet),
        card: px(RADIUS.card),
        sheet: px(RADIUS.sheet),
      },
      boxShadow: {
        // Soft, navy-tinted elevation plus a bright inner top rim: the glass edge.
        glass:
          'inset 0 1px 0 0 rgb(255 255 255 / 0.9), inset 0 -1px 0 0 rgb(255 255 255 / 0.25), 0 1px 2px 0 rgb(15 45 92 / 0.04), 0 10px 30px -12px rgb(15 45 92 / 0.18)',
        'glass-lg':
          'inset 0 1px 0 0 rgb(255 255 255 / 0.9), 0 2px 6px 0 rgb(15 45 92 / 0.05), 0 24px 60px -20px rgb(15 45 92 / 0.32)',
        // Gamified "press" edge under pill buttons; it collapses when the button is pressed.
        'press-red': `inset 0 1px 0 0 rgb(255 255 255 / 0.35), 0 4px 0 0 ${SUPPORT_COLORS.redDark}`,
        'press-red-sm': `inset 0 1px 0 0 rgb(255 255 255 / 0.35), 0 1px 0 0 ${SUPPORT_COLORS.redDark}`,
        'press-navy': `inset 0 1px 0 0 rgb(255 255 255 / 0.2), 0 4px 0 0 ${SUPPORT_COLORS.navyDark}`,
        'press-navy-sm': `inset 0 1px 0 0 rgb(255 255 255 / 0.2), 0 1px 0 0 ${SUPPORT_COLORS.navyDark}`,
        'press-glass': `inset 0 1px 0 0 rgb(255 255 255 / 0.9), 0 3px 0 0 rgb(15 45 92 / 0.12)`,
        'press-glass-sm': `inset 0 1px 0 0 rgb(255 255 255 / 0.9), 0 1px 0 0 rgb(15 45 92 / 0.12)`,
        'glow-blue': '0 0 0 6px rgb(47 107 234 / 0.16), 0 8px 24px -6px rgb(47 107 234 / 0.55)',
        'glow-gold': '0 0 0 6px rgb(245 192 0 / 0.2), 0 8px 24px -6px rgb(201 161 0 / 0.55)',
        'glow-red': '0 8px 24px -8px rgb(224 38 43 / 0.55)',
      },
      keyframes: {
        'glass-pop': {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'glow-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 0 4px rgb(47 107 234 / 0.18), 0 8px 24px -6px rgb(47 107 234 / 0.45)',
          },
          '50%': {
            boxShadow: '0 0 0 10px rgb(47 107 234 / 0.08), 0 8px 28px -4px rgb(47 107 234 / 0.6)',
          },
        },
        shine: {
          '0%': { transform: 'translateX(-100%)' },
          '60%, 100%': { transform: 'translateX(220%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        // Roadmap (student path view).
        'node-in': {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(0.6)' },
          '70%': { opacity: '1', transform: 'translateY(-3px) scale(1.06)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'path-flow': {
          from: { strokeDashoffset: '28' },
          to: { strokeDashoffset: '0' },
        },
        bob: {
          '0%, 100%': { transform: 'translate(-50%, 0)' },
          '50%': { transform: 'translate(-50%, -6px)' },
        },
        wobble: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '20%': { transform: 'rotate(-8deg)' },
          '40%': { transform: 'rotate(6deg)' },
          '60%': { transform: 'rotate(-4deg)' },
          '80%': { transform: 'rotate(2deg)' },
        },
        'ring-pulse': {
          '0%': { transform: 'scale(1)', opacity: '0.55' },
          '100%': { transform: 'scale(1.45)', opacity: '0' },
        },
      },
      animation: {
        'glass-pop': 'glass-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        shine: 'shine 2.8s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        'node-in': 'node-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'path-flow': 'path-flow 0.9s linear infinite',
        bob: 'bob 1.6s ease-in-out infinite',
        wobble: 'wobble 2.4s ease-in-out infinite',
        'ring-pulse': 'ring-pulse 1.8s ease-out infinite',
      },
      lineHeight: { body: String(FONTS.body.lineHeight) },
      minHeight: { touch: `${SHAPE.minTouchTargetPx}px` },
      minWidth: { touch: `${SHAPE.minTouchTargetPx}px` },
      screens: { xs: `${SHAPE.mobileMinWidthPx}px` },
    },
  },
  plugins: [],
};
