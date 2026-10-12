/* Офлайн-кеш: гра працює без інтернету після першого відкриття. */
const CACHE = 'chotyry-kuty-v6';
const FILES = [
  './', 'index.html', 'css/style.css', 'css/fonts.css',
  'fonts/manrope-latin.woff2', 'fonts/manrope-cyrillic.woff2', 'fonts/unbounded-latin.woff2', 'fonts/unbounded-cyrillic.woff2', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/engine.js', 'js/app.js',
  ...['03-tower', '21-lastsec', '22-dragon', '24-jackpot', '30-bubble', '31-rope', '32-chairs', '27-alarm', '28-cake', '04-bomb', '05-frog', '06-balloon', '07-stopwatch', '09-mouse', '10-knives', '11-parking', '12-chicken', '14-ufo', '16-orbit', '19-curling']
    .map((n) => `js/games/${n}.js`),
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request)
          .then((res) => {
            // шрифти та інші успішні відповіді — у кеш на майбутнє
            if (res.ok || res.type === 'opaque') {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(e.request, copy));
            }
            return res;
          })
          .catch(() => (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error()))
    )
  );
});
