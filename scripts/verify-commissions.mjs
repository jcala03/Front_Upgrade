// Real local CRM + Laravel; only guarded upgrade_test fixtures, never upgrade or gateways.
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash } from 'node:crypto';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const execute = promisify(execFile), root = fileURLToPath(new URL('../', import.meta.url)), backend = resolve(root, '../backendupgrade');
const artifacts = process.env.COMMISSIONS_QA_DIR || await mkdtemp(join(tmpdir(), 'upgrade79-documents-browser-commissions-'));
await mkdir(join(artifacts, 'sessions'), { recursive: true });
const origin = 'http://127.0.0.1:5198', api = 'http://127.0.0.1:8198';
const env = { ...process.env, APP_ENV: 'testing', DB_CONNECTION: 'mysql', DB_HOST: '127.0.0.1', DB_PORT: '3306', DB_DATABASE: 'upgrade_test',
  DB_USERNAME: 'root', DB_PASSWORD: '', DB_URL: '', TEST_DB_CONNECTION: 'mysql', TEST_DB_DATABASE: 'upgrade_test', MAIL_MAILER: 'array',
  DOCUMENTS_QA_DIR: artifacts, DOCUMENTS_QA_KEY: 'base64:' + randomBytes(32).toString('base64'),
  FRONTEND_URL: origin, SANCTUM_STATEFUL_DOMAINS: '127.0.0.1:5198,127.0.0.1:8198' };
