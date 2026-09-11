const CACHE_NAME = "fishing-intelligence-shell-v2";
const SHELL_ASSETS = ["/", "/dashboard", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only documents can use the HTML fallback. Let maps, APIs and assets reach the network directly.
  if (
    request.method !== "GET" ||
    request.mode !== "navigate" ||
    new URL(request.url).origin !== self.location.origin
  ) return;

  event.respondWith(
    fetch(request).catch(async () =>
      (await caches.match(request)) ?? (await caches.match("/dashboard")) ?? Response.error(),
    ),
  );
});
