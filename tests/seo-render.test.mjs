import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const vite = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { renderRequest } = await vite.ssrLoadModule('/src/seo/entry-server.tsx');
const { getProductBySlug } = await vite.ssrLoadModule('/src/api/products.ts');
const template = '<html><head><!--seo-head--></head><body><div id="root"></div></body></html>';
const options = { siteUrl: 'https://upgradecolombia.com', apiBase: 'http://127.0.0.1:9999' };
test('SSR conserva OEM en enlaces, API de detalle, bootstrap y regreso a tienda', async () => {
  const selection = 'vehicle_brand_id=1&vehicle_model_id=2&vehicle_version_id=3&vehicle_multimedia_system_id=4';
  const seen = [];
  const filtered = { ...product, price: 200000, has_variants: true, lowest_variant_price: 200000, total_variant_stock: 2,
    variants: [{ id: 10, product_id: 1, name: 'Compatible NBT', price: 200000, stock: 2, is_active: true, is_visible: true }] };
  await withApi(async url => {
    seen.push(String(url));
    return new Response(JSON.stringify({ data: String(url).includes('/producto-qa') ? filtered : [filtered] }));
  }, async () => {
    const shop = await renderRequest('/tienda?' + selection, template, options);
    assert.equal(shop.status, 200);
    assert.ok(shop.body.includes('/tienda/producto-qa?vehicle_brand_id=1&amp;vehicle_model_id=2&amp;vehicle_version_id=3&amp;vehicle_multimedia_system_id=4'));
    const detail = await renderRequest('/tienda/producto-qa?' + selection, template, options);
    assert.equal(detail.status, 200);
    assert.ok(seen.some(url => url.endsWith('/api/products/producto-qa?' + selection)));
    assert.ok(detail.body.includes('Compatible NBT'));
    assert.ok(detail.body.includes('href="/tienda?vehicle_brand_id=1&amp;vehicle_model_id=2&amp;vehicle_version_id=3&amp;vehicle_multimedia_system_id=4"'));
    const bootstrap = JSON.parse(detail.body.match(/<script id="public-bootstrap" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(bootstrap.query, selection);
  });
});
test('páginas legales independientes responden 200 sin consultar catálogo', async () => {
  await withApi(async () => { throw new Error('Las páginas legales no necesitan API'); }, async () => {
    for (const [path, title] of [
      ['/politica-de-datos', 'Política de Tratamiento de Datos Personales'],
      ['/terminos-y-condiciones', 'Términos y Condiciones'],
    ]) {
      const result = await renderRequest(path, template, options);
      assert.equal(result.status, 200);
      assert.ok(result.body.includes('<h1 id='));
      assert.ok(result.body.includes(title));
      assert.ok(result.body.includes('href="/#contact"'));
      assert.ok(result.body.includes('href="/"'));
      assert.ok(!result.body.includes('Pendiente de completar por el propietario'));
      assert.ok(!result.body.includes('El propietario debe'));
      assert.ok(result.body.includes('href="https://upgradecolombia.com' + path + '"'));
    }
  });
});
test('landing conserva enlaces legales sin desarrollar la política', async () => {
  await withApi(async () => new Response(JSON.stringify({ data: [] })), async () => {
    const result = await renderRequest('/', template, options);
    assert.equal(result.status, 200);
    assert.ok(result.body.includes('href="/politica-de-datos"'));
    assert.ok(result.body.includes('href="/terminos-y-condiciones"'));
    assert.ok(!result.body.includes('Qué datos compartes y para qué los usamos'));
    assert.ok(!result.body.includes('id="politica-datos"'));
    assert.ok(!result.body.includes('legal-page'));
  });
});
test('Home SSR protege el primer paint fuera de #root sin cambiar su árbol de hidratación', async () => {
  await withApi(async () => new Response(JSON.stringify({ data: [] })), async () => {
    const result = await renderRequest('/', template, options);
    assert.equal(result.status, 200);
    assert.ok(result.body.includes('id="public-bootstrap"'));
    assert.ok(result.body.includes('Tu carro.'));
    assert.ok(result.body.includes('<footer'));
    assert.ok(!result.body.includes('class="splash"'));
    assert.ok(result.body.includes('id="splash-first-paint"'));
    assert.ok(result.body.includes('html[data-home-splash="pending"] #root'));
    assert.ok(result.body.includes('.splash--initial {\n  display: none;'));
    assert.ok(result.body.indexOf('html.setAttribute("data-home-splash", "pending")') < result.body.indexOf('</head>'));
    assert.ok(result.body.indexOf('id="initial-splash"') < result.body.indexOf('<div id="root"'));
    assert.ok(result.body.includes('rel="preload" as="image"'));
  });
});
test('la cubierta de primer paint es exclusiva de Home, no tienda, legales, CRM ni errores', async () => {
  await withApi(async () => new Response(JSON.stringify({ data: [] })), async () => {
    for (const path of ['/tienda', '/politica-de-datos', '/terminos-y-condiciones', '/crm', '/login', '/desconocida']) {
      const result = await renderRequest(path, template, options);
      assert.ok(!result.body.includes('id="initial-splash"'), path);
      assert.ok(!result.body.includes('id="splash-first-paint"'), path);
      assert.ok(!result.body.includes('html.setAttribute("data-home-splash"'), path);
    }
  });
});
const product = { id: 1, name: 'Producto real QA', slug: 'producto-qa', is_active: true, is_visible: true, price: 10000, stock: 3, image_url: 'https://api.example.com/product.png', images: [], variants: [], vehicle_compatibilities: [], technical_specs: {} };
test('footer público termina con el logo IOI y el crédito de diseño, también en SSR', async () => {
  await withApi(async url => new Response(JSON.stringify({ data: String(url).includes('/producto-qa') ? product : [product] })), async () => {
    for (const path of ['/', '/tienda', '/tienda/producto-qa', '/politica-de-datos', '/terminos-y-condiciones']) {
      const result = await renderRequest(path, template, options);
      assert.equal(result.status, 200);
      const footer = result.body.match(/<footer class="footer">([\s\S]*?)<\/footer>/)?.[1];
      assert.ok(footer, `Footer presente en ${path}`);
      assert.equal((footer.match(/Powered by Innovative Online Industries/g) || []).length, 1);
      assert.ok(footer.indexOf('footer__credit container-wide') > footer.indexOf('footer__bottom container-wide'));
      assert.match(footer, /<img class="footer__credit-logo"[^>]*innovative-online-industries\.jpeg/);
      assert.match(footer, /alt="" width="1080" height="462" loading="lazy"/);
    }
  });
});
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