const cli = async action => {
  const { stdout } = await execute('php', ['tests/Browser/commissions-fixtures.php', action], { cwd: backend, env, maxBuffer: 1024 * 1024 });
  const data = JSON.parse(stdout); assert.equal(data.database, 'upgrade_test'); return data;
};
const initial = await cli(process.env.COMMISSIONS_QA_DIR ? 'inspect' : 'seed'), fixture = initial.manifest;
const server = spawn('php', ['-S', '127.0.0.1:8198', 'tests/Browser/documents-router.php'], { cwd: backend, env, stdio: ['ignore', 'pipe', 'pipe'] });
let backendLog = ''; server.stdout.on('data', b => backendLog += b); server.stderr.on('data', b => backendLog += b);
let browser, vite;
const errors = [], requests = [], results = [];
const swBefore = createHash('sha256').update(await readFile(join(root, 'public/sw.js'))).digest('hex');
try {
  const deadline = Date.now() + 15000;
  for (;;) { try { if ((await fetch(api + '/api/health')).ok) break; } catch {} assert.ok(Date.now() < deadline); await new Promise(r => setTimeout(r, 100)); }
  const client = "import React from 'react';import{createRoot}from'react-dom/client';import App from '/src/App.tsx';import '/src/index.css';createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(App)));";
  const proxy = { target: api, changeOrigin: true, cookieDomainRewrite: '', cookiePathRewrite: '/', configure(p) { p.on('proxyReq', req => req.setHeader('Referer', origin + '/')); } };
  vite = await createServer({ root, configFile: false, cacheDir: join(artifacts, 'vite-cache'),
    define: { __PUBLIC_SITE_URL__: JSON.stringify('https://upgradecolombia.com') }, esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-dev-runtime', 'lucide-react', 'framer-motion', 'gsap', '@gsap/react'] },
    server: { host: '127.0.0.1', port: 5198, strictPort: true, hmr: false, proxy: { '/api': proxy, '/sanctum': proxy } },
    plugins: [{ name: 'commission-qa', resolveId(id) { if (id === '/__comm-qa.js') return '\0comm-qa'; }, load(id) { if (id === '\0comm-qa') return client; },
      configureServer(v) { v.middlewares.use(async (req, res, next) => {
        if (!/^\/(?:crm(?:\/[^?]*)?|login)(?:\?.*)?$/.test(req.url)) return next();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(await v.transformIndexHtml(req.url, '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/__comm-qa.js"></script></body></html>'));
      }); } }] });
  await vite.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
  for (const role of ['user', 'admin']) {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === origin || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
      errors.push('Unexpected external request: ' + url.origin + url.pathname); return route.abort();
    });
    const page = await context.newPage(); page.setDefaultTimeout(25000); page.setDefaultNavigationTimeout(45000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource.*(?:403|404|422)/.test(m.text())) errors.push(m.text()); });
    page.on('response', r => { const url = new URL(r.url()); if (url.pathname.startsWith('/api/')) requests.push({ path: url.pathname, status: r.status(), database: r.headers()['x-documents-qa-database'] }); });
    await page.goto(origin + '/login');
    await page.getByLabel('Email', { exact: true }).fill(fixture[role + '_email']);
    await page.getByLabel('Contraseña', { exact: true }).fill('QA-only-commissions-not-a-real-account');
    const loginEvent = page.waitForResponse(r => r.url().endsWith('/api/auth/login'));
    await page.getByRole('button', { name: 'Entrar al CRM', exact: true }).click();
    const login = await loginEvent; assert.equal(login.status(), 200);
    await page.waitForURL(origin + (role === 'admin' ? '/crm' : '/crm/me'));
    const auth = await page.evaluate(() => JSON.parse(sessionStorage.getItem('upgrade79_crm_user')));
    assert.ok(auth.permissions.includes(role === 'user' ? 'commissions.view_own' : 'commissions.view'));
    if (role === 'user') assert.ok(!auth.permissions.includes('commissions.view'));
    const navigation = page.locator('.crm-layout__sidebar a[href="' + (role === 'admin' ? '/crm/commissions' : '/crm/me/commissions') + '"]');
    await navigation.waitFor({ state: 'attached' }); assert.equal(await navigation.count(), 1);
    const block = role === 'admin' ? page.locator('.team-commission-kpis') : page.locator('.user-home-card').filter({ has: page.getByRole('heading', { name: 'Ganadas del mes', exact: true }) });
    await block.waitFor();
    if (role === 'admin') {
      await page.setViewportSize({ width: 430, height: 1000 });
      await page.locator('.dashboard-scope select').selectOption(String(fixture.branch_id));
      await block.getByText('Sede histórica seleccionada', { exact: true }).waitFor();
      await block.getByText('Vendedor comisiones QA user', { exact: true }).waitFor();
    } else await block.getByText('28.000', { exact: false }).first().waitFor();
    for (const width of [1440, 1280, 1024, 768, 430, 390, 360]) {
      await page.setViewportSize({ width, height: 1000 });
      await block.scrollIntoViewIfNeeded();
      const size = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      assert.ok(size[0] <= size[1], JSON.stringify({ role, width, size, view: 'dashboard' }));
      assert.ok((await block.locator('input,button,a').evaluateAll(nodes => nodes.filter(n => n.getClientRects().length).map(n => { const r = n.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1; }))).every(Boolean));
      if ([1440, 390].includes(width)) await page.screenshot({ path: join(artifacts, role + '-dashboard-' + width + '.png'), fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await block.getByRole('link', { name: role === 'admin' ? 'Ver ventas de Vendedor comisiones QA user' : 'Ver comisiones', exact: true }).click();
    await page.getByRole('heading', { name: role === 'admin' ? 'Comisiones' : 'Mis comisiones', exact: true, level: 2 }).waitFor();
    const saleLink = page.getByRole('link', { name: fixture.orders.earned.number, exact: true });
    await saleLink.waitFor();
    for (const width of [1440, 1280, 1024, 768, 430, 390, 360]) {
      await page.setViewportSize({ width, height: 1000 });
      const size = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      assert.ok(size[0] <= size[1], JSON.stringify({ role, width, size, view: 'commissions' }));
    }
    const apiCheck = await page.evaluate(async ({ role, fixture }) => {
      const prefix = role === 'admin' ? '/api/admin/commissions' : '/api/my/commissions';
      const query = role === 'admin' ? '?branch_id=' + fixture.branch_id : '';
      const response = await fetch(prefix + '/summary' + query, { headers: { Accept: 'application/json' } });
      const data = (await response.json()).data;
      const previous = await fetch(prefix + '/summary' + (query || '?') + (query ? '&' : '') + 'date_from=2020-01-01&date_to=2020-01-31', { headers: { Accept: 'application/json' } });
      const old = (await previous.json()).data;
      const forbidden = role === 'user' ? await fetch('/api/my/commissions/summary?employee_id=1', { headers: { Accept: 'application/json' } }) : null;
      return { status: response.status, totals: data.totals, previous: old.totals, spoof: forbidden?.status };
    }, { role, fixture });
    assert.equal(apiCheck.status, 200); assert.equal(apiCheck.totals.earned_amount, 28000); assert.equal(apiCheck.totals.pending_amount, 14000);
    assert.equal(apiCheck.totals.review_amount, 14000); assert.equal(apiCheck.totals.sales_count, 3); assert.equal(apiCheck.previous.total_rows, 0);
    if (role === 'user') assert.equal(apiCheck.spoof, 422);
    const dates = page.locator('.commissions-page input[type="date"]');
    const from = await dates.nth(0).inputValue(), to = await dates.nth(1).inputValue();
    const summaryPath = role === 'admin' ? '/api/admin/commissions/summary' : '/api/my/commissions/summary';
    const changed = page.waitForResponse(r => {
      const url = new URL(r.url()); return url.pathname === summaryPath && url.searchParams.get('date_from') === '2020-01-01' && url.searchParams.get('date_to') === '2020-01-31';
    });
    await dates.nth(0).fill('2020-01-01'); await dates.nth(1).fill('2020-01-31');
    assert.equal((await (await changed).json()).data.totals.total_rows, 0);
    await page.getByText(role === 'admin' ? 'No hay comisiones registradas.' : 'Aún no tienes comisiones registradas.', { exact: true }).waitFor();
    await dates.nth(1).fill(to); await dates.nth(0).fill(from);
    await saleLink.waitFor();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await saleLink.click();
    await page.getByRole('region', { name: 'Documentos y envío' }).waitFor();
    assert.ok(page.url().includes('order_id=' + fixture.orders.earned.id));
    results.push({ role, login: 'PASS', navigation: 'PASS', widths: 7, periodAndTotals: 'PASS', orderDeepLink: 'PASS', apiCheck });
    await context.close();
  }
  const final = await cli('inspect'); assert.deepEqual(final.snapshot, initial.snapshot); assert.equal(final.original_records_unchanged, true);
  assert.deepEqual(errors, []); assert.ok(requests.length && requests.every(r => r.database === 'upgrade_test' && r.status < 500));
  assert.equal(createHash('sha256').update(await readFile(join(root, 'public/sw.js'))).digest('hex'), swBefore);
  const report = { status: 'PASS', database: 'upgrade_test', apiMocks: false, results, requests, errors, originalRecordsUnchanged: true, fixture, swBefore, artifacts };
  await writeFile(join(artifacts, 'report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify({ ...report, requests: requests.length }, null, 2));
} catch (error) { console.error('Artifacts:', artifacts); throw error; }
finally { await browser?.close(); await vite?.close(); server.kill('SIGTERM'); await writeFile(join(artifacts, 'backend.log'), backendLog); }
