const CACHE_NAME = "shiftly-v196"; // bump this whenever you want a guaranteed refresh

const ASSETS = [
  "/",
  "/index.html",
  "/config.js",
  "/app.js",
  "/manifest.json",
  "/icons/shiftly-favicon-32.png",
  "/icons/shiftly-favicon-192.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Force the new SW to activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Take control of all clients immediately + remove old caches
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // NETWORK-FIRST for HTML (prevents “stuck old UI” on mobile)
  if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/app.js" || url.pathname === "/config.js") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        return cached || caches.match("/index.html");
      }
    })());
    return;
  }

  // CACHE-FIRST for everything else (fast + offline)
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});
