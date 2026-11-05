import { motion } from 'framer-motion';

/**
 * Shared framer-motion presets (ADR 0009). Components import these instead of inventing their
 * own timings, so the whole app moves with one feel: springy, quick and playful.
 * The app root wraps everything in <MotionConfig reducedMotion="user">, so people who ask for
 * less motion get fades without movement.
 */
export const spring = { type: 'spring', stiffness: 420, damping: 28 };
export const bouncy = { type: 'spring', stiffness: 520, damping: 16 };
export const soft = { type: 'spring', stiffness: 220, damping: 26 };

/** Hover / tap feedback for pressable things. */
export const press = {
  whileHover: { scale: 1.04, y: -1 },
  whileTap: { scale: 0.94, y: 1 },
  transition: bouncy,
};
export const pressSmall = {
  whileHover: { scale: 1.08 },
  whileTap: { scale: 0.88 },
  transition: bouncy,
};

/** Enter animations (no exit: content that unmounts is simply removed). */
export const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: soft,
};
export const popIn = {
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1 },
  transition: bouncy,
};

/** Parent/child variants for staggered lists: put `stagger` on the list, `item` on children. */
export const stagger = {
  initial: 'hidden',
  animate: 'show',
  variants: { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } },
};
export const item = {
  variants: {
    hidden: { opacity: 0, y: 16, scale: 0.97 },
    show: { opacity: 1, y: 0, scale: 1, transition: soft },
  },
};

/** Error shake for fields and wrong answers. */
export const shake = { x: [0, -8, 8, -6, 6, -3, 0], transition: { duration: 0.45 } };

const cache = new Map();
/**
 * The motion version of an element name or component (e.g. a router Link), cached so the
 * component identity is stable between renders.
 */
export function motionOf(As) {
  if (typeof As === 'string') return motion[As];
  if (!cache.has(As)) cache.set(As, motion.create ? motion.create(As) : motion(As));
  return cache.get(As);
}
