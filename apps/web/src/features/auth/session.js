import { create } from 'zustand';
import {
  lastRefreshFailure,
  onSession,
  post,
  refreshSession,
  setAccessToken,
} from '../../api/client';
import { clearOfflineData } from '../../lib/pwa';

/**
 * The signed-in user. The access token itself stays in the API client's memory;
 * this store only holds what the UI renders.
 * status: 'loading' (silent refresh running) | 'authenticated' | 'anonymous'
 * offline: true when the session was restored from this device while the server was unreachable.
 */
export const useSession = create((set) => ({
  status: 'loading',
  user: null,
  expired: false,
  offline: false,
  setUser: (user) => {
    if (user) rememberUser(user);
    set({ user, status: user ? 'authenticated' : 'anonymous', offline: false });
  },
  clear: (expired = false) => set({ user: null, status: 'anonymous', expired, offline: false }),
  ackExpired: () => set({ expired: false }),
}));

// The last signed-in user, so the app can open offline (F7). Profile fields only, no tokens.
const LAST_USER = 'acet:lastUser';
function rememberUser(u) {
  try {
    const { id, name, role, batch, syllabusVersionId, mentorId, departmentId, email } = u;
    localStorage.setItem(
      LAST_USER,
      JSON.stringify({
        id,
        name,
        role,
        batch,
        syllabusVersionId,
        mentorId,
        departmentId,
        email,
        isActive: true,
      }),
    );
  } catch {
    // Storage blocked: offline start just isn't available.
  }
}
function rememberedUser() {
  try {
    return JSON.parse(localStorage.getItem(LAST_USER) ?? 'null');
  } catch {
    return null;
  }
}
function forgetUser() {
  try {
    localStorage.removeItem(LAST_USER);
  } catch {
    // ignore
  }
}

// Keep the store in sync with refreshes and expiries that happen inside the API client.
onSession((event) => {
  if (event.type === 'refreshed') useSession.getState().setUser(event.session.user);
  if (event.type === 'expired' && useSession.getState().user && lastRefreshFailure() === 'auth') {
    setAccessToken(null);
    forgetUser();
    useSession.getState().clear(true);
  }
});

/**
 * Silent refresh on page load: the httpOnly refresh cookie restores the session. When the
 * server can't be reached, the last user on this device is restored so cached pages open
 * offline; the real session is refreshed as soon as the connection returns.
 */
export async function restoreSession() {
  const session = await refreshSession();
  if (session) return session;
  const cached = rememberedUser();
  if (lastRefreshFailure() === 'network' && cached) {
    useSession.setState({ user: cached, status: 'authenticated', offline: true });
    const retry = () => {
      window.removeEventListener('online', retry);
      refreshSession().then((s) => {
        if (!s && lastRefreshFailure() === 'auth') {
          forgetUser();
          useSession.getState().clear(true);
        }
      });
    };
    window.addEventListener('online', retry);
    return null;
  }
  useSession.getState().clear();
  return null;
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
    forgetUser();
    clearOfflineData();
    useSession.getState().clear();
  }
}

/** Home route for each role (F2). */
export const ROLE_HOME = {
  student: '/learn',
  faculty: '/studio',
  mentor: '/mentor',
  admin: '/admin',
  coordinator: '/admin',
};
