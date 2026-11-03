/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { RangeRequestsPlugin } from 'workbox-range-requests'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

clientsClaim()
void self.skipWaiting()

precacheAndRoute(self.__WB_MANIFEST || [])
cleanupOutdatedCaches()

// App shell: serve the precached index.html for every in-app navigation so the UI boots offline.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// Audio streaming with HTTP 206 support so seeking works against cached audio while offline.
registerRoute(
  ({ request }) => request.destination === 'audio',
  new CacheFirst({
    cacheName: 'audio-media-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new RangeRequestsPlugin(),
      new ExpirationPlugin({ maxEntries: 50, purgeOnQuotaError: true }),
    ],
  }),
)

// Images and PDF documents.
registerRoute(
  ({ request, url }) =>
    request.destination === 'image' ||
    (request.destination === 'document' && request.mode !== 'navigate') ||
    url.pathname.endsWith('.pdf'),
  new StaleWhileRevalidate({
    cacheName: 'static-assets-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, purgeOnQuotaError: true }),
    ],
  }),
)
