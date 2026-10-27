/* Network-only CRM: never cache HTML, API responses, authentication or business writes. */
const CACHE = 'upgrade79-offline-v1';
const OFFLINE = ['/offline.html', '/icons/pwa-192.png', '/icons/pwa-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(OFFLINE)));
  // An update waits until the user explicitly accepts it (or all old windows close).
});
self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('upgrade79-offline-') && key !== CACHE).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
  } else if (OFFLINE.includes(new URL(event.request.url).pathname)) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
  }
});

// A minimal persistent device binding prevents delivery to a previous account after logout/switch.
function ownerStore(mode, action) {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open('upgrade79-push-device', 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore('device');
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const db = opening.result;
      const transaction = db.transaction('device', mode);
      const request = action(transaction.objectStore('device'));
      transaction.oncomplete = () => { db.close(); resolve(request.result); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
    };
  });
}
const getOwner = () => ownerStore('readonly', (store) => store.get('owner'));
self.addEventListener('message', (event) => {
  if (!event.source?.url || new URL(event.source.url).origin !== self.location.origin) return;
  if (event.data?.type === 'SKIP_WAITING') { event.waitUntil(self.skipWaiting()); return; }
  if (event.data?.type !== 'PUSH_OWNER') return;
  const owner = event.data.userId;
  if (owner !== null && (!Number.isSafeInteger(owner) || owner < 1)) return;
  event.waitUntil(ownerStore('readwrite', (store) => store.put(owner, 'owner')).then(async () => {
    for (const notification of await self.registration.getNotifications()) {
      if (notification.data?.user_id !== owner) notification.close();
    }
    if (owner === null && 'clearAppBadge' in self.navigator) await self.navigator.clearAppBadge().catch(() => {});
    event.ports[0]?.postMessage({ ok: true });
  }));
});

function crmUrl(value) {
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin === self.location.origin && /^\/crm(?:\/|$)/.test(url.pathname)) return url.href;
  } catch { /* Untrusted or malformed payload: stay inside the CRM. */ }
  return `${self.location.origin}/crm/notifications`;
}
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payload;
    try { payload = event.data?.json(); } catch { return; }
    if (!payload || !Number.isSafeInteger(payload.notification_id) || payload.user_id !== await getOwner()) return;
    await self.registration.showNotification(String(payload.title || 'Upgrade La 79').slice(0, 100), {
      body: String(payload.body || 'Tienes una nueva notificación en el CRM.').slice(0, 220),
      icon: '/icons/pwa-192.png',
      tag: `crm-${payload.notification_id}`, renotify: false,
      data: { url: crmUrl(payload.url), user_id: payload.user_id, notification_id: payload.notification_id },
    });
    if ('setAppBadge' in self.navigator && Number.isSafeInteger(payload.unread_count) && payload.unread_count >= 0) {
      await (payload.unread_count ? self.navigator.setAppBadge(payload.unread_count) : self.navigator.clearAppBadge()).catch(() => {});
    }
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    windows.forEach((client) => client.postMessage({ type: 'CRM_PUSH_RECEIVED' }));
  })());
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const owner = await getOwner();
    const url = owner === event.notification.data?.user_id ? crmUrl(event.notification.data?.url) : `${self.location.origin}/login`;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = windows.find((item) => new URL(item.url).origin === self.location.origin && new URL(item.url).pathname.startsWith('/crm'));
    if (client) { await client.navigate(url); return client.focus(); }
    return self.clients.openWindow(url);
  })());
});
