self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("juzt-tv-cache").then((cache) => {
      return cache.addAll([
        "./index.html",
        "./player.js",
        "./your-logo.png",
        "./manifest.json"
      ]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
