import { CloudOff, TriangleAlert } from 'lucide-react';
import { ApiError } from '../api/client';
import { Button, EmptyState } from './ui';

/** Error state for a failed query, with a retry (F7: every screen has an error state). */
export function QueryError({ query, what = 'this', className }) {
  const offline =
    (typeof navigator !== 'undefined' && !navigator.onLine) ||
    (query.error instanceof ApiError && query.error.status >= 500);
  return (
    <EmptyState
      className={className}
      tone="error"
      icon={offline ? CloudOff : TriangleAlert}
      title={offline ? `Can't load ${what} right now` : `Could not load ${what}`}
      description={
        offline
          ? 'You may be offline, or the server is busy. Pages you opened before still work.'
          : (query.error?.message ?? 'Something went wrong.')
      }
      action={
        <Button onClick={() => query.refetch()} loading={query.isFetching}>
          Try again
        </Button>
      }
    />
  );
}
