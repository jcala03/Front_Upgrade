// Run after an isolated build/prerender, against the PHP fixture router on
// upgrade_test. No orders, payments, mail or commercial database writes.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const directory = resolve(process.env.PUBLIC_CATALOG_QA_DIR || '/tmp/upgrade79-dynamic-http');
assert.ok(directory.startsWith('/tmp/upgrade79-dynamic-'));
const origin = process.env.CATALOG_QA_ORIGIN || 'http://127.0.0.1:8188';
assert.equal(new URL(origin).hostname, '127.0.0.1');
const dist = directory + '/client';
const phase = value => writeFile(directory + '/phase', value);
const get = (path, init = {}) => fetch(origin + path, { ...init, redirect: 'manual' });
const before = '/tienda/qa-runtime-before', after = '/tienda/qa-runtime-after';
const report = [];
const routes = JSON.parse(await readFile(dist + '/seo/routes.json', 'utf8'));
assert.ok(routes.pages.some(p => p.path === before));
assert.ok(!routes.pages.some(p => p.path === after), 'new product must NOT exist at build time');
await phase('before');
let response = await get(before);
assert.equal(response.status, 200);
assert.equal(response.headers.get('x-public-catalog'), 'prerendered');
assert.equal((await get(after)).status, 404);
assert.ok(!(await (await get('/sitemap.xml')).text()).includes(after));
report.push('before-build snapshot validated and reused; future product absent');
await phase('after');
response = await get(after);
assert.equal(response.status, 200);
assert.equal(response.headers.get('x-public-catalog'), 'dynamic');
const html = await response.text();
for (const value of ['<h1>QA qa-runtime-after</h1>', '<title>QA qa-runtime-after | UP GRADE 79</title>',
  'rel="canonical" href="https://upgradecolombia.com' + after + '"',
  'property="og:image"', '"@type":"Product"', '"priceCurrency":"COP"', '"renderMode":"client"']) assert.ok(html.includes(value), value);
assert.ok(!html.includes('cost_price'));
assert.ok((await (await get('/sitemap.xml')).text()).includes(after));
assert.equal((await get('/tienda/no-such-public-product')).status, 404);
assert.equal((await get(after, { method: 'HEAD' })).status, 200);
report.push('after-build product: HTTP 200, canonical/OG/Product in received HTML, live sitemap, missing slug 404');
await phase('hidden');
for (const path of [before, after]) {
  response = await get(path);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.ok(!(await (await get('/sitemap.xml')).text()).includes(path));
}
report.push('hidden product removed immediately from page and sitemap, including old snapshot');
await phase('changed');
response = await get(before);
assert.equal(response.status, 200);
assert.equal(response.headers.get('x-public-catalog'), 'dynamic');
assert.ok((await response.text()).includes('654.321'));
report.push('changed price bypasses obsolete snapshot without build');
await phase('after');

assert.ok(process.env.PLAYWRIGHT_MODULE, 'Provide an installed Playwright module; do not add a project dependency');
const playwright = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const browser = await (playwright.default ?? playwright).chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
try {
  const context = await browser.newContext();
  await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  // Production-mode builds keep the canonical public API domain. Browser QA
  // redirects those reads to the isolated Laravel fixture, NEVER to production.
  await context.route('https://upgradecolombia.com/api/**', async route => {
    assert.ok(['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()), 'No production mutations in browser QA');
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: origin + url.pathname + url.search, headers: { Accept: 'application/json' } });
    await route.fulfill({ response, headers: { ...response.headers(), 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true' } });
  });
  const page = await context.newPage();
  const errors = [], writes = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /hydration|hydrating|hooks|minified react error/i.test(message.text())) errors.push(message.text());
  });
  page.on('request', request => { if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(request.url()); });
  for (const width of [1440, 1280, 1024, 768, 430, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [before, after]) {
      response = await page.goto(origin + path);
      assert.equal(response.status(), 200);
      await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).waitFor();
      await page.waitForFunction(() => !document.querySelector('.product-detail__button')?.disabled);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    }
  }
  await page.screenshot({ path: directory + '/new-product-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(origin + after);
  await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
  await page.goto(origin + '/carrito');
  await page.getByText('QA qa-runtime-after', { exact: true }).first().waitFor();
  await page.getByRole('link', { name: 'Continuar compra' }).click();
  await page.waitForURL('**/checkout');
  await page.locator('h1').waitFor();
  assert.match(await page.locator('h1').innerText(), /checkout|compra|pedido|finaliz/i);
  assert.deepEqual(writes, [], 'Navigation must not create orders or charge anything');
  await page.goto(origin + before);
  await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).waitFor();
  await page.screenshot({ path: directory + '/old-product-desktop.png', fullPage: true });
  await page.goto(origin + '/tienda?in_stock=0');
  await page.getByRole('heading', { name: 'QA qa-runtime-after', exact: true }).waitFor();
  await page.goto(origin + '/tienda/no-such-public-product');
  assert.equal(await page.locator('h1').innerText(), 'Página no encontrada');
  assert.deepEqual(errors, []);
  report.push('Chrome: seven widths, old hydration/new client mount, cart → checkout, catalog, 404; no Hook/hydration errors or write requests');
} finally {
  await browser.close();
}
await writeFile(directory + '/report.json', JSON.stringify({ passed: true, report }, null, 2));
console.log(JSON.stringify({ passed: true, report }, null, 2));
