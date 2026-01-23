// Combined Service Worker for PWA + OneSignal Push Notifications
// This merges VitePWA's Workbox caching with OneSignal's push handling

// Import OneSignal service worker FIRST - this is required for push notifications
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// Workbox precache manifest - VitePWA will inject the file list here
const precacheManifest = self.__WB_MANIFEST;

// Cache names
const PRECACHE_NAME = 'precache-v2';
const API_CACHE_NAME = 'api-cache-v1';
const API_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

// Simple precaching - just cache the files Workbox provides
if (precacheManifest && precacheManifest.length > 0) {
  self.addEventListener('install', (event) => {
    self.skipWaiting(); // Activate immediately
    event.waitUntil(
      caches.open(PRECACHE_NAME).then((cache) => {
        return cache.addAll(
          precacheManifest.map((entry) => 
            typeof entry === 'string' ? entry : entry.url
          )
        );
      })
    );
  });
}

// Activate and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== PRECACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch handler with stale-while-revalidate for API calls
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle Supabase API requests with stale-while-revalidate
  if (url.hostname.includes('supabase') && event.request.method === 'GET') {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        
        // Fetch fresh data in background
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => cachedResponse);
        
        // Return cached immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
  
  // Handle static assets with cache-first
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
