import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MAP_NODE_STYLE } from '@acet/shared';
import { buildFlow, edgeKind, learningOrderIds, neighboursOf, positionsFor } from './graph';
import { MapListView } from './MapListView';
import { RoadmapView } from './RoadmapView';
import { TopicPanel } from './TopicPanel';

const map = {
  subject: { id: 's', code: 'CS T53', name: 'DBMS', semester: 5 },
  units: [
    { id: 'u3', number: 3, title: 'Database Design' },
    { id: 'u4', number: 4, title: 'Indexing' },
  ],
  topics: [
    {
      id: 'rel',
      unitId: 'u3',
      parentTopicId: null,
      title: 'Relational Model',
      summary: 'Tables',
      order: 0,
      position: { x: 0, y: 0 },
      status: 'approved',
    },
    {
      id: 'keys',
      unitId: 'u3',
      parentTopicId: null,
      title: 'Keys',
      summary: '',
      order: 1,
      position: { x: 0, y: 0 },
      status: 'approved',
    },
    {
      id: 'norm',
      unitId: 'u3',
      parentTopicId: null,
      title: 'Normalization',
      summary: '',
      order: 2,
      position: { x: 0, y: 0 },
      status: 'approved',
    },
    {
      id: 'idx',
      unitId: 'u4',
      parentTopicId: null,
      title: 'Indexing',
      summary: '',
      order: 3,
      position: { x: 0, y: 0 },
      status: 'approved',
    },
  ],
  links: [
    {
      id: 'l1',
      fromTopicId: 'rel',
      toTopicId: 'keys',
      type: 'prerequisite',
      reason: 'Keys are defined on relations.',
      status: 'approved',
      source: 'faculty',
      crossUnit: false,
    },
    {
      id: 'l2',
      fromTopicId: 'keys',
      toTopicId: 'norm',
      type: 'prerequisite',
      reason: 'Normal forms are defined by keys.',
      status: 'approved',
      source: 'faculty',
      crossUnit: false,
    },
    {
      id: 'l3',
      fromTopicId: 'keys',
      toTopicId: 'idx',
      type: 'related',
      reason: 'Primary keys get an index.',
      status: 'approved',
      source: 'faculty',
      crossUnit: true,
    },
    {
      id: 'l4',
      fromTopicId: 'rel',
      toTopicId: 'norm',
      type: 'related',
      reason: 'Same tables.',
      status: 'approved',
      source: 'ai',
      crossUnit: false,
    },
  ],
};

const me = {
  currentTopicId: 'keys',
  nodes: [
    {
      topicId: 'rel',
      state: 'mastered',
      mastery: 'confident',
      score: 90,
      missingPrerequisites: [],
    },
    {
      topicId: 'keys',
      state: 'current',
      mastery: 'learning',
      score: null,
      missingPrerequisites: [],
    },
    {
      topicId: 'norm',
      state: 'locked',
      mastery: 'notStarted',
      score: null,
      missingPrerequisites: ['keys'],
    },
    {
      topicId: 'idx',
      state: 'needsRevision',
      mastery: 'needsRevision',
      score: 60,
      missingPrerequisites: [],
    },
  ],
};

describe('graph builder', () => {
  it('classifies edges: prerequisite solid, related dashed, cross-unit related red dashed', () => {
    expect(edgeKind(map.links[0])).toBe('prerequisite');
    expect(edgeKind(map.links[3])).toBe('related');
    expect(edgeKind(map.links[2])).toBe('crossUnitRelated');
  });

  it('lays out a map whose stored positions are all stacked', () => {
    const p = positionsFor(map);
    expect(p.rel.x).toBeLessThan(p.keys.x);
    expect(p.keys.x).toBeLessThan(p.norm.x);
  });

  it('builds nodes in learning order with the student state, and dims other units', () => {
    const order = learningOrderIds(map, me);
    const { nodes, edges } = buildFlow({ map, me, order, selectedId: 'norm', unitId: 'u4' });
    expect(nodes.map((n) => n.id)).toEqual(['rel', 'keys', 'norm', 'idx']);
    expect(nodes.find((n) => n.id === 'norm').data).toMatchObject({
      state: 'locked',
      selected: true,
      missing: ['Keys'],
      dimmed: true,
    });
    expect(nodes.find((n) => n.id === 'idx').data.dimmed).toBe(false);
    expect(edges.find((e) => e.id === 'l3').data).toMatchObject({
      kind: 'crossUnitRelated',
      dimmed: false,
    });
    expect(edges.find((e) => e.id === 'l1').data.dimmed).toBe(true);
  });

  it('shows every node as unlocked for staff (no student state)', () => {
    const { nodes } = buildFlow({ map, order: learningOrderIds(map) });
    expect(new Set(nodes.map((n) => n.data.state))).toEqual(new Set(['unlocked']));
  });

  it('lists builds-on, unlocks and related topics with reasons', () => {
    const n = neighboursOf(map, 'keys');
    expect(n.buildsOn).toEqual([
      { id: 'rel', title: 'Relational Model', reason: 'Keys are defined on relations.' },
    ]);
    expect(n.unlocks.map((t) => t.title)).toEqual(['Normalization']);
    expect(n.related).toEqual([
      { id: 'idx', title: 'Indexing', reason: 'Primary keys get an index.', crossUnit: true },
    ]);
  });

  it('uses the exact A.8 colours per state', () => {
    expect(MAP_NODE_STYLE.mastered.fill).toBe('#F5C000');
    expect(MAP_NODE_STYLE.current.fill).toBe('#2F6BEA');
    expect(MAP_NODE_STYLE.unlocked).toMatchObject({ fill: '#FFFFFF', border: '#2F6BEA' });
    expect(MAP_NODE_STYLE.needsRevision.fill).toBe('#F5C000');
  });
});

