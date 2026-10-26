import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Flame, Lock, Sparkles, Star, Trophy, Zap } from 'lucide-react';
import { XP_PER_STATE } from '@acet/shared';
import { AnimatedNumber, focusRing } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { bouncy, item, soft, stagger } from '../../../lib/motion';
import { achievementIcon } from './icons';

/** Streak flame: flickers while a streak is alive, grey when it is not. */
export function StreakFlame({ days, className }) {
  const alive = days > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-bold',
        alive ? 'text-rating' : 'text-ink-subtle',
        className,
      )}
    >
      <motion.span
        aria-hidden
        animate={alive ? { scale: [1, 1.18, 0.95, 1.1, 1], rotate: [0, -6, 4, -2, 0] } : {}}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="inline-flex"
      >
        <Flame className="h-4 w-4" fill={alive ? 'currentColor' : 'none'} />
      </motion.span>
      <span className="text-navy">
        <AnimatedNumber value={days} />
      </span>
      <span className="sr-only"> day revision streak</span>
    </span>
  );
}

/** Level coin with the XP bar under it, for the top bar. Links to the progress page. */
export function LevelBadge({ game, streak }) {
  if (!game) return null;
  return (
    <motion.div
      {...{ initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 } }}
      transition={soft}
    >
      <Link
        to="/me/progress"
        aria-label={`Level ${game.level} ${game.title}, ${game.xp} XP, ${game.xpForNext - game.xpIntoLevel} XP to the next level. ${streak} day streak.`}
        className={cn(
          'flex min-h-[44px] items-center gap-3 rounded-full border border-line bg-surface py-1 pl-1 pr-3 hover:border-brand/40 hover:no-underline',
          focusRing,
        )}
      >
        <motion.span
          aria-hidden
          key={game.level}
          initial={{ scale: 0.3, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          whileHover={{ rotate: 360 }}
          transition={bouncy}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand font-heading text-sm font-bold text-white shadow-press-red-sm"
        >
          {game.level}
        </motion.span>
        <span aria-hidden className="hidden w-24 lg:block">
          <span className="flex items-center justify-between text-[11px] font-semibold text-navy">
            <span>{game.title}</span>
            <span className="inline-flex items-center gap-0.5 text-brand">
              <Zap className="h-3 w-3" fill="currentColor" />
              <AnimatedNumber value={game.xp} />
            </span>
          </span>
          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-line">
            <motion.span
              className="block h-full rounded-full bg-cta-gradient"
              initial={{ width: 0 }}
              animate={{ width: `${game.pct}%` }}
              transition={soft}
            />
          </span>
        </span>
        <StreakFlame days={streak} className="text-sm" />
      </Link>
    </motion.div>
  );
}

/** The home page's level card: level coin, title, XP to the next level, and how to earn XP. */
export function LevelCard({ game, streak }) {
  if (!game) return null;
  const toNext = game.xpForNext - game.xpIntoLevel;
  return (
    <motion.section
      aria-labelledby="level-h"
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={soft}
      className="relative overflow-hidden rounded-card border border-line bg-card p-5 shadow-card sm:p-6"
    >
      {/* Slow-floating sparkles in the corner. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -right-4 -top-4 text-brand/15"
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      >
        <Sparkles className="h-32 w-32" />
      </motion.span>
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <motion.div
          aria-hidden
          initial={{ scale: 0, rotate: -120 }}
          animate={{ scale: 1, rotate: 0 }}
          whileHover={{ scale: 1.08, rotate: 8 }}
          transition={{ ...bouncy, delay: 0.1 }}
          className="relative inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-cta-gradient shadow-cta"
        >
          <span className="absolute inset-1.5 rounded-full border-2 border-white/40" />
          <span className="font-heading text-3xl font-bold text-white">{game.level}</span>
          <motion.span
            className="absolute -right-1 -top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold text-navy shadow-[0_2px_0_0_#C9A100]"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Star className="h-4 w-4" fill="currentColor" />
          </motion.span>
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Level {game.level}</p>
          <h2 id="level-h" className="mt-1 text-xl">
            {game.title}
          </h2>
          <div className="mt-3 flex items-center justify-between text-xs font-semibold text-navy">
            <span className="inline-flex items-center gap-1 text-brand">
              <Zap className="h-3.5 w-3.5" fill="currentColor" aria-hidden />
              <AnimatedNumber value={game.xp} /> XP
            </span>
            <span>
              {toNext} XP to level {game.level + 1}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={`Level ${game.level} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={game.pct}
            className="mt-1.5 h-3 overflow-hidden rounded-full bg-line"
          >
            <motion.div
              className="shine h-full rounded-full bg-cta-gradient"
              initial={{ width: 0 }}
              animate={{ width: `${game.pct}%` }}
              transition={{ ...soft, delay: 0.2 }}
            />
          </div>
          <p className="mt-2 text-xs">
            Earn XP as topics move up: learning +{XP_PER_STATE.learning}, practising +
            {XP_PER_STATE.practicing}, mastered +{XP_PER_STATE.confident}.
          </p>
        </div>
        <div className="flex gap-4 sm:flex-col sm:items-end sm:gap-2">
          <StreakFlame days={streak} className="text-lg" />
          <Link
            to="/me/progress"
            className={cn(
              'inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-gold-tint px-3 text-sm font-semibold text-navy hover:no-underline',
              focusRing,
            )}
          >
            <Trophy className="h-4 w-4 text-gold-border" aria-hidden />
            {game.unlockedCount}/{game.achievements.length} badges
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

/** Achievement badges: unlocked ones are bright coins, locked ones show progress. */
export function AchievementGrid({ achievements }) {
  return (
    <motion.ul {...stagger} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {achievements.map((a) => {
        const Icon = a.unlocked ? achievementIcon(a.icon) : Lock;
        return (
          <motion.li
            key={a.id}
            {...item}
            whileHover={a.unlocked ? { y: -6, rotate: -2 } : { y: -2 }}
            className={cn(
              'flex flex-col items-center rounded-card border p-4 text-center',
              a.unlocked ? 'border-gold-border/50 bg-gold-tint shadow-card' : 'border-line bg-card',
            )}
          >
            <motion.span
              whileHover={a.unlocked ? { rotate: [0, -15, 15, -8, 0], scale: 1.15 } : {}}
              transition={{ duration: 0.6 }}
              className={cn(
                'inline-flex h-14 w-14 items-center justify-center rounded-full',
                a.unlocked
                  ? 'bg-gold text-navy shadow-[0_3px_0_0_#C9A100]'
                  : 'bg-surface text-ink-subtle',
              )}
            >
              <Icon className="h-6 w-6" aria-hidden />
            </motion.span>
            <p className="mt-2 text-sm font-semibold text-navy">{a.title}</p>
            <p className="text-xs">{a.description}</p>
            {a.unlocked ? (
              <p className="mt-2 text-xs font-semibold text-success">Unlocked</p>
            ) : (
              <div className="mt-2 w-full">
                <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                  <motion.div
                    className="h-full rounded-full bg-brand"
                    initial={{ width: 0 }}
                    animate={{ width: `${(a.current / a.target) * 100}%` }}
                    transition={soft}
                  />
                </div>
                <p className="mt-1 text-[11px]">
                  {a.current} / {a.target}
                </p>
              </div>
            )}
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

/** 0–3 stars that drop in one by one, for quiz results. */
export function StarRating({ stars, label }) {
  return (
    <div role="img" aria-label={label ?? `${stars} of 3 stars`} className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          initial={{ scale: 0, rotate: -120, y: -30 }}
          animate={{ scale: 1, rotate: 0, y: 0 }}
          transition={{ ...bouncy, delay: 0.25 + i * 0.22 }}
          className={i < stars ? 'text-rating' : 'text-line'}
        >
          <Star className="h-10 w-10" fill="currentColor" aria-hidden />
        </motion.span>
      ))}
    </div>
  );
}

/** Combo meter for consecutive correct answers. */
export function ComboMeter({ combo }) {
  return (
    <AnimatePresence>
      {combo >= 2 && (
        <motion.span
          key={combo}
          initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={bouncy}
          className="inline-flex items-center gap-1 rounded-full bg-rating px-3 py-1 text-xs font-bold text-navy shadow-[0_2px_0_0_#b86a00]"
        >
          <Flame className="h-3.5 w-3.5" fill="currentColor" aria-hidden />
          {combo}× combo
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** A "+N" that floats up and fades, for points earned in a session. */
export function PointsPop({ id, points, className }) {
  return (
    <AnimatePresence>
      {id ? (
        <motion.span
          key={id}
          aria-hidden
          initial={{ opacity: 0, y: 6, scale: 0.6 }}
          animate={{ opacity: [0, 1, 1, 0], y: -36, scale: 1.1 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          className={cn(
            'pointer-events-none absolute font-heading text-lg font-bold text-brand',
            className,
          )}
        >
          +{points}
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
