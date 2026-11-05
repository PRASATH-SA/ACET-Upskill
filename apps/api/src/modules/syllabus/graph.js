/**
 * Pure graph functions for the concept map (B2). No database access here.
 * Prerequisite links must form a DAG; related links may form cycles.
 */

/**
 * Returns one cycle as a closed path [a, b, c, a], or null when the graph is acyclic.
 * Iterative DFS with colouring, so deep graphs cannot overflow the stack.
 */
export function findCycle(nodes, edges) {
  const adj = new Map();
  for (const n of nodes) adj.set(n, []);
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    if (!adj.has(e.to)) adj.set(e.to, []);
    adj.get(e.from).push(e.to);
  }
  const WHITE = 0,
    GREY = 1,
    BLACK = 2;
  const colour = new Map([...adj.keys()].map((k) => [k, WHITE]));
  const parent = new Map();

  for (const start of adj.keys()) {
    if (colour.get(start) !== WHITE) continue;
    const stack = [{ node: start, i: 0 }];
    colour.set(start, GREY);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const next = adj.get(top.node)[top.i++];
      if (next === undefined) {
        colour.set(top.node, BLACK);
        stack.pop();
        continue;
      }
      const c = colour.get(next);
      if (c === WHITE) {
        parent.set(next, top.node);
        colour.set(next, GREY);
        stack.push({ node: next, i: 0 });
      } else if (c === GREY) {
        // Back edge top.node → next closes a cycle: walk parents from top.node back to next.
        const path = [top.node];
        let cur = top.node;
        while (cur !== next) {
          cur = parent.get(cur);
          path.push(cur);
        }
        path.reverse();
        path.push(next);
        return path;
      }
    }
  }
  return null;
}

/**
 * Topological order (Kahn's algorithm). Ties are broken by `rank` (e.g. unit number, then
 * topic order) so the result is stable and follows the syllabus where the graph allows.
 * Throws if the graph has a cycle.
 */
export function topologicalSort(nodes, edges, rank = () => []) {
  const indeg = new Map(nodes.map((n) => [n, 0]));
  const adj = new Map(nodes.map((n) => [n, []]));
  for (const e of edges) {
    if (!indeg.has(e.from) || !indeg.has(e.to)) continue;
    adj.get(e.from).push(e.to);
    indeg.set(e.to, indeg.get(e.to) + 1);
  }
  const cmp = (a, b) => {
    const ra = rank(a),
      rb = rank(b);
    for (let i = 0; i < Math.max(ra.length, rb.length); i++) {
      const d = (ra[i] ?? 0) - (rb[i] ?? 0);
      if (d !== 0) return d;
    }
    return a < b ? -1 : a > b ? 1 : 0;
  };
  const ready = nodes.filter((n) => indeg.get(n) === 0).sort(cmp);
  const out = [];
  while (ready.length) {
    const n = ready.shift();
    out.push(n);
    for (const m of adj.get(n)) {
      indeg.set(m, indeg.get(m) - 1);
      if (indeg.get(m) === 0) {
        ready.push(m);
        ready.sort(cmp);
      }
    }
  }
  if (out.length !== nodes.length) throw new Error('Graph has a cycle');
  return out;
}

/** Direct prerequisites of `id` (edges pointing into it). */
export function directPrerequisites(id, edges) {
  return edges.filter((e) => e.to === id).map((e) => e.from);
}

/** Topics directly unlocked by `id` (edges leaving it). */
export function directUnlocks(id, edges) {
  return edges.filter((e) => e.from === id).map((e) => e.to);
}
