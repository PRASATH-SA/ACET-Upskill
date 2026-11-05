import { memo, useCallback, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Sparkles } from 'lucide-react';
import { MAP_NODE_SIZE } from '@acet/shared';
import { cn } from '../../../lib/cn';
import { edgeKind } from '../../student/map/graph';
import { EdgeMarkers, LinkEdge } from '../../student/map/LinkEdge';

/** An editable topic node. AI drafts are outlined dashed with an "AI draft" tag (F6.2). */
const EditorNode = memo(function EditorNode({ data, selected }) {
  const aiDraft = data.source === 'ai' && data.status !== 'approved' && data.status !== 'published';
  return (
    <div
      className={cn(
        'relative rounded-2xl border-2 bg-card px-3 py-2 text-sm font-semibold leading-snug text-navy',
        aiDraft
          ? 'border-dashed border-blue'
          : data.status === 'approved' || data.status === 'published'
            ? 'border-navy'
            : 'border-line',
        selected && 'ring-4 ring-blue/30',
        data.parent && 'bg-surface',
      )}
      style={{ width: MAP_NODE_SIZE.width, minHeight: MAP_NODE_SIZE.height }}
      title={data.summary}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-navy"
      />
      {aiDraft && (
        <span className="absolute -top-3 left-3 inline-flex items-center gap-1 rounded-full bg-blue px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          <Sparkles className="h-3 w-3" aria-hidden /> AI draft
        </span>
      )}
      <span className="line-clamp-2">{data.title}</span>
      <span className="mt-0.5 block text-[11px] font-medium text-body">
        Unit {data.unitNumber}
        {data.status !== 'draft' && ` · ${data.status}`}
      </span>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-navy"
      />
    </div>
  );
});

const nodeTypes = { editor: EditorNode };
const edgeTypes = { link: LinkEdge };

function Canvas({ state, units, selected, onSelect, dispatch, onConnectRequest }) {
  const [drag, setDrag] = useState({});
  const unitNumber = useMemo(() => new Map(units.map((u) => [u.id, u.number])), [units]);
  const titleOf = useMemo(() => new Map(state.topics.map((t) => [t.id, t.title])), [state.topics]);

  const nodes = useMemo(
    () =>
      state.topics.map((t) => ({
        id: t.id,
        type: 'editor',
        position: drag[t.id] ?? t.position,
        selected: selected?.kind === 'topic' && selected.id === t.id,
        ariaLabel: `${t.title}, unit ${unitNumber.get(t.unitId)}, ${t.status}${t.source === 'ai' ? ', AI draft' : ''}`,
        data: { ...t, unitNumber: unitNumber.get(t.unitId), parent: Boolean(t.parentTopicId) },
      })),
    [state.topics, drag, selected, unitNumber],
  );
  const edges = useMemo(
    () =>
      state.links.map((l) => ({
        id: l.id,
        source: l.fromTopicId,
        target: l.toTopicId,
        type: 'link',
        ariaLabel: `${l.type} link: ${titleOf.get(l.fromTopicId)} to ${titleOf.get(l.toTopicId)}`,
        data: {
          kind: edgeKind(l),
          type: l.type,
          reason: l.reason,
          active: selected?.kind === 'link' && selected.id === l.id,
          draft: l.source === 'ai' && l.status === 'draft',
        },
      })),
    [state.links, selected, titleOf],
  );

  const onNodesChange = useCallback((changes) => {
    const moves = changes.filter((c) => c.type === 'position' && c.position);
    if (moves.length)
      setDrag((d) => ({ ...d, ...Object.fromEntries(moves.map((c) => [c.id, c.position])) }));
  }, []);

  return (
    <>
      <EdgeMarkers />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={(_, node) => {
          dispatch({ type: 'move', id: node.id, position: node.position });
          setDrag((d) => {
            const { [node.id]: _gone, ...rest } = d;
            return rest;
          });
        }}
        onNodeClick={(_, n) => onSelect({ kind: 'topic', id: n.id })}
        onEdgeClick={(_, e) => onSelect({ kind: 'link', id: e.id })}
        onPaneClick={() => onSelect(null)}
        onConnect={(c) => onConnectRequest({ fromTopicId: c.source, toTopicId: c.target })}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.1 }}
        minZoom={0.15}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
        aria-label="Editable concept map"
      >
        {/* Dot grid: a theme line colour, so it shows on light and dark pages. */}
        <Background gap={24} size={1} color="rgb(var(--c-line))" />
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap pannable zoomable position="bottom-right" ariaLabel="Mini map" />
      </ReactFlow>
    </>
  );
}

export function MapEditor(props) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
