import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { renderRequest } = await vite.ssrLoadModule('/src/seo/entry-server.tsx');
const { getProductBySlug } = await vite.ssrLoadModule('/src/api/products.ts');
const template = '<html><head><!--seo-head--></head><body><div id="root"></div></body></html>';
const options = { siteUrl: 'https://upgradecolombia.com', apiBase: 'http://127.0.0.1:9999' };
const product = { id: 1, name: 'Producto real QA', slug: 'producto-qa', is_active: true, is_visible: true, price: 10000, stock: 3, image_url: 'https://api.example.com/product.png', images: [], variants: [], vehicle_compatibilities: [], technical_specs: {} };
async function withApi(handler, run) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  try { await run(); } finally { globalThis.fetch = original; }
}
test('cliente conserva HTTP real: 404 no se confunde con error temporal', async () => {
  for (const status of [404, 429, 500, 503]) {
    await withApi(async () => new Response(JSON.stringify({ message: 'Error QA controlado' }), { status }), async () => {
      await assert.rejects(() => getProductBySlug('producto-qa'), error => error.name === 'ProductApiError' && error.status === status);
    });
  }
});
test('Home, Shop y Product contienen H1 y catálogo real en respuesta inicial, sin JS', async () => {
  await withApi(async url => new Response(JSON.stringify({ data: String(url).includes('/producto-qa') ? product : [product] })), async () => {
    for (const path of ['/', '/tienda', '/tienda/producto-qa']) {
      const result = await renderRequest(path, template, options);
      assert.equal(result.status, 200); assert.equal(result.headers['X-Robots-Tag'], 'index, follow');
      assert.equal((result.body.match(/<h1\b/g) || []).length, 1);
      assert.ok(result.body.includes('Producto real QA')); assert.ok(result.body.includes('rel="canonical"'));
    }
  });
});
test('catálogo y sitemap se actualizan en cada petición: no snapshot de productos', async () => {
  let current = product;
  await withApi(async () => new Response(JSON.stringify({ data: [current] })), async () => {
    assert.ok((await renderRequest('/sitemap.xml', template, options)).body.includes('/producto-qa'));
    current = { ...product, slug: 'nuevo-publicado', name: 'Nuevo publicado QA' };
    const sitemap = await renderRequest('/sitemap.xml', template, options);
    assert.ok(sitemap.body.includes('/nuevo-publicado')); assert.ok(!sitemap.body.includes('/producto-qa'));
    assert.ok((await renderRequest('/tienda', template, options)).body.includes('Nuevo publicado QA'));
  });
});
test('privadas no consultan API ni contienen bootstrap, token, Product o canonical', async () => {
  await withApi(async () => { throw new Error('No debe consultar API'); }, async () => {
    for (const path of ['/login', '/crm/orders', '/admin', '/carrito', '/checkout', '/checkout/payment/return', '/orden-confirmada']) {
      const result = await renderRequest(path + '?token=SECRET_SENTINEL', template, options);
      assert.equal(result.status, 200); assert.equal(result.headers['X-Robots-Tag'], 'noindex, nofollow'); assert.equal(result.headers['Cache-Control'], 'no-store');
      for (const forbidden of ['SECRET_SENTINEL', 'public-bootstrap', 'rel="canonical"', 'application/ld+json']) assert.ok(!result.body.includes(forbidden));
    }
  });
});
test('rutas desconocidas y producto privado son HTTP 404, nunca Home soft-404', async () => {
  await withApi(async () => new Response('{}', { status: 404 }), async () => {
    for (const path of ['/desconocida', '/tienda/inexistente', '/tienda/producto-qa/extra', '/tienda/%E0%A4']) {
      const result = await renderRequest(path, template, options);
      assert.equal(result.status, 404); assert.equal(result.headers['X-Robots-Tag'], 'noindex, nofollow');
      assert.ok(result.body.includes('Página no encontrada')); assert.ok(!result.body.includes('Tu carro.'));
      assert.ok(!result.body.includes('public-bootstrap'));
    }
  });
});
test('errores públicos devuelven 503 recuperable sin indexar ni inventar catálogo vacío', async () => {
  await withApi(async () => { throw new Error('upstream'); }, async () => {
    for (const path of ['/tienda', '/tienda/producto-qa', '/sitemap.xml']) {
      const result = await renderRequest(path, template, options);
      assert.equal(result.status, 503); assert.equal(result.headers['X-Robots-Tag'], 'noindex, nofollow'); assert.equal(result.headers['Retry-After'], '60');
      assert.ok(!result.body.includes('rel="canonical"')); assert.ok(!result.body.includes('application/ld+json'));
    }
  });
});

test('fallo del preview no sustituye Home ni se confunde con un catálogo vacío', async () => {
  for (const handler of [
    async () => { throw new Error('upstream'); },
    async () => new Response('{}', { status: 503 }),
    async () => new Response(JSON.stringify({ data: null })),
  ]) {
    await withApi(handler, async () => {
      const result = await renderRequest('/', template, options);
      assert.equal(result.status, 200);
      for (const content of ['Tu carro.', 'Frente y ópticas', 'productos destacados', 'Reintentar productos', 'homeCatalogUnavailable'])
        assert.ok(result.body.includes(content), content);
      assert.ok(!result.body.includes('Catálogo temporalmente no disponible'));
      assert.ok(!result.body.includes('No hay productos destacados disponibles'));
      assert.ok(result.body.includes('public-bootstrap'));
      assert.equal((result.body.match(/<h1\b/g) || []).length, 1);
    });
  }
});

test('Home distingue vacío legítimo y conserva cinco hotspots sin simular fotografías pendientes', async () => {
  await withApi(async () => new Response(JSON.stringify({ data: [] })), async () => {
    const result = await renderRequest('/', template, options);
    assert.equal(result.status, 200);
    assert.ok(result.body.includes('No hay productos destacados disponibles'));
    assert.ok(!result.body.includes('homeCatalogUnavailable'));
    assert.equal((result.body.match(/class="transformation__hotspot /g) || []).length, 5);
    assert.equal((result.body.match(/class="transformation__vehicle is-active"/g) || []).length, 1);
    assert.ok(result.body.includes('data-active-visual="front"'));
    assert.ok(!result.body.includes('data-treatment='));
    assert.ok(result.body.includes('imagen base de referencia'));
    assert.ok(result.body.includes('fotografías de cada modificación están pendientes'));
    assert.ok(result.body.includes('<!--$-->'), 'Home includes the client Suspense hydration boundary');
    for (const title of ['Frente y ópticas', 'Rin delantero y postura', 'Línea lateral', 'Silueta superior', 'Rin trasero y cierre'])
      assert.ok(result.body.includes(title));
  });
});
