import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Award, Lock, RotateCcw } from 'lucide-react';
import { MAP_NODE_SIZE, MAP_NODE_STYLE } from '@acet/shared';
import { cn } from '../../../lib/cn';
import { STATE_LABEL } from './graph';

const ICON = { mastered: Award, locked: Lock, needsRevision: RotateCcw };

/**
 * A topic on the concept map. Colours come from MAP_NODE_STYLE (A.8) so they match the
 * mockup exactly. The node is a real button: Tab reaches it and Enter selects it.
 */
export const TopicNode = memo(function TopicNode({ id, data }) {
  const style = MAP_NODE_STYLE[data.state] ?? MAP_NODE_STYLE.unlocked;
  const Icon = ICON[data.state];
  const isCurrent = data.state === 'current';
  return (
    <div
      className={cn('relative transition-opacity', data.dimmed && 'opacity-30')}
      style={{ width: MAP_NODE_SIZE.width }}
    >
      {isCurrent && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-navy px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
          You are here
        </span>
      )}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !bg-transparent"
        isConnectable={false}
      />
      <button
        type="button"
        data-topic-id={id}
        data-state={data.state}
        aria-label={`${data.title}. ${STATE_LABEL[data.state]}${data.unitNumber ? `. Unit ${data.unitNumber}` : ''}`}
        aria-pressed={data.selected}
        // No onClick here: the click (mouse, touch, or Enter on this button) bubbles to the
        // React Flow node, whose onNodeClick selects it. A node without a click handler gets
        // pointer-events: none from React Flow, so the map must own the handler.
        onFocus={(e) => {
          // Centre only for keyboard focus; a click shouldn't move the map.
          let keyboard = true;
          try {
            keyboard = e.currentTarget.matches(':focus-visible');
          } catch {
            // Older engines without :focus-visible: treat every focus as keyboard focus.
          }
          if (keyboard) data.onFocusNode?.(id);
        }}
        className={cn(
          'nodrag nopan flex w-full items-center gap-2 rounded-2xl border-2 px-3 text-left text-sm font-semibold leading-snug outline-none',
          'focus-visible:ring-4 focus-visible:ring-blue/40 focus-visible:ring-offset-2',
          isCurrent && 'ring-[6px] ring-blue/20',
          data.selected && 'ring-4 ring-navy/40',
          data.highlighted && 'animate-pulse ring-4 ring-gold',
          data.draft && 'border-dashed',
        )}
        style={{
          minHeight: MAP_NODE_SIZE.height,
          background: style.fill,
          borderColor: style.border,
          color: style.text,
        }}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
        <span className="line-clamp-2">{data.title}</span>
      </button>
      {data.state === 'needsRevision' && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white"
          style={{ background: MAP_NODE_STYLE.needsRevision.dot }}
        />
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0 !bg-transparent"
        isConnectable={false}
      />
    </div>
  );
});
