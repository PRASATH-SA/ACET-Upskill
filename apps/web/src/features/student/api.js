import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SubjectMapSchema } from '@acet/shared';
import { get, post, put } from '../../api/client';

/** Query keys for student data, shared so mutations can invalidate precisely. */
export const keys = {
  subjects: ['subjects'],
  map: (id) => ['subjects', id, 'map'],
  myMap: (id) => ['subjects', id, 'map', 'me'],
  learningOrder: (id) => ['subjects', id, 'learning-order'],
  lab: (id) => ['subjects', id, 'lab'],
  examPrep: (id, f) => ['subjects', id, 'exam-prep', f ?? {}],
  progress: ['me', 'progress'],
  revision: ['revision', 'today'],
  topicPage: (id) => ['topics', id, 'page'],
  quiz: (id) => ['topics', id, 'quiz'],
  search: (q) => ['search', q],
};

export const useSubjects = () =>
  useQuery({ queryKey: keys.subjects, queryFn: () => get('/subjects') });

/** ADR 0012: lab subjects have no topics of their own, so topic-based pages skip them. */
export const isPractical = (subject) => subject?.kind === 'practical';
export const theoryOnly = (subjects) => (subjects ?? []).filter((s) => !isPractical(s));

/** A lab: its experiments (on the theory roadmap), the student's progress, and for staff the linkable problems. */
export const useLab = (subjectId, enabled = true) =>
  useQuery({
    queryKey: keys.lab(subjectId),
    queryFn: () => get(`/subjects/${subjectId}/lab`),
    enabled: Boolean(subjectId) && enabled,
  });

/** A student marks an experiment done (or not) when it was completed outside the code lab. */
export function useMarkExperimentDone(subjectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }) => post(`/experiments/${id}/done`, { done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.lab(subjectId) }),
  });
}

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

/** Topics of a subject in learning order, across units: [{ position, topicId, title }]. */
export const useLearningOrder = (subjectId, enabled = true) =>
  useQuery({
    queryKey: keys.learningOrder(subjectId),
    queryFn: () => get(`/subjects/${subjectId}/learning-order`),
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
/** Saves where the student is on a topic's step page (PUT /topics/:id/steps). Fire and forget. */
export function useSaveTopicSteps(topicId) {
  return useMutation({
    mutationFn: (body) => put(`/topics/${topicId}/steps`, body),
    meta: { silent: true },
  });
}

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
