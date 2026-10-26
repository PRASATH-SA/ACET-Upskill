import { useEffect } from 'react';
import {
  MotionGlobalConfig,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';

/**
 * Counts up to a number, like a score tally. Strings that start with a number ("3 days",
 * "8 / 14") count the number and keep the rest; anything else renders as is. With reduced
 * motion (or in tests) the final value shows straight away.
 */
export function AnimatedNumber({ value, duration = 0.9 }) {
  const reduce = useReducedMotion();
  const instant = reduce || MotionGlobalConfig.skipAnimations;
  const match =
    typeof value === 'number' && Number.isFinite(value)
      ? [null, String(Math.round(value)), '']
      : /^(\d+)(.*)$/s.exec(String(value ?? ''));
  const target = match ? Number(match[1]) : null;
  const suffix = match ? match[2] : '';

  const count = useMotionValue(instant || target === null ? (target ?? 0) : 0);
  const text = useTransform(count, (v) => `${Math.round(v)}${suffix}`);

  useEffect(() => {
    if (target === null) return undefined;
    if (instant) {
      count.set(target);
      return undefined;
    }
    const controls = animate(count, target, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [count, target, instant, duration]);

  if (target === null) return <>{value}</>;
  return <motion.span>{text}</motion.span>;
}
