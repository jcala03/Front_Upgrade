// Opt-in real SDK regression. Download gtag.js only; intercept ALL collection.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/verify-ga4-real-sdk-browser.mjs
import assert from 'node:assert/strict';
import { createServer, loadEnv } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const id = loadEnv('production', process.cwd(), 'VITE_').VITE_GA4_MEASUREMENT_ID;
assert.equal(id, 'G-9SGBHZ5YT9');
const fixture = `import React from 'react';import {hydrateRoot} from 'react-dom/client';
import {PrivacyControls} from '/src/privacy/PrivacyControls.tsx';
import {openPrivacyPreferences} from '/src/privacy/consent.ts';
import * as analytics from '/src/privacy/analytics.ts';
window.measure=analytics;document.querySelector('#preferences').onclick=openPrivacyPreferences;
hydrateRoot(document.querySelector('#root'),<PrivacyControls pathname={location.pathname}/>);`;
const server = await createServer({ configFile: false, envFile: false, appType: 'custom',
  esbuild: { jsx: 'automatic' }, optimizeDeps: { include: ['react', 'react-dom/client'] },
  define: Object.fromEntries(Object.entries({ DEV: true, VITE_GA4_ENABLED: 'true', VITE_GA4_MEASUREMENT_ID: id,
    VITE_GA4_SETTINGS_REVIEWED: 'true', VITE_ANALYTICS_INFORMATION_REVIEWED: 'true', VITE_GA4_LOCAL_DEBUG: 'true' })
    .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])),
  plugins: [{ name: 'privacy-sdk-fixture', resolveId: name => name === '/fixture.tsx' ? name : undefined,
    load: name => name === '/fixture.tsx' ? fixture : undefined }],
  server: { host: '127.0.0.1', port: 0, hmr: false, ws: false } });
server.middlewares.use((req, res, next) => {
  if (!['/', '/tienda'].includes(req.url)) return next();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!doctype html><html><head><title>Isolated consent regression</title></head><body><button id="preferences">Configurar cookies</button><div id="root"></div><script type="module" src="/fixture.tsx"></script></body></html>');
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext();
  let phase = 'before-consent';
  const calls = [], errors = [];
  // Only the existing Google library may be downloaded. No event reaches Google.
  await context.route('https://**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.googletagmanager.com' && url.pathname === '/gtag/js' && url.searchParams.get('id') === id) {
      calls.push({ phase, type: 'script' });
      return route.continue();
    }
    const chunks = [url.searchParams, ...((route.request().postData() || '').split('\n').map(line => new URLSearchParams(line)))];
    const targets = chunks.map(params => params.get('tid')).filter(Boolean);
    const events = chunks.map(params => params.get('en')).filter(Boolean);
    calls.push({ phase, type: 'intercepted-collection', targets, events });
    return route.fulfill({ status: 204, body: '' });
  });
  const page = await context.newPage();page.on('pageerror', error => errors.push(error.message));
  const cdp = await context.newCDPSession(page);await cdp.send('Network.enable');
  const timeline = [];
  cdp.on('Network.requestWillBeSent', event => {
    const url = new URL(event.request.url);
    if (url.protocol === 'https:') timeline.push({ host:url.hostname, path:url.pathname, transport:event.type, startedAt:event.wallTime * 1000 });
  });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  await page.goto(origin);await page.getByRole('button', { name: 'Aceptar analíticas', exact: true }).waitFor();
  await page.waitForTimeout(500);assert.equal(calls.length, 0);
  phase = 'accepted';await page.getByRole('button', { name: 'Aceptar analíticas', exact: true }).click();
  await page.waitForFunction(() => Boolean(window.google_tag_manager));
  await page.evaluate(() => {
    history.pushState({}, '', '/tienda');window.dispatchEvent(new PopStateEvent('popstate'));
    window.measure.trackCommerce('view_item_list', [{productId: 40, variantId:64, price:1200000, quantity:1}], 'isolated');
  });
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Configurar cookies', exact: true }).click();
  await page.evaluate(() => document.addEventListener('click', event => {
    if (event.target.closest('button')?.textContent === 'Rechazar opcionales') window.revocationClickAt = Date.now();
  }, { capture:true, once:true }));
  phase = 'withdrawn';await page.getByRole('button', { name: 'Rechazar opcionales', exact: true }).click();
  const cutoff = await page.evaluate(() => window.revocationClickAt);assert.ok(cutoff);
  await page.waitForTimeout(6500);
  const state = await page.evaluate(id => ({ disabled: window['ga-disable-' + id], script: Boolean(document.getElementById('upgrade79-ga4')),
    allowed:window.measure.analyticsAllowed(), choice:JSON.parse(localStorage.getItem('upgrade79_privacy_choice')).analytics }), id);
  assert.deepEqual(state, { disabled:true, script:false, allowed:false, choice:false });
  assert.equal(await page.evaluate(() => window.measure.trackCommerce('add_to_cart', [{productId:40,price:1200000,quantity:1}])), false);
  assert.ok(timeline.length === calls.length && timeline.every(call => Number.isFinite(call.startedAt) && call.startedAt > 0));
  assert.equal(timeline.filter(call => call.startedAt >= cutoff).length, 0, JSON.stringify({cutoff,timeline,calls}));
  // The same SDK must resume only after a NEW explicit choice, without a second tag.
  phase = 'reaccepted';
  await page.getByRole('button', { name: 'Configurar cookies', exact: true }).click();
  await page.getByRole('button', { name: 'Aceptar analíticas', exact: true }).click();
  await page.waitForTimeout(6500);
  assert.ok(calls.some(call => call.phase === 'reaccepted' && call.events?.includes('page_view')), JSON.stringify(calls));
  await page.getByRole('button', { name: 'Configurar cookies', exact: true }).click();
  await page.evaluate(() => document.addEventListener('click', event => {
    if (event.target.closest('button')?.textContent === 'Rechazar opcionales') window.revocationClickAt = Date.now();
  }, { capture:true, once:true }));
  phase = 'withdrawn-again';await page.getByRole('button', { name: 'Rechazar opcionales', exact: true }).click();
  const secondCutoff = await page.evaluate(() => window.revocationClickAt);
  await page.waitForTimeout(6500);
  await page.reload();await page.getByRole('button', { name: 'Configurar cookies', exact: true }).waitFor();
  await page.waitForTimeout(1000);
  assert.equal(timeline.filter(call => call.startedAt >= secondCutoff).length, 0, JSON.stringify({secondCutoff,timeline,calls}));
  for (const call of calls) for (const target of call.targets || []) assert.equal(target, id);
  assert.equal(calls.filter(call => call.type === 'script').length, 1);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status:'PASS', calls, collection_delivered_to_google:false, state }, null, 2));
} finally { await browser?.close();await server.close(); }
