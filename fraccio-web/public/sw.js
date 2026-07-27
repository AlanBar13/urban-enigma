/* Fraccio service worker — push notifications only, no offline caching. */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim()),
)

// ponytail: empty handler, exists only so Chromium treats the app as installable.
// Add caching here if offline support is ever actually requested.
self.addEventListener('fetch', () => {})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'Fraccio'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: '/web-app-manifest-192x192.png',
      badge: '/web-app-manifest-192x192.png',
      tag: payload.tag || title,
      data: { url: payload.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin)
    .href

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (
            new URL(client.url).origin === self.location.origin &&
            'focus' in client
          ) {
            return client.navigate
              ? client.navigate(url).then((c) => c?.focus())
              : client.focus()
          }
        }
        return self.clients.openWindow(url)
      }),
  )
})

// ponytail: no `pushsubscriptionchange` handler. Expired endpoints return 410 on send and get
// deleted server-side; the user re-enables from Mi Perfil. Add re-subscription here if silent
// drop-off turns out to be common.
