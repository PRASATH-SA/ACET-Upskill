import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useIsFetching } from '@tanstack/react-query';
import { Play, Quote } from 'lucide-react';
import { Button } from '../../components/ui';
import { bouncy, soft } from '../../lib/motion';

/** Quotes on learning and skills, one picked at random per splash. */
export const SKILL_QUOTES = [
  {
    text: 'Live as if you were to die tomorrow. Learn as if you were to live forever.',
    by: 'Mahatma Gandhi',
  },
  {
    text: 'Education is the most powerful weapon which you can use to change the world.',
    by: 'Nelson Mandela',
  },
  {
    text: 'Dream, dream, dream. Dreams transform into thoughts and thoughts result in action.',
    by: 'Dr. A. P. J. Abdul Kalam',
  },
  {
    text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.",
    by: 'Dr. Seuss',
  },
  { text: 'An investment in knowledge pays the best interest.', by: 'Benjamin Franklin' },
];

const WORD = 'SKILLUP';
/** Shortest time the loading bar takes, so the welcome can be read. */
const MIN_MS = 1800;

/**
 * Loading progress, 0–100: eases up over MIN_MS but holds at 90% while the home page's first
 * queries are still fetching behind the splash, so START means the app is ready.
 */
function useLoading(instant) {
  const fetching = useIsFetching();
  const fetchingRef = useRef(fetching);
  fetchingRef.current = fetching;
  const [pct, setPct] = useState(instant ? 100 : 0);
  useEffect(() => {
    if (instant) return undefined;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / MIN_MS);
      const eased = 100 * (1 - (1 - t) ** 3);
      const capped = fetchingRef.current > 0 ? Math.min(eased, 90) : eased;
      setPct((p) => Math.max(p, Math.round(capped)));
      if (t < 1 || fetchingRef.current > 0) raf = requestAnimationFrame(tick);
      else setPct(100);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [instant]);
  return pct;
}

/**
 * First-visit welcome, styled like a game's title screen: the logo spins in, SKILLUP bounces in
 * letter by letter, a skills quote appears, a loading bar fills, then PRESS START enters the app.
 * @param {{ name?: string, onStart: () => void }} props
 */
export function Splash({ name, onStart }) {
  const reduce = useReducedMotion();
  const pct = useLoading(Boolean(reduce));
  const ready = pct >= 100;
  const quote = useMemo(() => SKILL_QUOTES[Math.floor(Math.random() * SKILL_QUOTES.length)], []);
  const startRef = useRef(null);

  useEffect(() => {
    if (ready) startRef.current?.focus();
  }, [ready]);
  // The page behind must not scroll while the title screen is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="splash-title"
      aria-describedby="splash-quote"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.08, filter: 'blur(6px)' }}
      transition={{ duration: 0.45 }}
      className="bg-sunburst fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      {/* Slowly turning rays behind everything, like a level-select screen. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[38%] h-[160vmax] w-[160vmax] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            'repeating-conic-gradient(from 0deg, rgb(255 255 255 / 0.16) 0deg 7deg, transparent 7deg 20deg)',
        }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={onStart}
        className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] text-navy hover:bg-white/40"
      >
        Skip
      </Button>

      <div className="relative flex w-full max-w-md flex-col items-center">
        <motion.img
          src="/brand/achariya-25-320.webp"
          alt="Achariya, 25 years"
          width={112}
          height={112}
          initial={reduce ? false : { scale: 0, rotate: -270 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...bouncy, delay: 0.1 }}
          className="h-24 w-24 rounded-2xl shadow-glass-lg sm:h-28 sm:w-28"
        />

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...soft, delay: 0.45 }}
          className="mt-5 text-xs font-bold uppercase tracking-[0.3em] text-navy"
        >
          {name ? `Welcome, ${name.split(' ')[0]}, to` : 'Welcome to'}
        </motion.p>

        <h1 id="splash-title" className="mt-1 leading-none">
          <span className="sr-only">Welcome to SkillUp Achariya</span>
          <span aria-hidden className="flex justify-center">
            {WORD.split('').map((ch, i) => (
              <motion.span
                key={i}
                initial={reduce ? false : { y: -60, opacity: 0, rotate: -20 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ ...bouncy, delay: 0.6 + i * 0.07 }}
                className="inline-block font-heading text-5xl font-extrabold text-brand-deep drop-shadow-[0_3px_0_rgba(255,255,255,0.7)] sm:text-6xl"
              >
                {ch}
              </motion.span>
            ))}
          </span>
          <motion.span
            aria-hidden
            initial={reduce ? false : { opacity: 0, letterSpacing: '0.1em' }}
            animate={{ opacity: 1, letterSpacing: '0.45em' }}
            transition={{ duration: 0.8, delay: 1.15 }}
            className="mt-2 block pl-[0.45em] font-heading text-lg font-bold text-navy sm:text-xl"
          >
            ACHARIYA
          </motion.span>
        </h1>

        <motion.figure
          initial={reduce ? false : { opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...soft, delay: 1.35 }}
          className="mt-6 w-full rounded-card border border-white/70 bg-white/80 px-5 py-4 text-left shadow-card backdrop-blur"
        >
          <Quote className="h-5 w-5 text-brand" aria-hidden />
          <blockquote id="splash-quote" className="mt-1 text-sm font-medium text-navy">
            {quote.text}
          </blockquote>
          <figcaption className="mt-2 text-xs font-semibold text-brand-deep">
            — {quote.by}
          </figcaption>
        </motion.figure>

        <div className="mt-7 h-[60px] w-full">
          {ready ? (
            <motion.div
              initial={reduce ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={bouncy}
            >
              <motion.div
                animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-block"
              >
                <Button
                  ref={startRef}
                  size="lg"
                  icon={Play}
                  onClick={onStart}
                  className="tracking-[0.2em]"
                >
                  PRESS START
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            <div>
              <div
                role="progressbar"
                aria-label="Loading SkillUp"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                className="h-4 w-full overflow-hidden rounded-full border-2 border-white bg-white/50 shadow-inner"
              >
                <div
                  className="shine h-full rounded-full bg-cta-gradient transition-[width] duration-150"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-navy">
                Loading your skills… {pct}%
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
