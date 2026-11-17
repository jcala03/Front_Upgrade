import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { apacheRules } from '../scripts/prerender.mjs';
const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
  define: { __PUBLIC_SITE_URL__: JSON.stringify('https://upgradecolombia.com') },
  server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => vite.close());
const { renderRequest } = await vite.ssrLoadModule('/src/seo/entry-server.tsx');
const origin = 'https://upgradecolombia.com';
const template = '<!doctype html><html lang="es"><head><!--seo-head--></head><body><div id="root"></div></body></html>';
const options = { siteUrl: origin, apiBase: 'http://127.0.0.1:1' };
const product = { id: 1, name: 'Pantalla de fixture aislada', slug: 'fixture-screen', is_active: true, is_visible: true,
  price: 123000, stock: 2, image_url: 'https://example.test/product.png', images: [], variants: [], vehicle_compatibilities: [] };
async function render(path) {
  const original = globalThis.fetch;
  globalThis.fetch = async url => new Response(JSON.stringify({ data: String(url).includes('/fixture-screen') ? product : [product] }));
  try { return await renderRequest(path, template, options); }
  finally { globalThis.fetch = original; }
}
const text = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
test('Home H1 retains its slogan and visibly identifies the service and city from its title', async () => {
  const response = await render('/');
  const headings = [...response.body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
  assert.equal(headings.length, 1);
  const heading = text(headings[0][1]);
  assert.match(heading, /Personalización automotriz en Barranquilla/);
  assert.match(heading, /Tu carro\. Otra presencia\./);
  assert.ok(response.body.includes('pantallas Android y accesorios multimedia'));
  assert.match(response.headers['Content-Type'], /charset=utf-8/i);
});
test('decorative marquee retains two visual strips without sixteen repetitions in SSR text', async () => {
  const response = await render('/');
  const marquee = response.body.match(/<div class="marquee" aria-hidden="true">([\s\S]*?)<\/div><\/div>/)?.[1];
  assert.ok(marquee);
  assert.equal(text(marquee), '');
  assert.equal((marquee.match(/data-marquee-text=/g) ?? []).length, 2);
});
test('public SSR images retain explicit alternatives including intentionally empty decorative images', async () => {
  for (const path of ['/', '/tienda', '/tienda/fixture-screen', '/politica-de-datos']) {
    const response = await render(path);
    const images = response.body.match(/<img\b[^>]*>/g) ?? [];
    assert.ok(images.length > 0);
    for (const image of images) assert.match(image, /\salt="[^"]*"/, path + ': ' + image);
    if (path === '/') {
      assert.match(response.body, /alt="Pantalla de fixture aislada"/);
      assert.match(response.body, /alt="BMW"/);
      assert.match(response.body, /alt=""/);
    }
  }
});
test('static UTF-8 applies to documents without changing backend routing or asset MIME types', () => {
  const rules = apacheRules([{ path: '/', file: 'index.html' }], origin);
  assert.match(rules, /AddCharset UTF-8 \.html \.txt \.xml/);
  assert.ok(rules.indexOf('AddDefaultCharset UTF-8') < rules.indexOf('<IfModule mod_mime.c>'));
  assert.ok(!rules.includes('ForceType'));
  assert.ok(rules.includes('RewriteRule ^tienda/[^/]+/?$ laravel-api.php [END,QSA]'));
  assert.ok(rules.includes('RewriteRule ^sitemap\\.xml$ laravel-api.php [END,QSA]'));
});
