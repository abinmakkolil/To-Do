// sw.js
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Claim clients so notifications work right away
  e.waitUntil(self.clients.claim());
});

// Notification click -> focus app
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ includeUncontrolled: true, type: 'window' });
    if (allClients.length > 0) {
      const client = allClients[0];
      client.focus();
    } else {
      clients.openWindow('./');
    }
  })());
});
