// Cache version — bump này mỗi khi deploy để force refresh
const CACHE_VERSION = 'englishmaster-v' + Date.now();
const STATIC_CACHE = 'em-static-v5';

// Chỉ cache assets tĩnh thực sự không đổi
const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then(c => c.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Bỏ qua request ngoài (fonts, API, v.v.)
  if (!url.startsWith(self.location.origin)) return;

  // Icons & manifest → cache-first (không bao giờ thay đổi)
  if (url.includes('icon-') || url.includes('manifest.json')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
    return;
  }

  // index.html, data/*.json, *.js → network-first
  // Nếu offline mới dùng cache
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Lưu bản mới vào cache để dùng khi offline
        if (response.ok) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
