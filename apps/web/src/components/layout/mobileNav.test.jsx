import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { NAV } from '../../app/nav';
import { BackBar, BottomTabs, sectionOf } from './MobileNav';

const faculty = NAV.faculty;

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function wrap(ui, path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              {ui}
              <Where />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('mobile bottom tabs', () => {
  it('shows four short tabs plus More, and More lists every page', async () => {
    wrap(<BottomTabs items={faculty} />, '/studio');
    const tabs = screen.getByRole('navigation', { name: 'Main' });
    expect(within(tabs).getByRole('link', { name: 'Questions' })).toHaveAttribute(
      'href',
      '/studio/questions',
    );
    expect(within(tabs).getByRole('link', { name: 'Forms' })).toBeInTheDocument();
    expect(within(tabs).queryByRole('link', { name: 'Leaderboard' })).not.toBeInTheDocument();

    await userEvent.click(within(tabs).getByRole('button', { name: 'More' }));
    const sheet = await screen.findByRole('dialog', { name: 'All pages' });
    for (const item of faculty)
      expect(within(sheet).getByRole('link', { name: item.label })).toBeInTheDocument();
    expect(within(sheet).getByRole('link', { name: 'My profile' })).toBeInTheDocument();

    await userEvent.click(within(sheet).getByRole('link', { name: 'Student progress' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/studio/students');
    expect(screen.queryByRole('dialog', { name: 'All pages' })).not.toBeInTheDocument();
  });

  it('has no More tab when every page fits', () => {
    wrap(<BottomTabs items={NAV.mentor} />, '/mentor');
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
  });
});

describe('back bar', () => {
  it('is hidden on menu pages', () => {
    wrap(<BackBar items={faculty} />, '/studio/questions');
    expect(screen.queryByRole('navigation', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('shows where you are and goes to the section when there is no history', async () => {
    wrap(<BackBar items={faculty} />, '/studio/topics/t1');
    const bar = screen.getByRole('navigation', { name: 'Back' });
    expect(within(bar).getByRole('link', { name: 'Studio' })).toHaveAttribute('href', '/studio');
    expect(within(bar).getByText('Topic editor')).toHaveAttribute('aria-current', 'page');
    await userEvent.click(within(bar).getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/studio$/);
  });

  it('picks the most specific menu page as the section', () => {
    expect(sectionOf(faculty, '/studio/students/s1').label).toBe('Student progress');
    expect(sectionOf(faculty, '/studio/subjects/s1').label).toBe('Studio');
  });
});
