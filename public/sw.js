/* Couch of Power service worker.
 * - App shell + Mode 1 + tutorial are precached (with their JS/CSS) so they work offline.
 * - Pages: network first, cache fallback. Hashed static assets: cache first.
 * - /api/* is never cached: online play is always live and server-authoritative. */
const VERSION = 'cop-v1';
const PAGES = ['/', '/local', '/tutorial', '/online'];
const EXTRA = ['/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

async function precache() {
  const cache = await caches.open(VERSION);
  const assets = new Set(EXTRA);
  for (const page of PAGES) {
    try {
      const res = await fetch(page, { cache: 'reload' });
      if (!res.ok) continue;
      const html = await res.clone().text();
      await cache.put(page, res);
      for (const m of html.matchAll(/\/_next\/static\/[^"'\s)]+/g)) assets.add(m[0]);
    } catch {}
  }
  await Promise.all([...assets].map((u) => cache.add(u).catch(() => {})));
}

self.addEventListener('install', (e) => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !url.pathname.startsWith('/r/')) caches.open(VERSION).then((c) => c.put(url.pathname, res.clone()));
          return res;
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match('/local')) || Response.error()),
    );
    return;
  }

  // Everything else same-origin: stale-while-revalidate.
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => hit);
      return hit || net;
    }),
  );
});
