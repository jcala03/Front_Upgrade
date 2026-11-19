// Optional local browser proof. Every API response is an in-memory fixture.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/verify-crm-idle-browser.mjs
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture = `import React from 'react'; import { createRoot } from 'react-dom/client';
import { CrmLayout } from '/src/modules/crm/layout/CrmLayout.tsx';
import { LoginPage } from '/src/modules/crm/auth/LoginPage.tsx';
import '/src/index.css';
if(location.pathname !== '/login') sessionStorage.setItem('upgrade79_crm_user', JSON.stringify({id:901,name:'Isolated user',email:'fixture@example.test',role:'admin',permissions:['notifications.view']}));
document.cookie='XSRF-TOKEN=isolated-csrf; path=/';
createRoot(document.getElementById('root')).render(<React.StrictMode>{location.pathname === '/login' ? <LoginPage/> : <CrmLayout title='Sesión aislada'><label>Nota sin guardar<input aria-label='Nota sin guardar'/></label><a href='/'>Tienda pública</a></CrmLayout>}</React.StrictMode>);`;
const server = await createServer({ configFile: false, envFile: false, appType: 'custom',
  esbuild: { jsx: 'automatic' }, optimizeDeps: { include: ['react', 'react-dom/client'] },
  plugins: [{ name: 'idle-fixture', resolveId: id => id === '/idle-fixture.tsx' ? id : undefined,
    load: id => id === '/idle-fixture.tsx' ? fixture : undefined }],
  server: { host: '127.0.0.1', port: 4196, strictPort: true, hmr: false, ws: false } });
server.middlewares.use((req, res, next) => {
  if (!['/', '/login', '/crm'].includes(req.url?.split('?')[0])) return next();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/idle-fixture.tsx"></script></body></html>');
});
let browser;
const id = 'b'.repeat(64);
const errors = [];
const requests = [];
let passed = 0;
let lastActivity = new Date('2026-11-18T15:00:00Z').getTime() / 1000;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext();
  await context.route('**/*', async route => {
    const request = route.request(); const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1') throw new Error('External network forbidden in isolated browser QA');
    if (url.pathname.startsWith('/api/') || url.pathname === '/sanctum/csrf-cookie') {
      requests.push({ path: url.pathname, method: request.method(), body: request.postDataJSON?.() });
      const time = ['/api/auth/session', '/api/auth/activity'].includes(url.pathname)
        ? Math.floor(await request.frame().page().evaluate(() => Date.now()) / 1000) : 0;
      if (url.pathname === '/api/auth/activity') lastActivity = time;
      const data = url.pathname === '/api/auth/session' || url.pathname === '/api/auth/activity'
        ? { session: { session_id: id, server_time: time, expires_at: lastActivity + 1800, idle_timeout_seconds: 1800 } }
        : url.pathname.includes('unread-count') ? { data: { unread_count: 0 } }
        : { data: { enabled: false }, message: 'Fixture only' };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    }
    return route.continue();
  });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({ time: new Date('2026-11-18T15:00:00Z') });
  const origin = 'http://127.0.0.1:4196';
  await page.goto(origin + '/crm');
  await page.getByLabel('Nota sin guardar').waitFor();
  await page.waitForFunction(() => !!localStorage.getItem('upgrade79_crm_idle_session')); passed++;
  await page.getByLabel('Nota sin guardar').fill('Contenido aún no guardado');
  await page.waitForTimeout(100);
  assert.ok(requests.some(r => r.path === '/api/auth/activity')); passed++;
  const activityBeforePolling = requests.filter(r => r.path === '/api/auth/activity').length;
  await page.clock.fastForward(20 * 60_000);
  await page.waitForTimeout(100);
  assert.equal(requests.filter(r => r.path === '/api/auth/activity').length, activityBeforePolling); passed++;
  assert.equal(new URL(page.url()).pathname, '/crm'); passed++;
  await page.getByLabel('Nota sin guardar').press('End');
  await page.waitForTimeout(100);
  assert.ok(requests.filter(r => r.path === '/api/auth/activity').length > activityBeforePolling); passed++;
  // A second tab shares the server-confirmed session without synthetic heartbeat.
  const second = await context.newPage(); second.on('pageerror', e => errors.push(e.message));
  await second.clock.install({ time: new Date(await page.evaluate(() => Date.now())) });
  await second.goto(origin + '/crm'); await second.getByLabel('Nota sin guardar').waitFor();
  await page.clock.fastForward(29 * 60_000);
  await page.getByRole('status').filter({ hasText: 'Guarda los cambios' }).waitFor(); passed++;
  assert.equal(await page.getByLabel('Nota sin guardar').inputValue(), 'Contenido aún no guardado'); passed++;
  await page.clock.fastForward(60_000);
  await page.waitForURL('**/login');
  await page.getByText(/Tu sesión terminó por inactividad/).waitFor(); passed++;
  await second.waitForURL('**/login'); passed++;
  const logout = requests.find(r => r.path === '/api/auth/logout');
  assert.equal(logout.body.idle_session_id, id); passed++;
  assert.equal(await page.evaluate(() => sessionStorage.getItem('upgrade79_crm_user')), null); passed++;
  assert.equal(await second.evaluate(() => sessionStorage.getItem('upgrade79_crm_user')), null); passed++;
  for (const width of [1440, 768, 430, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); passed++;
  }
  assert.deepEqual(errors, []); passed++;
  assert.ok(!requests.some(r => /orders|payments|ship\/|products|inventory/.test(r.path))); passed++;
  console.log(`PASS ${passed} isolated browser checks: actual CRM layout/login, trusted input, polling, warning, exact timeout, two tabs, logout identity, five widths. No real API or database accessed.`);
} finally { await browser?.close(); await server.close(); }
