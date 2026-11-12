// Real React/SSR + real Laravel HTTP kernel + PDO SQLite :memory:, never production.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement, StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const backend = resolve(process.env.MULTIMEDIA_QA_BACKEND || '../backendupgrade');
const extension = process.env.MULTIMEDIA_QA_SQLITE_EXTENSION;
const artifacts = await mkdtemp(join(tmpdir(), 'upgrade79-multimedia-sql-browser.'));
const results = [], errors = [], httpCalls = [];
let bridge, bridgeExit, pending = [], ready, currentProduct;
function startBridge(profile) {
  const args = [...(extension ? ['-d', 'extension=' + extension] : []), join(backend, 'tests/Support/multimedia-http-bridge.php'), '--isolated-memory-qa', profile];
  bridge = spawn(process.env.PHP_BINARY || 'php', args, { cwd: backend, stdio: ['pipe', 'pipe', 'pipe'] });
  bridgeExit = new Promise(resolve => bridge.once('exit', resolve));
  bridge.stderr.on('data', data => errors.push('Laravel bridge: ' + data.toString()));
  const lines = createInterface({ input: bridge.stdout });
  const first = new Promise((resolve, reject) => pending.push({ resolve, reject }));
  lines.on('line', line => {
    const next = pending.shift();
    try { assert.ok(next, 'Unexpected bridge response'); next.resolve(JSON.parse(line)); }
    catch (error) { next?.reject(error); }
  });
  bridge.once('exit', code => { for (const next of pending.splice(0)) next.reject(new Error('Bridge exited: ' + code)); });
  return first;
}
function rpc(input) {
  return new Promise((resolve, reject) => {
    pending.push({ resolve, reject });
    bridge.stdin.write(JSON.stringify(input) + '\n');
  });
}
const client = `
import { createElement, StrictMode, useState } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { CartProvider } from '/src/context/CartContext.tsx';
import { ProductDetailPage } from '/src/pages/ProductDetail/ProductDetailPage.tsx';
import { CartPage } from '/src/pages/Cart/CartPage.tsx';
import { CheckoutPage } from '/src/pages/Checkout/CheckoutPage.tsx';
import '/src/index.css';
const props=JSON.parse(document.getElementById('fixture').textContent);
function Harness(){const [view,setView]=useState('product');window.__sqlView=setView;
return view==='cart'?createElement(CartPage):view==='checkout'?createElement(CheckoutPage):createElement(ProductDetailPage,props);}
hydrateRoot(document.getElementById('root'),createElement(StrictMode,null,createElement(CartProvider,null,createElement(Harness))),
{onRecoverableError:error=>console.error('HYDRATION: '+error.message)});
`;
let ProductDetailPage, CartProvider, browser;
const vite = await createServer({ root, configFile: false, cacheDir: join(artifacts, 'cache'),
  define: { __PUBLIC_SITE_URL__: JSON.stringify('https://upgradecolombia.com') }, esbuild: { jsx: 'automatic' },
  optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-dev-runtime', 'lucide-react'] },
  server: { host: '127.0.0.1', port: 5195, strictPort: true, hmr: false },
  plugins: [{ name: 'isolated-sql-qa', resolveId(id) { if (id === '/__sql-qa.js') return '\0sql-qa'; },
    load(id) { if (id === '\0sql-qa') return client; },
    configureServer(server) { server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith('/tienda/')) return next();
      try {
        const props = { slug: currentProduct.slug, initialProduct: currentProduct, query: new URL(req.url, 'http://localhost').search };
        const html = renderToString(createElement(StrictMode, null, createElement(CartProvider, null, createElement(ProductDetailPage, props))));
        const data = JSON.stringify(props).replaceAll('<', '\\u003c');
        const document = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root">'+html+'</div><script type="application/json" id="fixture">'+data+'</script><script type="module" src="/__sql-qa.js"></script></body></html>';
        res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(await server.transformIndexHtml(req.url, document));
      } catch (error) { res.statusCode = 500; res.end(String(error)); }
    }); },
  }],
});
try {
  await vite.listen();
  ({ ProductDetailPage } = await vite.ssrLoadModule('/src/pages/ProductDetail/ProductDetailPage.tsx'));
  ({ CartProvider } = await vite.ssrLoadModule('/src/context/CartContext.tsx'));
  const origin = vite.resolvedUrls.local[0].replace(/\/$/, '');
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
  for (const profile of ['memory', 'memory-reviewed', 'reference']) for (const width of [1440, 390]) {
    console.log('Isolated SQL browser scenario:', profile, width);
    ready = await startBridge(profile);
    assert.equal(ready.database, ':memory:'); assert.equal(ready.driver, 'sqlite');
    const catalog = await rpc({ method: 'GET', path: '/api/products/' + ready.slug });
    assert.equal(catalog.status, 200); currentProduct = catalog.body.data;
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 1000 } });
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      if (/\/storage\/products\/isolated-(?:fixture|variant)\.png$/.test(url.pathname)) {
        return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#171a1e"/><text x="40" y="300" fill="#a6c9db" font-size="24">Isolated SQL fixture</text></svg>' });
      }
      assert.equal(url.origin, origin, 'External requests forbidden: ' + url.origin);
      if (url.pathname.endsWith('/sanctum/csrf-cookie')) return route.fulfill({ status: 204 });
      const path = url.pathname.replace(/^\/__public-api/, '') + url.search;
      if (path.startsWith('/api/')) {
        const answer = await rpc({ method: req.method(), path, ...(req.method() === 'POST' ? { body: req.postDataJSON(), key: req.headers()['idempotency-key'] } : {}) });
        httpCalls.push({ profile, width, method: req.method(), path: path.replace(/\/checkout\/orders\/[^/?]+/, '/checkout/orders/[isolated-token]'), status: answer.status });
        return route.fulfill({ status: answer.status, json: answer.body });
      }
      assert.equal(req.method(), 'GET', 'Unexpected mutation'); return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(origin + '/tienda/' + ready.slug);
    const select = async (oem, year) => {
      if (profile === 'memory-reviewed') {
        assert.equal(await page.getByLabel('Año del vehículo', { exact: true }).count(), 0);
      } else {
        // Enter the known test year through the existing store filters.
        const query = new URLSearchParams(Object.fromEntries(['vehicle_brand_id','vehicle_model_id','vehicle_version_id'].map(key => [key, String(ready.context[key])])));
        query.set('year', String(year));
        await page.goto(origin + '/tienda/' + ready.slug + '?' + query);
      }
      await page.locator('select[aria-label="Sistema OEM"]').selectOption(String(oem));
      if (profile !== 'reference') await page.locator('select[aria-label="Configuración de memoria"]').selectOption('8/128');
      await page.locator('[data-configuration-status="valid"]').waitFor();
      assert.equal(await page.getByLabel('Cantidad seleccionada').innerText(), '1');
      assert.ok(!(await page.locator('main').innerText()).includes('Selecciona una configuración para consultar su disponibilidad'));
      await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).click();
    };
    await select(ready.context.vehicle_multimedia_system_id, 2013);
    await select(ready.other_oem_id, 2016);
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('upgrade79_cart') || '[]').length === 2);
    const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('upgrade79_cart')));
    assert.equal(cart[0].variant.id, cart[1].variant.id);
    assert.notEqual(cart[0].configuration_context.vehicle_multimedia_system_id, cart[1].configuration_context.vehicle_multimedia_system_id);
    await page.evaluate(() => window.__sqlView('cart'));
    await page.getByRole('heading', { name: 'Carrito', exact: true }).waitFor();
    assert.equal(await page.locator('.configuration-summary').count(), 2);
    await page.evaluate(() => window.__sqlView('checkout'));
    await page.getByRole('heading', { name: 'Finalizar compra', exact: true }).waitFor();
    await page.getByRole('radio', { name: /Recoger en sede/ }).check();
    await page.getByLabel('Nombre completo', { exact: false }).fill('Isolated SQL QA');
    await page.getByLabel('Correo electrónico', { exact: false }).fill('isolated@example.test');
    await page.locator('input[type="tel"]').fill('3001234567');
    await page.getByRole('button', { name: 'Preparar orden', exact: true }).click();
    await page.locator('.checkout-delivery').waitFor();
    const persisted = await rpc({ action: 'inspect' });
    assert.equal(persisted.orders, 1); assert.equal(persisted.items.length, 2);
    assert.equal(persisted.stock, 3); assert.equal(persisted.movements, 0); assert.equal(persisted.payments, 0);
    for (const item of persisted.items) {
      const saved = JSON.parse(item.configuration_context);
      // Commercial lines are canonically sorted by backend, not insertion order.
      const selected = cart.find(line => line.configuration_context.vehicle_multimedia_system_id === saved.vehicle_multimedia_system_id).configuration_context;
      for (const key of ['profile_id', 'vehicle_brand_id', 'vehicle_model_id', 'vehicle_version_id', 'vehicle_multimedia_system_id', 'year']) assert.equal(saved[key], selected[key], key);
      if (profile !== 'reference') { assert.equal(saved.ram_gb, 8); assert.equal(saved.almacenamiento_gb, 128); }
      else { assert.equal(saved.ram_gb, undefined); assert.equal(saved.almacenamiento_gb, undefined); }
      assert.equal(saved.variant_id, ready.variant_id); assert.equal(item.unit_price, 1200000);
    }
    const size = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
    assert.ok(size.page <= size.viewport, JSON.stringify(size));
    await page.screenshot({ path: join(artifacts, profile + '-' + width + '.png'), fullPage: true });
    await rpc({ action: 'block' });
    const rejected = await rpc({ method: 'POST', path: '/api/orders', key: 'blocked-client-override', body: { customer_name: 'Isolated', customer_email: 'isolated@example.test', customer_phone: '3000000000', items: cart.map(line => ({ product_id: line.product.id, product_variant_id: line.variant.id, quantity: 1, configuration_context: { ...ready.context, purchase_enabled: true } })) } });
    assert.equal(rejected.status, 422);
    assert.equal((await rpc({ action: 'inspect' })).orders, 1);
    await context.close(); bridge.stdin.end(); assert.equal(await bridgeExit, 0); bridge = null;
    results.push({ profile, width, realLaravelSql: true, snapshotExact: true, sharedStock: true, blockedDirectHttp: true, payments: 0, hydration: 'PASS' });
  }
  assert.deepEqual(errors, []);
  const report = { results, httpCalls, errors, artifacts, database: 'sqlite::memory:', simulatedOrderResponses: false, externalRequestsAllowed: false };
  await writeFile(join(artifacts, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error('SQL BROWSER QA FAILED:', error);
  throw error;
} finally {
  await browser?.close();
  if (bridge) { bridge.stdin.end(); await bridgeExit; }
  await vite.close();
}
