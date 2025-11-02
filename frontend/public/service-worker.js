const STATIC_CACHE = 'albins2-static-v2';
const RUNTIME_CACHE = 'albins2-runtime-v2';
const RUNTIME_CACHE_LIMIT = 20;
const ADMIN_PATH_PREFIXES = ['/admin', '/api/admin'];
const SHELL_PATH = '/index.html';
const OFFLINE_FALLBACK = '/offline.html';

const STATIC_ASSETS = [
  '/',
  SHELL_PATH,
  OFFLINE_FALLBACK,
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      );

      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {
          // navigationPreload may not be supported; ignore.
        }
      }
    })(),
  );
  self.clients.claim();
});

const ASSET_PATTERN = /\.(?:js|css|mjs|json|png|jpg|jpeg|gif|svg|webp|ico|woff2?)$/;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);
  const sameOrigin = requestUrl.origin === self.location.origin;
  const isAdminPath =
    sameOrigin && ADMIN_PATH_PREFIXES.some((prefix) => requestUrl.pathname.startsWith(prefix));

  if (request.mode === 'navigate') {
    if (!sameOrigin || isAdminPath) {
      return;
    }

    event.respondWith(handleNavigationRequest(event));
    return;
  }

  if (sameOrigin && !isAdminPath && ASSET_PATTERN.test(requestUrl.pathname)) {
    event.respondWith(handleAssetRequest(request));
    return;
  }

  if (!sameOrigin || isAdminPath) {
    return;
  }

  // Bypass API and other non-asset requests so the backend remains the source of truth.
});

async function handleNavigationRequest(event) {
  try {
    const preloadResponse = await event.preloadResponse;
    if (preloadResponse) {
      cacheRuntimeResponse(event.request, preloadResponse);
      return preloadResponse;
    }

    const networkResponse = await fetch(event.request);
    cacheRuntimeResponse(event.request, networkResponse);
    return networkResponse;
  } catch {
    const cached = await caches.match(event.request);
    if (cached) {
      return cached;
    }

    const shell = await caches.match(SHELL_PATH);
    if (shell) {
      return shell;
    }

    return caches.match(OFFLINE_FALLBACK);
  }
}

async function handleAssetRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Refresh the cache in the background for fresh builds.
    fetch(request)
      .then((response) => cacheStaticAsset(request, response))
      .catch(() => {});
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    cacheStaticAsset(request, networkResponse);
    return networkResponse;
  } catch {
    return caches.match(request);
  }
}

async function cacheRuntimeResponse(request, response) {
  if (!response || !response.ok) {
    return;
  }

  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response.clone());
  await trimCache(cache);
}

async function cacheStaticAsset(request, response) {
  if (!response || !response.ok) {
    return;
  }

  const cache = await caches.open(STATIC_CACHE);
  await cache.put(request, response.clone());
}

async function trimCache(cache, limit = RUNTIME_CACHE_LIMIT) {
  const keys = await cache.keys();
  if (keys.length <= limit) {
    return;
  }

  const removals = keys.slice(0, keys.length - limit);
  await Promise.all(removals.map((entry) => cache.delete(entry)));
}
