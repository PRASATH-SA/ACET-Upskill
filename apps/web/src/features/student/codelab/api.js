import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../../../api/client';

export const codeLabKeys = {
  topic: (id) => ['topics', id, 'code-lab'],
  subject: (id) => ['subjects', id, 'code-lab'],
  challenge: (id) => ['code-lab', id],
  subjects: ['code-lab', 'subjects'],
};

/** Subjects with published code problems: [{ subjectId, total }]. */
export const useCodingSubjects = () =>
  useQuery({ queryKey: codeLabKeys.subjects, queryFn: () => get('/code-lab/subjects') });

export const useTopicCodeLab = (topicId, enabled = true) =>
  useQuery({
    queryKey: codeLabKeys.topic(topicId),
    queryFn: () => get(`/topics/${topicId}/code-lab`),
    enabled: Boolean(topicId) && enabled,
  });

export const useSubjectCodeLab = (subjectId) =>
  useQuery({
    queryKey: codeLabKeys.subject(subjectId),
    queryFn: () => get(`/subjects/${subjectId}/code-lab`),
    enabled: Boolean(subjectId),
  });

export const useChallenge = (id) =>
  useQuery({ queryKey: codeLabKeys.challenge(id), queryFn: () => get(`/code-lab/${id}`) });

/** Run on the sample data. Errors in the SQL come back as data ({ ok: false }), not as a failure. */
/** `input` (Python only) is the program's stdin; omitted, the server uses the first example. */
export const useRunCode = (id) =>
  useMutation({
    mutationFn: ({ code, input }) => post(`/code-lab/${id}/run`, { code, input }),
  });

export function useSubmitCode(id, topicId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code) => post(`/code-lab/${id}/submit`, { code }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: codeLabKeys.challenge(id) });
      qc.invalidateQueries({ queryKey: codeLabKeys.topic(topicId) });
      qc.invalidateQueries({
        queryKey: ['subjects'],
        predicate: (q) => q.queryKey[2] === 'code-lab',
      });
    },
  });
}
