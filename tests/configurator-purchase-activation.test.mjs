import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { configurableProduct } from './fixtures/configurator-products.mjs';
const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => vite.close());
const { resolveConfiguration } = await vite.ssrLoadModule('/src/domain/productConfigurator/resolver.ts');
const { catalogSnapshot } = await vite.ssrLoadModule('/src/domain/productConfigurator/catalog.ts');
const { MEMORY_OEM_PROFILE, REFERENCE_OEM_PROFILE } = await vite.ssrLoadModule('/src/domain/productConfigurator/types.ts');
const { addCartItem } = await vite.ssrLoadModule('/src/domain/cartLines.ts');
const { purchaseConfiguration } = await vite.ssrLoadModule('/src/types/productConfiguration.ts');
const vehicle = { vehicle_brand_id: 10, vehicle_model_id: 20, vehicle_version_id: 30, vehicle_multimedia_system_id: 40 };
function reviewedProduct() {
  const p = structuredClone(configurableProduct('multi-oem'));
  p.variants = p.variants.slice(0, 2);
  for (const v of p.variants) for (const row of v.vehicle_compatibilities)
    row.oem_year_ranges = [{ year_from: row.vehicle_multimedia_system_id === 40 ? 2012 : 2014, year_to: row.vehicle_multimedia_system_id === 40 ? 2013 : 2018 }];
  p.configuration = { ...p.configuration, purchase_enabled: true, purchasable_variant_ids: [1, 2], year_optional_variant_ids: [1, 2] };
  return p;
}
function resolve(p, selection, profile = MEMORY_OEM_PROFILE) {
  return resolveConfiguration({ profile, snapshot: catalogSnapshot(p, 'fresh', 'complete_public'), expectedRequestKey: 'fresh', selection });
}
test('reviewed OEM and manual memory resolve the exact approved SKU without inventing a year', () => {
  for (const [ram_gb, almacenamiento_gb, id] of [[4,64,1],[8,128,2]]) {
    const p = reviewedProduct(), result = resolve(p, { ...vehicle, ram_gb, almacenamiento_gb });
    assert.equal(result.status, 'valid'); assert.equal(result.variant.variant_id, id);
    assert.equal(result.yearRequired, false); assert.equal(result.variant.price, p.variants[id - 1].price);
  }
});
test('same physical SKU retains independent OEM contexts and shared stock', () => {
  const p = reviewedProduct(), v = p.variants[1];
  let cart = [];
  for (const oem of [40,41]) {
    const selection = { ...vehicle, vehicle_multimedia_system_id: oem, ram_gb: 8, almacenamiento_gb: 128 };
    assert.equal(resolve(p, selection).variant.variant_id, v.id);
    const context = { ...selection, schema_version: 1, profile_id: MEMORY_OEM_PROFILE.id, profile_version: 1, year: null };
    cart = addCartItem(cart, p, 1, v, context);
  }
  assert.equal(cart.length, 2); assert.equal(cart[0].variant.id, cart[1].variant.id);
  assert.deepEqual(cart.map(line => purchaseConfiguration(line.configuration_context).year), [null,null]);
  assert.deepEqual(cart.map(line => line.configuration_context.vehicle_multimedia_system_id), [40,41]);
});
test('missing server authority never silently waives a year or approves a physical reference', () => {
  const selected = { ...vehicle, ram_gb: 4, almacenamiento_gb: 64 };
  for (const mutate of [p => delete p.configuration.year_optional_variant_ids, p => p.configuration.year_optional_variant_ids = [],
    p => p.configuration.purchasable_variant_ids = [], p => p.configuration.purchase_enabled = false]) {
    const p = reviewedProduct(); mutate(p);
    assert.equal(resolve(p, selected).status, 'incomplete');
  }
  const p = reviewedProduct(); p.configuration.purchasable_variant_ids = [2]; p.configuration.year_optional_variant_ids = [2];
  assert.equal(resolve(p, { ...vehicle, ram_gb: 8, almacenamiento_gb: 128 }).status, 'valid');
  assert.equal(resolve(p, selected).status, 'incomplete');
});
test('supplied years and commercial year limits remain mandatory and are never repaired', () => {
  const p = reviewedProduct(), selected = { ...vehicle, ram_gb: 4, almacenamiento_gb: 64 };
  assert.equal(resolve(p, { ...selected, year: 2013 }).status, 'valid');
  assert.equal(resolve(p, { ...selected, year: 2014 }).status, 'nonexistent');
  p.variants[0].vehicle_compatibilities[0].year_from = 2012;
  p.variants[0].vehicle_compatibilities[0].year_to = 2013;
  assert.equal(resolve(p, selected).status, 'incomplete');
});
test('approval cannot bypass absent, unavailable, incompatible or exhausted variants', () => {
  const selected = { ...vehicle, ram_gb: 4, almacenamiento_gb: 64 };
  for (const [change,status] of [[{stock:0},'out_of_stock'],[{is_active:false},'unavailable'],[{is_visible:false},'unavailable']]) {
    const p = reviewedProduct(); Object.assign(p.variants[0], change);
    assert.equal(resolve(p, { ...selected, variant_id: 1 }).status, status);
  }
  assert.equal(resolve(reviewedProduct(), { ...selected, variant_id: 999 }).status, 'nonexistent');
  assert.equal(resolve(reviewedProduct(), { ...selected, vehicle_multimedia_system_id: 99 }).status, 'nonexistent');
});
test('Linux keeps the established explicit year and commercial reference validation', () => {
  const p = reviewedProduct(); p.variants = p.variants.slice(0,1);
  p.configuration.profile_id = REFERENCE_OEM_PROFILE.id;
  assert.equal(resolve(p, vehicle, REFERENCE_OEM_PROFILE).status, 'incomplete');
  assert.equal(resolve(p, { ...vehicle, year: 2013, variant_id: 1 }, REFERENCE_OEM_PROFILE).status, 'valid');
});
