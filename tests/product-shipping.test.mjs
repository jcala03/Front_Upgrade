import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => vite.close());
const shipping = await vite.ssrLoadModule('/src/modules/admin/inventory/product-form/productShipping.ts');
const utils = await vite.ssrLoadModule('/src/modules/admin/inventory/product-form/productFormUtils.ts');
const { ProductShippingFields, ShippingReadiness } = await vite.ssrLoadModule('/src/modules/admin/inventory/product-form/ProductShippingFields.tsx');
const complete = { weight_grams: '100', length_cm: '10', width_cm: '10', height_cm: '10' };
const payload = (form = {}, variants = []) => utils.buildProductFormData({ form: { ...utils.emptyProductForm, ...form }, variants, productFields: [], technicalSpecs: {}, generalCompatibilities: [], images: [] });

test('paquete nuevo sin valores inventados; Backspace conserva vacíos y no crea cero', () => {
  assert.deepEqual(shipping.emptyShippingDraft(), { weight_grams: '', length_cm: '', width_cm: '', height_cm: '' });
  assert.deepEqual(shipping.shippingDraftErrors(shipping.emptyShippingDraft()), {});
  for (const value of Object.values(shipping.shippingPayload(shipping.emptyShippingDraft()))) assert.equal(value, null);
  assert.equal(payload().get('weight_grams'), '');
  assert.equal(shipping.shippingReadiness(shipping.emptyShippingDraft()).complete, false);
});

test('100 g y 10 cm se envían en gramos y milímetros por el contrato actual', () => {
  const body = payload(complete);
  for (const key of ['weight_grams', 'length_mm', 'width_mm', 'height_mm']) assert.equal(body.get(key), '100');
  assert.equal(body.has('length_cm'), false);
});

test('conversión decimal exacta sin redondeos silenciosos', () => {
  for (const [input, mm] of [['0.1', 1], ['.5', 5], ['10.2', 102], ['1.10', 11], ['10.', 100], ['12.30', 123], ['429496729.5', 4294967295]]) {
    assert.equal(shipping.parseShippingValue(input, 'length_cm'), mm, input);
  }
  for (const input of ['1.01', '0.01', '10.25', '429496729.6']) assert.equal(shipping.parseShippingValue(input, 'width_cm'), null, input);
  for (const input of ['1.1', '0.1', '4294967296']) assert.equal(shipping.parseShippingValue(input, 'weight_grams'), null, input);
  assert.equal(shipping.parseShippingValue('100.00', 'weight_grams'), 100);
});

test('rechaza NaN, Infinity, exponentes, negativos, cero, hex y texto sin serializarlos', () => {
  for (const value of ['0', '-1', 'Infinity', 'NaN', '1e3', '0x10', '100g', '10,2', ' ', '+1', '9999999999999999999']) {
    const draft = { ...complete, weight_grams: value };
    assert.ok(shipping.shippingDraftErrors(draft).weight_grams, value);
    assert.throws(() => shipping.shippingPayload(draft), /Revisa los datos/);
    assert.throws(() => payload(draft), /Revisa los datos/);
  }
});

test('edición hidrata medidas históricas y conserva sus valores exactos al guardar', () => {
  const historical = { weight_grams: 1520, length_mm: 323, width_mm: 215, height_mm: 101 };
  const draft = shipping.shippingToDraft(historical);
  assert.deepEqual(draft, { weight_grams: '1520', length_cm: '32.3', width_cm: '21.5', height_cm: '10.1' });
  assert.deepEqual(shipping.shippingPayload(draft), historical);
  const form = utils.productToFormState({ ...historical, name: 'Histórico', requires_shipping: false });
  assert.equal(form.requires_shipping, false);
  assert.equal(form.length_cm, '32.3');
  assert.equal(payload(form).has('requires_shipping'), false, 'no alterar el tipo de envío existente');
});

test('variante nueva hereda sin duplicar medidas generales en SQL', () => {
  const variant = { ...utils.emptyVariant(0), id: 901, name: 'A' };
  const body = payload(complete, [variant]);
  for (const key of ['weight_grams', 'length_mm', 'width_mm', 'height_mm']) assert.equal(body.get(`variants[0][${key}]`), '');
  assert.equal(shipping.shippingReadiness(variant, complete).complete, true);
});

test('hidratación usa valores propios, nunca effective_logistics', () => {
  const variant = shipping.variantShippingToDraft({ weight_grams: null, length_mm: null, width_mm: null, height_mm: null,
    effective_logistics: { weight_grams: 1000, length_mm: 500, width_mm: 400, height_mm: 200 } });
  assert.equal(variant.use_general_shipping, true);
  assert.equal(variant.weight_grams, '');
});

