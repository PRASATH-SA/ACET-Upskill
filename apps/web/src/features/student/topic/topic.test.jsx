import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setAccessToken } from '../../../api/client';
import { createSseParser } from '../../../api/sse';
import { useUi } from '../../../lib/uiStore';
import { json, mockApi, renderApp, users } from '../../../test/render';
import { useSession } from '../../auth/session';
import { availableSteps } from './TopicPage';
import { youTubeId } from './VideoPlayer';

const basePage = {
  topic: {
    id: 't1',
    title: 'Normalization',
    summary: 'Split tables so each fact lives once.',
    subject: { id: 's1', code: 'CS T53', name: 'DBMS' },
    unit: { id: 'u3', number: 3, title: 'Database Design' },
  },
  flashcardCount: 0,
  questionCount: 0,
  prerequisites: [
    { id: 't0', title: 'Functional Dependency', reason: 'Normal forms are defined with FDs.' },
  ],
  unlocks: [],
};

const fullPage = {
  ...basePage,
  curiosity: {
    id: 'c1',
    title: 'The duplicated address',
    question: {
      id: 'q1',
      stem: 'A customer moves house. What breaks?',
      options: ['Nothing', 'Some rows keep the old address', 'The table is deleted'],
      correctIndex: 1,
      explanation: 'The address is stored many times.',
      optionExplanations: ['No.', 'Yes: an update anomaly.', 'No.'],
    },
  },
  video: {
    id: 'v1',
    title: 'Normalization in 6 minutes',
    url: 'https://www.youtube.com/watch?v=abc123XYZ',
  },
  easy: { id: 'e1', body: 'Keep **one fact in one place**.' },
  tenMark: { id: 'tm1', body: '## Definition\nNormalization is…' },
  flashcardCount: 2,
  questionCount: 5,
  pyqs: [{ id: 'p1', text: 'Explain 3NF with an example.', marks: 10, examDate: '2024-11-20' }],
};

function setup(page) {
  useSession.setState({ status: 'authenticated', user: users.student, expired: false });
  setAccessToken('tok');
  return mockApi({
    'GET /topics/t1/page': page,
    'POST /topics/t1/open': { mastery: { state: 'learning' } },
    'GET /subjects/s1/map/me': {
      currentTopicId: 't1',
      nodes: [{ topicId: 't1', state: 'current', mastery: 'learning', missingPrerequisites: [] }],
    },
    'GET /topics/t1/flashcards': [
      { id: 'f1', front: 'What is 1NF?', back: 'Atomic values only.' },
      { id: 'f2', front: 'What is 2NF?', back: '1NF and no partial dependency.' },
    ],
    'POST /flashcards/f1/rate': { nextDue: '2026-10-20' },
    'GET /me/submissions': [],
  });
}

beforeEach(() => {
  useUi.setState({ lowData: false });
});
afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
});

