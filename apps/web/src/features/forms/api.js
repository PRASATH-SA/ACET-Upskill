import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, post, put } from '../../api/client';

export const fkeys = {
  list: ['forms'],
  form: (id) => ['forms', id],
  responses: (id) => ['forms', id, 'responses'],
  view: (id) => ['forms', id, 'view'],
  summary: (id) => ['forms', id, 'summary'],
  mine: ['me', 'forms'],
};

/** Staff: forms they own, collaborate on, or (HOD) their department's. */
export const useForms = () => useQuery({ queryKey: fkeys.list, queryFn: () => get('/forms') });
export const useForm = (id) =>
  useQuery({ queryKey: fkeys.form(id), queryFn: () => get(`/forms/${id}`) });
export const useFormResponses = (id, { enabled = true } = {}) =>
  useQuery({
    queryKey: fkeys.responses(id),
    queryFn: () => get(`/forms/${id}/responses`),
    enabled,
  });

/** Respondent view of a form (staff editors get a preview). */
export const useFormView = (id) =>
  useQuery({ queryKey: fkeys.view(id), queryFn: () => get(`/forms/${id}/view`) });
export const useFormSummary = (id, { enabled = true } = {}) =>
  useQuery({
    queryKey: fkeys.summary(id),
    queryFn: () => get(`/forms/${id}/summary`),
    enabled,
  });

/** Students: forms shared with them. Polls so a new form shows without a reload. */
export const useMyForms = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: fkeys.mine,
    queryFn: () => get('/me/forms'),
    enabled,
    refetchInterval: 120_000,
  });

export const saveForm = (id, body) => put(`/forms/${id}`, body);

export function useFormAction() {
  const qc = useQueryClient();
  return useMutation({
    /** @param {{ id: string, action: 'publish'|'unpublish'|'duplicate'|'release-scores'|'delete' }} v */
    mutationFn: ({ id, action }) =>
      action === 'delete' ? del(`/forms/${id}`) : post(`/forms/${id}/${action}`),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: fkeys.list });
      qc.invalidateQueries({ queryKey: fkeys.form(id) });
      qc.invalidateQueries({ queryKey: fkeys.responses(id) });
    },
  });
}

/** The shareable link students open (they sign in first if needed). */
export const formUrl = (id) => `${window.location.origin}/forms/${id}`;
