import { layoutMap, needsLayout } from '@acet/shared';

/** A.8 legend wording for each node state. */
export const STATE_LABEL = {
  mastered: 'Mastered',
  current: 'You are here',
  unlocked: 'Unlocked',
  locked: 'Locked',
  needsRevision: 'Needs revision',
};

export const MASTERY_LABEL = {
  notStarted: 'Not started',
  learning: 'Learning',
  practicing: 'Practicing',
  confident: 'Confident',
  needsRevision: 'Needs revision',
};

/** Edge style key: prerequisite (solid), related (dashed) or cross-unit related (red dashed). */
export function edgeKind(link) {
  if (link.type === 'prerequisite') return 'prerequisite';
  return link.crossUnit ? 'crossUnitRelated' : 'related';
}

/**
 * Positions to draw. Stored positions win; a map with none (or all stacked) gets the shared
 * dagre layout so it is still readable.
 */
export function positionsFor(map) {
  if (!needsLayout(map.topics)) {
    return Object.fromEntries(map.topics.map((t) => [t.id, t.position]));
  }
  return layoutMap(map.topics, map.links, { unitOrder: map.units.map((u) => u.id) });
}

/**
 * Builds React Flow nodes and edges.
 * @param {object} args
 * @param {object} args.map         GET /subjects/:id/map
 * @param {object} [args.me]        GET /subjects/:id/map/me (students); staff see every node unlocked
 * @param {string[]} [args.order]   topic ids in learning order (keyboard order follows it)
 * @param {string|null} [args.selectedId]
 * @param {string|null} [args.highlightId]  search result to highlight
 * @param {string|null} [args.unitId]       unit filter; other units are dimmed
 */
export function buildFlow({
  map,
  me,
  order,
  selectedId = null,
  highlightId = null,
  unitId = null,
}) {
  const positions = positionsFor(map);
  const stateOf = new Map((me?.nodes ?? []).map((n) => [n.topicId, n]));
  const unitNumber = new Map(map.units.map((u) => [u.id, u.number]));
  const titleOf = new Map(map.topics.map((t) => [t.id, t.title]));
  const rank = new Map((order ?? []).map((id, i) => [id, i]));
  const topics = [...map.topics].sort(
    (a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9) || a.order - b.order,
  );

  const nodes = topics.map((t) => {
    const s = stateOf.get(t.id);
    const state = s?.state ?? (me ? 'locked' : 'unlocked');
    return {
      id: t.id,
      type: 'topic',
      position: positions[t.id] ?? { x: 0, y: 0 },
      // The node's inner button takes keyboard focus, so the wrapper itself is not focusable.
      focusable: false,
      draggable: false,
      selectable: false,
      data: {
        title: t.title,
        summary: t.summary,
        state,
        mastery: s?.mastery ?? null,
        unitNumber: unitNumber.get(t.unitId),
        missing: (s?.missingPrerequisites ?? []).map((id) => titleOf.get(id)).filter(Boolean),
        selected: t.id === selectedId,
        highlighted: t.id === highlightId,
        dimmed: Boolean(unitId) && t.unitId !== unitId,
        draft: t.status === 'draft',
      },
    };
  });

  const edges = map.links.map((l) => ({
    id: l.id,
    source: l.fromTopicId,
    target: l.toTopicId,
    type: 'link',
    focusable: true,
    data: {
      kind: edgeKind(l),
      type: l.type,
      reason: l.reason,
      fromTitle: titleOf.get(l.fromTopicId),
      toTitle: titleOf.get(l.toTopicId),
      dimmed:
        Boolean(unitId) &&
        ![l.fromTopicId, l.toTopicId].some(
          (id) => map.topics.find((t) => t.id === id)?.unitId === unitId,
        ),
      draft: l.status === 'draft',
    },
  }));

  return { nodes, edges };
}

/** Builds-on / unlocks lists for the selected-topic panel, with link reasons. */
export function neighboursOf(map, topicId) {
  const title = new Map(map.topics.map((t) => [t.id, t.title]));
  const prereqs = map.links.filter((l) => l.type === 'prerequisite');
  return {
    buildsOn: prereqs
      .filter((l) => l.toTopicId === topicId)
      .map((l) => ({ id: l.fromTopicId, title: title.get(l.fromTopicId), reason: l.reason })),
    unlocks: prereqs
      .filter((l) => l.fromTopicId === topicId)
      .map((l) => ({ id: l.toTopicId, title: title.get(l.toTopicId), reason: l.reason })),
    related: map.links
      .filter((l) => l.type === 'related' && (l.fromTopicId === topicId || l.toTopicId === topicId))
      .map((l) => {
        const other = l.fromTopicId === topicId ? l.toTopicId : l.fromTopicId;
        return { id: other, title: title.get(other), reason: l.reason, crossUnit: l.crossUnit };
      }),
  };
}

/** Topic ids in learning order: the server's order, or map order when it isn't loaded. */
export function learningOrderIds(map, me) {
  if (me?.nodes?.length) return me.nodes.map((n) => n.topicId);
  return [...map.topics].sort((a, b) => a.order - b.order).map((t) => t.id);
}
