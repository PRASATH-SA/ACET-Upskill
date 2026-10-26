import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BRAND_COLORS, COLORS, SUPPORT_COLORS } from '@acet/shared';
import { celebrate, useCelebrations } from './celebrate';

const COLOURS = [
  BRAND_COLORS.brand,
  BRAND_COLORS.accent,
  COLORS.gold,
  BRAND_COLORS.rating,
  SUPPORT_COLORS.success,
  BRAND_COLORS.gradEnd,
];
const COUNT = { sm: 18, md: 34, lg: 60 };

/** One confetti burst: pieces fly out from a point, spin and fall. */
function Burst({ size, x = 0.5, y = 0.45 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: COUNT[size] ?? COUNT.md }, (_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 90 + Math.random() * (size === 'lg' ? 320 : 200);
        return {
          i,
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist - 80,
          rotate: Math.random() * 720 - 360,
          color: COLOURS[i % COLOURS.length],
          w: 6 + Math.random() * 6,
          round: Math.random() > 0.6,
          delay: Math.random() * 0.08,
        };
      }),
    [size],
  );
  return (
    <motion.div
      className="absolute"
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
      exit={{ opacity: 0 }}
    >
      {pieces.map((p) => (
        <motion.span
          key={p.i}
          className="absolute block"
          style={{
            width: p.w,
            height: p.round ? p.w : p.w * 0.45,
            background: p.color,
            borderRadius: p.round ? '999px' : '2px',
          }}
          initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
          animate={{
            x: p.dx,
            y: [0, p.dy, p.dy + 160],
            scale: [0, 1.2, 1],
            rotate: p.rotate,
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: p.delay }}
        />
      ))}
    </motion.div>
  );
}

/** Mount once (the app shell does). Decorative only, hidden from assistive tech. */
export function CelebrationLayer() {
  const bursts = useCelebrations((s) => s.bursts);
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      <AnimatePresence>
        {bursts.map((b) => (
          <Burst key={b.id} {...b} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Fires one burst when `when` turns true (e.g. an accepted submission). */
export function useCelebrateWhen(when, burst) {
  useEffect(() => {
    if (when) celebrate(burst);
    // Fire once per transition to true; the burst options are static at call sites.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [when]);
}
