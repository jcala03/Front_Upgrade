import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeo, safeJson, seoHead, productImages, sitemapXml, siteOrigin } from '../src/seo/model.ts';
const origin = 'https://upgradecolombia.com';
const product = { name: 'Pantalla <Pro>', slug: 'pantalla-pro', sku: 'REAL-001', is_active: true, is_visible: true, price: 12000, stock: 0, description: 'Pantalla automotriz', image_url: 'https://api.example.com/primary.png', images: [{ image_url: 'https://api.example.com/other.png', is_primary: false }, { image_url: 'https://api.example.com/primary.png', is_primary: true }], variants: [] };
test('origen único validado; dominio HTTPS o loopback, sin ruta ni tokens', () => {
  assert.equal(siteOrigin(origin), origin);
  assert.equal(siteOrigin('http://localhost:5174'), 'http://localhost:5174');
  for (const bad of ['http://example.com', origin + '/tienda', origin + '?token=x', 'https://user:pass@example.com']) assert.throws(() => siteOrigin(bad));
});
test('metadata inicial escapada y principal primero; COP y agotado reales', () => {
  const seo = createSeo('/tienda/pantalla-pro', origin, { product });
  assert.equal(seo.canonical, origin + '/tienda/pantalla-pro');
  assert.deepEqual(productImages(product), [product.image_url, product.images[0].image_url]);
  const data = seo.structuredData.find(x => x['@type'] === 'Product');
  assert.equal(data.offers.price, 12000); assert.equal(data.offers.priceCurrency, 'COP'); assert.equal(data.offers.availability, 'https://schema.org/OutOfStock');
  assert.ok(seoHead(seo).includes('Pantalla &lt;Pro&gt;'));
  for (const field of ['review', 'aggregateRating', 'gtin', 'shippingDetails', 'priceValidUntil']) assert.equal(field in data, false);
});
test('variantes públicas usan su precio y stock, no precio padre ni variantes ocultas', () => {
  const p = { ...product, has_variants: true, price: 3, stock: 999, variants: [{ name: 'V1', price: 450, stock: 4, is_active: true, is_visible: true }, { name: 'V2', price: 550, stock: 0, is_active: true, is_visible: true }, { name: 'Privada', price: 1, stock: 999, is_active: false, is_visible: true }] };
  const data = createSeo('/tienda/pantalla-pro', origin, { product: p }).structuredData.find(x => x['@type'] === 'Product');
  assert.deepEqual(data.offers.map(o => [o.price, o.availability]), [[450, 'https://schema.org/InStock'], [550, 'https://schema.org/OutOfStock']]);
});
test('privadas sin canonical, tokens, Product ni bootstrap financiero; filtros noindex', () => {
  for (const path of ['/crm/orders', '/admin', '/login', '/carrito', '/checkout', '/checkout/payment/return', '/orden-confirmada', '/desconocida']) {
    const seo = createSeo(path, origin, { query: '?token=secret' });
    assert.equal(seo.robots, 'noindex, nofollow'); assert.equal(seo.canonical, null); assert.deepEqual(seo.structuredData, []); assert.ok(!seoHead(seo).includes('secret'));
  }
  assert.equal(createSeo('/tienda', origin, { query: '?search=radio' }).robots, 'noindex, follow');
  assert.equal(createSeo('/tienda', origin, { query: '?utm_source=qa' }).robots, 'index, follow');
});
test('sitemap dinámico sólo publicado, agotados incluidos; sin lastmod inventado', () => {
  const xml = sitemapXml([product, { ...product, slug: 'hidden', is_visible: false }, { ...product, slug: 'inactive', is_active: false }], origin);
  assert.ok(xml.includes(origin + '/tienda/pantalla-pro')); assert.ok(!xml.includes('hidden')); assert.ok(!xml.includes('inactive')); assert.ok(!xml.includes('lastmod')); assert.ok(!xml.includes('/checkout'));
});
test('JSON incrustado no permite cerrar script; fallos API nunca indexables', () => {
  assert.ok(!safeJson({ name: '</script><script>alert(1)</script>' }).includes('<'));
  for (const status of [404, 503]) { const seo = createSeo('/', origin, { status }); assert.equal(seo.robots, 'noindex, nofollow'); assert.equal(seo.canonical, null); assert.deepEqual(seo.structuredData, []); }
});
