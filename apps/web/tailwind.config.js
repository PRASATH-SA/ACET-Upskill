// Import the token file directly (it has no imports) so Tailwind can load it without a build step.
import {
  BRAND_COLORS,
  COLORS,
  FONTS,
  RADIUS,
  SHADOWS,
  SHAPE,
  SUPPORT_COLORS,
} from '../../packages/shared/src/design-tokens.js';

const px = (n) => `${n}px`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // The A.8 names (navy, red, blue, body, line, surface) carry the E-Learning Kit values
      // (ADR 0008), so existing classes restyle in place. `brand`, `accent`, `ink` are the kit's names.
      colors: {
        navy: { DEFAULT: COLORS.navy, dark: SUPPORT_COLORS.navyDark },
        red: { DEFAULT: COLORS.red, dark: SUPPORT_COLORS.redDark },
        blue: { DEFAULT: COLORS.blue, dark: SUPPORT_COLORS.blueDark },
        brand: {
          DEFAULT: BRAND_COLORS.brand,
          deep: BRAND_COLORS.brandDeep,
          soft: BRAND_COLORS.brandSoft,
          logo: BRAND_COLORS.brandLogo,
        },
        grad: { start: BRAND_COLORS.gradStart, end: BRAND_COLORS.gradEnd },
        accent: { DEFAULT: BRAND_COLORS.accent, ink: BRAND_COLORS.accentInk },
        rating: BRAND_COLORS.rating,
        gold: { DEFAULT: COLORS.gold, border: COLORS.goldBorder, tint: COLORS.goldTint },
        success: { DEFAULT: SUPPORT_COLORS.success, soft: BRAND_COLORS.successSoft },
        warning: { DEFAULT: SUPPORT_COLORS.warning, dark: SUPPORT_COLORS.warningDark },
        ink: { DEFAULT: COLORS.navy, muted: COLORS.text, subtle: BRAND_COLORS.inkSubtle },
        body: COLORS.text,
        line: COLORS.border,
        surface: COLORS.surface,
        card: COLORS.card,
      },
      fontFamily: {
        heading: [FONTS.heading.family, 'Segoe UI', 'system-ui', 'sans-serif'],
        sans: [FONTS.body.family, 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      // The whole radius scale is remapped, so existing rounded-xl / rounded-2xl usages pick it up.
      borderRadius: {
        sm: px(RADIUS.sm),
        md: px(RADIUS.md),
        lg: px(RADIUS.lg),
        xl: px(RADIUS.xl),
        '2xl': px(RADIUS['2xl']),
        '3xl': px(RADIUS.sheet),
        card: px(RADIUS.card),
        sheet: px(RADIUS.sheet),
      },
      // The kit has two elevation levels: shadow-card (resting cards) and shadow-cta (under brand
      // pills). The older glass/press names map onto them so existing screens follow.
      boxShadow: {
        card: SHADOWS.card,
        cta: SHADOWS.cta,
        glass: SHADOWS.card,
        'glass-lg': '0 12px 32px rgba(158, 19, 96, 0.13)',
        'press-red': SHADOWS.cta,
        'press-red-sm': '0 4px 10px rgba(200, 29, 120, 0.24)',
        'press-navy': '0 6px 16px rgba(34, 53, 94, 0.22)',
        'press-navy-sm': '0 3px 8px rgba(34, 53, 94, 0.18)',
        'press-glass': SHADOWS.card,
        'press-glass-sm': 'none',
        'glow-blue': '0 0 0 6px rgb(200 29 120 / 0.14), 0 8px 20px -6px rgb(200 29 120 / 0.45)',
        'glow-gold': '0 0 0 6px rgb(245 192 0 / 0.2), 0 8px 24px -6px rgb(201 161 0 / 0.55)',
        'glow-red': SHADOWS.cta,
      },
      keyframes: {
        'glass-pop': {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'glow-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 0 4px rgb(200 29 120 / 0.16), 0 8px 20px -6px rgb(200 29 120 / 0.4)',
          },
          '50%': {
            boxShadow: '0 0 0 10px rgb(200 29 120 / 0.06), 0 8px 24px -4px rgb(200 29 120 / 0.5)',
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
