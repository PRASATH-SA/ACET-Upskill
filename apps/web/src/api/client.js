/**
 * Fetch wrapper for the ACET SkillUp API (A.6).
 *
 * - The access token lives in memory only (never localStorage). The refresh token is an
 *   httpOnly cookie the browser sends to /api/v1/auth/refresh.
 * - A 401 triggers one silent refresh (shared by concurrent requests), then the request is retried.
 * - Responses are unwrapped from `{ data, meta }`; errors become `ApiError` with the A.6 code.
 * - Pass a zod schema to validate the response with the shared contract.
 */
import { API_BASE_PATH } from '@acet/shared';

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? API_BASE_PATH;

export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {string} code
   * @param {string} message
   * @param {unknown} [details]
   */
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let accessToken = null;
let refreshInFlight = null;
/** Why the last refresh failed: 'auth' (no valid cookie) or 'network' (offline, server down). */
let refreshFailure = null;
export const lastRefreshFailure = () => refreshFailure;
const sessionListeners = new Set();

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token ?? null;
}

/**
 * Subscribes to session events: `{ type: 'refreshed', session }` or `{ type: 'expired' }`.
 * @returns {() => void} unsubscribe
 */
export function onSession(listener) {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

function emit(event) {
  for (const l of sessionListeners) l(event);
}

async function parseBody(res) {
  if (res.status === 204) return null;
  const type = res.headers.get('content-type') ?? '';
  if (type.includes('application/json')) return res.json();
  return res.text();
}

function toApiError(res, body) {
  const err = body && typeof body === 'object' ? body.error : undefined;
  if (err?.code) return new ApiError(res.status, err.code, err.message, err.details);
  return new ApiError(res.status, res.status >= 500 ? 'INTERNAL' : 'UNKNOWN', `HTTP ${res.status}`);
}

/**
 * Exchanges the refresh cookie for a new access token. Concurrent callers share one request.
 * @returns {Promise<{ accessToken: string, expiresIn: number, user: object } | null>}
 */
export function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) {
          setAccessToken(null);
          // A 5xx (or the service worker's offline 503) is not a verdict on the session.
          refreshFailure = res.status >= 500 ? 'network' : 'auth';
          return null;
        }
        const { data } = await res.json();
        refreshFailure = null;
        setAccessToken(data.accessToken);
        emit({ type: 'refreshed', session: data });
        return data;
      } catch {
        refreshFailure = 'network';
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

function buildUrl(path, query) {
  const url = `${API_BASE}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

/**
 * Calls the API.
 * @param {string} path  e.g. "/subjects"
 * @param {object} [opts]
 * @param {string} [opts.method]
 * @param {unknown} [opts.body]        JSON body, or a FormData for uploads
 * @param {Record<string, unknown>} [opts.query]
 * @param {import('zod').ZodTypeAny} [opts.schema]  validates `data`
 * @param {boolean} [opts.withMeta]    return `{ data, meta }` instead of `data`
 * @param {boolean} [opts.raw]         return the Response (downloads)
 * @param {AbortSignal} [opts.signal]
 */
export async function api(path, opts = {}) {
  const { method = 'GET', body, query, schema, withMeta, raw, signal } = opts;

  const send = () => {
    const headers = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    return fetch(buildUrl(path, query), {
      method,
      headers,
      body: payload,
      credentials: 'include',
      signal,
    });
  };

  let res = await send();
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const session = await refreshSession();
    if (session) res = await send();
    else emit({ type: 'expired' });
  }

  if (raw) {
    if (!res.ok) throw toApiError(res, await parseBody(res));
    return res;
  }

  const parsed = await parseBody(res);
  if (!res.ok) throw toApiError(res, parsed);

  const data = parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed;
  const value = schema ? schema.parse(data) : data;
  return withMeta ? { data: value, meta: parsed?.meta } : value;
}

export const get = (path, opts) => api(path, { ...opts, method: 'GET' });
export const post = (path, body, opts) => api(path, { ...opts, method: 'POST', body });
export const patch = (path, body, opts) => api(path, { ...opts, method: 'PATCH', body });
export const put = (path, body, opts) => api(path, { ...opts, method: 'PUT', body });
export const del = (path, opts) => api(path, { ...opts, method: 'DELETE' });

/** Readable message for any thrown value. */
export function errorMessage(err) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}
