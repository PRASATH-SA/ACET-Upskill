import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { applyTheme, useUi } from '../../lib/uiStore';
import { ThemeToggle } from './AppShell';

afterEach(() => {
  localStorage.clear();
  useUi.setState({ theme: 'light' });
  applyTheme('light');
});

describe('dark mode toggle', () => {
  it('switches <html> to dark and back, and remembers the choice', async () => {
    useUi.setState({ theme: 'light' });
    render(<ThemeToggle />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(JSON.parse(localStorage.getItem('acet:theme'))).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(JSON.parse(localStorage.getItem('acet:theme'))).toBe('light');
  });
});
