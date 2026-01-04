// Combined Service Worker for PWA + OneSignal Push Notifications
// This merges VitePWA's Workbox caching with OneSignal's push handling

// Import OneSignal service worker FIRST - this is required for push notifications
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// Workbox precache manifest - VitePWA will inject the file list here
const precacheManifest = self.__WB_MANIFEST;

// Simple precaching - just cache the files Workbox provides
if (precacheManifest && precacheManifest.length > 0) {
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open('precache-v1').then((cache) => {
        return cache.addAll(
          precacheManifest.map((entry) => 
            typeof entry === 'string' ? entry : entry.url
          )
        );
      })
    );
  });

  self.addEventListener('fetch', (event) => {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  });
}
