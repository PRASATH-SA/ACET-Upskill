import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setAccessToken } from '../../api/client';
import { json, mockApi, renderApp, users } from '../../test/render';
import { useSession } from '../auth/session';
import { labNodes } from './LabPage';

const pspp = {
  id: 'th1',
  code: 'CSC26103',
  name: 'Python Programming',
  semester: 1,
  kind: 'theory',
  theorySubjectId: null,
};
const lab = {
  id: 'lab1',
  code: 'CSC26P03',
  name: 'Python Programming Lab',
  semester: 1,
  kind: 'practical',
  theorySubjectId: 'th1',
};

const labData = (done = false) => ({
  subject: { id: 'lab1', code: 'CSC26P03', name: 'Python Programming Lab', semester: 1 },
  theorySubject: { id: 'th1', code: 'CSC26103', name: 'Python Programming' },
  roadmap: {
    units: [{ id: 'u1', number: 1, title: 'Introduction to Python' }],
    topics: [
      { id: 't1', unitId: 'u1', title: 'Variables', summary: '', order: 0 },
      { id: 't2', unitId: 'u1', title: 'Operators', summary: '', order: 1 },
      { id: 't3', unitId: 'u1', title: 'History of Python', summary: '', order: 2 },
    ],
  },
  experiments: [
    {
      id: 'e1',
      number: 1,
      title: 'Swap two numbers',
      aim: 'To swap two numbers.',
      procedure: '1. Read a and b',
      topicId: 't1',
      challenges: [
        { id: 'c1', title: 'Swap', difficulty: 'easy', language: 'python', solved: done },
      ],
      markedDone: false,
      done,
    },
    {
      id: 'e2',
      number: 2,
      title: 'Simple calculator',
      aim: 'To use operators.',
      procedure: '',
      topicId: 't2',
      challenges: [],
      markedDone: false,
      done: false,
    },
  ],
  summary: { total: 2, done: done ? 1 : 0 },
});

describe('lab roadmap states', () => {
  it('marks topics done when all experiments are done; the first with work left is current', () => {
    const byTopic = new Map([
      ['a', [{ done: true }]],
      ['b', [{ done: true }, { done: false }]],
      ['c', [{ done: false }]],
    ]);
    const { currentTopicId, nodes } = labNodes(['a', 'b', 'c'], byTopic);
    expect(currentTopicId).toBe('b');
    expect(nodes.map((n) => n.state)).toEqual(['mastered', 'current', 'unlocked']);
  });
});

describe('student labs (ADR 0012)', () => {
  beforeEach(() => {
    useSession.setState({ status: 'authenticated', user: users.student, expired: false });
    setAccessToken('tok');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    setAccessToken(null);
  });

  it('the home page separates theory and practical subjects', async () => {
    mockApi({
      'GET /subjects': [pspp, lab],
      'GET /me/progress': {
        subjects: [
          {
            subjectId: 'th1',
            code: 'CSC26103',
            name: 'Python Programming',
            semester: 1,
            totalTopics: 14,
            counts: { confident: 2, learning: 1 },
          },
        ],
        revision: { streakDays: 0, dueNow: 0 },
      },
      'GET /revision/today': { total: 0, groups: [] },
      'GET /subjects/th1/map/me': { currentTopicId: null, nodes: [] },
      'GET /subjects/lab1/lab': labData(true),
    });
    renderApp('/learn');
    const theory = (await screen.findByRole('heading', { name: 'Theory' })).nextElementSibling;
    expect(within(theory).getByText('Python Programming')).toBeInTheDocument();
    expect(within(theory).queryByText('Python Programming Lab')).not.toBeInTheDocument();

    const practical = screen.getByRole('heading', { name: 'Practical' }).nextElementSibling;
    const card = within(practical).getByRole('link');
    expect(card).toHaveAttribute('href', '/labs/lab1');
    expect(within(card).getByText('Roadmap: Python Programming')).toBeInTheDocument();
    expect(await within(card).findByText('1 of 2 experiments done')).toBeInTheDocument();
  });

  it('the lab page shows the theory roadmap with its experiments, and marks one done', async () => {
    const marks = [];
    mockApi({
      'GET /subjects/lab1/lab': labData(),
      'POST /experiments/:id/done': (url, init) => {
        marks.push({ url: String(url), body: JSON.parse(init.body) });
        return json(200, { data: { markedDone: true } });
      },
    });
    vi.stubGlobal('matchMedia', (q) => ({
      matches: q.includes('min-width: 1024px'),
      addEventListener() {},
      removeEventListener() {},
    }));
    renderApp('/labs/lab1');
    expect(
      await screen.findByRole('heading', { name: 'Python Programming Lab' }),
    ).toBeInTheDocument();
    expect(screen.getByText('0 of 2 experiments done')).toBeInTheDocument();

    // The roadmap keeps the theory topics that have experiments, in roadmap order.
    expect(screen.getByRole('button', { name: /^Variables\. / })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Operators\. / })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^History of Python/ })).not.toBeInTheDocument();

    // The current topic's experiments show beside the roadmap, with their problems.
    const panel = screen.getByRole('complementary', { name: 'Experiments for the selected topic' });
    expect(within(panel).getByText('Swap two numbers')).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: /Swap/ })).toHaveAttribute('href', '/code/c1');

    await userEvent.click(within(panel).getByRole('button', { name: 'Mark as done' }));
    await waitFor(() => expect(marks).toHaveLength(1));
    expect(marks[0].url).toMatch(/experiments\/e1\/done/);
    expect(marks[0].body).toEqual({ done: true });

    // The list view shows every experiment in number order.
    await userEvent.click(screen.getByRole('button', { name: 'All experiments' }));
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(['Swap two numbers', 'Simple calculator']);
  });
});
