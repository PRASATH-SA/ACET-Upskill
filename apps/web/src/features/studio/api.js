import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, patch, post } from '../../api/client';

export const skeys = {
  map: (id) => ['subjects', id, 'map'],
  materials: (q) => ['materials', q],
  topicItems: (topicId, type) => ['topics', topicId, 'items', type],
  reviewQueue: (q) => ['review-queue', q],
  jobs: (q) => ['ai', 'jobs', q],
  health: ['ai', 'health'],
  coverage: (topicId) => ['ai', 'coverage', topicId],
  insights: (id) => ['subjects', id, 'insights'],
  workshops: (id) => ['subjects', id, 'workshops'],
  submissions: (id) => ['workshops', id, 'submissions'],
};

/** A.7.8: AI buttons show "AI service offline" from this. Re-checked every 30 s. */
export const useAiHealth = () =>
  useQuery({
    queryKey: skeys.health,
    queryFn: () => get('/ai/health'),
    refetchInterval: 30_000,
    staleTime: 15_000,
    meta: { silent: true },
  });

/** True when AI actions should be disabled. */
export const aiOffline = (health) => health.isError || (health.data && !health.data.reachable);

export const useMaterials = (query) =>
  useQuery({
    queryKey: skeys.materials(query),
    queryFn: () => get('/materials', { query }),
    // Poll while anything is still being ingested.
    refetchInterval: (q) =>
      (q.state.data ?? []).some((m) => ['queued', 'running'].includes(m.ingestStatus))
        ? 2000
        : false,
  });

export function useUploadMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, kind, topicId, subjectId }) => {
      const fd = new FormData();
      fd.set('kind', kind);
      if (topicId) fd.set('topicId', topicId);
      if (subjectId) fd.set('subjectId', subjectId);
      fd.set('file', file);
      return post('/materials', fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materials'] }),
  });
}

export const useJobs = (subjectId) =>
  useQuery({
    queryKey: skeys.jobs({ subjectId }),
    queryFn: () => get('/ai/jobs', { query: { subjectId, limit: 10 } }),
  });

/** Starts an AI job; resolves to the job id (202). */
export function useStartJob(path) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => post(path, body ?? {}).then((d) => d.jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai', 'jobs'] }),
  });
}

/** `type` is resources | flashcards | questions. */
export const useTopicItems = (topicId, type) =>
  useQuery({
    queryKey: skeys.topicItems(topicId, type),
    queryFn: () => get(`/topics/${topicId}/${type}`),
    enabled: Boolean(topicId),
  });

/** Status change for one item: draft | inReview | approved | published. */
export function useSetStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, status }) => post(`/${type}/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topics'] });
      qc.invalidateQueries({ queryKey: ['review-queue'] });
    },
  });
}

export function useSaveItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, topicId, body }) =>
      id ? patch(`/${type}/${id}`, body) : post(`/topics/${topicId}/${type}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topics'] });
      qc.invalidateQueries({ queryKey: ['review-queue'] });
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id }) => del(`/${type}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topics'] }),
  });
}
