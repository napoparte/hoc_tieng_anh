// BUILD_HASH: 213b3eca
// Cache version — tự động được build script cập nhật với hash của index.html
// KHÔNG cần sửa tay file này — build-obfuscate.js sẽ inject BUILD_HASH
const STATIC_CACHE = 'em-static-213b3eca';  // build script sẽ replace dòng này

// Assets tĩnh thực sự không đổi (không bao gồm index.html hay data)
const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

let _isUpdate = false; // true nếu đang REPLACE SW cũ (không phải install lần đầu)

self.addEventListener('install', e => {
  // Nếu có SW cũ đang chạy -> đây là update
  _isUpdate = !!self.registration.active;
  e.waitUntil(
    caches.open(STATIC_CACHE).then(c => c.addAll(STATIC_ASSETS))
  );
  // Kích hoạt ngay, không chờ tab cũ đóng
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        // Xóa TẤT CẢ cache cũ khi deploy mới (STATIC_CACHE đã đổi hash)
        keys.filter(k => k !== STATIC_CACHE).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => {
      // Claim tất cả clients ngay lập tức để tránh race condition
      return self.clients.claim();
    }).then(() => {
      // Chỉ báo SW_UPDATED nếu đây là UPDATE (không phải install lần đầu)
      // Tránh reload loop khi user mở app lần đầu
      if (!_isUpdate) return;
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED' });
        });
      });
    })
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // FIX 1: Bỏ qua hoàn toàn các request nội bộ của trình duyệt/DevTools
  // (Chrome DevTools JSON, well-known endpoints, v.v.)
  // Không gọi e.respondWith() → trình duyệt tự xử lý bình thường
  if (
    url.includes('/.well-known/') ||
    url.includes('com.chrome.devtools') ||
    url.includes('chrome-extension://') ||
    e.request.method !== 'GET'
  ) {
    return;
  }

  // Bỏ qua request ngoài origin (fonts, API, v.v.)
  if (!url.startsWith(self.location.origin)) return;

  // Icons & manifest → cache-first (không bao giờ thay đổi)
  if (url.includes('icon-') || url.includes('manifest.json')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
        // FIX 2: Trả về Response lỗi thay vì undefined khi cả cache lẫn network đều thất bại
        .catch(() => new Response('Not found', { status: 404, statusText: 'Not Found' }))
    );
    return;
  }

  // index.html → LUÔN lấy từ network, KHÔNG cache
  // Đây là nguyên nhân chính của lỗi SyntaxError khi cache cũ còn tồn tại
  if (url.endsWith('/') || url.includes('index.html') || url.match(/\/hoc_tieng_anh\/?$/)) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        // FIX 2: Fallback về cache, rồi mới trả 504 nếu cả hai đều thất bại
        .catch(() => caches.match(e.request)
          .then(cached => cached || new Response('Offline – vui lòng thử lại sau.', {
            status: 504,
            statusText: 'Gateway Timeout',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          }))
        )
    );
    return;
  }

  // data/*.json.enc và *.js → network-first, cache khi offline
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // FIX 2: Chỉ cache response hợp lệ (status 200, không phải opaque)
        if (response.ok && response.status === 200) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      })
      // FIX 2: Fallback về cache, rồi trả 504 nếu offline hoàn toàn
      .catch(() => caches.match(e.request)
        .then(cached => cached || new Response('Offline – vui lòng thử lại sau.', {
          status: 504,
          statusText: 'Gateway Timeout',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }))
      )
  );
});
