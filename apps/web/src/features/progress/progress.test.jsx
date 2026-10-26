import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setAccessToken } from '../../api/client';
import { mockApi, renderApp, users } from '../../test/render';
import { useSession } from '../auth/session';

const publicRow = (rank, name, xp, extra = {}) => ({
  rank,
  studentId: `st${rank}`,
  name,
  batch: '2023-27',
  department: 'Computer Science',
  departmentCode: 'CSE',
  yearOfStudy: 3,
  xp,
  level: 1,
  levelTitle: 'Explorer',
  mastered: Math.floor(xp / 50),
  isMe: false,
  ...extra,
});

const staffRow = (rank, name, xp, risk = 'none') => ({
  ...publicRow(rank, name, xp),
  email: `${name.toLowerCase()}@acet.test`,
  semester: 5,
  totalTopics: 8,
  progressPct: 20,
  masteryPct: 12.5,
  averageScore: 70,
  codeSolved: 2,
  lastActiveAt: new Date().toISOString(),
  risk: { level: risk, reasons: risk === 'none' ? [] : ['Has never been active'] },
});

const states = { notStarted: 10, learning: 2, practicing: 1, confident: 3, needsRevision: 0 };
const report = {
  scope: { subjects: [{ subjectId: 's1', code: 'CS', name: 'DBMS', semester: 5 }] },
  summary: {
    students: 2,
    activeThisWeek: 1,
    averageXp: 75,
    averageMasteryPct: 18.8,
    averageProgressPct: 25,
    averageScore: 70,
    atRisk: 1,
    states,
  },
  bySubject: [
    {
      subjectId: 's1',
      code: 'CS',
      name: 'DBMS',
      semester: 5,
      totalTopics: 8,
      students: 2,
      states,
      averageMasteryPct: 18.8,
      averageProgressPct: 25,
      averageScore: 70,
      needsRevision: 0,
    },
  ],
  bySemester: [{ semester: 5, students: 2, averageProgressPct: 25, averageMasteryPct: 18.8 }],
  byBatch: [{ batch: '2023-27', students: 2, averageProgressPct: 25, averageMasteryPct: 18.8 }],
  students: [staffRow(1, 'Asha', 100), staffRow(2, 'Chitra', 0, 'high')],
};

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
});

describe('student leaderboard', () => {
  beforeEach(() => {
    useSession.setState({ status: 'authenticated', user: users.student, expired: false });
    setAccessToken('tok');
  });

  it('shows the podium, the list and the student pinned when outside the top rows', async () => {
    mockApi({
      'GET /leaderboard': {
        scope: { subjects: [], cohortSize: 30 },
        rows: [
          publicRow(1, 'Asha', 150),
          publicRow(2, 'Bala', 100),
          publicRow(3, 'Chitra', 50),
          publicRow(4, 'Deepa', 40),
        ],
        me: publicRow(12, 'Priya Raman', 10, { isMe: true }),
      },
    });
    renderApp('/leaderboard');
    expect(await screen.findByRole('heading', { name: 'Your class' })).toBeInTheDocument();
    expect(await screen.findByText(/^#12/)).toBeInTheDocument();
    const podium = screen.getByRole('list', { name: 'Top three' });
    expect(within(podium).getByText('Asha')).toBeInTheDocument();
    const rankings = screen.getByRole('list', { name: 'Rankings' });
    expect(within(rankings).getByText('Deepa')).toBeVisible();
    // Every row: department, year and batch beside the name, the score and a level badge.
    expect(within(rankings).getByText('CSE · III Year · 2023-27')).toBeInTheDocument();
    expect(within(rankings).getByText('Lv 1 · Explorer')).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Your position' })).getByText(/Priya Raman/),
    ).toBeInTheDocument();
  });
});

describe('faculty progress', () => {
  beforeEach(() => {
    useSession.setState({ status: 'authenticated', user: users.faculty, expired: false });
    setAccessToken('tok');
  });

  it('the studio home shows class progress with top and at-risk students', async () => {
    mockApi({
      'GET /reports/progress': report,
      'GET /subjects': [],
      'GET /review-queue': { items: [] },
      'GET /ai/jobs': [],
    });
    renderApp('/studio');
    expect((await screen.findAllByText('Average progress')).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Top students' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Need attention' })).getByText('Chitra'),
    ).toBeInTheDocument();
  });

  it('the student list filters by search and links to a student report', async () => {
    mockApi({
      'GET /reports/progress': report,
      'GET /reports/students/:id': {
        student: {
          id: 'st1',
          name: 'Asha',
          email: 'asha@acet.test',
          batch: '2023-27',
          semester: 5,
        },
        progress: {
          subjects: [
            {
              subjectId: 's1',
              code: 'CS',
              name: 'DBMS',
              semester: 5,
              totalTopics: 8,
              counts: states,
            },
          ],
          revision: { dueNow: 1, streakDays: 3 },
          weakestTopics: [{ topicId: 't1', title: 'BCNF', score: 40, state: 'needsRevision' }],
        },
        standing: {
          rank: 1,
          cohortSize: 2,
          xp: 100,
          averageScore: 70,
          codeSolved: 2,
          lastActiveAt: null,
          risk: { level: 'none', reasons: [] },
        },
        mySubjectIds: ['s1'],
      },
    });
    renderApp('/studio/students');
    await screen.findByRole('heading', { name: 'Student progress' });
    const table = await screen.findByRole('table', { name: 'Students ranked by XP' });
    expect(within(table).getByText('Chitra')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Search students'), 'ash');
    expect(within(table).queryByText('Chitra')).not.toBeInTheDocument();
    await userEvent.click(within(table).getByText('Asha'));
    expect(await screen.findByRole('heading', { name: 'Asha' })).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('Your subject')).toBeInTheDocument();
    expect(screen.getByText('BCNF')).toBeInTheDocument();
  });
});

describe('HOD department progress', () => {
  it('breaks the department down by semester and batch', async () => {
    useSession.setState({ status: 'authenticated', user: users.admin, expired: false });
    setAccessToken('tok');
    mockApi({ 'GET /reports/progress': report });
    renderApp('/admin/progress');
    expect(await screen.findByRole('heading', { name: 'By semester' })).toBeInTheDocument();
    expect(screen.getByText('Semester 5 · 2 students')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'By batch' })).toBeInTheDocument();
  });
});
