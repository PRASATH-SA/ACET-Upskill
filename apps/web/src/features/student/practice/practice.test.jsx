import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setAccessToken } from '../../../api/client';
import { json, mockApi, renderApp, users } from '../../../test/render';
import { useSession } from '../../auth/session';
import { useOutbox } from './outbox';

const quiz = {
  topicId: 't1',
  questions: [
    {
      id: 'q1',
      stem: 'Which normal form removes partial dependency?',
      options: ['1NF', '2NF', '3NF', 'BCNF'],
      difficulty: 'easy',
    },
    {
      id: 'q2',
      stem: 'A transitive dependency violates?',
      options: ['1NF', '2NF', '3NF', 'None'],
      difficulty: 'medium',
    },
  ],
};

const submitResult = {
  quizId: 'x',
  score: 50,
  correct: 1,
  total: 2,
  results: [
    {
      questionId: 'q1',
      selectedIndex: 1,
      correctIndex: 1,
      correct: true,
      explanation: '2NF removes partial dependency.',
      optionExplanations: ['', 'Yes.', '', ''],
    },
    {
      questionId: 'q2',
      selectedIndex: 0,
      correctIndex: 2,
      correct: false,
      explanation: '3NF removes transitive dependency.',
      optionExplanations: ['1NF is about atomic values.', '', 'Yes.', ''],
      whyWrong: '1NF is about atomic values.',
    },
  ],
  mastery: { before: { state: 'learning' }, after: { state: 'practicing' } },
  enrolled: { flashcards: 3, questions: 1 },
};

const page = {
  topic: {
    id: 't1',
    title: 'Normalization',
    summary: '',
    subject: { id: 's1', code: 'CS', name: 'DBMS' },
  },
  flashcardCount: 0,
  questionCount: 2,
  prerequisites: [],
  unlocks: [],
};

beforeEach(() => {
  useSession.setState({ status: 'authenticated', user: users.student, expired: false });
  setAccessToken('tok');
  useOutbox.setState({ pending: [], flushing: false });
});
afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
});

describe('quiz player (F5)', () => {
  it('collects answers, submits once, reviews each result, then summarises', async () => {
    let submitted = null;
    mockApi({
      'GET /topics/t1/page': page,
      'GET /topics/t1/quiz': quiz,
      'POST /quiz/submit': (_u, init) => {
        submitted = JSON.parse(init.body);
        return json(200, { data: submitResult });
      },
    });
    renderApp('/topics/t1/quiz');
    const user = userEvent.setup();

    expect(
      await screen.findByRole('heading', { name: quiz.questions[0].stem }),
    ).toBeInTheDocument();
    // Nothing reveals correctness before submission.
    expect(screen.queryByLabelText('Correct answer')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    await user.keyboard('2'); // keyboard shortcut selects option 2
    await user.keyboard('{Enter}');
    expect(
      await screen.findByRole('heading', { name: quiz.questions[1].stem }),
    ).toBeInTheDocument();
    await user.click(screen.getByLabelText(/Option A/));
    await user.click(screen.getByRole('button', { name: 'Submit quiz' }));

    await waitFor(() => expect(submitted).not.toBeNull());
    expect(submitted).toEqual({
      topicId: 't1',
      answers: [
        { questionId: 'q1', selectedIndex: 1 },
        { questionId: 'q2', selectedIndex: 0 },
      ],
    });

    expect(await screen.findByText('Correct')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Not quite')).toBeInTheDocument();
    expect(screen.getByText(/Why your choice is wrong/).parentElement).toHaveTextContent(
      '1NF is about atomic values.',
    );
    await user.click(screen.getByRole('button', { name: 'See summary' }));

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Practicing')).toBeInTheDocument();
    expect(screen.getByText('Was Learning')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Revise these' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start revision' })).toHaveAttribute(
      'href',
      '/revision',
    );
  });
});

