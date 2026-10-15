import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setAccessToken } from '../../api/client';
import { json, mockApi, renderApp, users } from '../../test/render';
import { useSession } from '../auth/session';
import {
  HISTORY_LIMIT,
  applyAction,
  diffForSave,
  fromServer,
  historyReducer,
  initHistory,
} from './map/editorState';

const serverMap = {
  subject: { id: 's1', code: 'CS', name: 'DBMS', semester: 5 },
  units: [{ id: 'u3', number: 3, title: 'Design' }],
  topics: [
    {
      id: 'a',
      unitId: 'u3',
      parentTopicId: null,
      title: 'Keys',
      summary: '',
      order: 0,
      position: { x: 0, y: 0 },
      status: 'draft',
      source: 'ai',
    },
    {
      id: 'b',
      unitId: 'u3',
      parentTopicId: null,
      title: 'FD',
      summary: '',
      order: 1,
      position: { x: 300, y: 0 },
      status: 'draft',
      source: 'ai',
    },
    {
      id: 'c',
      unitId: 'u3',
      parentTopicId: null,
      title: 'Normalization',
      summary: '',
      order: 2,
      position: { x: 600, y: 0 },
      status: 'approved',
      source: 'faculty',
    },
  ],
  links: [
    {
      id: 'l1',
      fromTopicId: 'a',
      toTopicId: 'b',
      type: 'prerequisite',
      reason: 'FDs use keys.',
      status: 'draft',
      source: 'ai',
      crossUnit: false,
    },
  ],
};

describe('map editor state (F6.2)', () => {
  it('applies edits, undoes and redoes them', () => {
    let h = initHistory(fromServer(serverMap));
    h = historyReducer(h, { type: 'rename', id: 'a', title: 'Keys and Superkeys' });
    h = historyReducer(h, { type: 'move', id: 'b', position: { x: 320, y: 40 } });
    h = historyReducer(h, {
      type: 'addLink',
      fromTopicId: 'b',
      toTopicId: 'c',
      linkType: 'prerequisite',
      reason: 'Normal forms use FDs.',
    });
    expect(h.present.links).toHaveLength(2);
    h = historyReducer(h, { type: 'undo' });
    expect(h.present.links).toHaveLength(1);
    h = historyReducer(h, { type: 'undo' });
    expect(h.present.topics.find((t) => t.id === 'b').position).toEqual({ x: 300, y: 0 });
    h = historyReducer(h, { type: 'redo' });
    expect(h.present.topics.find((t) => t.id === 'b').position).toEqual({ x: 320, y: 40 });
    // A new action clears the redo stack.
    h = historyReducer(h, { type: 'rename', id: 'c', title: 'Normal forms' });
    expect(h.future).toEqual([]);
  });

  it('keeps only the last 20 actions', () => {
    let h = initHistory(fromServer(serverMap));
    for (let i = 0; i < 30; i++)
      h = historyReducer(h, { type: 'move', id: 'a', position: { x: i, y: 0 } });
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    for (let i = 0; i < 25; i++) h = historyReducer(h, { type: 'undo' });
    expect(h.present.topics.find((t) => t.id === 'a').position.x).toBe(9);
  });

  it('ignores self links and duplicates, and deleting a topic removes its links', () => {
    const s = fromServer(serverMap);
    expect(
      applyAction(s, {
        type: 'addLink',
        fromTopicId: 'a',
        toTopicId: 'a',
        linkType: 'related',
        reason: 'x',
      }),
    ).toBe(s);
    expect(
      applyAction(s, {
        type: 'addLink',
        fromTopicId: 'a',
        toTopicId: 'b',
        linkType: 'prerequisite',
        reason: 'x',
      }),
    ).toBe(s);
    const d = applyAction(s, { type: 'deleteTopic', id: 'a' });
    expect(d.links).toEqual([]);
    expect(d.deletedLinks).toEqual(['l1']);
    expect(d.deletedTopics).toEqual(['a']);
  });

  it('builds a minimal SaveMap body plus topic deletes', () => {
    const original = fromServer(serverMap);
    let s = applyAction(original, { type: 'rename', id: 'b', title: 'Functional Dependency' });
    s = applyAction(s, { type: 'move', id: 'c', position: { x: 610.4, y: 20.6 } });
    s = applyAction(s, { type: 'updateLink', id: 'l1', patch: { type: 'related' } });
    s = applyAction(s, {
      type: 'addLink',
      fromTopicId: 'b',
      toTopicId: 'c',
      linkType: 'prerequisite',
      reason: 'Normal forms use FDs.',
    });
    s = applyAction(s, { type: 'deleteTopic', id: 'a' });
    const { body, deleteTopics, changed } = diffForSave(original, s);
    expect(changed).toBe(true);
    expect(body.nodes).toEqual([
      { id: 'b', title: 'Functional Dependency' },
      { id: 'c', position: { x: 610, y: 21 } },
    ]);
    // l1 was edited and then removed with topic a: only the delete is sent.
    expect(body.edges.delete).toEqual(['l1']);
    expect(body.edges.upsert).toEqual([
      { fromTopicId: 'b', toTopicId: 'c', type: 'prerequisite', reason: 'Normal forms use FDs.' },
    ]);
    expect(deleteTopics).toEqual(['a']);
    expect(diffForSave(original, original).changed).toBe(false);
  });
});

