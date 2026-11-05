import { Link, useRouteError } from 'react-router-dom';
import { Compass, Lock, TriangleAlert } from 'lucide-react';
import { Button, EmptyState } from '../components/ui';
import { Page } from '../components/layout/AppShell';
import { ROLE_HOME, useSession } from '../features/auth/session';

function HomeButton() {
  const user = useSession((s) => s.user);
  return (
    <Button as={Link} to={user ? ROLE_HOME[user.role] : '/login'}>
      Go to my home
    </Button>
  );
}

export function ForbiddenPage() {
  return (
    <Page>
      <EmptyState
        icon={Lock}
        title="You don't have access to this page"
        description="This area belongs to another role. If you think you should see it, ask your HOD to check your account."
        action={<HomeButton />}
      />
    </Page>
  );
}

export function NotFoundPage() {
  return (
    <Page>
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The link may be old, or the content isn't published yet."
        action={<HomeButton />}
      />
    </Page>
  );
}

/** Router-level crash screen. */
export function RouteErrorPage() {
  const err = useRouteError();
  return (
    <Page>
      <EmptyState
        tone="error"
        icon={TriangleAlert}
        title="Something went wrong"
        description={err instanceof Error ? err.message : 'An unexpected error stopped this page.'}
        action={<Button onClick={() => window.location.reload()}>Reload the page</Button>}
      />
    </Page>
  );
}