describe('revision session (F5)', () => {
  const today = {
    total: 2,
    groups: [
      {
        topicId: 't1',
        title: 'Normalization',
        subjectId: 's1',
        count: 2,
        items: [
          {
            reviewId: 'r1',
            itemType: 'flashcard',
            itemId: 'f1',
            front: 'What is 1NF?',
            back: 'Atomic values',
          },
          {
            reviewId: 'r2',
            itemType: 'flashcard',
            itemId: 'f2',
            front: 'What is 2NF?',
            back: 'No partial deps',
          },
        ],
      },
    ],
  };

  it('shows "All caught up" when nothing is due', async () => {
    mockApi({ 'GET /revision/today': { total: 0, groups: [] } });
    renderApp('/revision');
    expect(await screen.findByText('All caught up')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open my subjects' })).toBeInTheDocument();
  });

  it('keeps working offline after loading and syncs ratings when back online', async () => {
    const rated = [];
    let online = true;
    mockApi({
      'GET /revision/today': today,
      'POST /revision/:id/rate': (url, init) => {
        if (!online) return Promise.reject(new TypeError('Failed to fetch'));
        rated.push([String(url), JSON.parse(init.body).rating]);
        return json(200, { data: { nextDue: '2026-10-20' } });
      },
    });
    renderApp('/revision');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Start revision/ }));

    online = false; // the network drops mid-session
    await user.click(screen.getByRole('button', { name: /What is 1NF\?/ }));
    await user.click(screen.getByRole('button', { name: /^Again/ }));
    expect(await screen.findByText('What is 2NF?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /What is 2NF\?/ }));
    await user.keyboard('4'); // "easy" shortcut
    expect(await screen.findByText('Session complete')).toBeInTheDocument();
    expect(screen.getByText(/2 ratings waiting to sync/)).toBeInTheDocument();
    expect(rated).toEqual([]);

    online = true;
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(rated).toHaveLength(2));
    expect(rated.map(([u, r]) => [u.split('/').at(-2), r])).toEqual([
      ['r1', 'again'],
      ['r2', 'easy'],
    ]);
    expect(useOutbox.getState().pending).toEqual([]);
  });
});

describe('exam prep (F5)', () => {
  it('ranks the most asked topics and sends filters to the API', async () => {
    const fetchMock = mockApi({
      'GET /subjects': [
        { id: 's0', code: 'CSC26103', name: 'Problem Solving and Python Programming', semester: 1 },
        { id: 's1', code: 'CS', name: 'Database Management Systems', semester: 5 },
      ],
      'GET /subjects/s0/exam-prep': { subjectId: 's0', years: 5, untaggedCount: 0, topics: [] },
      'GET /subjects/s0/map': {
        subject: { id: 's0', code: 'CSC26103', name: 'PSPP', semester: 1 },
        units: [],
        topics: [],
        links: [],
      },
      'GET /subjects/s1/map': {
        subject: { id: 's1', code: 'CS', name: 'DBMS', semester: 5 },
        units: [{ id: 'u3', number: 3, title: 'Design' }],
        topics: [],
        links: [],
      },
      'GET /subjects/s1/exam-prep': {
        subjectId: 's1',
        years: 5,
        untaggedCount: 0,
        topics: [
          {
            topicId: 't1',
            title: 'Normalization',
            unit: { id: 'u3', number: 3, title: 'Design' },
            frequency: 4,
            marksBreakdown: { 10: 3, 2: 1 },
            pyqs: [{ id: 'p1', text: 'Explain 3NF.', marks: 10, examDate: '2024-11-01' }],
          },
          {
            topicId: 't2',
            title: 'Keys',
            unit: { id: 'u3', number: 3, title: 'Design' },
            frequency: 0,
            marksBreakdown: {},
            pyqs: [],
          },
        ],
      },
    });
    renderApp('/exam-prep/s1');
    const user = userEvent.setup();
    expect(await screen.findByText('Explain 3NF.')).toBeInTheDocument();
    // No previous-year wording and no "asked N×" counts.
    expect(screen.queryByText(/Asked d+×/)).not.toBeInTheDocument();
    expect(screen.queryByText('Most asked')).not.toBeInTheDocument();
    expect(screen.queryByText(/previous-year/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Study material' })[0]).toHaveAttribute(
      'href',
      '/topics/t1#step-prepare',
    );
    await user.selectOptions(screen.getByLabelText('Marks'), '10');
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([u]) => String(u).includes('exam-prep') && String(u).includes('marks=10'),
        ),
      ).toBe(true),
    );

    // One tab per subject: the URL opened DBMS; PSPP is its own component.
    expect(screen.getByRole('tab', { name: 'Database Management Systems' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Database Management Systems' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Problem Solving and Python Programming' }));
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Problem Solving and Python Programming',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/previous-year/i)).not.toBeInTheDocument();
  }, 20_000);
});
