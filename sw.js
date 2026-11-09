// ツタリノマルシェ Service Worker
// ・ページ／データ（HTML・CSS・JS）はネット優先：更新がすぐ反映され、電波が弱いときは前回の内容を表示
// ・画像は保存したものを優先：2回目以降の表示が速く、会場で電波が悪くても見られる
const CACHE = "tsutarino-v1";
const CORE = ["./", "index.html", "vendors.html", "manifest.webmanifest", "images/icons/icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  if (req.destination === "image") {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }))
    );
    return;
  }

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: req.mode === "navigate" }))
  );
});
