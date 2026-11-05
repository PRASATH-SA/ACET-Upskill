import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Brain, Map } from 'lucide-react';
import { Toaster } from '../../components/ui';
import { matchesNav, useOnboarding } from '../../lib/onboarding';
import { ExplorerQuest } from './ExplorerQuest';
import { SKILL_QUOTES, Splash } from './Splash';

// Reduced motion makes the splash load instantly, so START is reachable without timers.
vi.mock('framer-motion', async (orig) => ({ ...(await orig()), useReducedMotion: () => true }));

const items = [
  { to: '/learn', label: 'Learn', icon: Map },
  { to: '/revision', label: 'Revision', icon: Brain },
];

function wrap(ui, path = '/') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
      <Toaster />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useOnboarding.setState({ userId: null, state: {} });
  useOnboarding.getState().load('u1');
});
afterEach(() => localStorage.clear());

describe('welcome splash', () => {
  it('welcomes the user to SkillUp Achariya with a skills quote and starts on PRESS START', async () => {
    const onStart = vi.fn();
    wrap(<Splash name="Priya Raman" onStart={onStart} />);
    const dialog = screen.getByRole('dialog', { name: 'Welcome to SkillUp Achariya' });
    expect(dialog).toHaveTextContent('Welcome, Priya, to');
    expect(SKILL_QUOTES.some((q) => dialog.textContent.includes(q.text))).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'PRESS START' }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('remembers per user that the splash was seen', () => {
    useOnboarding.getState().finishSplash();
    useOnboarding.setState({ userId: null, state: {} });
    useOnboarding.getState().load('u1');
    expect(useOnboarding.getState().state.splashSeen).toBe(true);
    useOnboarding.getState().load('u2');
    expect(useOnboarding.getState().state.splashSeen).toBeUndefined();
  });
});

describe('explorer quest', () => {
  it('matches nav pages exactly for `end` items and by prefix otherwise', () => {
    expect(matchesNav({ to: '/studio', end: true }, '/studio/review')).toBe(false);
    expect(matchesNav({ to: '/studio/review' }, '/studio/review/x')).toBe(true);
    expect(matchesNav({ to: '/learn' }, '/learning')).toBe(false);
  });

  it('ticks off the visited page, lists the rest, and retires when all are explored', async () => {
    const { rerender } = wrap(<ExplorerQuest items={items} pathname="/learn" />, '/learn');
    expect(await screen.findByText('Explored: Learn')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Explorer quest: 1 of 2 pages explored' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('dialog', { name: 'Explorer quest' })).toHaveTextContent(
      'Revision',
    );

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ExplorerQuest items={items} pathname="/revision" />
        </MemoryRouter>
        <Toaster />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Explorer badge unlocked!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Explorer quest/ })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('acet:onboarding:u1'))).toMatchObject({
      explored: ['/learn', '/revision'],
      questDone: true,
    });
  });
});
