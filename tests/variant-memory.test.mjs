import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const readiness = await vite.ssrLoadModule('/src/modules/admin/inventory/product-form/variantTechnicalReadiness.ts');
const { ProductDynamicFields } = await vite.ssrLoadModule('/src/modules/admin/inventory/product-form/ProductDynamicFields.tsx');
const formUtils = await vite.ssrLoadModule('/src/modules/admin/inventory/product-form/productFormUtils.ts');

test('memoria estructurada es opcional al guardar pero completa para preparación', () => {
  assert.deepEqual(readiness.memorySpecErrors({}), {});
  const result = readiness.assessVariantTechnicalReadiness({}, false, 'universal', []);
  assert.equal(result.structurally_ready, false);
  assert.deepEqual(Object.keys(result.issues), ['ram_gb', 'almacenamiento_gb']);
});

test('valida GB enteros positivos sin deducir nombres, booleanos ni unidades escritas', () => {
  for (const value of [4, '8', '256', '8.0']) assert.equal(readiness.isValidMemoryGb(value), true);
  for (const value of ['', '8 GB', true, null, 0, -1, 1.5, Infinity, '0x8', 10000000000]) assert.equal(readiness.isValidMemoryGb(value), false, String(value));
});

test('preparación OEM exige una fila completa; herencia universal no la sustituye', () => {
  const specs = { ram_gb: 8, almacenamiento_gb: 256 };
  const row = { vehicle_brand_id: '1', vehicle_model_id: '2', vehicle_version_id: '3', vehicle_multimedia_system_id: '4' };
  assert.equal(readiness.assessVariantTechnicalReadiness(specs, true, 'vehicle_specific', [row]).structurally_ready, true);
  assert.equal(readiness.assessVariantTechnicalReadiness(specs, true, 'vehicle_specific', [{ ...row, vehicle_multimedia_system_id: '' }]).structurally_ready, false);
  assert.equal(readiness.assessVariantTechnicalReadiness(specs, true, 'universal', [row]).structurally_ready, false);
  assert.equal(readiness.assessVariantTechnicalReadiness(specs, false, 'universal', []).certifies_physical_compatibility, false);
});

test('controles CRM renderizan unidades GB y límites solo en los campos nuevos', () => {
  const fields = ['ram_gb', 'almacenamiento_gb'].map((field_key, i) => ({ id: i + 1, field_key, name: i ? 'Almacenamiento' : 'RAM', type: 'number', scope: 'variant', filter_unit: 'GB', is_required: false }));
  const html = renderToStaticMarkup(createElement(ProductDynamicFields, { fields, values: { ram_gb: 8 }, errorPrefix: 'variants.0.specs', onChange: () => {}, variantMemory: true }));
  assert.match(html, /RAM \(GB\)/); assert.match(html, /Almacenamiento \(GB\)/);
  assert.equal((html.match(/min="1"/g) ?? []).length, 2);
  assert.ok(!html.includes('required=""'));
  const legacy = renderToStaticMarkup(createElement(ProductDynamicFields, { fields: [{...fields[0], field_key: 'ram', scope: 'product'}], values: {}, errorPrefix: 'productSpecs', onChange: () => {} }));
  assert.ok(!legacy.includes('min="1"'));
});

test('el formulario distingue limpiar explícitamente de omitir una especificación', () => {
  const variant = {...formUtils.emptyVariant(0), name: 'Referencia', specs: {ram_gb: '', almacenamiento_gb: 128, kit: 'A'}};
  const body = formUtils.buildProductFormData({form: {...formUtils.emptyProductForm}, productFields: [], technicalSpecs: {}, generalCompatibilities: [], variants: [variant], images: []});
  assert.equal(body.get('variants[0][specs][ram_gb]'), '');
  assert.equal(body.get('variants[0][specs][almacenamiento_gb]'), '128');
  assert.equal(body.get('variants[0][specs][kit]'), 'A');
  assert.equal(body.has('variants[0][specs][campo_omitido]'), false);
});

test('serialización mantiene memoria independiente por ID sin copiar especificaciones generales', () => {
  const variants = [
    { ...formUtils.emptyVariant(0), id: 501, name: 'Kit A', sku: 'TEST-A', specs: { ram_gb: 4, almacenamiento_gb: 64 }, price: '1000000' },
    { ...formUtils.emptyVariant(1), id: 502, name: 'Kit B', sku: 'TEST-B', specs: { ram_gb: 8, almacenamiento_gb: 256 }, price: '1200000' },
    { ...formUtils.emptyVariant(2), id: 503, name: 'Nombre libre 8/128', specs: {} },
  ];
  const body = formUtils.buildProductFormData({ form: { ...formUtils.emptyProductForm }, productFields: [
    { field_key: 'ram', type: 'number', scope: 'product' },
    { field_key: 'almacenamiento', type: 'text', scope: 'product' },
  ], technicalSpecs: { ram: 2, almacenamiento: 'Histórico general' }, generalCompatibilities: [], variants, images: [] });
  assert.equal(body.get('technical_specs[ram]'), '2');
  assert.equal(body.get('technical_specs[almacenamiento]'), 'Histórico general');
  for (const [index, variant] of variants.entries()) {
    assert.equal(body.get(`variants[${index}][id]`), String(variant.id));
    for (const [key, value] of Object.entries(variant.specs)) assert.equal(body.get(`variants[${index}][specs][${key}]`), String(value));
    assert.equal(body.has(`variants[${index}][specs][ram]`), false);
  }
  assert.equal(body.has('variants[2][specs][ram_gb]'), false);
  assert.equal(body.has('variants[2][specs][almacenamiento_gb]'), false);
});
