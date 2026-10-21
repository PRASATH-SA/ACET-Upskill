/* ACET SkillUp service worker (F7). Plain JS, no build step.
 *
 * - App shell (navigations): network first, falling back to the cached index.html, so the
 *   app opens offline.
 * - Hashed static assets (/assets/*, icons, fonts): cache first; they never change.
 * - API GETs: network first, falling back to the last cached copy, so pages a student has
 *   already opened (map, topic, revision items) work offline.
 * - Non-GET API calls are never cached; the app queues revision ratings itself.
 * - "clear-api-cache" from the page (on sign-out) deletes cached API data, which matters on
 *   shared lab computers.
 */
const VERSION = 'v1';
const SHELL = `skillup-shell-${VERSION}`;
const STATIC = `skillup-static-${VERSION}`;
const API = `skillup-api-${VERSION}`;
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'clear-api-cache') event.waitUntil(caches.delete(API));
});

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(fallbackUrl ?? request, res.clone());
    return res;
  } catch {
    const hit = await cache.match(fallbackUrl ?? request);
    if (hit) return hit;
    if (fallbackUrl) {
      const shell = await caches.match('/index.html');
      if (shell) return shell;
    }
    return new Response(
      JSON.stringify({ error: { code: 'OFFLINE', message: 'You are offline' } }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) (await caches.open(STATIC)).put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    // Streams and file downloads are not cached.
    if (
      url.pathname.endsWith('/events') ||
      url.pathname.endsWith('/file') ||
      url.pathname.includes('/export')
    )
      return;
    event.respondWith(networkFirst(request, API));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL, '/index.html'));
    return;
  }
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/'))
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request));
  }
});
