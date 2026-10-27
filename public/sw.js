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

// TEMPORARY Push tracing. Separate database: never upgrade/alter the device owner binding.
const PUSH_DIAGNOSTICS_LIMIT = 30;
function diagnosticsStore(mode, action) {
  return new Promise((resolve, reject) => {
    let db; let transaction; let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) { try { transaction?.abort(); } catch { /* Already finished. */ } }
      db?.close();
      if (error) reject(error); else resolve(result);
    };
    // Blocked/broken diagnostic storage must never hold up a real Push indefinitely.
    const timeout = setTimeout(() => finish(new Error('Diagnostic storage unavailable')), 1000);
    try {
      const opening = indexedDB.open('upgrade79-push-diagnostics', 1);
      opening.onupgradeneeded = () => opening.result.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
      opening.onerror = () => finish(opening.error);
      opening.onblocked = () => finish(new Error('Diagnostic storage blocked'));
      opening.onsuccess = () => {
        if (settled) { opening.result.close(); return; }
        try {
          db = opening.result;
          db.onversionchange = () => db.close();
          transaction = db.transaction('events', mode);
          const request = action(transaction.objectStore('events'));
          transaction.oncomplete = () => finish(null, request.result);
          transaction.onerror = () => finish(transaction.error || new Error('Diagnostic transaction failed'));
          transaction.onabort = () => finish(transaction.error || new Error('Diagnostic transaction aborted'));
        } catch (error) { finish(error); }
      };
    } catch (error) { finish(error); }
  });
}
async function recordPushDiagnostic(stage, details = {}) {
  try {
    // Timestamp at the stage, not later when IndexedDB finishes the write.
    const entry = { timestamp: new Date().toISOString(), stage };
    for (const name of ['notification_id', 'payload_user_id', 'stored_owner']) {
      if (Number.isSafeInteger(details[name]) || details[name] === null) entry[name] = details[name];
    }
    if (details.path) entry.path = String(details.path).slice(0, 240);
    if (details.error) {
      // Never persist error messages/stacks: they may contain payloads, URLs or credentials.
      entry.error = ['AbortError', 'DataError', 'InvalidStateError', 'NotAllowedError', 'QuotaExceededError',
        'SecurityError', 'SyntaxError', 'TypeError', 'UnknownError'].includes(details.error.name) ? details.error.name : 'Error';
    }
    await diagnosticsStore('readwrite', (store) => {
      const added = store.add(entry);
      added.onsuccess = () => {
        const keys = store.getAllKeys();
        keys.onsuccess = () => keys.result.slice(0, Math.max(0, keys.result.length - PUSH_DIAGNOSTICS_LIMIT)).forEach((key) => store.delete(key));
      };
      return added;
    });
  } catch { /* Diagnostics are best-effort and must never reject a real Push. */ }
}

self.addEventListener('message', (event) => {
  if (!event.source?.url || new URL(event.source.url).origin !== self.location.origin) return;
  if (event.data?.type === 'SKIP_WAITING') { event.waitUntil(self.skipWaiting()); return; }
  if (event.data?.type === 'PUSH_DIAGNOSTIC_CLIENT_OPEN') {
    event.waitUntil(recordPushDiagnostic('client_open', { path: new URL(event.source.url).pathname })
      .then(() => event.ports[0]?.postMessage({ ok: true })));
    return;
  }
  if (['PUSH_DIAGNOSTICS_GET', 'PUSH_DIAGNOSTICS_CLEAR'].includes(event.data?.type)) {
    event.waitUntil((async () => {
      try {
        const records = await diagnosticsStore(event.data.type === 'PUSH_DIAGNOSTICS_CLEAR' ? 'readwrite' : 'readonly',
          (store) => event.data.type === 'PUSH_DIAGNOSTICS_CLEAR' ? store.clear() : store.getAll());
        event.ports[0]?.postMessage({ ok: true, records: (records || []).reverse() });
      } catch { event.ports[0]?.postMessage({ ok: false }); }
    })());
    return;
  }
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
  const writes = [];
  const record = (stage, details) => {
    const pending = recordPushDiagnostic(stage, details);
    writes.push(pending);
    return pending;
  };
  // First operation: persist receipt before JSON parsing, validation or the owner lookup.
  const received = record('push_event_received');
  const delivery = (async () => {
    await received;
    let payload;
    try { payload = event.data?.json(); } catch (error) { record('payload_parse_error', { error }); return; }
    const ids = { notification_id: payload?.notification_id, payload_user_id: payload?.user_id };
    record('payload_parsed', ids);
    if (!payload || !Number.isSafeInteger(payload.notification_id)) { record('payload_invalid', ids); return; }
    let owner;
    try { owner = await getOwner(); } catch (error) { record('owner_load_error', { ...ids, error }); throw error; }
    const details = { ...ids, stored_owner: owner ?? null };
    record('owner_loaded', details);
    if (payload.user_id !== owner) { record('owner_mismatch', details); return; }
    record('owner_match', details);
    record('show_notification_start', details);
    try { await self.registration.showNotification(String(payload.title || 'Upgrade La 79').slice(0, 100), {
      body: String(payload.body || 'Tienes una nueva notificación en el CRM.').slice(0, 220),
      icon: '/icons/pwa-192.png',
      tag: `crm-${payload.notification_id}`, renotify: false,
      data: { url: crmUrl(payload.url), user_id: payload.user_id, notification_id: payload.notification_id },
    }); } catch (error) { record('show_notification_error', { ...details, error }); throw error; }
    record('show_notification_resolved', details);
    if ('setAppBadge' in self.navigator && Number.isSafeInteger(payload.unread_count) && payload.unread_count >= 0) {
      await (payload.unread_count ? self.navigator.setAppBadge(payload.unread_count) : self.navigator.clearAppBadge()).catch(() => {});
    }
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    windows.forEach((client) => client.postMessage({ type: 'CRM_PUSH_RECEIVED' }));
    record('clients_notified', details);
  })();
  // Keep writes alive even when delivery rejects; logging failures are swallowed above.
  event.waitUntil(delivery.finally(() => Promise.all(writes)));
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
