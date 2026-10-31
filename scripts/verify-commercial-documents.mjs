// Real CRM and Laravel HTTP, isolated upgrade_test fixtures; no SMTP, gateway or WhatsApp requests.
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash } from 'node:crypto';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const execute = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url)), backend = resolve(root, '../backendupgrade');
const artifacts = await mkdtemp(join(tmpdir(), 'upgrade79-documents-browser-'));
await mkdir(join(artifacts, 'sessions'));
const origin = 'http://127.0.0.1:5198', api = 'http://127.0.0.1:8198';
const env = { ...process.env, APP_ENV: 'testing', DB_CONNECTION: 'mysql', DB_HOST: '127.0.0.1', DB_PORT: '3306', DB_DATABASE: 'upgrade_test',
  DB_USERNAME: 'root', DB_PASSWORD: '', DB_URL: '', TEST_DB_CONNECTION: 'mysql', TEST_DB_DATABASE: 'upgrade_test', MAIL_MAILER: 'array',
  DOCUMENTS_QA_DIR: artifacts, DOCUMENTS_QA_KEY: 'base64:' + randomBytes(32).toString('base64'),
  FRONTEND_URL: origin, SANCTUM_STATEFUL_DOMAINS: '127.0.0.1:5198,127.0.0.1:8198' };
