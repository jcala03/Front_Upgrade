// Local browser smoke test. Provider delivery/physical mobile installation are NOT simulated as real tests.
// Run an SSR build at PWA_QA_URL, then set PLAYWRIGHT_MODULE if Playwright is not installed in this repo.
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, createECDH } from 'node:crypto';

const playwright = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { chromium, devices: browserDevices } = playwright.default ?? playwright;
const upstream = process.env.PWA_QA_URL || 'http://127.0.0.1:4175';
let revision = 1;
let disconnected = false;
// In-memory proxy changes only a SW comment to exercise a real browser update, without editing the application.
const proxy = http.createServer(async (request, response) => {
  if (disconnected) { request.socket.destroy(); return; }
  try {
    const result = await fetch(new URL(request.url, upstream));
    const headers = Object.fromEntries(result.headers);
    delete headers['content-encoding']; delete headers['content-length'];
    let bytes = Buffer.from(await result.arrayBuffer());
    if (request.url === '/sw.js') bytes = Buffer.concat([bytes, Buffer.from(`\n// Local QA revision ${revision}\n`)]);
    response.writeHead(result.status, headers); response.end(bytes);
  } catch { response.writeHead(503); response.end(); }
});
await new Promise((resolve) => proxy.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${proxy.address().port}`;
const profile = await mkdtemp(join(tmpdir(), 'upgrade79-pwa-browser-'));
const desktop = await chromium.launchPersistentContext(profile, { executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'], permissions: ['notifications'] });
const browser = desktop.browser();
const ec = createECDH('prime256v1'); ec.generateKeys();
const publicKey = ec.getPublicKey().toString('base64url'); // Ephemeral public-only QA key; no VAPID secrets persisted.
const user = { id: 6, name: 'Usuario QA', email: 'qa@example.test', role: 'user', employee: null, permissions: ['notifications.view', 'notifications.update', 'business_overview.view', 'inventory.view_own', 'quotations.view_own', 'quotations.create_own', 'quotations.update_own', 'quotations.send_own', 'quotations.convert_own', 'orders.view_own', 'orders.create_own', 'orders.confirm_own', 'orders.complete_own', 'payments.create_own'] };
let devices = [];
const results = [];

async function prepare(context, state = 'compatible') {
  await context.addInitScript(({ user, publicKey, state }) => {
    sessionStorage.setItem('upgrade79_crm_user', JSON.stringify(user));
    window.__qaPermissionCalls = 0;
    if (state === 'unsupported') { delete window.PushManager; return; }
    if (state === 'blocked') Object.defineProperty(Notification, 'permission', { get: () => 'denied' });
    const native = Notification.requestPermission.bind(Notification);
    Notification.requestPermission = (...args) => { window.__qaPermissionCalls += 1; return native(...args); };
    const decoded = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), (value) => value.charCodeAt(0));
    const subscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/local-browser-qa',
      options: { applicationServerKey: decoded.buffer },
      toJSON: () => ({ endpoint: subscription.endpoint, expirationTime: null, keys: { p256dh: publicKey, auth: 'YWFhYWFhYWFhYWFhYWFhYQ' } }),
      unsubscribe: async () => { localStorage.removeItem('__pwa_qa_subscription'); return true; },
    };
    PushManager.prototype.getSubscription = async () => localStorage.getItem('__pwa_qa_subscription') ? subscription : null;
    PushManager.prototype.subscribe = async () => { localStorage.setItem('__pwa_qa_subscription', '1'); return subscription; };
  }, { user, publicKey, state });
  // Intercept API regardless of the build's API domain; QA must never write to
  // a real production API when testing a production-configured build.
  await context.route(url => url.pathname.startsWith('/api/') || url.pathname.startsWith('/sanctum/'), async (route) => {
    const request = route.request(); const url = new URL(request.url());
    const cors = { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type,x-xsrf-token', 'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS' };
    if (request.method() === 'OPTIONS' || url.pathname.startsWith('/sanctum/')) return route.fulfill({ status: 204, headers: cors });
    let data = {};
    if (url.pathname === '/api/auth/me') data = { user };
    else if (url.pathname === '/api/push/config') {
      if (state === 'config-error') return route.fulfill({ status: 503, headers: cors, json: { message: 'QA unavailable' } });
      data = { data: { enabled: state !== 'unavailable', public_key: state === 'unavailable' ? null : publicKey } };
    }
    else if (url.pathname === '/api/push/subscriptions' && request.method() === 'GET') data = { data: devices };
    else if (url.pathname === '/api/push/subscriptions' && request.method() === 'POST') {
      const body = request.postDataJSON();
      devices = [{ id: 1, endpoint_hash: createHash('sha256').update(body.endpoint).digest('hex'), is_active: true, expires_at: null }];
      data = { data: devices[0] };
    } else if (/\/api\/push\/subscriptions\/\d+$/.test(url.pathname) && request.method() === 'DELETE') {
      devices = devices.map((device) => ({ ...device, is_active: false })); data = { data: null };
    } else if (url.pathname.endsWith('/notifications/unread-count')) data = { data: { count: 3 } };
    else if (url.pathname === '/api/admin/notifications') data = { data: { unread_count: 3, notifications: { data: [], current_page: 1, last_page: 1, total: 0 } } };
    await route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(data) });
  });
}

try {
  const context = desktop;
  await prepare(context);
  let page = await context.newPage(); const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/crm/profile`);
  await page.getByRole('heading', { name: 'Notificaciones del dispositivo' }).waitFor();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  assert.equal(await page.evaluate(() => window.__qaPermissionCalls), 0);
  const cdp = await context.newCDPSession(page);
  const manifest = await cdp.send('Page.getAppManifest');
  assert.equal(manifest.errors.length, 0); assert.equal(JSON.parse(manifest.data).display, 'standalone');
  results.push({ check: 'Manifest y Service Worker reales sobre servidor SSR', result: 'PASS' });
  const installability = await cdp.send('Page.getInstallabilityErrors').catch(() => ({ installabilityErrors: ['CDP not available'] }));
  results.push({ check: 'Chrome installability', details: installability });
  for (const [label, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['mobile', 390, 844]]) {
    await page.setViewportSize({ width, height });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `/tmp/upgrade79-pwa-${label}.png`, fullPage: true });
    results.push({ check: `Perfil responsive ${label}`, result: 'PASS' });
  }
  await page.getByRole('button', { name: 'Activar notificaciones en este dispositivo', exact: true }).click();
  await page.getByText('Notificaciones activadas.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.__qaPermissionCalls), 1); assert.equal(devices.length, 1);
  results.push({ check: 'Permiso explícito, suscripción y estado (API/proveedor simulados)', result: 'PASS' });

  // Hold only the next registration promise: prove that a profile mounted
  // before PWA readiness updates an existing subscription without window focus.
  await context.addInitScript(() => {
    if (sessionStorage.getItem('__qaHoldPwaRegistration') !== '1') return;
    sessionStorage.removeItem('__qaHoldPwaRegistration');
    const register = navigator.serviceWorker.register.bind(navigator.serviceWorker);
    navigator.serviceWorker.register = (...args) => new Promise((resolve, reject) => {
      window.__qaReleasePwa = () => register(...args).then(resolve, reject);
    });
  });
  await page.evaluate(() => sessionStorage.setItem('__qaHoldPwaRegistration', '1'));
  await page.reload();
  await page.getByText('Notificaciones desactivadas.', { exact: true }).waitFor();
  await page.waitForFunction(() => typeof window.__qaReleasePwa === 'function');
  await page.evaluate(() => window.__qaReleasePwa());
  await page.getByText('Notificaciones activadas.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.__qaPermissionCalls), 0);
  results.push({ check: 'Perfil refresca suscripción al terminar registro PWA, sin foco ni nuevo permiso', result: 'PASS' });
  const worker = context.serviceWorkers().find((item) => item.url().endsWith('/sw.js'));
  assert.ok(worker);
  await worker.evaluate(() => {
    self.__qaNotifications = [];
    const show = self.registration.showNotification.bind(self.registration);
    self.registration.showNotification = async (...arguments_) => {
      self.__qaNotifications.push({ title: arguments_[0], data: arguments_[1]?.data });
      try { return await show(...arguments_); }
      catch (error) { self.__qaPushError = error.message; throw error; }
    };
  });
  await worker.evaluate(async (payload) => {
    const push = new PushEvent('push', { data: JSON.stringify(payload) });
    Object.defineProperty(push, 'waitUntil', { value: (promise) => { self.__qaPushDone = promise; } });
    self.dispatchEvent(push); await self.__qaPushDone;
    const shown = self.__qaNotifications.find((item) => item.data.notification_id === 999);
    if (!shown) throw new Error('The real SW did not call showNotification');
    // Headless Linux need not retain OS notifications. Simulate only the user click, not routing.
    const click = new Event('notificationclick');
    Object.defineProperties(click, {
      notification: { value: { data: shown.data, close() {} } },
      waitUntil: { value: (promise) => { self.__qaClickDone = promise; } },
    });
    self.dispatchEvent(click);
    try { await self.__qaClickDone; }
    catch (error) {
      // Synthetic events have no OS user activation; navigation still runs, but focus may be forbidden.
      if (error.name !== 'InvalidAccessError') throw error;
    }
  }, { user_id: user.id, notification_id: 999, title: 'Tarea asignada', body: 'Prueba local', url: '/crm/notifications', unread_count: 3 });
  await page.waitForURL('**/crm/notifications');
  results.push({ check: 'SW real llama showNotification y navega con clic sintético (no clic OS)', result: 'PASS' });
  await page.close();
  await worker.evaluate(async (payload) => {
    const push = new PushEvent('push', { data: JSON.stringify(payload) });
    Object.defineProperty(push, 'waitUntil', { value: (promise) => { self.__qaPushDone = promise; } });
    self.dispatchEvent(push); await self.__qaPushDone;
    if (!self.__qaNotifications.some((item) => item.data.notification_id === 1000)) throw new Error('No background synthetic notification');
  }, { user_id: user.id, notification_id: 1000, title: 'Tarea asignada', body: 'Prueba sin pestañas CRM', url: '/crm/notifications', unread_count: 3 });
  results.push({ check: 'Push sintético con todas las pestañas CRM cerradas (sin proveedor externo)', result: 'PASS' });
  page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/crm/profile`);
  await page.getByRole('button', { name: 'Desactivar notificaciones en este dispositivo' }).click();
  await page.getByText('Notificaciones desactivadas.', { exact: true }).waitFor();
  assert.equal(devices[0].is_active, false);
  results.push({ check: 'Desactivación del dispositivo (API simulada)', result: 'PASS' });
  revision = 2;
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration('/')).update(); });
  await page.getByRole('button', { name: 'Actualizar aplicación' }).waitFor();
  assert.equal(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration('/')).waiting)), true);
  await Promise.all([
    page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame()),
    page.getByRole('button', { name: 'Actualizar aplicación' }).click(),
  ]);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(async () => { const registration = await navigator.serviceWorker.getRegistration('/'); return registration?.active && !registration.waiting; });
  await page.getByRole('heading', { name: 'Notificaciones del dispositivo' }).waitFor();
  results.push({ check: 'Actualización real espera consentimiento y recarga', result: 'PASS' });
  assert.ok(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL));
  // Chromium's frame-only network emulation may not stop SW fetches. Drop the actual local connection too.
  disconnected = true;
  await context.setOffline(true);
  await page.getByText(/^Sin conexión\. Las ventas/).waitFor();
  await page.reload(); await page.getByRole('heading', { name: 'No hay conexión' }).waitFor();
  const cached = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async (key) => (await (await caches.open(key)).keys()).map((request) => new URL(request.url).pathname)))).flat());
  assert.ok(cached.every((path) => path === '/offline.html' || path.startsWith('/icons/')));
  await page.screenshot({ path: '/tmp/upgrade79-pwa-offline.png', fullPage: true });
  results.push({ check: 'Offline real sin caché privada ni colas comerciales', result: 'PASS', cached });
  disconnected = false;
  await context.setOffline(false); await page.close();

  for (const state of ['blocked', 'unsupported', 'unavailable', 'config-error']) {
    const context = await browser.newContext(); await prepare(context, state);
    const page = await context.newPage(); await page.goto(`${origin}/crm/profile`);
    const messages = { blocked: /Permiso bloqueado/, unsupported: /no soporta Web Push/, unavailable: /El servicio Push aún no está habilitado/, 'config-error': /No se pudo consultar el estado/ };
    await page.getByText(messages[state]).waitFor();
    if (state === 'config-error') assert.equal(await page.getByText(/El servicio Push aún no está habilitado/).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Activar notificaciones en este dispositivo', exact: true }).count(), 0);
    assert.equal(await page.evaluate(() => window.__qaPermissionCalls), 0);
    results.push({ check: `Estado ${state}, sin petición automática`, result: 'PASS' });
    if (state === 'config-error') {
      await page.route(url => url.pathname === '/api/push/config', route => {
        const headers = { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type,x-xsrf-token', 'access-control-allow-methods': 'GET,OPTIONS' };
        return route.request().method() === 'OPTIONS'
          ? route.fulfill({ status: 204, headers })
          : route.fulfill({ status: 200, headers, json: { data: { enabled: false, public_key: null } } });
      });
      await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
      await page.getByText(/El servicio Push aún no está habilitado/).waitFor();
      assert.equal(await page.getByText(/No se pudo consultar el estado/).count(), 0);
      results.push({ check: 'Reintento recupera el estado real sin conservar el error de consulta', result: 'PASS' });
    }
    await context.close();
  }
  const android = await browser.newContext({ ...browserDevices['Pixel 7'] });
  await prepare(android); const androidPage = await android.newPage(); await androidPage.goto(`${origin}/crm/profile`);
  await androidPage.getByRole('heading', { name: 'Notificaciones del dispositivo' }).waitFor();
  assert.equal(await androidPage.getByText(/Para recibir notificaciones en iPhone/).count(), 0);
  assert.equal(await androidPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await androidPage.evaluate(() => window.__qaPermissionCalls), 0);
  results.push({ check: 'Chrome Android Pixel 7 emulado, sin aviso iPhone ni permiso automático', result: 'PASS' });
  await android.close();
  const ios = await browser.newContext({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1', viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  await prepare(ios); const iphone = await ios.newPage(); await iphone.goto(`${origin}/crm/profile`);
  await iphone.getByText(/Para recibir notificaciones en iPhone/).waitFor();
  assert.equal(await iphone.evaluate(() => window.__qaPermissionCalls), 0);
  await iphone.screenshot({ path: '/tmp/upgrade79-pwa-iphone-help.png', fullPage: true });
  results.push({ check: 'Ayuda iPhone (UA y viewport emulados, no Safari físico)', result: 'PASS' });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ results, pageErrors: errors, limitations: ['No instalación física Android/iPhone', 'Suscripciones/API y Push del proveedor simulados en navegador; backend validado por separado'] }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ completed: results, error: error.message }, null, 2));
  for (const context of browser.contexts()) for (const page of context.pages()) {
    console.error(JSON.stringify({ url: page.url(), body: (await page.locator('body').innerText().catch(() => '')).slice(0, 2200), worker: await page.evaluate(() => navigator.serviceWorker?.controller?.scriptURL).catch(() => null) }));
    await page.screenshot({ path: '/tmp/upgrade79-pwa-failure.png', fullPage: true }).catch(() => {});
  }
  for (const context of browser.contexts()) for (const worker of context.serviceWorkers()) {
    console.error(JSON.stringify(await worker.evaluate(async () => ({ owner: await getOwner(), shown: self.__qaNotifications, pushError: self.__qaPushError, permission: Notification.permission, notifications: (await self.registration.getNotifications()).map((item) => ({ tag: item.tag, data: item.data })) })).catch((error) => ({ error: error.message }))));
  }
  throw error;
} finally {
  await browser.close(); await new Promise((resolve) => proxy.close(resolve));
}
