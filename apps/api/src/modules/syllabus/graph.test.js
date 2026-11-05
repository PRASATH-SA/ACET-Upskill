import { describe, expect, it } from 'vitest';
import { findCycle, topologicalSort } from './graph.js';

describe('findCycle', () => {
  it('returns null for a DAG', () => {
    expect(
      findCycle(
        ['a', 'b', 'c'],
        [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
          { from: 'a', to: 'c' },
        ],
      ),
    ).toBeNull();
  });

  it('names the cycle A→B→C→A', () => {
    const cycle = findCycle(
      ['A', 'B', 'C'],
      [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'A' },
      ],
    );
    expect(cycle).not.toBeNull();
    expect(cycle[0]).toBe(cycle[cycle.length - 1]);
    expect(new Set(cycle)).toEqual(new Set(['A', 'B', 'C']));
    expect(cycle).toHaveLength(4);
  });

  it('detects a self loop', () => {
    expect(findCycle(['a'], [{ from: 'a', to: 'a' }])).toEqual(['a', 'a']);
  });

  it('handles long chains without recursion limits', () => {
    const n = 20_000;
    const nodes = Array.from({ length: n }, (_, i) => `n${i}`);
    const edges = nodes.slice(1).map((to, i) => ({ from: nodes[i], to }));
    expect(findCycle(nodes, edges)).toBeNull();
  });
});

describe('topologicalSort', () => {
  it('orders prerequisites first and breaks ties by rank', () => {
    const rank = { a: [1, 1], b: [1, 2], c: [1, 3], d: [2, 1] };
    const order = topologicalSort(['d', 'c', 'b', 'a'], [{ from: 'c', to: 'a' }], (id) => rank[id]);
    expect(order).toEqual(['b', 'c', 'a', 'd']);
  });

  it('throws on a cycle', () => {
    expect(() =>
      topologicalSort(
        ['a', 'b'],
        [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'a' },
        ],
      ),
    ).toThrow();
  });
});
