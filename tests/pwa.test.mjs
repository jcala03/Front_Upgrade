import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createServer } from 'vite';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { deviceStatus, applicationServerKey, endpointHash } = await vite.ssrLoadModule('/src/pwa/device.ts');

test('manifest válido, standalone, alcance y tamaños reales de iconos', async () => {
  const manifest = JSON.parse(await read('public/manifest.webmanifest'));
  assert.equal(manifest.name, 'Upgrade La 79'); assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.scope, '/'); assert.equal(manifest.start_url, '/crm'); assert.equal(manifest.id, '/');
  for (const icon of manifest.icons) {
    const bytes = await readFile(new URL(`public${icon.src}`, root));
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
  }
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));
  const html = await read('index.html');
  assert.match(html, /rel="manifest" href="\/manifest.webmanifest"/);
  assert.match(html, /rel="apple-touch-icon"/);
});

test('detección de soporte y permiso sin solicitarlo automáticamente', () => {
  const compatible = { secure: true, serviceWorker: true, push: true, notification: true, ios: false, standalone: false };
  assert.equal(deviceStatus(compatible, 'default', false), 'disabled');
  assert.equal(deviceStatus(compatible, 'denied', true), 'blocked');
  assert.equal(deviceStatus(compatible, 'granted', true), 'enabled');
  assert.equal(deviceStatus({ ...compatible, push: false }, 'unsupported', false), 'unsupported');
  assert.equal(deviceStatus({ ...compatible, secure: false }, 'granted', false), 'unsupported');
  assert.equal(deviceStatus({ ...compatible, ios: true }, 'default', false), 'ios-install');
  assert.equal(deviceStatus({ ...compatible, ios: true, standalone: true }, 'granted', true), 'enabled');
  assert.deepEqual(Array.from(applicationServerKey('AQIDBA')), [1, 2, 3, 4]);
});

test('hash de endpoint estable, sin guardar endpoint en storage', async () => {
  assert.equal(await endpointHash('https://fcm.googleapis.com/one'), await endpointHash('https://fcm.googleapis.com/one'));
  assert.notEqual(await endpointHash('one'), await endpointHash('two'));
});

test('registro seguro, actualización voluntaria y permiso solo dentro de activar', async () => {
  const source = await read('src/pwa/register.ts');
  assert.match(source, /import.meta.env.PROD/); assert.match(source, /window.isSecureContext/);
  assert.match(source, /register\("\/sw.js", \{ scope: "\/"/);
  assert.match(source, /registration\?\.waiting/); assert.match(source, /SKIP_WAITING/);
  assert.ok(!(await read('src/main.tsx')).includes('requestPermission'));
  const profile = await read('src/pwa/DeviceNotifications.tsx');
  assert.equal((profile.match(/Notification.requestPermission\(/g) || []).length, 1);
  assert.ok(profile.indexOf('Notification.requestPermission') > profile.indexOf('async function activate'));
  assert.ok(profile.indexOf('Notification.requestPermission') < profile.indexOf('async function deactivate'));
});

const workerSource = await read('public/sw.js');
function worker() {
  const handlers = {}; const shown = []; const opened = []; const messages = []; const cached = [];
  const context = vm.createContext({ URL, Promise, console,
    caches: { open: async () => ({ addAll: async (paths) => cached.push(...paths) }), keys: async () => [], match: async () => new Response('offline') },
    fetch: async () => new Response('online'), harnessOwner: 7,
    self: { location: { origin: 'https://upgrade.example' }, navigator: {}, skipWaiting: async () => messages.push('activate'),
      addEventListener: (name, handler) => { handlers[name] = handler; },
      registration: { showNotification: async (title, options) => shown.push({ title, options }), getNotifications: async () => [] },
      clients: { claim: async () => {}, matchAll: async () => [], openWindow: async (url) => opened.push(url) } },
  });
  vm.runInContext(workerSource, context);
  vm.runInContext('ownerStore = async () => harnessOwner', context);
  async function emit(type, values = {}) {
    let pending;
    handlers[type]({ ...values, waitUntil: (value) => { pending = value; } });
    await pending;
  }
  return { context, emit, handlers, shown, opened, messages, cached };
}

test('Service Worker instala únicamente shell offline e iconos, nunca respuestas privadas', async () => {
  const harness = worker(); await harness.emit('install');
  assert.deepEqual(harness.cached, ['/offline.html', '/icons/pwa-192.png', '/icons/pwa-512.png']);
  for (const request of [
    { url: 'https://upgrade.example/api/admin/notifications', method: 'GET', mode: 'cors' },
    { url: 'https://upgrade.example/api/orders', method: 'POST', mode: 'cors' },
    { url: 'https://backend.example/api/orders', method: 'GET', mode: 'cors' },
  ]) harness.handlers.fetch({ request, respondWith: () => assert.fail('No debe interceptar API ni escrituras') });
});

test('Push reutiliza ID como tag, contenido CRM y rutas internas; no otra cuenta', async () => {
  const harness = worker();
  const payload = { notification_id: 45, user_id: 7, title: 'Stock bajo', body: 'Sede BAQ', url: '/crm/inventory', unread_count: 3 };
  await harness.emit('push', { data: { json: () => payload } });
  assert.equal(harness.shown[0].options.tag, 'crm-45');
  assert.equal(harness.shown[0].options.renotify, false);
  assert.equal(harness.shown[0].options.data.url, 'https://upgrade.example/crm/inventory');
  await harness.emit('push', { data: { json: () => ({ ...payload, user_id: 8 }) } });
  assert.equal(harness.shown.length, 1);
  harness.context.harnessOwner = null;
  await harness.emit('push', { data: { json: () => payload } }); assert.equal(harness.shown.length, 1);
});

test('clic abre rutas reales, bloquea redirecciones externas y conserva autenticación', async () => {
  const harness = worker();
  const click = async (url, user_id = 7) => harness.emit('notificationclick', { notification: { close() {}, data: { url, user_id } } });
  for (const path of ['/crm/orders', '/crm/inventory', '/crm/quotations', '/crm/notifications']) await click(path);
  assert.deepEqual(harness.opened.slice(0, 4), ['/crm/orders', '/crm/inventory', '/crm/quotations', '/crm/notifications'].map((path) => `https://upgrade.example${path}`));
  await click('https://attacker.test/crm/orders'); assert.equal(harness.opened.at(-1), 'https://upgrade.example/crm/notifications');
  await click('//attacker.test/crm'); assert.equal(harness.opened.at(-1), 'https://upgrade.example/crm/notifications');
  await click('/crm/orders', 8); assert.equal(harness.opened.at(-1), 'https://upgrade.example/login');
});

test('badge opcional usa contador existente y Push no marca como leído al hacer clic', async () => {
  const harness = worker(); const badges = [];
  harness.context.self.navigator.setAppBadge = async (count) => badges.push(count);
  harness.context.self.navigator.clearAppBadge = async () => badges.push(0);
  await harness.emit('push', { data: { json: () => ({ user_id: 7, notification_id: 1, unread_count: 3 }) } });
  assert.deepEqual(badges, [3]);
  assert.doesNotMatch(workerSource, /\/read\b|addEventListener\(['"]sync['"]/);
  assert.match(await read('src/modules/crm/layout/CrmLayout.tsx'), /updateAppBadge\(unreadCount\)/);
});
