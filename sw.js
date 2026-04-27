// GPS Pin Note (HUD for Riders) Service Worker
// v4.9 - 베타 피드백 4종 반영 (코어 음성 안내 완벽화 + UI 강화)
// 이 Service Worker는 오직 정적 파일 캐싱 용도로만 사용됨.
// periodicsync / sync / push 이벤트 리스너 없음 — 백그라운드 자동 실행 일체 없음.
const CACHE_NAME = 'gpn-cache-v4-9';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/privacy.html',
  '/terms.html',
  '/manual.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] 일부 캐시 실패 (외부 리소스):', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 외부 API는 캐시 제외 (항상 네트워크)
  const bypassDomains = [
    'api.open-meteo.com',
    'dapi.kakao.com'
  ];
  if (bypassDomains.some(d => url.hostname.includes(d))) {
    return; // 기본 fetch 처리
  }

  // 캐시 우선, 없으면 네트워크
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // 오프라인 + 캐시 없음: index.html 반환
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
