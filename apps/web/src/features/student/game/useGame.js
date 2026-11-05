import { useEffect, useMemo } from 'react';
import { gamify } from '@acet/shared';
import { toast } from '../../../components/ui';
import { useSession } from '../../auth/session';
import { useProgress } from '../api';
import { celebrate } from './celebrate';

/** XP, level and achievements for the signed-in student, derived from GET /me/progress. */
export function useGame(enabled = true) {
  const progress = useProgress(enabled);
  const game = useMemo(() => (progress.data ? gamify(progress.data) : null), [progress.data]);
  return { game, progress };
}

const storeKey = (userId) => `skillup.game.${userId}`;

function readSeen(userId) {
  try {
    return JSON.parse(localStorage.getItem(storeKey(userId)) ?? 'null');
  } catch {
    return null;
  }
}

function writeSeen(userId, seen) {
  try {
    localStorage.setItem(storeKey(userId), JSON.stringify(seen));
  } catch {
    // Storage blocked (private mode): the celebration just may repeat. Nothing else depends on it.
  }
}

/**
 * Celebrates a level up or a newly unlocked achievement once, the first time this device sees
 * it. The very first visit only records the current state, so nobody gets a pile of toasts.
 */
export function useLevelUpWatcher(game) {
  const userId = useSession((s) => s.user?.id);
  useEffect(() => {
    if (!game || !userId) return;
    const unlocked = game.achievements.filter((a) => a.unlocked).map((a) => a.id);
    const seen = readSeen(userId);
    writeSeen(userId, { level: game.level, unlocked });
    if (!seen) return;
    const fresh = game.achievements.filter((a) => a.unlocked && !seen.unlocked?.includes(a.id));
    if (game.level > seen.level) {
      celebrate({ size: 'lg' });
      toast.success(`Level up! You reached level ${game.level}`, `New title: ${game.title}`);
    } else if (fresh.length) {
      celebrate({ size: 'md', y: 0.2 });
    }
    for (const a of fresh) toast.success(`Achievement unlocked: ${a.title}`, a.description);
  }, [game, userId]);
}
