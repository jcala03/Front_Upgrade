import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, loadEnv } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('production receives the verified GA4 ID and approved policies, without premature collection or misleading controls', async () => {
  const env = loadEnv('production', process.cwd(), 'VITE_');
  assert.equal(env.VITE_GA4_MEASUREMENT_ID, 'G-9SGBHZ5YT9');
  assert.equal(env.VITE_GA4_SETTINGS_REVIEWED, 'true', 'client property settings explicitly confirmed on 2026-11-19');
  for (const gate of ['VITE_PRIVACY_CONTROLS_ENABLED', 'VITE_GA4_ENABLED',
    'VITE_ANALYTICS_INFORMATION_REVIEWED']) assert.equal(env[gate], 'true', gate);
  assert.equal(env.VITE_GA4_LOCAL_DEBUG, 'false');
  const server = await createServer({ configFile: false, envFile: false, esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true, include: [] },
    define: Object.fromEntries(Object.entries({ ...env, DEV: false }).map(([key, value]) =>
      [`import.meta.env.${key}`, JSON.stringify(value)])),
    server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  try {
    const analytics = await server.ssrLoadModule('/src/privacy/analytics.ts');
    const privacy = await server.ssrLoadModule('/src/privacy/config.ts');
    const { PrivacyControls } = await server.ssrLoadModule('/src/privacy/PrivacyControls.tsx');
    const { Footer } = await server.ssrLoadModule('/src/components/layout/Footer/Footer.tsx');
    assert.equal(analytics.ga4Settings.id, 'G-9SGBHZ5YT9');
    assert.equal(analytics.ga4Settings.enabled, true);
    assert.equal(analytics.ga4Settings.localDebug, false);
    assert.equal(analytics.analyticsAllowed(), false);
    assert.equal(privacy.legalPublicationReady(), false);
    assert.deepEqual(privacy.publicLegalPaths(), ['/politica-de-datos', '/politica-de-cookies']);
    assert.equal(renderToStaticMarkup(createElement(PrivacyControls, { pathname: '/' })), '');
    const footer = renderToStaticMarkup(createElement(Footer));
    assert.match(footer, /Configurar cookies/);
    assert.doesNotMatch(footer, /__legal-review|href="\/envios-y-entregas"/);
    assert.match(footer, /href="\/politica-de-cookies"/);
    assert.match(footer, /href="\/politica-de-datos"/);
    assert.match(footer, /href="\/terminos-y-condiciones"/);
    assert.equal(privacy.ANALYTICS_EFFECTIVE_AT, Date.parse('2026-11-19T05:00:00Z'));
    assert.equal(privacy.analyticsStartReached(Date.parse('2026-11-19T04:59:59.999Z')), false);
    assert.equal(privacy.analyticsStartReached(Date.parse('2026-11-19T05:00:00Z')), true);
    const originalNow = Date.now;
    const keys = ['window', 'location', 'localStorage'];
    const descriptors = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
    let now = privacy.ANALYTICS_EFFECTIVE_AT - 1;
    let accepted = true;
    try {
      Date.now = () => now;
      globalThis.location = { hostname: 'upgradecolombia.com', pathname: '/tienda', origin: 'https://upgradecolombia.com' };
      globalThis.window = { location: globalThis.location };
      globalThis.localStorage = { getItem: () => JSON.stringify({ version: privacy.PRIVACY_VERSION, analytics: accepted, updatedAt: now }) };
      assert.equal(analytics.analyticsAllowed(), false, 'even stored acceptance cannot collect before Colombia midnight');
      now = privacy.ANALYTICS_EFFECTIVE_AT;
      accepted = false;
      assert.equal(analytics.analyticsAllowed(), false, 'effective date does not substitute visitor acceptance');
      accepted = true;
      analytics.ga4Settings.reviewed = false;
      assert.equal(analytics.analyticsAllowed(), false, 'an unreviewed client property remains blocked even with consent');
      analytics.ga4Settings.reviewed = true;
      assert.equal(analytics.analyticsAllowed(), true, 'reviewed production permits measurement only after date AND consent');
    } finally {
      Date.now = originalNow;
      keys.forEach((key, i) => descriptors[i] ? Object.defineProperty(globalThis, key, descriptors[i]) : delete globalThis[key]);
    }
  } finally { await server.close(); }
});
