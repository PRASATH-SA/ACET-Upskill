import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, api, getAccessToken, onSession, setAccessToken } from './client';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('api client', () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('old-token');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    setAccessToken(null);
  });

  it('sends the in-memory bearer token and unwraps { data }', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { id: 'u1' } }));
    await expect(api('/auth/me')).resolves.toEqual({ id: 'u1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/auth/me');
    expect(init.headers.Authorization).toBe('Bearer old-token');
    expect(init.credentials).toBe('include');
  });

  it('returns meta for paginated lists and drops empty query values', async () => {
    fetchMock.mockResolvedValueOnce(
      json(200, { data: [1], meta: { page: 2, limit: 1, total: 5 } }),
    );
    const res = await api('/users', { query: { page: 2, role: undefined, q: '' }, withMeta: true });
    expect(res.meta.total).toBe(5);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/users?page=2');
  });

  it('refreshes once on 401, retries with the new token, and emits the session', async () => {
    const events = [];
    const off = onSession((e) => events.push(e.type));
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }))
      .mockResolvedValueOnce(
        json(200, { data: { accessToken: 'new-token', expiresIn: 900, user: { id: 'u1' } } }),
      )
      .mockResolvedValueOnce(json(200, { data: ['ok'] }));
    await expect(api('/subjects')).resolves.toEqual(['ok']);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/auth/refresh');
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer new-token');
    expect(getAccessToken()).toBe('new-token');
    expect(events).toEqual(['refreshed']);
    off();
  });

  it('shares one refresh between concurrent 401s', async () => {
    fetchMock.mockImplementation(async (url, init) => {
      if (url.endsWith('/auth/refresh')) {
        return json(200, { data: { accessToken: 'fresh', expiresIn: 900, user: {} } });
      }
      return init.headers.Authorization === 'Bearer fresh'
        ? json(200, { data: url })
        : json(401, { error: { code: 'UNAUTHORIZED', message: 'x' } });
    });
    await Promise.all([api('/a'), api('/b'), api('/c')]);
    const refreshes = fetchMock.mock.calls.filter(([u]) => u.endsWith('/auth/refresh'));
    expect(refreshes).toHaveLength(1);
  });

  it('emits "expired" when the refresh cookie is no longer valid', async () => {
    const events = [];
    const off = onSession((e) => events.push(e.type));
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHORIZED', message: 'x' } }))
      .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHORIZED', message: 'x' } }));
    await expect(api('/subjects')).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(events).toEqual(['expired']);
    expect(getAccessToken()).toBeNull();
    off();
  });

  it('never refreshes for /auth/* calls such as a failed login', async () => {
    fetchMock.mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHORIZED', message: 'bad' } }));
    await expect(api('/auth/login', { method: 'POST', body: {} })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps the A.6 error envelope to ApiError', async () => {
    fetchMock.mockResolvedValueOnce(
      json(422, {
        error: {
          code: 'UNPROCESSABLE',
          message: 'Cycle: A → B → A',
          details: { cycle: ['A', 'B'] },
        },
      }),
    );
    const err = await api('/subjects/x/links', { method: 'POST', body: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 422, code: 'UNPROCESSABLE', message: 'Cycle: A → B → A' });
    expect(err.details.cycle).toEqual(['A', 'B']);
  });

  it('validates responses with a shared zod schema', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { status: 'nope' } }));
    const schema = z.object({ status: z.enum(['ok', 'degraded']) });
    await expect(api('/health', { schema })).rejects.toThrow();
  });

  it('sends FormData without a JSON content type', async () => {
    fetchMock.mockResolvedValueOnce(json(201, { data: { id: 'm1' } }));
    const fd = new FormData();
    fd.set('kind', 'notes');
    await api('/materials', { method: 'POST', body: fd });
    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBe(fd);
    expect(init.headers['Content-Type']).toBeUndefined();
  });
});
