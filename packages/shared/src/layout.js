/**
 * Left-to-right concept-map layout (dagre). Shared by the seed, the AI map pipeline (A3) and
 * the faculty "Auto-layout" button (F6), so every map is laid out the same way.
 *
 * Only prerequisite links shape the layers; related links are drawn but don't move nodes.
 * Topics are grouped by unit so each unit reads as a band, top to bottom.
 */
import dagre from '@dagrejs/dagre';

export const MAP_NODE_SIZE = { width: 200, height: 64 };

/**
 * @param {{ id: string, unitId?: string }[]} topics
 * @param {{ fromTopicId: string, toTopicId: string, type: string }[]} links
 * @param {{ unitOrder?: string[], rankSep?: number, nodeSep?: number }} [opts]
 * @returns {Record<string, { x: number, y: number }>} top-left positions by topic id
 */
export function layoutMap(topics, links, opts = {}) {
  const { unitOrder = [], rankSep = 90, nodeSep = 36 } = opts;
  const ids = new Set(topics.map((t) => t.id));
  const units = [...new Set([...unitOrder, ...topics.map((t) => t.unitId ?? '_')])];
  const positions = {};
  let offsetY = 0;

  for (const unitId of units) {
    const members = topics.filter((t) => (t.unitId ?? '_') === unitId);
    if (!members.length) continue;
    const memberIds = new Set(members.map((t) => t.id));
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', ranksep: rankSep, nodesep: nodeSep, marginx: 0, marginy: 0 });
    g.setDefaultEdgeLabel(() => ({}));
    for (const t of members) g.setNode(t.id, { ...MAP_NODE_SIZE });
    for (const l of links) {
      if (l.type !== 'prerequisite') continue;
      if (memberIds.has(l.fromTopicId) && memberIds.has(l.toTopicId)) {
        g.setEdge(l.fromTopicId, l.toTopicId);
      }
    }
    dagre.layout(g);

    let maxY = 0;
    for (const t of members) {
      const n = g.node(t.id);
      const x = Math.round(n.x - MAP_NODE_SIZE.width / 2);
      const y = Math.round(n.y - MAP_NODE_SIZE.height / 2) + offsetY;
      positions[t.id] = { x, y };
      maxY = Math.max(maxY, y + MAP_NODE_SIZE.height);
    }
    offsetY = maxY + 120;
  }

  // Cross-unit prerequisites: push a dependent unit's topics right of their prerequisite.
  for (const l of links) {
    if (l.type !== 'prerequisite' || !ids.has(l.fromTopicId) || !ids.has(l.toTopicId)) continue;
    const from = positions[l.fromTopicId];
    const to = positions[l.toTopicId];
    if (to.x <= from.x) to.x = from.x + MAP_NODE_SIZE.width + rankSep;
  }
  return positions;
}

/** True when stored positions can't be shown as-is (all missing or stacked on one spot). */
export function needsLayout(topics) {
  if (topics.length < 2) return false;
  const keys = new Set(topics.map((t) => `${t.position?.x ?? 0},${t.position?.y ?? 0}`));
  return keys.size < Math.ceil(topics.length / 2);
}
