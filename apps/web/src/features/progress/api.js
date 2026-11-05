import { useQuery } from '@tanstack/react-query';
import { get } from '../../api/client';

/** Cohort filters (ADR 0013): { subjectId?, departmentId?, semester?, batch?, limit? }. */
export const useLeaderboard = (query = {}) =>
  useQuery({
    queryKey: ['leaderboard', query],
    queryFn: () => get('/leaderboard', { query }),
  });

export const useProgressReport = (query = {}, { enabled = true } = {}) =>
  useQuery({
    queryKey: ['reports', 'progress', query],
    queryFn: () => get('/reports/progress', { query }),
    enabled,
  });

export const useStudentReport = (id) =>
  useQuery({
    queryKey: ['reports', 'student', id],
    queryFn: () => get(`/reports/students/${id}`),
  });

/** Where staff open one student: mentors keep their notes page, faculty and HODs the report. */
export const studentPath = (role, id) =>
  role === 'mentor' ? `/mentor/students/${id}` : `/studio/students/${id}`;
