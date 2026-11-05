/**
 * Map editor state (F6.2): local edits with undo/redo of the last 20 actions, saved in one
 * PATCH /subjects/:id/map (validated and written in one transaction by the API).
 *
 * Topic creation needs a server id, so "add topic" calls the API at once; undoing it marks the
 * topic for deletion, which happens on save. Everything else is local until save.
 */
export const HISTORY_LIMIT = 20;

let tempSeq = 0;
export const isTempId = (id) => String(id).startsWith('new-');

/** @param {object} map  GET /subjects/:id/map (staff view) */
export function fromServer(map) {
  return {
    topics: map.topics.map((t) => ({ ...t })),
    links: map.links.map((l) => ({ ...l })),
    deletedTopics: [],
    deletedLinks: [],
  };
}

function unitOf(state, topicId) {
  return state.topics.find((t) => t.id === topicId)?.unitId;
}

/** Pure reducer for one editor action. Returns the same object when nothing changes. */
export function applyAction(state, action) {
  switch (action.type) {
    case 'move':
      return {
        ...state,
        topics: state.topics.map((t) =>
          t.id === action.id ? { ...t, position: action.position } : t,
        ),
      };
    case 'layout':
      return {
        ...state,
        topics: state.topics.map((t) =>
          action.positions[t.id] ? { ...t, position: action.positions[t.id] } : t,
        ),
      };
    case 'rename':
      return {
        ...state,
        topics: state.topics.map((t) => (t.id === action.id ? { ...t, title: action.title } : t)),
      };
    case 'addTopic':
      return {
        ...state,
        topics: [...state.topics, action.topic],
        deletedTopics: state.deletedTopics.filter((id) => id !== action.topic.id),
      };
    case 'deleteTopic': {
      const gone = state.links.filter(
        (l) => l.fromTopicId === action.id || l.toTopicId === action.id,
      );
      return {
        ...state,
        topics: state.topics.filter((t) => t.id !== action.id),
        links: state.links.filter((l) => !gone.includes(l)),
        deletedTopics: [...state.deletedTopics, action.id],
        deletedLinks: [
          ...state.deletedLinks,
          ...gone.filter((l) => !isTempId(l.id)).map((l) => l.id),
        ],
      };
    }
    case 'addLink': {
      // The link type is `linkType`: `type` is the action name.
      const { fromTopicId, toTopicId, linkType: type, reason } = action;
      if (fromTopicId === toTopicId) return state;
      const dup = state.links.some(
        (l) =>
          l.type === type &&
          ((l.fromTopicId === fromTopicId && l.toTopicId === toTopicId) ||
            (type === 'related' && l.fromTopicId === toTopicId && l.toTopicId === fromTopicId)),
      );
      if (dup) return state;
      tempSeq += 1;
      return {
        ...state,
        links: [
          ...state.links,
          {
            id: action.id ?? `new-${tempSeq}`,
            fromTopicId,
            toTopicId,
            type,
            reason,
            status: 'draft',
            source: 'faculty',
            crossUnit: unitOf(state, fromTopicId) !== unitOf(state, toTopicId),
          },
        ],
      };
    }
    case 'updateLink':
      return {
        ...state,
        links: state.links.map((l) => (l.id === action.id ? { ...l, ...action.patch } : l)),
      };
    case 'deleteLink':
      return {
        ...state,
        links: state.links.filter((l) => l.id !== action.id),
        deletedLinks: isTempId(action.id) ? state.deletedLinks : [...state.deletedLinks, action.id],
      };
    default:
      return state;
  }
}

/** History wrapper: { past, present, future }. */
export function initHistory(present) {
  return { past: [], present, future: [] };
}

export function historyReducer(h, action) {
  switch (action.type) {
    case 'undo':
      if (!h.past.length) return h;
      return {
        past: h.past.slice(0, -1),
        present: h.past.at(-1),
        future: [h.present, ...h.future],
      };
    case 'redo':
      if (!h.future.length) return h;
      return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
    case 'reset':
      return initHistory(action.state);
    default: {
      const next = applyAction(h.present, action);
      if (next === h.present) return h;
      return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [] };
    }
  }
}

const samePos = (a, b) =>
  Math.round(a?.x ?? 0) === Math.round(b?.x ?? 0) &&
  Math.round(a?.y ?? 0) === Math.round(b?.y ?? 0);

/**
 * What to send: SaveMapSchema body for changed nodes and edges, plus topics to delete.
 * @returns {{ body: { nodes: object[], edges: { upsert: object[], delete: string[] } }, deleteTopics: string[], changed: boolean }}
 */
export function diffForSave(original, present) {
  const before = new Map(original.topics.map((t) => [t.id, t]));
  const nodes = [];
  for (const t of present.topics) {
    const o = before.get(t.id);
    if (!o) {
      // Created through the API during this session: it exists, so just save where it was put.
      nodes.push({
        id: t.id,
        position: { x: Math.round(t.position.x), y: Math.round(t.position.y) },
      });
      continue;
    }
    const n = { id: t.id };
    if (!samePos(o.position, t.position))
      n.position = { x: Math.round(t.position.x), y: Math.round(t.position.y) };
    if (o.title !== t.title) n.title = t.title;
    if (Object.keys(n).length > 1) nodes.push(n);
  }
  const oldLinks = new Map(original.links.map((l) => [l.id, l]));
  const upsert = [];
  for (const l of present.links) {
    const o = oldLinks.get(l.id);
    if (o && o.type === l.type && o.reason === l.reason) continue;
    upsert.push({
      ...(isTempId(l.id) ? {} : { id: l.id }),
      fromTopicId: l.fromTopicId,
      toTopicId: l.toTopicId,
      type: l.type,
      reason: l.reason,
    });
  }
  const deleteTopics = present.deletedTopics.filter(
    (id) => !present.topics.some((t) => t.id === id),
  );
  const linkDeletes = [...new Set(present.deletedLinks)].filter((id) => oldLinks.has(id));
  const body = { nodes, edges: { upsert, delete: linkDeletes } };
  return {
    body,
    deleteTopics,
    changed: nodes.length + upsert.length + linkDeletes.length + deleteTopics.length > 0,
  };
}
