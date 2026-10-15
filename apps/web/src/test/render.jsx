import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { buildRoutes } from '../app/router';
import { Toaster } from '../components/ui';

/** Renders the real route tree at `path` with a fresh query client. */
export function renderApp(path) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(buildRoutes(), { initialEntries: [path] });
  const utils = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  );
  return { ...utils, router, client };
}

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/**
 * Stubs fetch with a route table: { 'GET /subjects': data | (url, init) => Response }.
 * Unknown routes return 404. Returns the mock for call assertions.
 */
export function mockApi(routes) {
  const fn = vi.fn(async (url, init = {}) => {
    const method = init.method ?? 'GET';
    const path = String(url)
      .replace(/^\/api\/v1/, '')
      .split('?')[0];
    const key = Object.keys(routes).find((k) => {
      const [m, p] = k.split(' ');
      if (m !== method) return false;
      const re = new RegExp(`^${p.replace(/:[^/]+/g, '[^/]+')}$`);
      return re.test(path);
    });
    if (!key)
      return json(404, { error: { code: 'NOT_FOUND', message: `No mock for ${method} ${path}` } });
    const v = routes[key];
    if (typeof v === 'function') return v(url, init);
    if (v instanceof Response) return v;
    return json(200, { data: v });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

export { json };

export const users = {
  student: {
    id: 's1',
    name: 'Priya Raman',
    email: 'student01@acet.test',
    role: 'student',
    departmentId: null,
    batch: '2023-27',
    syllabusVersionId: 'v1',
    mentorId: null,
    isActive: true,
  },
  faculty: {
    id: 'f1',
    name: 'Dr S Lakshmi',
    email: 'faculty1@acet.test',
    role: 'faculty',
    departmentId: null,
    batch: null,
    syllabusVersionId: null,
    mentorId: null,
    isActive: true,
  },
  mentor: {
    id: 'm1',
    name: 'Mentor One',
    email: 'mentor@acet.test',
    role: 'mentor',
    departmentId: null,
    batch: null,
    syllabusVersionId: null,
    mentorId: null,
    isActive: true,
  },
  admin: {
    id: 'a1',
    name: 'HOD',
    email: 'admin@acet.test',
    role: 'admin',
    departmentId: null,
    batch: null,
    syllabusVersionId: null,
    mentorId: null,
    isActive: true,
  },
};

export const session = (user) => ({ accessToken: `tok-${user.role}`, expiresIn: 900, user });
