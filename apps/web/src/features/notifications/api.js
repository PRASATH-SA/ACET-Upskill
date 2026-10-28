import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../../api/client';

const key = ['notifications'];

/** The bell feed: { items, unread }. Polls every minute. */
export const useNotifications = () =>
  useQuery({
    queryKey: key,
    queryFn: () => get('/notifications', { query: { limit: 20 } }),
    refetchInterval: 60_000,
  });

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => (id ? post(`/notifications/${id}/read`) : post('/notifications/read-all')),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}
