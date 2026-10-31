import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { configurableProduct, traditionalProduct } from './fixtures/configurator-products.mjs';
const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { productCompatibilitySummary, specificationFacts, isQaProduct } = await vite.ssrLoadModule('/src/pages/ProductDetail/productPresentation.ts');
const { ProductDetailPage } = await vite.ssrLoadModule('/src/pages/ProductDetail/ProductDetailPage.tsx');
const { ProductConfigurationSummary } = await vite.ssrLoadModule('/src/pages/ProductDetail/ProductConfigurator.tsx');
const { CartProvider } = await vite.ssrLoadModule('/src/context/CartContext.tsx');

test('resumen vehicular deduplica OEM y presenta solo rangos realmente registrados', () => {
  const p = configurableProduct();p.variants = p.variants.slice(0, 5);
  assert.equal(productCompatibilitySummary(p), 'Compatible con BMW Serie 3 F30 (2012–2018)');
  const variant = structuredClone(p.variants[0]);variant.vehicle_compatibilities[0].year_from = 2014;variant.vehicle_compatibilities[0].year_to = 2016;
  assert.equal(productCompatibilitySummary(p, variant), 'Compatible con BMW Serie 3 F30 (2014–2016)');
  delete variant.vehicle_compatibilities[0].vehicle_version.year_from;delete variant.vehicle_compatibilities[0].vehicle_version.year_to;
  variant.vehicle_compatibilities[0].year_from = null;variant.vehicle_compatibilities[0].year_to = null;
  assert.equal(productCompatibilitySummary(p, variant), 'Compatible con BMW Serie 3 F30');
});
test('resumen multivehículo o multirrango no selecciona uno ni fusiona rangos', () => {
  const p = configurableProduct();
  assert.equal(productCompatibilitySummary(p), 'Compatibilidad con 2 vehículos registrados. Verifica tu referencia.');
  p.variants = p.variants.slice(0, 2);
  p.variants[1].vehicle_compatibilities[0].year_from = 2015;p.variants[1].vehicle_compatibilities[0].year_to = 2017;
  assert.equal(productCompatibilitySummary(p), 'Compatible con BMW Serie 3 F30');
  assert.equal(productCompatibilitySummary({ ...p, variants: [] }), 'Verifica la compatibilidad con el taller antes de comprar.');
  assert.equal(productCompatibilitySummary({ ...p, is_universal: true, compatibility_type: 'universal' }), 'Compatibilidad universal');
});
test('especificaciones comerciales traducen claves, unidades y precedencia sin mutar datos', () => {
  const p = configurableProduct(), v = p.variants[1];
  p.technical_specs = { ram_gb: 2, almacenamiento_gb: '64 GB', pantalla_pulgadas: 10.1, bluetooth: true };
  p.product_category.fields.push({ field_key: 'pantalla_pulgadas', name: 'Pantalla', filter_unit: 'pulgadas' });
  const original = JSON.stringify(p);
  const facts = specificationFacts(p, v);
  assert.deepEqual(facts.filter(([name]) => ['RAM', 'Almacenamiento'].includes(name)), [['RAM', '8 GB'], ['Almacenamiento', '128 GB']]);
  assert.ok(facts.some(([name, value]) => name === 'Pantalla' && value === '10.1 pulgadas'));
  assert.ok(facts.some(([name, value]) => name === 'Bluetooth' && value === 'Sí'));
  assert.ok(facts.every(([name]) => !name.includes('_')));
  assert.equal(JSON.stringify(p), original);
  assert.ok(specificationFacts(p).some(([name, value]) => name === 'Almacenamiento' && value === '64 GB'));
});
test('los metadatos históricos muestran GB una sola vez y sin ceros decimales artificiales', () => {
  const p = configurableProduct();p.technical_specs = {};
  p.spec_values = [{ field: { field_key: 'ram_gb', name: 'RAM', filter_unit: 'GB' }, value_number: '4.00' }];
  assert.deepEqual(specificationFacts(p), [['RAM', '4 GB']]);
});
test('avisos QA requieren marcador explícito y no alteran nombres ni imágenes', () => {
  const p = traditionalProduct(true);p.name = 'QA LOCAL — Ensayo';
  assert.equal(isQaProduct(p), true);
  assert.equal(isQaProduct({ ...p, name: 'Pantalla Android', description: 'QA SINTÉTICO · solo local' }), true);
  assert.equal(isQaProduct({ ...p, name: 'Pantalla Android', description: null }), false);
});
test('ficha SSR ordena configuración antes de una única compra y conserva información secundaria accesible', () => {
  for (const p of [configurableProduct(), traditionalProduct(), traditionalProduct(true)]) {
    const html = renderToString(createElement(CartProvider, null, createElement(ProductDetailPage, { slug: p.slug, initialProduct: p, query: '' })));
    assert.equal((html.match(/class="product-detail__price"/g) ?? []).length, 1);
    assert.equal((html.match(/class="product-detail__stock"/g) ?? []).length, 1);
    assert.equal((html.match(/class="product-detail__commercial"/g) ?? []).length, 1);
    for (const label of ['Descripción', 'Compatibilidad', 'Antes de comprar']) assert.ok(html.includes(`<summary>${label}</summary>`));
    assert.ok(html.indexOf('product-detail__compatibility-summary') < html.indexOf('product-detail__commercial'));
    if (p.configuration) {
      assert.ok(html.indexOf('class="product-configurator"') < html.indexOf('class="product-detail__price"'));
      assert.ok(!html.includes('SKU QA-PARENT')); // Parent reference must not masquerade as a configured SKU.
    }
  }
});
test('resumen elegido no repite vehículo, SKU, precio o stock del bloque comercial', () => {
  const model = { selection: { vehicle_multimedia_system_id: 40, ram_gb: 8, almacenamiento_gb: 128 },
    resolution: { options: { oems: [{ vehicle_multimedia_system_id: 40, name: 'CIC' }] } } };
  const html = renderToString(createElement(ProductConfigurationSummary, { model }));
  assert.match(html, /3 · Configuración seleccionada/);assert.match(html, /CIC · 8 GB \/ 128 GB/);
  assert.ok(!/SKU|Precio|Disponibilidad|BMW/.test(html));assert.ok(!html.includes('Año'));
});
