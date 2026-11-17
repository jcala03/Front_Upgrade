// Optional real-browser regression: all Google requests are intercepted locally.
// Run: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/verify-privacy-browser.mjs
import assert from 'node:assert/strict';
import { createServer, loadEnv } from 'vite';
const measurementId = loadEnv('production', process.cwd(), 'VITE_').VITE_GA4_MEASUREMENT_ID;
assert.equal(measurementId, 'G-RXJ570E5BE');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture = `import React from 'react';import {hydrateRoot} from 'react-dom/client';
import {PrivacyControls} from '/src/privacy/PrivacyControls.tsx';
import {openPrivacyPreferences} from '/src/privacy/consent.ts';
import * as analytics from '/src/privacy/analytics.ts';
window.measure=analytics;document.querySelector('#preferences').onclick=openPrivacyPreferences;
hydrateRoot(document.querySelector('#root'),<PrivacyControls pathname={location.pathname}/>);`;
const server = await createServer({ configFile: false, envFile: false, appType: 'custom',
  esbuild: { jsx: 'automatic' }, optimizeDeps: { include: ['react', 'react-dom/client'] },
  define: Object.fromEntries(Object.entries({ DEV: true, VITE_GA4_ENABLED: 'true', VITE_GA4_MEASUREMENT_ID: measurementId,
    VITE_GA4_SETTINGS_REVIEWED: 'true', VITE_ANALYTICS_INFORMATION_REVIEWED: 'true', VITE_GA4_LOCAL_DEBUG: 'true' })
    .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])),
  plugins: [{ name: 'privacy-test-fixture', resolveId: id => id === '/privacy-fixture.tsx' ? id : undefined,
    load: id => id === '/privacy-fixture.tsx' ? fixture : undefined }],
  server: { host: '127.0.0.1', port: 4189, strictPort: true, hmr: false, ws: false } });
server.middlewares.use((req, res, next) => {
  if (!['/', '/tienda', '/carrito'].includes(req.url)) return next();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!doctype html><html lang="es"><head><title>Consent fixture</title></head><body><button id="preferences">Configurar cookies</button><div id="root"></div><script type="module" src="/privacy-fixture.tsx"></script></body></html>');
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext();
  let google = 0; const errors = [];
  await context.route(/https:\/\/.*(?:googletagmanager|google-analytics)\.com\//, route => {
    assert.equal(new URL(route.request().url()).searchParams.get('id'), measurementId);
    assert.equal(new URL(route.request().url()).pathname, '/gtag/js');
    google++; return route.fulfill({ contentType: 'application/javascript', body: 'window.testGoogleLoaded=true;' });
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  await page.goto(origin); await page.getByRole('button', { name: 'Aceptar analíticas', exact: true }).waitFor();
  assert.equal(google, 0);
  await page.getByRole('button', { name: 'Rechazar opcionales', exact: true }).click();
  await page.reload(); await page.getByRole('button', { name: 'Configurar cookies', exact: true }).click();
  await page.getByRole('dialog').waitFor(); assert.equal(google, 0);
  await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Guardar preferencias' }).click();
  await page.waitForFunction(() => window.testGoogleLoaded); assert.equal(google, 1);
  await page.evaluate(() => { history.pushState({}, '', '/tienda'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await page.waitForFunction(() => window.dataLayer.filter(a => a[0] === 'event' && a[1] === 'page_view').length === 2);
  const commerce = await page.evaluate(() => {
    const item = { productId: 40, variantId: 64, sku: 'TEST-ISOLATED', price: 1200000, quantity: 1 };
    const names = ['view_item_list', 'select_item', 'view_item', 'add_to_cart', 'remove_from_cart', 'begin_checkout'];
    const accepted = names.map(name => window.measure.trackCommerce(name, [item], name));
    const unpaidPurchase = window.measure.trackConfirmedPurchase({ id: 1, payment_status: 'unpaid' });
    return { accepted, unpaidPurchase, events: window.dataLayer.filter(a => a[0] === 'event').map(a => a[1]) };
  });
  assert.deepEqual(commerce.accepted, Array(6).fill(true));
  assert.equal(commerce.unpaidPurchase, false);
  assert.equal(commerce.events.includes('purchase'), false);
  await page.getByRole('button', { name: 'Configurar cookies', exact: true }).click();
  await page.getByRole('button', { name: 'Rechazar opcionales', exact: true }).click();
  assert.equal(await page.evaluate(() => window.measure.trackCommerce('add_to_cart', [{productId:40,variantId:64,price:1200000,quantity:1}])), false);
  assert.equal(await page.locator('#upgrade79-ga4').count(), 0); assert.equal(google, 1);
  await page.reload(); assert.equal(google, 1);
  for (const width of [1440, 768, 430, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('button', { name: 'Configurar cookies', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: hydration, no Google before consent/rejection, accept once, SPA, withdrawal, reload, 5 responsive widths. All Google traffic intercepted.');
} finally { await browser?.close(); await server.close(); }
