import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import { MAP_EDGE_STYLE } from '@acet/shared';

/** Arrow markers for prerequisite edges, one per colour. Render once inside the flow. */
export function EdgeMarkers() {
  return (
    <svg className="absolute h-0 w-0" aria-hidden>
      <defs>
        {Object.entries(MAP_EDGE_STYLE).map(([kind, s]) => (
          <marker
            key={kind}
            id={`arrow-${kind}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={s.stroke} />
          </marker>
        ))}
      </defs>
    </svg>
  );
}

/**
 * A topic link. Prerequisite = solid with an arrow, related = dashed, cross-unit related =
 * red dashed (A.8). When `data.active` is set, the "why connected" reason shows as a tooltip.
 */
export const LinkEdge = memo(function LinkEdge(props) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const style = MAP_EDGE_STYLE[data.kind];
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={24}
        markerEnd={style.arrow ? `url(#arrow-${data.kind})` : undefined}
        style={{
          stroke: style.stroke,
          strokeWidth: data.active ? 3 : 2,
          strokeDasharray: style.dashed ? '6 5' : undefined,
          opacity: data.dimmed ? 0.2 : data.draft ? 0.6 : 1,
        }}
      />
      {data.active && (
        <EdgeLabelRenderer>
          <div
            role="tooltip"
            id={`edge-reason-${id}`}
            className="nodrag nopan pointer-events-auto absolute max-w-[15rem] rounded-xl bg-navy px-3 py-2 text-xs leading-snug text-white"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            <p className="font-bold uppercase tracking-[0.15em] text-gold">
              {data.type === 'prerequisite' ? 'Why it comes first' : 'Why they connect'}
            </p>
            <p className="mt-1">{data.reason}</p>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
