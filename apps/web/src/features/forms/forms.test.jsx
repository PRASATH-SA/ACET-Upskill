import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormSettingsSchema, blankQuestion } from '@acet/shared';
import { setAccessToken } from '../../api/client';
import { json, mockApi, renderApp, users } from '../../test/render';
import { useSession } from '../auth/session';

const open = { open: true, reason: null };
const settings = FormSettingsSchema.parse({ isQuiz: true });

const q = (id, type, extra) => ({ ...blankQuestion(type), id, ...extra });
const form = {
  id: 'f1',
  title: 'Lab feedback',
  description: 'Two minutes, promise.',
  headerColor: 'brand',
  status: 'published',
  sections: [
    {
      id: 's1',
      title: '',
      description: '',
      next: 'next',
      questions: [
        q('attended', 'multipleChoice', {
          title: 'Did you attend?',
          required: true,
          branching: true,
          options: [
            { id: 'y', label: 'Yes', goTo: 'next' },
            { id: 'n', label: 'No', goTo: 'submit' },
          ],
        }),
      ],
    },
    {
      id: 's2',
      title: 'The lab',
      description: '',
      next: 'next',
      questions: [q('useful', 'shortText', { title: 'What was most useful?', required: true })],
    },
  ],
  settings,
  audience: { departmentIds: [], yearsOfStudy: [], semesters: [], batches: [] },
};

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
});

describe('student forms', () => {
  beforeEach(() => {
    useSession.setState({ status: 'authenticated', user: users.student, expired: false });
    setAccessToken('tok');
  });

  it('lists forms to fill, badges the nav and shows the notification in the bell', async () => {
    mockApi({
      'GET /me/forms': [
        {
          id: 'f1',
          title: 'Lab feedback',
          description: '',
          headerColor: 'brand',
          isQuiz: false,
          open,
          responded: false,
          closesAt: null,
        },
        {
          id: 'f2',
          title: 'Old survey',
          description: '',
          headerColor: 'navy',
          isQuiz: false,
          open: { open: false, reason: 'closed' },
          responded: false,
        },
      ],
      'GET /notifications': {
        unread: 1,
        items: [
          {
            id: 'n1',
            type: 'form.published',
            title: 'New form: Lab feedback',
            body: '',
            link: '/forms/f1',
            readAt: null,
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    });
    renderApp('/forms');
    expect(await screen.findByRole('heading', { name: 'Lab feedback' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fill in' })).toHaveAttribute('href', '/forms/f1');
    // The closed form is on its own tab.
    expect(screen.queryByText('Old survey')).not.toBeInTheDocument();
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0];
    expect(await within(nav).findByText(/to do/)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }));
    expect(await screen.findByText('New form: Lab feedback')).toBeInTheDocument();
  });

  it('checks required answers, follows branching and submits', async () => {
    const api = mockApi({
      'GET /forms/:id/view': {
        form: { ...form, settings: { ...form.settings, limitOneResponse: true } },
        open,
        preview: false,
        myResponse: null,
        canRespond: true,
        canEdit: false,
        confirmationMessage: 'Thanks!',
      },
      'POST /forms/:id/responses': () =>
        json(201, {
          data: {
            response: {
              id: 'r1',
              answers: { attended: 'No' },
              files: [],
              submittedAt: new Date().toISOString(),
              scoreReleased: true,
              score: 0,
              maxScore: 0,
              results: {},
            },
            confirmationMessage: 'Thanks!',
          },
        }),
    });
    const user = userEvent.setup();
    renderApp('/forms/f1');
    await user.click(await screen.findByRole('button', { name: 'Next' }));
    expect(await screen.findByText('This question is required')).toBeInTheDocument();

    // "Yes" continues to section 2; "No" jumps straight to submit.
    await user.click(screen.getByRole('radio', { name: 'Yes' }));
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Thanks!')).toBeInTheDocument();
    const call = api.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(call[1].body)).toEqual({ answers: { attended: 'No' } });
  });
});

describe('form studio', () => {
  beforeEach(() => {
    useSession.setState({ status: 'authenticated', user: users.faculty, expired: false });
    setAccessToken('tok');
  });

  it('autosaves edits, publishes and gives the shareable link', async () => {
    const editor = {
      ...form,
      status: 'draft',
      open: { open: false, reason: 'draft' },
      responseCount: 0,
      collaborators: [],
      owner: { id: 'f1', name: 'Dr S Lakshmi', email: 'faculty1@acet.test' },
      isOwner: true,
    };
    const api = mockApi({
      'GET /forms/:id': editor,
      'PUT /forms/:id': (_url, init) =>
        json(200, { data: { ...editor, ...JSON.parse(init.body), notified: 0 } }),
      'POST /forms/:id/publish': { ...editor, status: 'published', open, notified: 12 },
      'GET /departments': [],
    });
    const user = userEvent.setup();
    renderApp('/studio/forms/f1');
    const title = await screen.findByRole('textbox', { name: 'Form title' });
    await user.clear(title);
    await user.type(title, 'Mid-term feedback');
    await waitFor(
      () => {
        const put = api.mock.calls.find(([, init]) => init?.method === 'PUT');
        expect(JSON.parse(put[1].body).title).toBe('Mid-term feedback');
      },
      { timeout: 3000 },
    );
    expect(await screen.findByText('All changes saved')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(await screen.findByRole('dialog', { name: 'Send form' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Link' })).toHaveValue(
      `${window.location.origin}/forms/f1`,
    );
    expect(
      api.mock.calls.some(
        ([url, init]) => String(url).endsWith('/forms/f1/publish') && init.method === 'POST',
      ),
    ).toBe(true);
  });

  it('shows the response summary, individual answers and the quiz settings', async () => {
    const editor = {
      ...form,
      open,
      responseCount: 2,
      collaborators: [],
      owner: null,
      isOwner: true,
    };
    mockApi({
      'GET /forms/:id': editor,
      'GET /departments': [{ id: 'd1', name: 'Computer Science', code: 'CSE' }],
      'GET /forms/:id/responses': {
        total: 2,
        anonymous: false,
        summary: {
          attended: {
            questionId: 'attended',
            type: 'multipleChoice',
            answered: 2,
            counts: [
              { label: 'Yes', count: 1 },
              { label: 'No', count: 1 },
            ],
          },
          useful: { questionId: 'useful', type: 'shortText', answered: 1, texts: ['Joins'] },
        },
        quiz: { maxScore: 0, average: 0, median: 0, correctByQuestion: {} },
        responses: [
          {
            id: 'r1',
            student: { id: 's1', name: 'Asha', email: 'asha@acet.test', batch: '2023-27' },
            answers: { attended: 'Yes', useful: 'Joins' },
            files: [],
            score: 0,
            maxScore: 0,
            results: {},
            manualGrades: {},
            feedback: '',
            scoreReleased: true,
            submittedAt: new Date().toISOString(),
          },
        ],
      },
    });
    const user = userEvent.setup();
    renderApp('/studio/forms/f1');
    await user.click(await screen.findByRole('tab', { name: /Responses/ }));
    expect(await screen.findByText('2 responses')).toBeInTheDocument();
    expect(screen.getByTitle('Yes: 1 (50%)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download CSV' })).toBeEnabled();
    await user.click(screen.getByRole('tab', { name: 'Individual' }));
    expect(await screen.findByText('asha@acet.test')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Settings' }));
    expect(await screen.findByRole('switch', { name: /Make this a quiz/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Correct answers/ })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'CSE' })).toBeInTheDocument();
  });
});
