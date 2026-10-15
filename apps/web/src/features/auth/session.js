import { create } from 'zustand';
import { onSession, post, refreshSession, setAccessToken } from '../../api/client';

/**
 * The signed-in user. The access token itself stays in the API client's memory;
 * this store only holds what the UI renders.
 * status: 'loading' (silent refresh running) | 'authenticated' | 'anonymous'
 */
export const useSession = create((set) => ({
  status: 'loading',
  user: null,
  expired: false,
  setUser: (user) => set({ user, status: user ? 'authenticated' : 'anonymous' }),
  clear: (expired = false) => set({ user: null, status: 'anonymous', expired }),
  ackExpired: () => set({ expired: false }),
}));

// Keep the store in sync with refreshes and expiries that happen inside the API client.
onSession((event) => {
  if (event.type === 'refreshed') useSession.getState().setUser(event.session.user);
  if (event.type === 'expired' && useSession.getState().user) {
    setAccessToken(null);
    useSession.getState().clear(true);
  }
});

/** Silent refresh on page load: the httpOnly refresh cookie restores the session. */
export async function restoreSession() {
  const session = await refreshSession();
  if (!session) useSession.getState().clear();
  return session;
}

export async function login(credentials) {
  const data = await post('/auth/login', credentials);
  setAccessToken(data.accessToken);
  useSession.getState().setUser(data.user);
  return data.user;
}

export async function logout() {
  try {
    await post('/auth/logout');
  } finally {
    setAccessToken(null);
    useSession.getState().clear();
  }
}

/** Home route for each role (F2). */
export const ROLE_HOME = {
  student: '/learn',
  faculty: '/studio',
  mentor: '/mentor',
  admin: '/admin',
};
