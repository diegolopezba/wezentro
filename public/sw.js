// Combined Service Worker for PWA + OneSignal Push Notifications
// This merges VitePWA's Workbox caching with OneSignal's push handling

// Import OneSignal service worker FIRST - this is required for push notifications
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// Workbox precache manifest - VitePWA will inject the file list here
const precacheManifest = self.__WB_MANIFEST;

// URLs that must NEVER be served from cache
const BYPASS_PATTERNS = [
  /^\/~oauth/,           // OAuth redirect - must always hit network
  /\/rest\/v1\//,        // Supabase REST API
  /\/auth\/v1\//,        // Supabase Auth API
  /\/functions\/v1\//,   // Edge functions
  /\/realtime\//,        // Realtime subscriptions
  /\/storage\/v1\//,     // Storage API
  /supabase\.co/,        // Any direct Supabase calls
  /api\.mapbox\.com/,    // Mapbox API
  /onesignal\.com/,      // OneSignal API
  /stripe\.com/,         // Stripe API
];

function shouldBypass(url) {
  const urlStr = typeof url === 'string' ? url : url.href || '';
  return BYPASS_PATTERNS.some((pattern) => pattern.test(urlStr));
}

// Simple precaching - just cache the files Workbox provides
if (precacheManifest && precacheManifest.length > 0) {
  self.addEventListener('install', (event) => {
    self.skipWaiting(); // Activate new SW immediately
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

  self.addEventListener('activate', (event) => {
    // Claim clients immediately so the new SW takes effect without reload
    event.waitUntil(self.clients.claim());
  });

  self.addEventListener('fetch', (event) => {
    // Never cache API calls, auth redirects, or external services
    if (shouldBypass(event.request.url)) {
      return; // Let the browser handle it normally (network only)
    }

    // Only cache GET requests for same-origin static assets
    if (event.request.method !== 'GET') return;

    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  });
}
