import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { Badge, Button } from '../../../components/ui';
import { useSetStatus } from '../api';

const STATUS_TONE = { draft: 'neutral', inReview: 'blue', approved: 'gold', published: 'green' };
const STATUS_LABEL = {
  draft: 'Draft',
  inReview: 'In review',
  approved: 'Approved',
  published: 'Published',
};

/** Badges for an item's status, source and flags. */
export function ItemBadges({ item }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
      {item.source === 'ai' && (
        <Badge tone="blue" icon={Sparkles}>
          AI draft{item.editedAfterAi ? ' · edited' : ''}
        </Badge>
      )}
      {item.needsAttention && (
        <Badge tone="orange" icon={AlertTriangle}>
          Needs attention
        </Badge>
      )}
      {item.rejectedAt && (
        <Badge tone="red">Rejected{item.rejectReason ? `: ${item.rejectReason}` : ''}</Badge>
      )}
    </span>
  );
}

/**
 * Status actions (B3 status machine). "Approve & publish" is the main one: only published
 * content reaches students, so approving makes it appear on the topic page at once.
 * `type` is resources | flashcards | questions.
 */
export function ItemStatusActions({ type, item, canApprove = true }) {
  const set = useSetStatus();
  const go = (status) => set.mutate({ type, id: item.id, status });
  return (
    <div className="flex flex-wrap gap-2">
      {item.status !== 'published' && canApprove && (
        <Button
          size="sm"
          icon={CheckCircle2}
          loading={set.isPending}
          onClick={() => go('published')}
        >
          Approve &amp; publish
        </Button>
      )}
      {item.status === 'draft' && (
        <Button size="sm" variant="secondary" onClick={() => go('inReview')}>
          Send for review
        </Button>
      )}
      {item.status !== 'draft' && (
        <Button size="sm" variant="ghost" onClick={() => go('draft')}>
          {item.status === 'published' ? 'Unpublish' : 'Back to draft'}
        </Button>
      )}
    </div>
  );
}
