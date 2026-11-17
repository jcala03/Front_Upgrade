import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, loadEnv } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('production receives the verified GA4 ID, without collection, misleading controls or legal publication', async () => {
  const env = loadEnv('production', process.cwd(), 'VITE_');
  assert.equal(env.VITE_GA4_MEASUREMENT_ID, 'G-RXJ570E5BE');
  for (const gate of ['VITE_PRIVACY_CONTROLS_ENABLED', 'VITE_GA4_ENABLED', 'VITE_GA4_SETTINGS_REVIEWED',
    'VITE_ANALYTICS_INFORMATION_REVIEWED', 'VITE_GA4_LOCAL_DEBUG']) assert.equal(env[gate], 'false', gate);
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
    assert.equal(analytics.ga4Settings.id, 'G-RXJ570E5BE');
    assert.equal(analytics.ga4Settings.enabled, false);
    assert.equal(analytics.analyticsAllowed(), false);
    assert.equal(privacy.legalPublicationReady(), false);
    assert.equal(renderToStaticMarkup(createElement(PrivacyControls, { pathname: '/' })), '');
    const footer = renderToStaticMarkup(createElement(Footer));
    assert.doesNotMatch(footer, /Configurar cookies|__legal-review|politica-de-cookies/);
    assert.match(footer, /href="\/politica-de-datos"/);
    assert.match(footer, /href="\/terminos-y-condiciones"/);
  } finally { await server.close(); }
});
