const CACHE_NAME = "zssw30-scaner-shell-v31";
const APP_FILES = ["./index.html", "./style.css?v=31", "./app.js?v=31", "./manifest.webmanifest", "./icon.svg", "./rosomak.jpg", "./borsuk.jpg", "./wb-logo.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("zssw30-scaner-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (req.mode === "navigate" || /\.(?:js|css)$/.test(url.pathname)) {
    event.respondWith(fetch(req, {cache:"no-store"}).then(response => {
      if (response.ok) {const copy=response.clone(); event.waitUntil(caches.open(CACHE_NAME).then(c=>c.put(req,copy)));}
      return response;
    }).catch(async()=> (await caches.match(req)) || (await caches.match("./index.html")) || Response.error()));
    return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE_NAME).then(c=>c.put(req,copy)));}
    return response;
  })));
});
