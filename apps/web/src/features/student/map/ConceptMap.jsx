import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Crosshair, Maximize } from 'lucide-react';
import { MAP_EDGE_STYLE, MAP_NODE_SIZE, MAP_NODE_STYLE } from '@acet/shared';
import { useIsMobile } from '../../../hooks/useMediaQuery';
import { Button, IconButton } from '../../../components/ui';
import { buildFlow, STATE_LABEL } from './graph';
import { EdgeMarkers, LinkEdge } from './LinkEdge';
import { TopicNode } from './TopicNode';

const nodeTypes = { topic: TopicNode };
const edgeTypes = { link: LinkEdge };

export function Legend({ className }) {
  const edgeRows = [
    ['prerequisite', 'Prerequisite (comes first)'],
    ['related', 'Related'],
    ['crossUnitRelated', 'Related, other unit'],
  ];
  return (
    <div className={className}>
      <p className="eyebrow">Legend</p>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-navy sm:grid-cols-1">
        {Object.entries(STATE_LABEL).map(([state, label]) => {
          const s = MAP_NODE_STYLE[state];
          return (
            <li key={state} className="flex items-center gap-2">
              <span
                aria-hidden
                className="relative inline-block h-3.5 w-6 rounded-md border-2"
                style={{ background: s.fill, borderColor: s.border }}
              >
                {s.dot && (
                  <span
                    className="absolute -right-1 -top-1 h-2 w-2 rounded-full"
                    style={{ background: s.dot }}
                  />
                )}
              </span>
              {label}
            </li>
          );
        })}
        {edgeRows.map(([kind, label]) => {
          const s = MAP_EDGE_STYLE[kind];
          return (
            <li key={kind} className="flex items-center gap-2">
              <svg width="24" height="8" aria-hidden>
                <line
                  x1="0"
                  y1="4"
                  x2="24"
                  y2="4"
                  stroke={s.stroke}
                  strokeWidth="2"
                  strokeDasharray={s.dashed ? '4 3' : undefined}
                />
              </svg>
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function edgeAria(e) {
  const kind = e.data.type === 'prerequisite' ? 'Prerequisite' : 'Related';
  return `${kind}: ${e.data.fromTitle} to ${e.data.toTitle}. ${e.data.reason}`;
}

function MapCanvas({
  map,
  me,
  order,
  selectedId,
  onSelect,
  highlightId,
  unitId,
  currentId,
  focusRequest,
}) {
  const isMobile = useIsMobile();
  const { setCenter, fitView, getNode } = useReactFlow();
  const [activeEdge, setActiveEdge] = useState(null);

  const centreOn = useCallback(
    (id, zoom) => {
      const n = getNode(id);
      if (!n) return;
      setCenter(n.position.x + MAP_NODE_SIZE.width / 2, n.position.y + MAP_NODE_SIZE.height / 2, {
        zoom: zoom ?? 1.1,
        duration: 400,
      });
    },
    [getNode, setCenter],
  );

  // Search and the "focus current topic" button ask the canvas to centre a node.
  useEffect(() => {
    if (focusRequest?.id) centreOn(focusRequest.id);
  }, [focusRequest, centreOn]);

  const flow = useMemo(
    () => buildFlow({ map, me, order, selectedId, highlightId, unitId }),
    [map, me, order, selectedId, highlightId, unitId],
  );

  const nodes = useMemo(
    () =>
      flow.nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onSelect,
          // Keep the keyboard-focused node on screen.
          onFocusNode: (id) => centreOn(id, undefined),
        },
      })),
    [flow.nodes, onSelect, centreOn],
  );
  const edges = useMemo(
    () =>
      flow.edges.map((e) => ({
        ...e,
        ariaLabel: edgeAria(e),
        data: { ...e.data, active: e.id === activeEdge },
      })),
    [flow.edges, activeEdge],
  );

  return (
    <div className="relative h-full w-full">
      <EdgeMarkers />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        edgesFocusable
        onEdgeClick={(_, edge) => setActiveEdge((cur) => (cur === edge.id ? null : edge.id))}
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => setActiveEdge(null)}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        // On a phone the whole map fits only at an unreadable zoom, so start on the current topic.
        onInit={() => {
          if (isMobile && (currentId || selectedId)) {
            requestAnimationFrame(() => centreOn(currentId ?? selectedId, 0.9));
          }
        }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        panOnScroll={!isMobile}
        zoomOnDoubleClick={false}
        aria-label={`Concept map for ${map.subject.name}`}
      >
        <Background gap={24} size={1} color="#E3E7EE" />
        <Controls showInteractive={false} position="bottom-left" />
        {!isMobile && (
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            ariaLabel="Mini map"
            nodeColor={(n) => MAP_NODE_STYLE[n.data.state]?.fill ?? '#fff'}
            nodeStrokeColor={(n) => MAP_NODE_STYLE[n.data.state]?.border ?? '#2F6BEA'}
            nodeStrokeWidth={3}
            maskColor="rgba(15,45,92,0.08)"
          />
        )}
      </ReactFlow>
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        {currentId && (
          <Button
            size="sm"
            variant="secondary"
            icon={Crosshair}
            onClick={() => centreOn(currentId, 1.2)}
          >
            Focus current
          </Button>
        )}
        <IconButton
          icon={Maximize}
          label="Fit map to screen"
          variant="outline"
          onClick={() => fitView({ padding: 0.2, duration: 400 })}
        />
      </div>
    </div>
  );
}

/** The student concept map (F3). Pan and zoom, keyboard-reachable nodes, edge reasons on click. */
export function ConceptMap(props) {
  return (
    <ReactFlowProvider>
      <MapCanvas {...props} />
    </ReactFlowProvider>
  );
}
