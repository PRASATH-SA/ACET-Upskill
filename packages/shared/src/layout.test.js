import { describe, expect, it } from 'vitest';
import { layoutMap, MAP_NODE_SIZE, needsLayout } from './layout.js';

describe('layoutMap', () => {
  const topics = [
    { id: 'rel', unitId: 'u3' },
    { id: 'keys', unitId: 'u3' },
    { id: 'fd', unitId: 'u3' },
    { id: 'norm', unitId: 'u3' },
    { id: 'idx', unitId: 'u4' },
  ];
  const links = [
    { fromTopicId: 'rel', toTopicId: 'keys', type: 'prerequisite' },
    { fromTopicId: 'keys', toTopicId: 'fd', type: 'prerequisite' },
    { fromTopicId: 'fd', toTopicId: 'norm', type: 'prerequisite' },
    { fromTopicId: 'keys', toTopicId: 'idx', type: 'related' },
  ];

  it('places every prerequisite left of the topic it unlocks', () => {
    const p = layoutMap(topics, links, { unitOrder: ['u3', 'u4'] });
    expect(p.rel.x).toBeLessThan(p.keys.x);
    expect(p.keys.x).toBeLessThan(p.fd.x);
    expect(p.fd.x).toBeLessThan(p.norm.x);
  });

  it('puts each unit in its own band, in unit order, with no overlapping nodes', () => {
    const p = layoutMap(topics, links, { unitOrder: ['u3', 'u4'] });
    expect(p.idx.y).toBeGreaterThan(Math.max(p.rel.y, p.keys.y, p.fd.y, p.norm.y));
    const boxes = Object.values(p);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlap =
          Math.abs(a.x - b.x) < MAP_NODE_SIZE.width && Math.abs(a.y - b.y) < MAP_NODE_SIZE.height;
        expect(overlap).toBe(false);
      }
    }
  });

  it('detects maps whose stored positions are unusable', () => {
    expect(needsLayout(topics.map((t) => ({ ...t, position: { x: 0, y: 0 } })))).toBe(true);
    const laid = layoutMap(topics, links);
    expect(needsLayout(topics.map((t) => ({ ...t, position: laid[t.id] })))).toBe(false);
  });
});
