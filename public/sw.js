const CACHE_NAME = 'Costa&Costa Library-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // --- REGRAS DE EXCLUSÃO ---
  if (event.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.pathname.endsWith('.pdf')) return;
  if (url.pathname.includes('vite') || url.pathname.includes('@vite')) return;

  // --- ESTRATÉGIA DE CACHE ---
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Se tem no cache, retorna e atualiza em background (Stale-while-revalidate)
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          // Verificação de segurança adicionada aqui
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic' && !networkResponse.bodyUsed) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
        }).catch(() => {});
        
        return cachedResponse;
      }

      // 2. Se não tem no cache, busca na rede
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // CORREÇÃO DO ERRO DE CLONE: Verifica se o corpo já foi usado
        if (!response.bodyUsed) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return response;
      }).catch((error) => {
        console.error('Falha na requisição:', error);
        return new Response("Offline - Verifique sua conexão", { 
          status: 503, 
          statusText: "Service Unavailable",
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});