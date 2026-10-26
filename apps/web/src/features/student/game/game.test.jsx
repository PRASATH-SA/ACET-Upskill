import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { gamify } from '@acet/shared';
import { Toaster, useToastStore } from '../../../components/ui';
import { useSession } from '../../auth/session';
import { users } from '../../../test/render';
import { AchievementGrid, LevelCard, StarRating } from './GameWidgets';
import { useLevelUpWatcher } from './useGame';

const progress = (counts, streakDays = 0) => ({
  subjects: [{ totalTopics: Object.values(counts).reduce((a, b) => a + b, 0), counts }],
  revision: { dueNow: 0, streakDays },
});

function Watcher({ game }) {
  useLevelUpWatcher(game);
  return null;
}

describe('game widgets', () => {
  beforeEach(() => {
    localStorage.clear();
    useToastStore.setState({ toasts: [] });
    useSession.setState({ user: users.student, status: 'authenticated' });
  });

  it('LevelCard shows the level, title and XP to the next level', () => {
    const game = gamify(progress({ confident: 3, notStarted: 2 }, 2)); // 150 XP → level 2
    render(
      <MemoryRouter>
        <LevelCard game={game} streak={2} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Apprentice' })).toBeInTheDocument();
    expect(screen.getByText('150 XP to level 3')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Level 2 progress' })).toHaveAttribute(
      'aria-valuenow',
      '25',
    );
  });

  it('AchievementGrid marks unlocked badges and shows progress on locked ones', () => {
    const game = gamify(progress({ confident: 1, notStarted: 4 }, 1));
    render(<AchievementGrid achievements={game.achievements} />);
    expect(screen.getAllByText('Unlocked').length).toBe(game.unlockedCount);
    expect(screen.getByText('1 / 5')).toBeInTheDocument(); // High five
  });

  it('StarRating has an accessible label', () => {
    render(<StarRating stars={2} />);
    expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeInTheDocument();
  });

  it('celebrates a level up once, but not on the first visit', async () => {
    const low = gamify(progress({ learning: 1, notStarted: 9 }));
    const high = gamify(progress({ confident: 4, notStarted: 6 }));
    const { rerender } = render(
      <>
        <Watcher game={low} />
        <Toaster />
      </>,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    rerender(
      <>
        <Watcher game={high} />
        <Toaster />
      </>,
    );
    expect(await screen.findByText(/Level up! You reached level 2/)).toBeInTheDocument();
    expect(screen.getByText('Achievement unlocked: Got it!')).toBeInTheDocument();
  });
});
