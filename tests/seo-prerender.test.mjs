import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
import { prerender } from '../scripts/prerender.mjs';

const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
  define: { __PUBLIC_SITE_URL__: JSON.stringify('https://upgradecolombia.com') },
  server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const renderer = await vite.ssrLoadModule('/src/seo/entry-server.tsx');
const origin = 'https://upgradecolombia.com';
const options = { siteUrl: origin, apiBase: 'http://127.0.0.1:9999' };
const product = { id: 1, name: 'Producto QA', slug: 'producto-qa', is_active: true, is_visible: true,
  price: 10000, stock: 2, image_url: 'https://example.test/product.png', images: [], variants: [], vehicle_compatibilities: [] };
const template = '<!doctype html><html lang="es"><head><!--seo-head--></head><body><div id="root"></div></body></html>';

async function fixture(t, handler) {
  const directory = await mkdtemp(join(tmpdir(), 'upgrade79-static-test-'));
  const dist = join(directory, 'public');
  await mkdir(dist);
  await writeFile(join(dist, 'index.html'), template);
  await writeFile(join(dist, '.htaccess'), 'RewriteEngine On\nRewriteRule ^ index.html [L]\n');
  const original = globalThis.fetch;
  globalThis.fetch = handler ?? (async url => new Response(JSON.stringify({ data: String(url).includes('/producto-qa') ? product : [product] })));
  t.after(async () => { globalThis.fetch = original; await rm(directory, { recursive: true, force: true }); });
  return { directory, dist };
}

test('build estático usa SSR real: Home, tienda, producto y legales tienen metadata, H1 e hidratación', async t => {
  const { dist } = await fixture(t);
  const pages = await prerender({ dist, renderer, options });
  assert.equal(pages.length, 5);
  for (const page of pages) {
    const html = await readFile(join(dist, page.file), 'utf8');
    assert.match(html, /<html lang="es">/);
    assert.match(html, /<title>/);
    assert.match(html, /name="description"/);
    assert.match(html, /rel="canonical"/);
    assert.match(html, /property="og:title"/);
    assert.match(html, /name="twitter:card"/);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.doesNotMatch(html, /<!--seo-head-->|<div id="root"><\/div>/);
    const bootstrap = JSON.parse(html.match(/id="public-bootstrap" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(bootstrap.path, page.path);
    assert.equal(bootstrap.prerendered, true);
    assert.equal(bootstrap.seo.canonical, origin + page.path);
  }
  const detail = pages.find(page => page.path === '/tienda/producto-qa');
  assert.match(await readFile(join(dist, detail.file), 'utf8'), /"@type":"Product"/);
  assert.equal(await readFile(join(dist, 'seo/template.html'), 'utf8'), template);
});

test('robots y sitemap son archivos reales; solo URLs públicas indexables, sin términos ni rutas privadas', async t => {
  const { dist } = await fixture(t, async url => new Response(JSON.stringify({ data: String(url).includes('/producto-qa') ? product : [product, { ...product, slug: 'oculto', is_visible: false }] })));
  await prerender({ dist, renderer, options });
  const robots = await readFile(join(dist, 'robots.txt'), 'utf8');
  assert.match(robots, /Sitemap: https:\/\/upgradecolombia.com\/sitemap.xml/);
  assert.match(robots, /Disallow: \/crm/);
  assert.match(robots, /Disallow: \/api/);
  assert.match(robots, /Allow: \/api\/products/);
  assert.match(robots, /Allow: \/api\/vehicle-models/);
  const sitemap = await readFile(join(dist, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /^<\?xml/);
  for (const path of ['/', '/tienda', '/politica-de-datos', '/tienda/producto-qa']) assert.ok(sitemap.includes(`<loc>${origin}${path}</loc>`));
  assert.doesNotMatch(sitemap, /<html|oculto|terminos-y-condiciones/);
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]));
  assert.ok(urls.every(url => url.origin === origin && !url.search && !url.pathname.startsWith('/crm') && !url.pathname.includes('oculto')));
  assert.ok(!urls.some(url => url.pathname === '/terminos-y-condiciones'));
});

test('filtros conservan flujo cliente sin bootstrap equivocado; privadas y 404 son noindex', async t => {
  const { dist } = await fixture(t);
  const pages = await prerender({ dist, renderer, options });
  for (const page of pages.filter(page => page.queryFile)) {
    const html = await readFile(join(dist, page.queryFile), 'utf8');
    assert.match(html, /content="noindex, follow"/);
    assert.doesNotMatch(html, /public-bootstrap|application\/ld\+json|<!--seo-head-->/);
    assert.match(html, /<div id="root"><\/div>/);
  }
  for (const file of ['private.html', '404.html']) {
    const html = await readFile(join(dist, 'seo', file), 'utf8');
    assert.match(html, /noindex, nofollow/);
    assert.doesNotMatch(html, /public-bootstrap|rel="canonical"/);
  }
  const rules = await readFile(join(dist, 'seo/apache.conf'), 'utf8');
  assert.match(rules, /ErrorDocument 404 \/seo\/404.html/);
  assert.match(rules, /REQUEST_URI\} !\^\/\(\?:api\|sanctum\)/);
  assert.match(rules, /AddType text\/plain \.txt/);
  assert.match(rules, /AddType application\/xml \.xml/);
});

test('fallo del catálogo detiene el build en lugar de publicar un sitemap incompleto', async t => {
  const { dist } = await fixture(t, async () => new Response('{}', { status: 503 }));
  await assert.rejects(prerender({ dist, renderer, options }), /Public catalog unavailable/);
  assert.equal(await readFile(join(dist, 'index.html'), 'utf8'), template);
});

test('instalador conserva reglas Hostinger y API, hace respaldo privado y es idempotente', async t => {
  const { directory, dist } = await fixture(t);
  await prerender({ dist, renderer, options });
  const original = '# Hostinger settings\nRewriteEngine On\nRewriteRule ^(api|sanctum)(/.*)?$ laravel-api.php [L,QSA]\nRewriteRule ^ index.html [L]\n';
  await writeFile(join(dist, '.htaccess'), original);
  await writeFile(join(dist, 'laravel-api.php'), '<?php // QA bridge placeholder');
  const installer = new URL('../scripts/install-seo-routing.php', import.meta.url).pathname;
  // decodeURIComponent handles the spaces in the real workspace path.
  execFileSync('php', [decodeURIComponent(installer), dist]);
  const first = await readFile(join(dist, '.htaccess'), 'utf8');
  assert.ok(first.endsWith(original));
  assert.equal((first.match(/# BEGIN UPGRADE79 PUBLIC SEO/g) ?? []).length, 1);
  execFileSync('php', [decodeURIComponent(installer), dist]);
  assert.equal(await readFile(join(dist, '.htaccess'), 'utf8'), first);
  assert.equal((await readdir(directory)).filter(file => file.startsWith('.htaccess.before-seo')).length, 1);
  assert.equal((await readdir(dist)).filter(file => file.startsWith('.htaccess.before-seo')).length, 0);
});