describe('review queue (F6.4)', () => {
  const rows = [
    {
      type: 'flashcard',
      id: 'f1',
      topicId: 't1',
      subjectId: 's1',
      kind: 'flashcard',
      status: 'draft',
      source: 'ai',
      needsAttention: false,
      preview: 'What is 2NF?',
      aiMeta: { sourceChunkIds: ['c1'] },
      createdAt: '2026-10-15',
    },
    {
      type: 'question',
      id: 'q1',
      topicId: 't1',
      subjectId: 's1',
      kind: 'question',
      status: 'draft',
      source: 'ai',
      needsAttention: true,
      preview: 'Which NF removes partial deps?',
      aiMeta: { sourceChunkIds: ['c1'] },
      createdAt: '2026-10-14',
    },
  ];
  let bulk;
  beforeEach(() => {
    bulk = [];
    useSession.setState({ status: 'authenticated', user: users.faculty, expired: false });
    setAccessToken('tok');
    mockApi({
      'GET /review-queue': () => json(200, { data: rows, meta: { page: 1, limit: 25, total: 2 } }),
      'GET /subjects': [{ id: 's1', code: 'CS', name: 'DBMS', semester: 5 }],
      'GET /flashcards/f1': {
        id: 'f1',
        front: 'What is 2NF?',
        back: '1NF without partial dependency.',
      },
      'GET /questions/q1': {
        id: 'q1',
        stem: 'Which NF removes partial deps?',
        options: ['1NF', '2NF', '3NF', 'BCNF'],
        correctIndex: 1,
        optionExplanations: [],
        explanation: '',
      },
      'GET /ai/chunks': [
        {
          id: 'c1',
          fileName: 'notes.pdf',
          heading: 'Second Normal Form',
          text: '2NF removes partial dependencies.',
          index: 1,
        },
      ],
      'POST /review-queue/bulk': (_u, init) => {
        bulk.push(JSON.parse(init.body));
        return json(200, { data: { updated: 1 } });
      },
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    setAccessToken(null);
  });

  it('shows the draft beside its source chunks', async () => {
    renderApp('/studio/review');
    const draft = await screen.findByLabelText('Draft');
    expect(await within(draft).findByText('1NF without partial dependency.')).toBeInTheDocument();
    const source = screen.getByLabelText('Source material');
    expect(
      await within(source).findByText('2NF removes partial dependencies.'),
    ).toBeInTheDocument();
    expect(within(source).getByText(/notes\.pdf/)).toBeInTheDocument();
  });

  it('a approves (publishes) the current draft, j moves, r asks for a reason', async () => {
    renderApp('/studio/review');
    await screen.findByLabelText('Draft');
    const user = userEvent.setup();
    await user.keyboard('a');
    await waitFor(() => expect(bulk).toHaveLength(1));
    expect(bulk[0]).toEqual({ action: 'publish', items: [{ type: 'flashcard', id: 'f1' }] });

    await user.keyboard('j');
    await user.keyboard('r');
    const dialog = await screen.findByRole('dialog', { name: /Reject 1 item/ });
    await user.type(within(dialog).getByLabelText('Reason'), 'Option C is also correct');
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(bulk).toHaveLength(2));
    expect(bulk[1]).toEqual({
      action: 'reject',
      reason: 'Option C is also correct',
      items: [{ type: 'question', id: 'q1' }],
    });
  });

  it('x ticks items for a bulk approve', async () => {
    renderApp('/studio/review');
    await screen.findByLabelText('Draft');
    const user = userEvent.setup();
    await user.keyboard('x');
    await user.keyboard('j');
    await user.keyboard('x');
    await user.click(screen.getByRole('button', { name: 'Approve 2 selected' }));
    await waitFor(() => expect(bulk).toHaveLength(1));
    expect(bulk[0].items).toHaveLength(2);
  });

  it('admins cannot approve (only the subject faculty can)', async () => {
    useSession.setState({ user: users.admin });
    renderApp('/studio/review');
    await screen.findByLabelText('Draft');
    expect(screen.getByText(/Only the faculty assigned/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve this' })).toBeDisabled();
  });
});
