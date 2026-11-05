import { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import {
  RequireAuth,
  RequireRole,
  RoleHomeRedirect,
  FullPageLoading,
} from '../features/auth/guards';
import { LoginPage } from '../features/auth/LoginPage';
import { ProfilePage } from '../features/auth/ProfilePage';
import { ForbiddenPage, NotFoundPage, RouteErrorPage } from '../routes/ErrorPages';
import { appRoutes } from '../routes/appRoutes';

// Vite replaces import.meta.env.DEV with false in production, so this chunk is not built there.
const DesignPage = import.meta.env.DEV
  ? lazy(() => import('../design/DesignPage').then((m) => ({ default: m.DesignPage })))
  : null;

function Lazy() {
  return (
    <Suspense fallback={<FullPageLoading />}>
      <Outlet />
    </Suspense>
  );
}

/** Route tree. Role areas are guarded twice: here in the UI and by requireRole in the API. */
export function buildRoutes() {
  return [
    { path: '/login', element: <LoginPage />, errorElement: <RouteErrorPage /> },
    // /design is a developer catalogue; it is not part of production builds.
    ...(import.meta.env.DEV
      ? [
          {
            path: '/design',
            element: (
              <Suspense fallback={null}>
                <DesignPage />
              </Suspense>
            ),
          },
        ]
      : []),
    {
      element: <RequireAuth />,
      errorElement: <RouteErrorPage />,
      children: [
        {
          element: <AppShell />,
          children: [
            {
              element: <Lazy />,
              errorElement: <RouteErrorPage />,
              children: [
                { index: true, element: <RoleHomeRedirect /> },
                { path: 'profile', element: <ProfilePage /> },
                { path: '403', element: <ForbiddenPage /> },
                ...appRoutes.shared,
                ...Object.entries(appRoutes.byRole).map(([role, children]) => ({
                  element: <RequireRole roles={role.split(',')} />,
                  children,
                })),
                { path: '*', element: <NotFoundPage /> },
              ],
            },
          ],
        },
      ],
    },
  ];
}

export const createRouter = () => createBrowserRouter(buildRoutes());