describe('selected-topic panel', () => {
  const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

  it('shows the start CTA, exam insight and connections for an open topic', async () => {
    const onSelect = vi.fn();
    wrap(
      <TopicPanel
        map={map}
        node={me.nodes[1]}
        topicId="keys"
        examFrequency={4}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByText('Selected topic')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Keys' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start topic' })).toHaveAttribute(
      'href',
      '/topics/keys',
    );
    expect(screen.getByText('Asked 4× in 5 years')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Normalization/ }));
    expect(onSelect).toHaveBeenCalledWith('norm');
  });

  it('shows "Review topic" when mastered', () => {
    wrap(<TopicPanel map={map} node={me.nodes[0]} topicId="rel" onSelect={() => {}} />);
    expect(screen.getByRole('link', { name: 'Review topic' })).toBeInTheDocument();
  });

  it('tells a student what to finish first instead of a start button when locked', async () => {
    const onSelect = vi.fn();
    wrap(<TopicPanel map={map} node={me.nodes[2]} topicId="norm" onSelect={onSelect} />);
    expect(screen.queryByRole('link', { name: /Start topic/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Finish/)).toHaveTextContent('Finish Keys first');
    await userEvent.click(screen.getByRole('button', { name: 'Go to Keys' }));
    expect(onSelect).toHaveBeenCalledWith('keys');
  });
});

describe('list view', () => {
  it('is an ordered list that announces each state and what is missing', () => {
    render(
      <MemoryRouter>
        <MapListView map={map} me={me} order={learningOrderIds(map, me)} onSelect={() => {}} />
      </MemoryRouter>,
    );
    const list = screen.getByRole('list', { name: /learning order/ });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[2]).toHaveTextContent('Normalization');
    expect(items[2]).toHaveTextContent('Locked');
    expect(items[2]).toHaveTextContent('Needs Keys');
    expect(within(items[2]).queryByRole('link')).not.toBeInTheDocument();
    expect(within(items[1]).getByRole('link', { name: 'Open Keys' })).toHaveAttribute(
      'href',
      '/topics/keys',
    );
  });
});

describe('learning path (roadmap view)', () => {
  const renderPath = (onSelect = () => {}) =>
    render(
      <MemoryRouter>
        <RoadmapView
          map={map}
          me={me}
          order={learningOrderIds(map, me)}
          onSelect={onSelect}
          onDetails={() => {}}
          onOpenMap={() => {}}
        />
      </MemoryRouter>,
    );

  it('groups topics by unit in learning order and names each state', () => {
    renderPath();
    const unit3 = screen.getByRole('list', { name: 'Unit 3: Database Design' });
    const nodes = within(unit3).getAllByRole('button', { name: /Unit 3$/ });
    expect(nodes.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Relational Model. Mastered. Unit 3',
      'Keys. You are here. Unit 3',
      'Normalization. Locked. Unit 3',
    ]);
    expect(nodes[1]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('list', { name: 'Unit 4: Indexing' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Unit 3 reward: 1 of 3/ })).toBeInTheDocument();
  });

  it('opens a card with the next action; a locked topic says what to finish first', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderPath(onSelect);
    await user.click(screen.getByRole('button', { name: /^Keys\./ }));
    expect(onSelect).toHaveBeenCalledWith('keys');
    // Keys is in progress ("learning"), so the action is Continue.
    expect(screen.getByRole('link', { name: 'Continue Keys' })).toHaveAttribute(
      'href',
      '/topics/keys',
    );

    await user.click(screen.getByRole('button', { name: /^Normalization\./ }));
    expect(screen.queryByRole('link', { name: /Keys/ })).not.toBeInTheDocument();
    expect(screen.getByText('Finish Keys first')).toBeInTheDocument();
  });
});
