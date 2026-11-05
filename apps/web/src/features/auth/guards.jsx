import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingBlock, toast } from '../../components/ui';
import { roleAllows } from '@acet/shared';
import { ROLE_HOME, useSession } from './session';

function FullPageLoading() {
  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <LoadingBlock label="Signing you in…" />
    </div>
  );
}

/** Renders the child routes for signed-in users; others go to /login and come back afterwards. */
export function RequireAuth() {
  const status = useSession((s) => s.status);
  const expired = useSession((s) => s.expired);
  const ackExpired = useSession((s) => s.ackExpired);
  const location = useLocation();

  useEffect(() => {
    if (expired) {
      toast({
        title: 'Session expired',
        description: 'Please sign in again to continue.',
        tone: 'info',
        key: 'session-expired',
      });
      ackExpired();
    }
  }, [expired, ackExpired]);

  if (status === 'loading') return <FullPageLoading />;
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/**
 * Allows only the listed roles; anyone else sees the 403 page (F2).
 * The Academic Coordinator passes wherever the HOD (`admin`) does.
 */
export function RequireRole({ roles }) {
  const user = useSession((s) => s.user);
  if (!user || !roleAllows(user.role, roles)) return <Navigate to="/403" replace />;
  return <Outlet />;
}

/** "/" → the signed-in user's home, by role. */
export function RoleHomeRedirect() {
  const user = useSession((s) => s.user);
  return <Navigate to={ROLE_HOME[user.role] ?? '/profile'} replace />;
}

export { FullPageLoading };
