// ══════════════════════════════════════════════════════════
//  CKM Service Worker — Network-first
//  Estrategia: siempre intenta red primero (versión más nueva).
//  Cae a caché solo si no hay conexión. No usar cache-first aquí:
//  CKM está en fase de estabilización con cambios frecuentes, y
//  cache-first arriesga que el conductor pruebe en calle una
//  versión vieja sin darse cuenta.
//
//  Importante: la versión se sincroniza desde index.html vía
//  query string (?v=SW_VERSION). Esta constante interna solo
//  nombra la caché — no necesita coincidir número por número con
//  SW_VERSION en index.html, pero se mantiene igual por claridad.
// ══════════════════════════════════════════════════════════

const SW_VERSION = '4.4.0';
const CACHE_NAME = `ckm-cache-${SW_VERSION}`;

// Archivos base que se intentan precachear en la instalación.
// Si alguno falla (ej: assets/ con nombres distintos), la
// instalación no debe romperse — ver manejo de errores abajo.
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

// ── INSTALL ───────────────────────────────────────────────
// Precachea lo esencial. skipWaiting() NO se llama aquí directo;
// index.html ya controla la activación enviando { type: 'SKIP_WAITING' }
// cuando corresponde (ver mensaje 'message' más abajo).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // addAll es atómico (si uno falla, falla todo). Para no
        // romper la instalación por un ícono faltante, se intenta
        // cada archivo por separado y se ignoran los que fallen.
        return Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn('[CKM SW] No se pudo precachear:', url, err);
            })
          )
        );
      })
  );
});

// ── ACTIVATE ──────────────────────────────────────────────
// Limpia cachés de versiones anteriores.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('ckm-cache-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── MESSAGE ───────────────────────────────────────────────
// index.html envía SKIP_WAITING cuando detecta un worker nuevo
// en espera, para activarlo sin esperar a que se cierren todas
// las pestañas/instancias abiertas.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── FETCH — Network-first ────────────────────────────────
// 1. Intenta la red.
// 2. Si responde bien, actualiza la caché con la respuesta fresca
//    y la devuelve.
// 3. Si la red falla (sin conexión), cae a lo que haya en caché.
// 4. Si tampoco hay caché, deja que el error se propague (el
//    navegador mostrará su pantalla de "sin conexión" estándar).
//
// No interceptar llamadas a Nominatim/OSRM ni a APIs externas:
// solo se cachean los archivos propios de la app (mismo origen).
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo GET, y solo mismo origen (no tocar llamadas a
  // nominatim.openstreetmap.org, router.project-osrm.org, etc.)
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Solo cachear respuestas válidas (evita guardar errores 4xx/5xx)
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Sin conexión: buscar en caché. Si no está, dejar que falle.
        return caches.match(request).then((cached) => {
          return cached || Promise.reject('no-cache-no-network');
        });
      })
  );
});
