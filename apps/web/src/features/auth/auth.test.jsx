import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setAccessToken } from '../../api/client';
import { json, mockApi, renderApp, session, users } from '../../test/render';
import { restoreSession, useSession } from './session';

beforeEach(() => {
  useSession.setState({ status: 'loading', user: null, expired: false });
});
afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
});

describe('login and role routing (F2)', () => {
  it.each([
    ['student', '/learn'],
    ['faculty', '/studio'],
    ['mentor', '/mentor'],
    ['admin', '/admin'],
  ])('a %s lands on %s after signing in', async (role, home) => {
    mockApi({
      'POST /auth/refresh': json(401, { error: { code: 'UNAUTHORIZED', message: 'no cookie' } }),
      'POST /auth/login': session(users[role]),
      'GET /subjects': [],
    });
    await restoreSession();
    const { router } = renderApp('/');
    expect(router.state.location.pathname).toBe('/login');

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email/), users[role].email);
    await user.type(screen.getByLabelText(/Password/), 'Acet@2025');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(home));
  });

  it('shows a clear message for wrong credentials', async () => {
    mockApi({
      'POST /auth/refresh': json(401, { error: { code: 'UNAUTHORIZED', message: 'x' } }),
      'POST /auth/login': json(401, {
        error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
      }),
    });
    await restoreSession();
    renderApp('/login');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email/), 'student01@acet.test');
    await user.type(screen.getByLabelText(/Password/), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match/);
  });

  it('validates the form with the shared LoginSchema before calling the API', async () => {
    const fetchMock = mockApi({
      'POST /auth/refresh': json(401, { error: { code: 'UNAUTHORIZED', message: 'x' } }),
    });
    await restoreSession();
    renderApp('/login');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email/), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('/auth/login'))).toBe(false);
  });

  it('keeps the user signed in across a reload via the refresh cookie', async () => {
    mockApi({ 'POST /auth/refresh': session(users.student), 'GET /subjects': [] });
    await restoreSession();
    const { router } = renderApp('/');
    await waitFor(() => expect(router.state.location.pathname).toBe('/learn'));
  });

  it('a student typing /studio sees the 403 page', async () => {
    mockApi({ 'POST /auth/refresh': session(users.student) });
    await restoreSession();
    renderApp('/studio');
    expect(await screen.findByText("You don't have access to this page")).toBeInTheDocument();
  });

  it('sends anonymous users to /login and back to the page they asked for', async () => {
    mockApi({
      'POST /auth/refresh': json(401, { error: { code: 'UNAUTHORIZED', message: 'x' } }),
      'POST /auth/login': session(users.faculty),
      'GET /subjects': [],
    });
    await restoreSession();
    const { router } = renderApp('/profile');
    expect(router.state.location.pathname).toBe('/login');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email/), users.faculty.email);
    await user.type(screen.getByLabelText(/Password/), 'Acet@2025');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/profile'));
  });

  it('shows a session-expired toast and returns to /login when refresh fails mid-session', async () => {
    let refreshOk = true;
    mockApi({
      'POST /auth/refresh': () =>
        refreshOk
          ? json(200, { data: session(users.student) })
          : json(401, { error: { code: 'UNAUTHORIZED', message: 'x' } }),
      'GET /syllabus-versions': () =>
        json(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }),
    });
    await restoreSession();
    refreshOk = false;
    const { router } = renderApp('/profile');
    expect(await screen.findByText('Session expired')).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});
