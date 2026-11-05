import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setAccessToken } from '../../../api/client';
import { json, mockApi, renderApp, users } from '../../../test/render';
import { useSession } from '../../auth/session';
import { availableSteps } from '../topic/TopicPage';

const challenge = {
  id: 'c1',
  topicId: 't1',
  title: 'Can phone be a key?',
  difficulty: 'easy',
  language: 'sql',
  solved: false,
  attempts: 0,
  prompt: 'List every **phone** shared by more than one applicant.',
  setupSql: 'CREATE TABLE applicants (…);',
  starterCode: 'SELECT phone, count(*) AS n\nFROM applicants\n;',
  hints: ['GROUP BY phone.', 'HAVING count(*) > 1.'],
  orderMatters: false,
  tables: [
    {
      name: 'applicants',
      rowCount: 6,
      columns: [
        { name: 'app_no', type: 'INTEGER', pk: true },
        { name: 'phone', type: 'TEXT', pk: false },
      ],
      sampleRows: [
        [1, '9840011111'],
        [2, '9840011111'],
      ],
    },
  ],
  lastSubmission: null,
};
const siblings = [
  { id: 'c1', title: 'Can phone be a key?', difficulty: 'easy', solved: false, attempts: 0 },
  { id: 'c2', title: 'Broken foreign keys', difficulty: 'medium', solved: false, attempts: 0 },
];

function setup(extra = {}) {
  useSession.setState({ status: 'authenticated', user: users.student, expired: false });
  setAccessToken('tok');
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
  return mockApi({
    'GET /code-lab/c1': challenge,
    'GET /topics/t1/code-lab': siblings,
    'GET /topics/t1/page': {
      topic: { id: 't1', title: 'Keys', subject: { id: 's1', code: 'CS T53', name: 'DBMS' } },
      flashcardCount: 0,
      questionCount: 0,
      codeChallengeCount: 2,
      prerequisites: [],
      unlocks: [],
    },
    ...extra,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
});

describe('code lab', () => {
  it('counts code problems as practice on the topic page', () => {
    expect(availableSteps({ questionCount: 0, codeChallengeCount: 2 })).toEqual(['practice']);
  });

  it('shows the problem, tables and hints one at a time, starting from the starter code', async () => {
    setup();
    renderApp('/code/c1');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Can phone be a key?' }),
    ).toBeInTheDocument();
    const editor = screen.getByLabelText('Your SQL');
    expect(editor).toHaveValue(challenge.starterCode);

    await userEvent.click(screen.getByRole('tab', { name: /Tables/ }));
    const table = await screen.findByRole('table', { name: 'First rows of applicants' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);

    await userEvent.click(screen.getByRole('tab', { name: /Hints/ }));
    expect(screen.queryByText(/GROUP BY phone/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show hint 1 of 2' }));
    expect(screen.getByText(/GROUP BY phone/)).toBeInTheDocument();
  });

  it('runs with Ctrl+Enter and shows the output or the SQL error', async () => {
    let calls = 0;
    const fetchMock = setup({
      'POST /code-lab/c1/run': () => {
        calls += 1;
        return calls === 1
          ? json(200, {
              data: {
                ok: true,
                columns: ['phone', 'n'],
                rows: [['9840011111', 2]],
                rowCount: 1,
                timeMs: 4,
              },
            })
          : json(200, { data: { ok: false, stage: 'code', error: 'near "SELEC": syntax error' } });
      },
    });
    renderApp('/code/c1');
    const editor = await screen.findByLabelText('Your SQL');
    fireEvent.change(editor, {
      target: { value: 'SELECT phone, count(*) FROM applicants GROUP BY phone' },
    });
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true });
    expect(await screen.findByRole('table', { name: 'Your output' })).toBeInTheDocument();
    const body = JSON.parse(fetchMock.mock.calls.find(([u]) => String(u).endsWith('/run'))[1].body);
    expect(body.code).toMatch(/GROUP BY phone/);

    fireEvent.change(editor, { target: { value: 'SELEC 1' } });
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));
    expect(await screen.findByText('SQL error')).toBeInTheDocument();
    expect(screen.getByText(/syntax error/)).toBeInTheDocument();
  });

  it('Tab indents instead of leaving the editor', async () => {
    setup();
    renderApp('/code/c1');
    const editor = await screen.findByLabelText('Your SQL');
    fireEvent.change(editor, { target: { value: 'SELECT' } });
    editor.setSelectionRange(0, 0);
    fireEvent.keyDown(editor, { key: 'Tab' });
    await waitFor(() => expect(editor).toHaveValue('  SELECT'));
  });

  it('shows expected vs actual on a wrong answer, and Accepted with the next problem', async () => {
    let n = 0;
    setup({
      'POST /code-lab/c1/submit': () => {
        n += 1;
        return n === 1
          ? json(200, {
              data: {
                passed: false,
                verdict: 'wrongAnswer',
                timeMs: 9,
                cases: [
                  {
                    name: 'Sample data',
                    passed: false,
                    reason: 'Expected 2 row(s), got 4.',
                    expected: {
                      columns: ['phone', 'n'],
                      rows: [
                        ['1', 2],
                        ['3', 2],
                      ],
                      rowCount: 2,
                    },
                    got: {
                      columns: ['phone', 'n'],
                      rows: [
                        ['1', 2],
                        ['2', 1],
                        ['3', 2],
                        ['4', 1],
                      ],
                      rowCount: 4,
                    },
                  },
                ],
              },
            })
          : json(200, {
              data: {
                passed: true,
                verdict: 'accepted',
                timeMs: 12,
                firstSolve: true,
                cases: [
                  { name: 'Sample data', passed: true },
                  { name: 'Hidden tests', passed: true },
                ],
              },
            });
      },
    });
    renderApp('/code/c1');
    await screen.findByLabelText('Your SQL');
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Wrong answer')).toBeInTheDocument();
    expect(screen.getByText('Expected 2 row(s), got 4.')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Expected output' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Accepted')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Next problem: Broken foreign keys/ })).toHaveAttribute(
      'href',
      '/code/c2',
    );
  });
});
