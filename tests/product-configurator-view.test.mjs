import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { configurableProduct, traditionalProduct } from './fixtures/configurator-products.mjs';
const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { ProductDetailPage } = await vite.ssrLoadModule('/src/pages/ProductDetail/ProductDetailPage.tsx');
const { CartProvider } = await vite.ssrLoadModule('/src/context/CartContext.tsx');
const { supportedConfiguration } = await vite.ssrLoadModule('/src/pages/ProductDetail/useProductConfigurator.ts');
const { ProductConfigurator } = await vite.ssrLoadModule('/src/pages/ProductDetail/ProductConfigurator.tsx');
const { ConfigurationOptions } = await vite.ssrLoadModule('/src/pages/ProductDetail/ConfigurationOptions.tsx');
const render = product => renderToString(createElement(CartProvider, null, createElement(ProductDetailPage, { slug: product.slug, initialProduct: product, query: '' })));

test('ficha SSR configurable muestra pasos deterministas, ayuda y compra bloqueada', () => {
  const p = configurableProduct();
  const first = render(p), second = render(p);
  assert.equal(first, second);
  assert.match(first, /1 · Sistema original/); assert.match(first, /2 · RAM y almacenamiento/);
  assert.match(first, /3 · Configuración seleccionada/); assert.ok(!first.includes('<select')); assert.ok(!first.includes('Año del vehículo'));
  assert.match(first, /¿No sabes qué sistema original tiene tu vehículo\?/);
  assert.match(first, /Compra online no habilitada/); assert.ok(!first.includes('Versión del producto'));
  assert.match(first, /class="product-detail__button"[^>]*disabled/);
});
test('registro deshabilitado/desconocido/datos incompletos no vuelve al selector tradicional', () => {
  for (const scenario of ['disabled', 'unsupported', 'incomplete']) {
    const html = render(configurableProduct(scenario));
    assert.ok(!html.includes('Versión del producto')); assert.match(html, /Compra online no habilitada/);
    assert.match(html, /class="product-detail__button"[^>]*disabled/);
  }
  assert.equal(supportedConfiguration({ ...configurableProduct().configuration, schema_version: 2 }), null);
});
test('producto simple y variantes tradicionales conservan sus controles e identidad comercial', () => {
  const traditional = render(traditionalProduct()), simple = render(traditionalProduct(true));
  assert.match(traditional, /Versión del producto/); assert.ok(!traditional.includes('product-configurator'));
  assert.ok(!simple.includes('Versión del producto')); assert.ok(!simple.includes('product-configurator'));
  assert.match(simple, /Agregar al carrito/);
});
test('metadata de compra habilitada no omite la lectura completa ni la selección válida después de hidratar', () => {
  const p = configurableProduct(); p.configuration.purchase_enabled = true;
  const html = render(p);
  assert.match(html, /class="product-detail__button"[^>]*disabled/); assert.match(html, /Compra online no habilitada/);
});

const panelModel = (status, extra = {}) => ({ uiEnabled: true, selection: {}, resolution: { status, options: { vehicles: [], oems: [], memories: [] }, candidates: [], differentiators: [] },
  loadStatus: 'ready', failure: null, fullProduct: null, selectedVariant: null, referenceOptions: [], vehicleMemoryOptions: [],
  vehicleContext: { status: 'unverified', source: null }, cleared: [], select: () => {}, retry: () => {}, ...extra });
test('panel distingue estados del resolvedor y conserva controles etiquetados', () => {
  for (const [status, text] of Object.entries({ incomplete: 'Completa el sistema original', nonexistent: 'Esta combinación no existe', out_of_stock: 'está agotada', unavailable: 'no está disponible para compra', insufficient_data: 'Faltan datos verificados', ambiguous: 'Hay varias referencias', valid: 'Configuración identificada' })) {
    const html = renderToString(createElement(ProductConfigurator, { model: panelModel(status), product: configurableProduct(), interactive: false }));
    assert.ok(html.includes(text)); assert.ok(html.includes(`data-configuration-status="${status}"`));
    assert.ok(!html.includes('Marca, modelo y generación')); assert.ok(!html.includes('<input')); assert.match(html, /<fieldset disabled/);
  }
});
test('conexión, contrato incompleto y producto retirado tienen diagnósticos distintos', () => {
  for (const [failure, status, text] of [['connection','connection_error','Comprueba tu conexión'],['configuration','insufficient_data','No pudimos verificar los datos'],['unavailable','unavailable','ya no está disponible en el catálogo público']]) {
    const html = renderToString(createElement(ProductConfigurator, { model: panelModel('insufficient_data', { loadStatus: 'error', failure }), product: configurableProduct(), interactive: true }));
    assert.ok(html.includes(text)); assert.ok(html.includes(`data-configuration-status="${status}"`));
    assert.match(html, /Reintentar configuraciones/);
  }
});

