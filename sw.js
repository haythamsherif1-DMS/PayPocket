// ===================================================================
//  ⚡ عند أي تعديل في الملفات، قم بتغيير رقم الإصدار فقط من هنا ⚡
//  Change APP_VERSION below whenever you update any file
// ===================================================================
const APP_VERSION = '1.0.5';
// ===================================================================

const CACHE_NAME = `smart-payroll-cache-${APP_VERSION}`;

// الملفات الأساسية اللي هتتخزن في الكاش
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './192.png',
  './512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 1) تثبيت الـ Service Worker وتخزين الملفات
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn('[SW] فشل تخزين بعض الملفات:', err);
      });
    })
  );
});

// 2) تفعيل الـ Service Worker وحذف أي كاش قديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cache) => cache !== CACHE_NAME)
          .map((cache) => {
            console.log('[SW] حذف كاش قديم:', cache);
            return caches.delete(cache);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// 3) استراتيجية جلب البيانات
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // طلبات Google Apps Script ديناميكية - ما نخزنهاش
  if (url.includes('script.google.com') || url.includes('googleusercontent.com')) {
    event.respondWith(fetch(event.request).catch(() => new Response('Offline', { status: 503 })));
    return;
  }

  // باقي الطلبات: Network First ثم Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // تخزين نسخة من الاستجابة الناجحة
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// 4) استقبال رسالة من الصفحة لإجبار التحديث
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
