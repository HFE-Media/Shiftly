const CACHE_NAME = "shiftly-v218"; // Jobs static assets; existing shell caching unchanged

const ASSETS = [
  "/",
  "/index.html",
  "/marketing.css?v=225",
  "/marketing.js?v=224",
  "/assets/marketing/shiftly-logo.jpg?v=214",
  "/billing",
  "/billing/",
  "/billing.html",
  "/billing.css?v=2",
  "/login",
  "/login.html",
  "/config.js",
  "/app.js",
  "/jobs.js?v=12",
  "/jobs.css?v=11",
  "/jobs-data.js?v=2",
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

  // NETWORK-FIRST for both HTML entry points and operational code.
  if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/billing" || url.pathname === "/billing/" || url.pathname === "/billing.html" || url.pathname === "/login" || url.pathname === "/login/" || url.pathname === "/login.html" || url.pathname === "/app.js" || url.pathname === "/config.js") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        if (cached) return cached;
        const operationalRoute = url.pathname === "/login" || url.pathname === "/login/" || url.pathname === "/login.html";
        const billingRoute = url.pathname === "/billing" || url.pathname === "/billing/" || url.pathname === "/billing.html";
        if (operationalRoute) return (await caches.match("/login")) || caches.match("/login.html");
        if (billingRoute) return (await caches.match("/billing")) || caches.match("/billing.html");
        return caches.match("/index.html");
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
