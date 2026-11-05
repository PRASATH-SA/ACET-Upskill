import { useQuery } from '@tanstack/react-query';
import { get } from '../../api/client';

export const useVersions = () =>
  useQuery({ queryKey: ['syllabus-versions'], queryFn: () => get('/syllabus-versions') });
export const useDepartments = () =>
  useQuery({ queryKey: ['departments'], queryFn: () => get('/departments') });
export const useUsersByRole = (role) =>
  useQuery({
    queryKey: ['admin', 'users', { role, limit: 100 }],
    queryFn: () => get('/users', { query: { role, limit: 100 } }),
  });

export const versionLabel = (v) =>
  `${v.branch} · ${v.regulation} · ${v.academicYear}${v.isActive ? '' : ' (inactive)'}`;
