import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SubjectMapSchema } from '@acet/shared';
import { get, post } from '../../api/client';

/** Query keys for student data, shared so mutations can invalidate precisely. */
export const keys = {
  subjects: ['subjects'],
  map: (id) => ['subjects', id, 'map'],
  myMap: (id) => ['subjects', id, 'map', 'me'],
  examPrep: (id, f) => ['subjects', id, 'exam-prep', f ?? {}],
  progress: ['me', 'progress'],
  revision: ['revision', 'today'],
  topicPage: (id) => ['topics', id, 'page'],
  quiz: (id) => ['topics', id, 'quiz'],
  search: (q) => ['search', q],
};

export const useSubjects = () =>
  useQuery({ queryKey: keys.subjects, queryFn: () => get('/subjects') });

export const useSubjectMap = (subjectId) =>
  useQuery({
    queryKey: keys.map(subjectId),
    queryFn: () => get(`/subjects/${subjectId}/map`, { schema: SubjectMapSchema }),
    enabled: Boolean(subjectId),
  });

/** Node states for the signed-in student (B4.5). */
export const useMyMap = (subjectId, enabled = true) =>
  useQuery({
    queryKey: keys.myMap(subjectId),
    queryFn: () => get(`/subjects/${subjectId}/map/me`),
    enabled: Boolean(subjectId) && enabled,
  });

export const useExamPrep = (subjectId, filters) =>
  useQuery({
    queryKey: keys.examPrep(subjectId, filters),
    queryFn: () => get(`/subjects/${subjectId}/exam-prep`, { query: filters }),
    enabled: Boolean(subjectId),
  });

export const useProgress = (enabled = true) =>
  useQuery({ queryKey: keys.progress, queryFn: () => get('/me/progress'), enabled });

export const useRevisionToday = (enabled = true) =>
  useQuery({ queryKey: keys.revision, queryFn: () => get('/revision/today'), enabled });

export const useSearch = (q) =>
  useQuery({
    queryKey: keys.search(q),
    queryFn: () => get('/search', { query: { q } }),
    enabled: q.trim().length > 0,
  });

export const useTopicPage = (topicId) =>
  useQuery({
    queryKey: keys.topicPage(topicId),
    queryFn: () => get(`/topics/${topicId}/page`),
    enabled: Boolean(topicId),
  });

/** Marks the topic as learning (B4) the first time a student opens it. */
export function useOpenTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (topicId) => post(`/topics/${topicId}/open`),
    meta: { silent: true },
    onSuccess: (_res) => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      qc.invalidateQueries({ queryKey: keys.progress });
    },
  });
}
