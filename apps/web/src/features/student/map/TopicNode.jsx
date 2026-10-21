import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Award, Lock, MapPin, RotateCcw, Sparkles } from 'lucide-react';
import { MAP_NODE_SIZE, MAP_NODE_STYLE } from '@acet/shared';
import { cn } from '../../../lib/cn';
import { STATE_LABEL } from './graph';

const ICON = { mastered: Award, locked: Lock, needsRevision: RotateCcw };

/**
 * Per-state glass treatment on top of the A.8 node colours. Filled states (mastered, current)
 * stay solid so their text keeps AA contrast; unlocked and locked nodes are frosted glass.
 */
const SURFACE = {
  mastered: 'shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_4px_0_0_#C9A100]',
  needsRevision: 'shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_4px_0_0_#C9A100]',
  current: 'animate-glow-pulse shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]',
  unlocked:
    'backdrop-blur-md shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_4px_0_0_rgb(47_107_234/0.25)]',
  locked: 'backdrop-blur-md',
};

/** Translucent fills for the glass states; the solid states use MAP_NODE_STYLE as is. */
const GLASS_FILL = {
  unlocked: 'rgb(255 255 255 / 0.72)',
  locked: 'rgb(229 231 235 / 0.72)',
};

/**
 * A topic on the concept map. Colours come from MAP_NODE_STYLE (A.8). The node is a real
 * button for keyboard access.
 */
export const TopicNode = memo(function TopicNode({ id, data }) {
  const style = MAP_NODE_STYLE[data.state] ?? MAP_NODE_STYLE.unlocked;
  const Icon = ICON[data.state];
  const isCurrent = data.state === 'current';
  const isMastered = data.state === 'mastered';
  const isLocked = data.state === 'locked';

  return (
    <div
      className={cn('relative animate-glass-pop transition-opacity', data.dimmed && 'opacity-30')}
      style={{ width: MAP_NODE_SIZE.width }}
    >
      {isCurrent && (
        <span className="absolute -top-8 left-1/2 inline-flex -translate-x-1/2 animate-float items-center gap-1 whitespace-nowrap rounded-full border border-white/30 bg-navy/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-glass-lg backdrop-blur">
          <MapPin className="h-3 w-3 text-gold" aria-hidden />
          You are here
        </span>
      )}

      {isMastered && (
        <Sparkles
          className="absolute -right-2 -top-2.5 z-10 h-5 w-5 animate-float text-gold-border drop-shadow"
          aria-hidden
        />
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
        onFocus={(e) => {
          let keyboard = true;
          try {
            keyboard = e.currentTarget.matches(':focus-visible');
          } catch {
            // Older engines without :focus-visible: treat every focus as keyboard focus.
          }
          if (keyboard) data.onFocusNode?.(id);
        }}
        className={cn(
          'nodrag nopan flex w-full items-center gap-2.5 rounded-2xl border px-3 text-left text-sm font-semibold leading-snug outline-none transition-[transform,box-shadow] duration-200',
          'bg-[linear-gradient(180deg,rgb(255_255_255/0.35),rgb(255_255_255/0)_55%)]',
          'focus-visible:ring-4 focus-visible:ring-blue/40 focus-visible:ring-offset-2',
          SURFACE[data.state] ?? SURFACE.unlocked,
          data.selected && 'ring-4 ring-navy/30',
          data.highlighted && 'ring-4 ring-gold',
          data.draft && 'border-dashed opacity-60',
          isLocked ? 'cursor-not-allowed' : 'hover:-translate-y-0.5 active:translate-y-0.5',
        )}
        style={{
          minHeight: MAP_NODE_SIZE.height,
          backgroundColor: GLASS_FILL[data.state] ?? style.fill,
          borderColor: style.border,
          color: style.text,
        }}
      >
        {(Icon || isCurrent) && (
          <span
            className={cn(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl',
              isCurrent ? 'bg-white/20' : isLocked ? 'bg-navy/10' : 'bg-white/50',
            )}
          >
            {isCurrent ? (
              <MapPin className="h-4 w-4" aria-hidden />
            ) : (
              <Icon className="h-4 w-4" aria-hidden />
            )}
          </span>
        )}
        <span className="line-clamp-2">{data.title}</span>
      </button>

      {/* Revision dot (A.8: gold node with an orange dot). */}
      {data.state === 'needsRevision' && (
        <span
          aria-hidden
          className="absolute -right-1.5 -top-1.5 h-4 w-4 animate-pulse rounded-full border-2 border-white shadow"
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