test('conserva overrides históricos parciales y hereda únicamente los campos nulos', () => {
  const variant = { ...utils.emptyVariant(0), ...shipping.variantShippingToDraft({ weight_grams: 200, length_mm: null, width_mm: 120, height_mm: null }), id: 902, name: 'B' };
  assert.equal(variant.use_general_shipping, false);
  const body = payload(complete, [variant]);
  assert.equal(body.get('variants[0][weight_grams]'), '200');
  assert.equal(body.get('variants[0][length_mm]'), '');
  assert.equal(body.get('variants[0][width_mm]'), '120');
  assert.equal(shipping.shippingReadiness(variant, complete).complete, true);
});

test('variantes mantienen sus medidas independientes y IDs comerciales', () => {
  const variants = [
    { ...utils.emptyVariant(0), ...complete, id: 901, sku: 'A', price: '100000', use_general_shipping: false },
    { ...utils.emptyVariant(1), ...complete, id: 902, sku: 'B', price: '120000', weight_grams: '200', length_cm: '12.5', use_general_shipping: false },
  ];
  const body = payload(complete, variants);
  assert.equal(body.get('variants[0][weight_grams]'), '100');
  assert.equal(body.get('variants[1][weight_grams]'), '200');
  assert.equal(body.get('variants[1][length_mm]'), '125');
  assert.equal(body.get('variants[1][id]'), '902');
  assert.equal(body.get('variants[1][sku]'), 'B');
  assert.equal(body.get('variants[1][price]'), '120000');
});

test('activar herencia limpia explícitamente overrides sin modificar los borradores', () => {
  const variant = { ...utils.emptyVariant(0), ...complete, weight_grams: '200', use_general_shipping: true };
  assert.equal(payload(complete, [variant]).get('variants[0][weight_grams]'), '');
  assert.equal(variant.weight_grams, '200');
  assert.equal(payload(complete, [{ ...variant, use_general_shipping: false }]).get('variants[0][weight_grams]'), '200');
});

test('cambiar embalaje no modifica precios, SKU, OEM, estados ni inventario del payload', () => {
  const variant = { ...utils.emptyVariant(0), id: 901, name: 'Referencia', sku: 'SKU-1', price: '100000', use_general_compatibility: false,
    vehicle_compatibilities: [{ vehicle_brand_id: '1', vehicle_model_id: '2', vehicle_version_id: '3', vehicle_multimedia_system_id: '4', year_from: '2015', year_to: '2017', notes: '' }] };
  const before = payload({ price: '100000', sku: 'PRINCIPAL' }, [variant]);
  const after = payload({ ...complete, price: '100000', sku: 'PRINCIPAL' }, [{ ...variant, ...complete, use_general_shipping: false }]);
  const nonShipping = body => [...body.entries()].filter(([key]) => !/(?:weight_grams|length_mm|width_mm|height_mm)/.test(key));
  assert.deepEqual(nonShipping(after), nonShipping(before));
  assert.equal([...after.keys()].some(key => /stock|inventory/.test(key)), false);
});

test('estado incompleto informa campos faltantes sin prometer domicilio garantizado', () => {
  const status = renderToStaticMarkup(createElement(ShippingReadiness, { draft: { ...complete, weight_grams: '' } }));
  assert.match(status, /Pendiente para cotizar envío: Peso embalado/);
  assert.match(status, /Puedes guardar/);
  const ready = renderToStaticMarkup(createElement(ShippingReadiness, { draft: complete }));
  assert.match(ready, /depende del destino, la sede de despacho y la cobertura/);
});

test('campos accesibles con teclado móvil, unidades y mensajes vinculados', () => {
  const html = renderToStaticMarkup(createElement(ProductShippingFields, { draft: complete, errors: { 'variants.0.length_mm': 'Medida inválida' }, errorPrefix: 'variants.0.', general: complete, onChange: () => {} }));
  assert.equal((html.match(/type="number"/g) ?? []).length, 4);
  assert.equal((html.match(/inputMode="decimal"/g) ?? []).length, 3);
  assert.match(html, /inputMode="numeric"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby=/);
  assert.match(html, /Medida inválida/);
  assert.match(html, /Los campos vacíos heredan/);
  assert.ok(!html.includes('required=""'), 'datos opcionales históricos no bloquean otras ediciones');
});