const cli = async action => {
  const { stdout } = await execute('php', ['tests/Browser/documents-fixtures.php', action], { cwd: backend, env, maxBuffer: 1024 * 1024 });
  const data = JSON.parse(stdout);assert.equal(data.database, 'upgrade_test');return data;
};
const initial = await cli('seed'), fixture = initial.manifest;
const server = spawn('php', ['-S', '127.0.0.1:8198', 'tests/Browser/documents-router.php'], { cwd: backend, env, stdio: ['ignore', 'pipe', 'pipe'] });
let backendLog = '';server.stdout.on('data', b => backendLog += b);server.stderr.on('data', b => backendLog += b);
let browser, vite;
const errors = [], requests = [], external = [], results = [], endpointChecks = [], polling = [];
try {
  const deadline = Date.now() + 15000;
  for (;;) {
    try { if ((await fetch(api + '/api/health')).ok) break; } catch {}
    assert.ok(Date.now() < deadline, 'QA backend startup timed out');await new Promise(r => setTimeout(r, 100));
  }
  const client = "import React from 'react';import{createRoot}from'react-dom/client';import App from '/src/App.tsx';import '/src/index.css';createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(App)));";
  const proxy = { target: api, changeOrigin: true, cookieDomainRewrite: '', cookiePathRewrite: '/',
    configure(p) { p.on('proxyReq', req => req.setHeader('Referer', origin + '/')); } };
  vite = await createServer({ root, configFile: false, cacheDir: join(artifacts, 'vite-cache'),
    define: { __PUBLIC_SITE_URL__: JSON.stringify('https://upgradecolombia.com') }, esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-dev-runtime', 'lucide-react', 'framer-motion', 'gsap', '@gsap/react'] },
    server: { host: '127.0.0.1', port: 5198, strictPort: true, hmr: false, proxy: { '/api': proxy, '/sanctum': proxy } },
    plugins: [{ name: 'document-qa', resolveId(id) { if (id === '/__docs-qa.js') return '\0docs-qa'; }, load(id) { if (id === '\0docs-qa') return client; },
      configureServer(v) { v.middlewares.use(async (req, res, next) => {
        if (!/^\/(?:crm(?:\/[^?]*)?|login)(?:\?.*)?$/.test(req.url)) return next();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(await v.transformIndexHtml(req.url, '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/__docs-qa.js"></script></body></html>'));
      }); } }] });
  await vite.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
  const swBefore = createHash('sha256').update(await readFile(join(root, 'public/sw.js'))).digest('hex');
  for (const role of ['admin', 'user']) {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === origin || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
      external.push(url.origin + url.pathname);return route.abort();
    });
    const page = await context.newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(45000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource.*(?:403|404)/.test(m.text())) errors.push(m.text()); });
    page.on('response', r => {
      const url = new URL(r.url());if (url.pathname.startsWith('/api/')) requests.push({ path: url.pathname, status: r.status(), database: r.headers()['x-documents-qa-database'] });
    });
    await page.goto(origin + '/login');
    await page.getByLabel('Email', { exact: true }).fill(fixture[role + '_email']);
    await page.getByLabel('Contraseña', { exact: true }).fill('QA-only-documents-not-a-real-account');
    const login = page.waitForResponse(r => r.url().endsWith('/api/auth/login'));
    await page.getByRole('button', { name: 'Entrar al CRM', exact: true }).click();assert.equal((await login).status(), 200);
    await page.waitForURL(origin + (role === 'admin' ? '/crm' : '/crm/me'));
    const cases = [
      { type: 'quotation', id: fixture.quote_id, number: fixture.quote_number, route: role === 'admin' ? '/crm/quotations' : '/crm/me/quotations', prefix: 'COT' },
      ...['pending', 'paid'].map(mode => ({ type: mode, ...fixture.orders[mode], route: role === 'admin' ? '/crm/orders' : '/crm/me/sales', prefix: mode === 'paid' ? 'VENTA' : 'ORDEN' })),
    ];
    for (const c of cases) {
      await page.setViewportSize({ width: 1440, height: 1000 });await page.goto(origin + c.route);
      const row = page.locator(role === 'admin' ? c.type === 'quotation' ? '.quotations-table > article' : '.orders-list__row' : '.my-commerce-grid > article').filter({ hasText: c.number });
      if (c.type === 'quotation') {
        await row.waitFor();
        const checks = await page.evaluate(async () => {
          const paths = ['/api/admin/notifications/unread-count', '/api/admin/quotations?page=1&per_page=20'];
          return Promise.all(paths.map(async path => {
            const response = await fetch(path, { credentials: 'include', headers: { Accept: 'application/json' } });
            const json = await response.json();
            return { path, status: response.status, database: response.headers.get('X-Documents-QA-Database'),
              count: json.data?.count, perPage: json.data?.per_page };
          }));
        });
        assert.equal(checks[0].status, 200);assert.equal(typeof checks[0].count, 'number');
        assert.equal(checks[1].status, role === 'admin' ? 200 : 403);
        if (role === 'admin') assert.equal(checks[1].perPage, 20);
        assert.ok(checks.every(check => check.database === 'upgrade_test'));
        endpointChecks.push({ role, checks });
        if (role === 'admin') {
          const offset = requests.length;
          // Observe more than one real 60-second polling interval, without clicks or navigation.
          for (let part = 0; part < 2; part++) {
            await page.waitForTimeout(32000);
            console.log('Observing stable CRM polling: ' + (part + 1) + '/2');
          }
          const observed = requests.slice(offset);
          const quotationLoads = observed.filter(request => request.path === '/api/admin/quotations');
          const unreadLoads = observed.filter(request => request.path === '/api/admin/notifications/unread-count');
          assert.equal(quotationLoads.length, 0, 'Quotation listing must not retry while idle');
          assert.equal(unreadLoads.length, 1, 'Exactly one scheduled notification poll expected in 64 seconds');
          assert.ok(observed.every(request => request.status < 500));
          polling.push({ role, seconds: 64, quotationLoads: quotationLoads.length, unreadLoads: unreadLoads.length, status: 'PASS' });
        }
      }
      await row.getByRole('button', { name: role === 'admin' ? c.type === 'quotation' ? 'Ver' : 'Ver orden' : c.type === 'quotation' ? 'Ver cotización' : 'Ver venta', exact: true }).click();
      const actions = page.getByRole('region', { name: 'Documentos y envío' });
      await actions.waitFor();
      const filename = c.prefix + '-' + String(c.id).padStart(6, '0') + '.pdf';
      const download = async label => {
        const event = page.waitForEvent('download');await actions.getByRole('button', { name: label, exact: true }).click();
        const file = await event;assert.equal(file.suggestedFilename(), filename);
        const target = join(artifacts, role + '-' + filename);await file.saveAs(target);
        assert.ok((await readFile(target)).subarray(0, 5).toString() === '%PDF-');return target;
      };
      const target = await download('Descargar PDF');await unlink(target);await download('Descargar PDF');
      await actions.getByRole('button', { name: 'Enviar por correo', exact: true }).click();
      await actions.getByLabel('Destinatario', { exact: true }).fill('revisado@example.test');
      const email = page.waitForResponse(r => r.url().endsWith('/email') && r.request().method() === 'POST');
      await actions.getByRole('button', { name: 'Enviar correo de prueba', exact: true }).click();
      const sent = await email;assert.equal(sent.status(), 200);assert.equal((await sent.json()).data.simulated, true);
      await actions.getByText('Correo de prueba generado con el PDF adjunto.', { exact: false }).waitFor();
      await actions.getByRole('button', { name: 'Enviar por WhatsApp', exact: true }).click();
      assert.equal(await actions.getByLabel('Número de WhatsApp con indicativo').inputValue(), '573001234567');
      assert.equal(await actions.getByRole('button', { name: '2. Abrir WhatsApp', exact: true }).isDisabled(), true);
      await download('1. Descargar PDF');
      const link = actions.getByRole('link', { name: '2. Abrir WhatsApp', exact: true });
      assert.ok((await link.getAttribute('href')).startsWith('https://wa.me/573001234567?text='));
      assert.equal(await link.getAttribute('target'), '_blank');
      for (const width of [1440, 1280, 1024, 768, 430, 390, 360]) {
        await page.setViewportSize({ width, height: 1000 });
        const size = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
        assert.ok(size[0] <= size[1], JSON.stringify({ role, document: c.type, width, size }));
        const controls = await actions.locator('button,input,a').evaluateAll(nodes => nodes.filter(n => n.getClientRects().length).map(n => { const r = n.getBoundingClientRect();return { left: r.left, right: r.right, viewport: innerWidth }; }));
        assert.ok(controls.every(r => r.left >= 0 && r.right <= r.viewport + 1), JSON.stringify(controls));
      }
      if (c.type === 'quotation') {
        await page.setViewportSize({ width: 1440, height: 1000 });await actions.scrollIntoViewIfNeeded();
        await page.screenshot({ path: join(artifacts, role + '-desktop.png'), fullPage: true });
        await page.setViewportSize({ width: 390, height: 1000 });await actions.scrollIntoViewIfNeeded();
        await page.screenshot({ path: join(artifacts, role + '-mobile.png'), fullPage: true });
      }
      results.push({ role, document: c.type, pdf: filename, downloadAndRegenerate: 'PASS', mail: 'simulation PASS', whatsapp: 'manual link PASS', widths: 7 });
      console.log(JSON.stringify(results.at(-1)));
    }
    if (role === 'user') {
      const status = await page.evaluate(async id => (await fetch('/api/admin/orders/' + id + '/pdf', { headers: { Accept: 'application/json' } })).status, fixture.orders.paid.id);
      assert.equal(status, 403);
    }
    await context.close();
  }
  const final = await cli('inspect');assert.deepEqual(final.snapshot, initial.snapshot);
  assert.deepEqual(errors, []);assert.deepEqual(external, []);assert.ok(requests.length && requests.every(r => r.database === 'upgrade_test'));
  assert.equal(createHash('sha256').update(await readFile(join(root, 'public/sw.js'))).digest('hex'), swBefore);
  assert.ok(requests.every(request => request.status < 500));
  const report = { status: 'PASS', database: 'upgrade_test', results, endpointChecks, polling, fixture, apiMocks: false, requests, errors, external, commercialStateUnchanged: true, swBefore, artifacts };
  await writeFile(join(artifacts, 'report.json'), JSON.stringify(report, null, 2));console.log(JSON.stringify({ ...report, requests: requests.length }, null, 2));
} catch (error) { console.error('Artifacts:', artifacts);throw error; }
finally { await browser?.close();await vite?.close();server.kill('SIGTERM');await writeFile(join(artifacts, 'backend.log'), backendLog); }