describe('topic page (F4)', () => {
  it('shows only the steps that have content, with no empty cards', async () => {
    setup(basePage);
    renderApp('/topics/t1');
    expect(await screen.findByText('Content is on its way')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Learning steps' })).not.toBeInTheDocument();
    expect(screen.queryByText('Prepare')).not.toBeInTheDocument();
    // Connections still show.
    expect(screen.getByText('Functional Dependency')).toBeInTheDocument();
  });

  it('computes available steps from the published page', () => {
    expect(availableSteps(basePage)).toEqual([]);
    expect(availableSteps(fullPage)).toEqual([
      'curiosity',
      'understand',
      'prepare',
      'remember',
      'practice',
    ]);
  });

  it('renders every section, marks the topic as learning, and lists PYQs', async () => {
    const fetchMock = setup(fullPage);
    renderApp('/topics/t1');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Normalization' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'In simple words' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Definition' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Take the quiz' })).toHaveAttribute(
      'href',
      '/topics/t1/quiz',
    );
    expect(screen.getByText('Explain 3NF with an example.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apply/ })).toBeDisabled();
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([u, i]) => String(u).endsWith('/topics/t1/open') && i.method === 'POST',
        ),
      ).toBe(true),
    );
  });

  it('reveals the curiosity answer only after a pick', async () => {
    setup(fullPage);
    renderApp('/topics/t1');
    const user = userEvent.setup();
    const reveal = await screen.findByRole('button', { name: 'Reveal the answer' });
    expect(reveal).toBeDisabled();
    expect(screen.queryByText('Yes: an update anomaly.')).not.toBeInTheDocument();
    await user.click(screen.getByLabelText(/Some rows keep the old address/));
    await user.click(reveal);
    expect(screen.getByText('Yes: an update anomaly.')).toBeInTheDocument();
    expect(screen.getByText('Good instinct!')).toBeInTheDocument();
  });

  it('does not load the video until tapped; in low-data mode not even the thumbnail', async () => {
    useUi.setState({ lowData: true });
    setup(fullPage);
    const { container } = renderApp('/topics/t1');
    const play = await screen.findByRole('button', { name: /Play video/ });
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('img[src*="ytimg"]')).toBeNull();
    await userEvent.click(play);
    expect(container.querySelector('iframe')).toHaveAttribute(
      'src',
      expect.stringContaining('youtube-nocookie.com/embed/abc123XYZ'),
    );
  });

  it('flips and rates inline flashcards', async () => {
    const fetchMock = setup(fullPage);
    renderApp('/topics/t1');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /What is 1NF\?/ }));
    expect(screen.getByText('Atomic values only.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Good/ }));
    await waitFor(() => expect(screen.getByText('What is 2NF?')).toBeInTheDocument());
    const rate = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/flashcards/f1/rate'));
    expect(JSON.parse(rate[1].body)).toEqual({ rating: 'good' });
  });

  it('streams tutor tokens visibly and shows citations that jump to the section', async () => {
    setup(fullPage);
    let push;
    const stream = new ReadableStream({
      start(controller) {
        push = (s) => controller.enqueue(new TextEncoder().encode(s));
        push.close = () => controller.close();
      },
    });
    const base = globalThis.fetch;
    vi.stubGlobal(
      'fetch',
      vi.fn((url, init) =>
        String(url).endsWith('/ai/tutor/ask')
          ? Promise.resolve(
              new Response(stream, {
                status: 200,
                headers: { 'content-type': 'text/event-stream' },
              }),
            )
          : base(url, init),
      ),
    );
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;

    renderApp('/topics/t1');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Ask why' }));
    const dialog = screen.getByRole('dialog', { name: 'Ask why' });
    await user.type(within(dialog).getByLabelText(/Ask a question/), 'Why split tables?');
    await user.click(within(dialog).getByRole('button', { name: 'Ask' }));

    await act(async () => push('event: token\ndata: {"text":"Because each "}\n\n'));
    expect(await within(dialog).findByText(/Because each/)).toBeInTheDocument();
    await act(async () => push('event: token\ndata: {"text":"fact lives once."}\n\n'));
    expect(await within(dialog).findByText(/Because each fact lives once\./)).toBeInTheDocument();
    await act(async () => {
      push(
        'event: done\ndata: {"grounded":true,"citations":[{"kind":"resource","id":"tm1","title":"10-mark answer","section":"prepare"}]}\n\n',
      );
      push.close();
    });
    const chip = await within(dialog).findByRole('button', { name: '10-mark answer' });
    await user.click(chip);
    expect(scroll).toHaveBeenCalled();
  });

  it('shows "AI service offline" when the tutor is unavailable', async () => {
    setup(fullPage);
    const base = globalThis.fetch;
    vi.stubGlobal(
      'fetch',
      vi.fn((url, init) =>
        String(url).endsWith('/ai/tutor/ask')
          ? Promise.resolve(
              json(503, { error: { code: 'AI_OFFLINE', message: 'AI service offline' } }),
            )
          : base(url, init),
      ),
    );
    renderApp('/topics/t1');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Ask why' }));
    const dialog = screen.getByRole('dialog', { name: 'Ask why' });
    await user.type(within(dialog).getByLabelText(/Ask a question/), 'Why?');
    await user.click(within(dialog).getByRole('button', { name: 'Ask' }));
    expect(await within(dialog).findByText('AI service offline.')).toBeInTheDocument();
  });
});

describe('helpers', () => {
  it('parses SSE frames split across chunks', () => {
    const got = [];
    const parse = createSseParser((m) => got.push(m));
    parse('event: token\ndata: {"te');
    parse('xt":"hi"}\n\n: keep-alive\n\nevent: done\ndata: plain\n\n');
    expect(got).toEqual([
      { event: 'token', data: { text: 'hi' } },
      { event: 'done', data: 'plain' },
    ]);
  });

  it('extracts YouTube ids from the common URL shapes', () => {
    expect(youTubeId('https://www.youtube.com/watch?v=abc123XYZ')).toBe('abc123XYZ');
    expect(youTubeId('https://youtu.be/abc123XYZ')).toBe('abc123XYZ');
    expect(youTubeId('https://www.youtube.com/embed/abc123XYZ')).toBe('abc123XYZ');
    expect(youTubeId('https://vimeo.com/1')).toBeNull();
  });
});
