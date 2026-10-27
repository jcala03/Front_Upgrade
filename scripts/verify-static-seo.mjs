// Exercises generated files through an isolated Apache, not the Vite/Node SSR middleware.
// APACHE_BINARY/APACHE_MODULE_DIR may point to packages extracted into /tmp.
import assert from 'node:assert/strict';
import { mkdtemp, cp, writeFile, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { request } from 'node:http';

const directory = await mkdtemp(join(tmpdir(), 'upgrade79-apache-qa-'));
const root = join(directory, 'public');
await cp(resolve('dist'), root, { recursive: true });
await writeFile(join(root, 'laravel-api.php'), 'QA-API-BRIDGE');
const socket = createServer();
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const moduleDir = process.env.APACHE_MODULE_DIR || '/usr/lib/apache2/modules';
const configuration = [
  `ServerRoot "${directory}"`, `PidFile "${directory}/httpd.pid"`,
  `Listen 127.0.0.1:${port}`, 'ServerName localhost',
  ...['mpm_event', 'authz_core', 'authz_host', 'dir', 'mime', 'rewrite', 'headers'].map(name => `LoadModule ${name}_module "${moduleDir}/mod_${name}.so"`),
  'TypesConfig /etc/mime.types', `ErrorLog "${directory}/error.log"`,
  process.env.APACHE_QA_TRACE ? 'LogLevel warn rewrite:trace5' : 'LogLevel warn',
  `DocumentRoot "${root}"`, 'DirectoryIndex index.html',
  `<Directory "${root}">`, '  AllowOverride All', '  Require all granted', '</Directory>',
].join('\n');
const configFile = join(directory, 'httpd.conf');
await writeFile(configFile, configuration);
const server = spawn(process.env.APACHE_BINARY || 'apache2', ['-f', configFile, '-DFOREGROUND'], { stdio: ['ignore', 'ignore', 'pipe'] });
let startupError = '';
server.stderr.on('data', chunk => { startupError += chunk; });
server.on('error', error => { startupError += error.message; });
const origin = `http://127.0.0.1:${port}`;
const results = [];
const get = (path, init = {}) => fetch(origin + path, { ...init, redirect: 'manual' });
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { await get('/'); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  assert.ok(ready, `Apache did not start: ${startupError}`);
  const routes = JSON.parse(await readFile(join(root, 'seo/routes.json'), 'utf8'));
  for (const page of routes.pages) {
    const response = await get(page.path);
    assert.equal(response.status, 200, page.path);
    const html = await response.text();
    assert.match(html, /<title>/); assert.match(html, /<h1\b/);
    assert.ok(html.includes(`rel="canonical" href="${routes.siteUrl}${page.path}"`));
    assert.doesNotMatch(html, /<!--seo-head-->|<div id="root"><\/div>/);
    results.push({ path: page.path, status: response.status, semanticHtml: true });
  }
  for (const [path, type, content] of [
    ['/robots.txt', /text\/plain/, 'Sitemap: https://upgradecolombia.com/sitemap.xml'],
    ['/sitemap.xml', /(?:application|text)\/xml/, '<urlset'],
    ['/sw.js', /javascript/, "addEventListener('push'"],
    ['/manifest.webmanifest', /json/, 'standalone'],
  ]) {
    const response = await get(path);
    assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), type);
    assert.ok((await response.text()).includes(content));
    const head = await get(path, { method: 'HEAD' }); assert.equal(head.status, 200);
    results.push({ path, status: 200, contentType: head.headers.get('content-type') });
  }
  for (const path of ['/api/auth/me', '/sanctum/csrf-cookie']) {
    const response = await get(path); assert.equal(await response.text(), 'QA-API-BRIDGE');
    results.push({ path, existingBridge: true });
  }
  for (const path of ['/crm/me/inventory', '/admin', '/login', '/checkout/payment/return']) {
    const response = await get(path); const html = await response.text();
    assert.equal(response.status, 200); assert.match(html, /noindex, nofollow/);
    assert.doesNotMatch(html, /public-bootstrap|rel="canonical"/);
    results.push({ path, privateClientRoute: true });
  }
  for (const path of ['/does-not-exist', '/tienda/missing', '/seo/template.html', '/seo/entry-server.js']) {
    const response = await get(path);
    assert.equal(response.status, 404, path);
    assert.match(await response.text(), /Página no encontrada/);
    results.push({ path, status: 404 });
  }
  const filtered = await get('/tienda?search=radio&vehicle_brand_id=1');
  assert.equal(filtered.status, 200); assert.match(await filtered.text(), /content="noindex, follow"/);
  const tracking = await get('/tienda?utm_source=qa&gclid=test');
  assert.match(await tracking.text(), /id="public-bootstrap"/);
  // Node fetch may replace Host with the URL host; use raw HTTP for this check.
  const www = await new Promise((resolve, reject) => {
    const outgoing = request(origin + '/tienda?search=radio', { headers: { Host: 'www.upgradecolombia.com' } }, response => {
      response.resume(); resolve({ status: response.statusCode, location: response.headers.location });
    });
    outgoing.on('error', reject); outgoing.end();
  });
  assert.equal(www.status, 301); assert.equal(www.location, 'https://upgradecolombia.com/tienda?search=radio');
  results.push({ queryFlow: true, www301: true });
  if (process.env.PLAYWRIGHT_MODULE) {
    const playwright = await import(process.env.PLAYWRIGHT_MODULE);
    const browser = await (playwright.default ?? playwright).chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
    try {
      const context = await browser.newContext();
      await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
      const requests = [];
      await context.route(url => url.pathname.startsWith('/api/'), route => {
        requests.push(route.request().url());
        const headers = { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type,x-xsrf-token' };
        return route.request().method() === 'OPTIONS' ? route.fulfill({ status: 204, headers }) : route.fulfill({ status: 200, headers, json: { data: [] } });
      });
      await context.addInitScript(() => {
        window.__seoHydrated = false;
        new MutationObserver(records => {
          if (records.some(record => [...record.removedNodes].some(node => node.nodeType === 1 && node.hasAttribute?.('data-public-seo')))) window.__seoHydrated = true;
        }).observe(document, { childList: true, subtree: true });
      });
      const page = await context.newPage(); const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && /hydration|hydrating|hooks|minified react error/i.test(message.text())) errors.push(message.text()); });
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        for (const path of ['/', '/tienda', '/politica-de-datos', '/terminos-y-condiciones', '/tienda?search=radio']) {
          await page.goto(origin + path);
          await page.waitForFunction(() => window.__seoHydrated);
          assert.equal(await page.locator('h1').count(), 1, path);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, path);
        }
      }
      assert.ok(requests.some(url => url.includes('search=radio')), 'Filtered shell must query the real filter contract, not hydrate unfiltered data');
      await page.evaluate(async () => { await navigator.serviceWorker.ready; });
      assert.equal(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)), true);
      assert.deepEqual(errors, []);
      results.push({ browser: 'desktop/mobile hydration and filters, real SW active', errors });
    } finally { await browser.close(); }
  }
  console.log(JSON.stringify({ server: 'Apache static artifacts (no Node SSR)', results }, null, 2));
} catch (error) {
  console.error(startupError, (await readFile(join(directory, 'error.log'), 'utf8').catch(() => '')).slice(-16000));
  throw error;
} finally {
  if (server.exitCode === null) {
    const exited = new Promise(resolve => server.once('exit', resolve));
    server.kill('SIGTERM'); await exited;
  }
  await rm(directory, { recursive: true, force: true });
}
