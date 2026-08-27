// EcoFarm service worker — additive PWA support only. Does not change
// anything about how the app behaves for a visitor who never installs it;
// this only runs at all once a browser has registered it (see
// src/hooks/useServiceWorkerUpdate.ts).
//
// Strategy:
//   - Page navigations (HTML): network-first, so content updates show up
//     promptly; falls back to a cached copy, then to offline.html, when
//     there's no network at all.
//   - Static assets (images/fonts/icons): cache-first, for speed and
//     offline support — these rarely change and refetching them on every
//     load would be wasted work.
//   - Everything else (JS/CSS bundles, /api/*, /ws) is deliberately left
//     untouched and goes straight to the network. Vite gives every JS/CSS
//     bundle a content hash in its filename, so the browser's own HTTP
//     cache already handles them correctly (a new deploy = new filenames);
//     caching them here too would risk serving an old bundle that no
//     longer matches a freshly-fetched index.html. /api and /ws are live,
//     auth-sensitive, real-time traffic that must never be intercepted.

const VERSION = "v1"
const PAGES_CACHE = `ecofarm-pages-${VERSION}`
const STATIC_CACHE = `ecofarm-static-${VERSION}`
const OFFLINE_URL = "/offline.html"

const STATIC_ASSET_RE = /\.(?:png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf)$/i

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGES_CACHE).then((cache) => cache.add(OFFLINE_URL))
  )
  // Take over from any previous service worker as soon as this one has
  // finished installing, instead of waiting for every open tab to close.
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== PAGES_CACHE && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  )
  // Start controlling already-open tabs immediately, not just tabs opened
  // after this activation.
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only ever handle same-origin GET requests — never touch cross-origin
  // calls, and never touch API/WebSocket traffic.
  if (request.method !== "GET" || url.origin !== self.location.origin) return
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws")) return

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request))
    return
  }

  if (STATIC_ASSET_RE.test(url.pathname)) {
    event.respondWith(cacheFirst(request))
  }
})

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    const cache = await caches.open(PAGES_CACHE)
    cache.put(request, response.clone())
    return response
  } catch {
    const cache = await caches.open(PAGES_CACHE)
    const cached = await cache.match(request)
    return cached || cache.match(OFFLINE_URL)
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  cache.put(request, response.clone())
  return response
}
