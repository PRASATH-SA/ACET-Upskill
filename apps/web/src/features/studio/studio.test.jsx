import { describe, expect, it } from 'vitest';
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