test('opciones accesibles usan botones de tipo button con selección y bloqueo explícitos', () => {
  const html = renderToString(createElement(ConfigurationOptions, { label: 'Memoria', value: '8/128', onSelect: () => {}, emptyMessage: 'Sin opciones', options: [
    { value: '8/128', label: '8 GB / 128 GB' },
    { value: '8/256', label: '8 GB / 256 GB', disabled: true, detail: 'No disponible para este sistema' },
    { value: '4/64', label: '4 GB / 64 GB', soldOut: true, detail: 'Agotada · consultar referencia' },
  ] }));
  assert.match(html, /role="group" aria-label="Memoria"/);
  assert.match(html, /data-option-value="8\/128"[^>]*aria-pressed="true"/);
  assert.match(html, /data-option-value="8\/256"[^>]*aria-pressed="false"[^>]*disabled/);
  assert.match(html, /data-option-value="4\/64"[^>]*data-sold-out="true"/);
  assert.equal((html.match(/type="button"/g) ?? []).length, 3);
  assert.ok(!html.includes('<select'));
});

test('panel presenta solo pares reales del resolvedor y deshabilita los incompatibles, sin dropdown OEM/memoria/referencia', () => {
  const product = configurableProduct();
  const vehicle = { vehicle_brand_id: 10, vehicle_model_id: 20, vehicle_version_id: 30 };
  const model = panelModel('valid', { fullProduct: product, selection: { ...vehicle, vehicle_multimedia_system_id: 40, ram_gb: 8, almacenamiento_gb: 128 },
    vehicleContext: { status: 'resolved', source: 'catalog' }, selectedVariant: product.variants[1],
    resolution: { status: 'valid', candidates: [], options: { vehicles: [vehicle], oems: [{ vehicle_multimedia_system_id: 40, name: 'CIC', available_variant_ids: [2] }],
      memories: [{ ram_gb: 8, almacenamiento_gb: 128, available_variant_ids: [2] }] } },
    vehicleMemoryOptions: [{ ram_gb: 8, almacenamiento_gb: 128 }, { ram_gb: 8, almacenamiento_gb: 256 }],
    referenceOptions: [{ variant_id: 2, name: 'Kit A', sku: 'QA-A', availability: { state: 'available' } }, { variant_id: 7, name: 'Kit B', sku: 'QA-B', availability: { state: 'available' } }],
  });
  const html = renderToString(createElement(ProductConfigurator, { model, product, interactive: true }));
  assert.match(html, /role="group" aria-label="Sistema OEM"/);
  assert.match(html, /role="group" aria-label="Configuración de memoria"/);
  assert.match(html, /role="group" aria-label="Elige la referencia exacta"/);
  assert.match(html, /data-option-value="8\/128"[^>]*aria-pressed="true"/);
  assert.match(html, /data-option-value="8\/256"[^>]*disabled/);
  assert.ok(!html.includes('4 GB / 64 GB')); // Not provided by the resolver for this view.
  assert.equal((html.match(/<select\b/g) ?? []).length, 0);
  assert.ok(!html.includes('product-detail__price')); assert.ok(!html.includes('product-detail__sku'));
  assert.ok(!html.includes('product-configurator__facts')); // Commercial information belongs to one parent block.
  assert.ok(!html.includes('data-option-value="2" aria-pressed="true"')); // Ambiguity never auto-picks a kit.
});

test('contexto multivehículo o año pendiente bloquea opciones y permite verificar desde tienda', () => {
  for (const [status,text] of [['ambiguous','varios vehículos'],['year_required','año verificado'],['unverified','No pudimos confirmar']]) {
    const html = renderToString(createElement(ProductConfigurator, { model: panelModel('incomplete', { vehicleContext: { status, source: null } }), product: configurableProduct(), interactive: true }));
    assert.ok(html.includes(text)); assert.match(html, /href="\/tienda"/); assert.ok(!html.includes('<select')); assert.ok(!html.includes('<input'));
    assert.match(html, /<fieldset disabled/); assert.ok(!html.includes('data-option-value='));
  }
});
