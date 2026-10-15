import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError, errorMessage } from '../api/client';
import { toast } from '../components/ui';

/** Errors the user can't act on from a toast (auth expiry has its own toast; 404 renders inline). */
function shouldToast(err) {
  if (err instanceof ApiError) return ![401, 404].includes(err.status);
  return !(err instanceof DOMException && err.name === 'AbortError');
}

/**
 * TanStack Query setup (F1). Queries stay fresh for 30 s, never retry a 4xx, and any failure
 * shows one global error toast unless the query or mutation sets `meta: { silent: true }`.
 */
export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (err, query) => {
        if (query.meta?.silent || !shouldToast(err)) return;
        toast({
          title: 'Could not load data',
          description: errorMessage(err),
          tone: 'error',
          key: 'query-error',
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (err, _vars, _ctx, mutation) => {
        if (mutation.meta?.silent || !shouldToast(err)) return;
        toast.error('That did not work', errorMessage(err));
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: (count, err) => {
          if (err instanceof ApiError && err.status < 500) return false;
          return count < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}
