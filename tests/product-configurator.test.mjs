import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const base = '/src/domain/productConfigurator/';
const { MEMORY_OEM_PROFILE: profile } = await vite.ssrLoadModule(base + 'types.ts');
const { resolveConfiguration: resolve } = await vite.ssrLoadModule(base + 'resolver.ts');
const { catalogSnapshot, beginCatalogLoad, acceptCatalogResponse, rejectCatalogResponse } = await vite.ssrLoadModule(base + 'catalog.ts');
const { productVehicleSelection, reconcileSelection, selectionFromShopQuery } = await vite.ssrLoadModule(base + 'selection.ts');
const { effectiveCompatibility, matchesRow } = await vite.ssrLoadModule(base + 'compatibility.ts');
const { getCompleteConfiguratorCatalog } = await vite.ssrLoadModule('/src/api/productConfigurator.ts');

// Synthetic references, not technical certification, production data or inventory writes.
const fields = ['ram_gb', 'almacenamiento_gb'].map(field_key => ({ field_key, scope: 'variant', type: 'number', filter_unit: 'GB', is_active: true }));
function row({ brand = 10, model = 20, version = 30, oem = 40, from = null, to = null, naturalFrom = 2012, naturalTo = 2018 } = {}) {
  return { vehicle_brand_id: brand, vehicle_model_id: model, vehicle_version_id: version, vehicle_multimedia_system_id: oem, year_from: from, year_to: to,
    vehicle_brand: { id: brand, name: brand === 10 ? 'BMW' : 'Toyota', is_active: true },
    vehicle_model: { id: model, vehicle_brand_id: brand, name: model === 20 ? 'Serie 3' : 'Corolla', is_active: true },
    vehicle_version: { id: version, vehicle_model_id: model, name: version === 30 ? 'F30' : 'E170', year_from: naturalFrom, year_to: naturalTo, is_active: true },
    vehicle_multimedia_system: oem == null ? null : { id: oem, vehicle_brand_id: brand, name: oem === 40 ? 'CIC' : oem === 41 ? 'NBT' : 'Toyota Touch', is_active: true } };
}
function variant(id, { ram = 8, storage = 128, rows = [row()], stock = 3, ...rest } = {}) {
  return { id, product_id: 100, name: `Kit ${id}`, sku: `TEST-${id}`, price: 1000000 + id * 10000, stock, is_active: true, is_visible: true,
    compatibility_type: 'vehicle_specific', effective_compatibility_type: 'vehicle_specific', specs: { ram_gb: ram, almacenamiento_gb: storage }, image_url: `https://images.example.test/${id}.webp`, vehicle_compatibilities: rows, ...rest };
}
function product(variants = [variant(1)], rest = {}) {
  return { id: 100, slug: 'synthetic-screen', is_active: true, is_visible: true, has_variants: true, compatibility_type: 'vehicle_specific',
    product_category: { requires_oem_compatibility: true, fields: structuredClone(fields) }, vehicle_compatibilities: [], variants, ...rest };
}
const selected = { vehicle_brand_id: 10, vehicle_model_id: 20, vehicle_version_id: 30, vehicle_multimedia_system_id: 40, ram_gb: 8, almacenamiento_gb: 128 };
function input(p = product(), selection = selected, coverage = 'complete_public') {
  return { profile, snapshot: catalogSnapshot(p, 'r1', coverage), expectedRequestKey: 'r1', selection };
}
function deepFreeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) deepFreeze(child); }
  return value;
}

test('vehículo interno único: deduplica filas OEM/rangos sin inventar año ni variante', () => {
  const p = product([variant(1, { rows: [row({ from: 2012, to: 2014 }), row({ oem: 41, from: 2015, to: 2018 })] }), variant(2)]);
  const source = deepFreeze(input(p, {}));
  const r = productVehicleSelection(source);
  assert.equal(r.vehicleContext.status, 'resolved'); assert.equal(r.vehicleContext.source, 'catalog');
  assert.deepEqual(r.selection, { vehicle_brand_id: 10, vehicle_model_id: 20, vehicle_version_id: 30 });
  assert.equal(r.selection.year, undefined); assert.equal(r.selection.variant_id, undefined);
  assert.equal(resolve({ ...input(p), selection: r.selection }).canSelectForPurchase, false);
});

test('varios vehículos sin contexto explícito no se resuelven por OEM, memoria o SKU', () => {
  const p = product([variant(1), variant(2, { rows: [row({ brand: 11, model: 21, version: 31, oem: 42 })] })]);
  for (const selection of [{}, { vehicle_multimedia_system_id: 40, ram_gb: 8, almacenamiento_gb: 128, variant_id: 1 }]) {
    const r = productVehicleSelection(input(p, selection));
    assert.equal(r.vehicleContext.status, 'ambiguous'); assert.equal(r.selection.vehicle_version_id, undefined);
  }
});

test('contexto explícito de filtros conserva vehículo y año en un catálogo multivehículo', () => {
  const p = product([variant(1), variant(2, { rows: [row({ brand: 11, model: 21, version: 31, oem: 42 })] })]);
  const selection = { vehicle_brand_id: 11, vehicle_model_id: 21, vehicle_version_id: 31, year: 2016 };
  const r = productVehicleSelection(input(p, selection));
  assert.equal(r.vehicleContext.status, 'resolved'); assert.equal(r.vehicleContext.source, 'explicit');
  assert.deepEqual(r.selection, selection);
});

test('contexto explícito ajeno no se sustituye por el vehículo único del producto', () => {
  const selection = { vehicle_brand_id: 999, vehicle_model_id: 998, vehicle_version_id: 997, year: 2016 };
  const r = productVehicleSelection(input(product(), selection));
  assert.equal(r.vehicleContext.status, 'unverified'); assert.deepEqual(r.selection, selection);
});

test('padres parciales solo se completan si determinan una tupla única registrada', () => {
  const p = product([variant(1), variant(2, { rows: [row({ brand: 11, model: 21, version: 31, oem: 42 })] })]);
  const r = productVehicleSelection(input(p, { vehicle_brand_id: 11 }));
  assert.equal(r.vehicleContext.status, 'resolved'); assert.equal(r.selection.vehicle_version_id, 31);
  p.variants.push(variant(3, { rows: [row({ version: 32 })] }));
  assert.equal(productVehicleSelection(input(p, { vehicle_brand_id: 10 })).vehicleContext.status, 'ambiguous');
});

test('no infiere unicidad de catálogo filtrado, pendiente ni respuesta obsoleta', () => {
  for (const change of [source => { source.snapshot.coverage = 'filtered'; }, source => { source.snapshot.status = 'loading'; }, source => { source.expectedRequestKey = 'new-request'; }]) {
    const source = input(product(), {}); change(source);
    const r = productVehicleSelection(source);
    assert.equal(r.vehicleContext.status, 'pending'); assert.deepEqual(r.selection, {});
  }
});

test('datos incompletos que pueden ocultar otro vehículo impiden inferir unicidad', () => {
  const p = product([variant(1), variant(2, { specs: {}, rows: [row({ brand: 11, model: 21, version: 31, oem: 42 })] })]);
  const r = productVehicleSelection(input(p, {}));
  assert.equal(r.vehicleContext.status, 'unverified'); assert.equal(r.selection.vehicle_version_id, undefined);
});

test('perfil que requiere año no lo fabrica y conserva un año aportado explícitamente', () => {
  const source = { ...input(product(), {}), profile: { ...profile, requireYear: true } };
  const missing = productVehicleSelection(source);
  assert.equal(missing.vehicleContext.status, 'year_required'); assert.equal(missing.selection.year, undefined);
  const explicit = productVehicleSelection({ ...source, selection: { year: 2016 } });
  assert.equal(explicit.vehicleContext.status, 'resolved'); assert.equal(explicit.selection.year, 2016);
});

test('BMW F30: OEM y memoria solo provienen de filas/variantes comerciales registradas', () => {
  const p = product([variant(1, { ram: 4, storage: 64 }), variant(2), variant(3, { rows: [row({ oem: 41 })], storage: 256 })]);
  const r = resolve(input(p));
  assert.equal(r.status, 'valid'); assert.equal(r.variant.variant_id, 2);
  assert.deepEqual(r.options.oems.map(o => o.vehicle_multimedia_system_id), [40, 41]);
  assert.deepEqual(r.options.memories.map(m => [m.ram_gb, m.almacenamiento_gb]), [[4, 64], [8, 128]]);
  assert.equal(resolve(input(p, { ...selected, almacenamiento_gb: 256 })).status, 'nonexistent');
  assert.equal(resolve(input(p, { ...selected, vehicle_multimedia_system_id: 41, almacenamiento_gb: 256 })).variant.variant_id, 3);
});

test('selección incompleta nunca elige la primera variante ni la principal', () => {
  const r = resolve(input(product(), {}));
  assert.equal(r.status, 'incomplete'); assert.equal(r.variant, null); assert.equal(r.canSelectForPurchase, false);
  assert.ok(r.reasons.some(reason => reason.field === 'vehicle_multimedia_system_id'));
});

test('mismo SKU físico multi-OEM y multi-vehículo conserva ID, precio y stock único', () => {
  const v = variant(7, { rows: [row(), row({ oem: 41 }), row({ brand: 11, model: 21, version: 31, oem: 42 })], stock: 5 });
  const p = product([v]);
  for (const selection of [selected, { ...selected, vehicle_multimedia_system_id: 41 }, { ...selected, vehicle_brand_id: 11, vehicle_model_id: 21, vehicle_version_id: 31, vehicle_multimedia_system_id: 42 }]) {
    const r = resolve(input(p, selection));
    assert.equal(r.status, 'valid'); assert.equal(r.candidates.length, 1);
    assert.equal(r.variant.variant_id, 7); assert.equal(r.variant.price, v.price); assert.equal(r.variant.sku, v.sku);
    assert.equal(r.variant.availability.stock, 5); assert.equal(r.options.memories.length, 1);
    assert.deepEqual(r.options.memories[0].variant_ids, [7]);
  }
});

test('filas distintas jamás cruzan generación, OEM, marca ni años', () => {
  const p = product([variant(1, { rows: [row({ oem: 40, from: 2012, to: 2014 }), row({ version: 32, oem: 41, from: 2015, to: 2018 })] })]);
  assert.equal(resolve(input(p, { ...selected, vehicle_multimedia_system_id: 41 })).status, 'nonexistent');
  assert.equal(resolve(input(p, { ...selected, year: 2015 })).status, 'nonexistent');
  assert.equal(resolve(input(p, { ...selected, vehicle_brand_id: 11 })).status, 'nonexistent');
  assert.equal(resolve(input(p, { ...selected, year: 2014 })).status, 'valid');
});

test('rangos naturales, extremos inclusivos y overrides parciales siguen el contrato Laravel', () => {
  for (const year of [2012, 2018]) assert.equal(resolve(input(product(), { ...selected, year })).status, 'valid');
  for (const year of [2011, 2019]) assert.equal(resolve(input(product(), { ...selected, year })).status, 'nonexistent');
  const p = product([variant(1, { rows: [row({ from: 2014 })] })]);
  assert.equal(resolve(input(p, { ...selected, year: 2013 })).status, 'nonexistent');
  assert.equal(resolve(input(p, { ...selected, year: 2020 })).status, 'valid'); // SQL override has open upper bound.
  const toOnly = product([variant(1, { rows: [row({ to: 2016 })] })]);
  assert.equal(resolve(input(toOnly, { ...selected, year: 2011 })).status, 'valid');
  assert.equal(resolve(input(toOnly, { ...selected, year: 2017 })).status, 'nonexistent');
});

test('un año sin metadatos naturales no se da por compatible; sin año no se inventa límite', () => {
  const r = row(); delete r.vehicle_version;
  const p = product([variant(1, { rows: [r] })]);
  assert.equal(resolve(input(p, { ...selected, year: 2015 })).status, 'insufficient_data');
  assert.equal(resolve(input(p)).status, 'valid');
  assert.equal(resolve(input(p)).options.vehicles[0].year_range_known, false);
});

test('agotada sigue siendo una opción existente, no una combinación inexistente', () => {
  const r = resolve(input(product([variant(1, { stock: 0 })])));
  assert.equal(r.status, 'out_of_stock'); assert.equal(r.canSelectForPurchase, false);
  assert.deepEqual(r.options.memories[0].variant_ids, [1]); assert.deepEqual(r.options.memories[0].available_variant_ids, []);
  assert.equal(r.candidates[0].availability.stock, 0);
});

test('stock agregado es provisional y nunca certifica surtido por sede', () => {
  const r = resolve(input(product()));
  assert.deepEqual(r.variant.availability, { stock: 3, state: 'available', source: 'public_aggregate', provisional: true, requiresFulfillmentValidation: true });
  for (const stock of [undefined, -1, Infinity, '3']) assert.equal(resolve(input(product([{ ...variant(1), stock }]))).status, 'insufficient_data');
});

test('ocultas/inactivas no se ofrecen ni habilitan compra cuando están presentes en el input', () => {
  for (const flag of ['is_active', 'is_visible']) {
    const r = resolve(input(product([variant(1, { [flag]: false })])));
    assert.equal(r.status, 'unavailable'); assert.equal(r.options.memories.length, 0); assert.equal(r.variant, null);
  }
  assert.equal(resolve(input(product([variant(1)], { is_visible: false }))).status, 'unavailable');
});

test('memoria ausente, inválida, texto con unidades y datos generales no son fallback', () => {
  for (const specs of [{}, { ram_gb: 8 }, { ram_gb: '8 GB', almacenamiento_gb: 128 }, { ram_gb: 0, almacenamiento_gb: 128 }, { ram_gb: 8, almacenamiento_gb: 1.5 }]) {
    const p = product([variant(1, { specs, name: '8/128', attributes: { ram_gb: 8 }, })], { technical_specs: { ram: 8, almacenamiento: '128' } });
    assert.equal(resolve(input(p)).status, 'insufficient_data');
  }
  assert.equal(resolve(input(product([variant(1, { ram: '8.00', storage: '128' })]))).status, 'valid');
});

test('metadatos GB numéricos, activos y de variante obligatorios; no se reinterpretan campos históricos', () => {
  for (const patch of [{ filter_unit: 'MB' }, { scope: 'product' }, { type: 'text' }, { is_active: false }]) {
    const p = product(); Object.assign(p.product_category.fields[0], patch);
    assert.equal(resolve(input(p)).status, 'insufficient_data');
  }
  const p = product(); p.product_category.fields = [];
  assert.equal(resolve(input(p)).status, 'insufficient_data');
  p.variants[0].spec_values = fields.map(field => ({ field }));
  assert.equal(resolve(input(p)).status, 'valid');
});

test('duplicidad de configuración es ambigua aunque solo una referencia tenga stock', () => {
  const p = product([variant(2, { stock: 0 }), variant(1)]);
  const r = resolve(input(p));
  assert.equal(r.status, 'ambiguous'); assert.equal(r.variant, null); assert.equal(r.canSelectForPurchase, false);
  assert.deepEqual(r.differentiators.map(v => v.variant_id), [1, 2]);
  assert.ok(r.differentiators.every(v => v.sku && v.name && v.image_url && Number.isInteger(v.price)));
  assert.equal(resolve(input(p, { ...selected, variant_id: 2 })).status, 'out_of_stock');
  assert.equal(resolve(input(p, { ...selected, variant_id: 1 })).status, 'valid');
  assert.equal(resolve(input(p, { ...selected, variant_id: 99 })).status, 'nonexistent');
});

test('una referencia activa incompleta impide afirmar unicidad de otra potencialmente igual', () => {
  assert.equal(resolve(input(product([variant(1), variant(2, { specs: {} })]))).status, 'insufficient_data');
  assert.equal(resolve(input(product([variant(1), variant(2, { specs: {} })]), { ...selected, variant_id: 1 })).status, 'valid');
});

test('herencia general con tipo null, incluso junto a filas históricas propias; jamás inventa OEM', () => {
  const inherited = variant(1, { compatibility_type: null, effective_compatibility_type: 'vehicle_specific', rows: [] });
  const general = row({ oem: null });
  const p = product([inherited], { product_category: { requires_oem_compatibility: false, fields }, vehicle_compatibilities: [general] });
  const vehicleProfile = { ...profile, compatibility: 'vehicle' };
  assert.equal(resolve({ ...input(p, { ...selected, vehicle_multimedia_system_id: null }), profile: vehicleProfile }).status, 'valid');
  assert.equal(resolve(input(p)).status, 'insufficient_data');
  assert.equal(effectiveCompatibility(p, inherited).rows.length, 1);
  const mixed = { ...p, variants: [{ ...inherited, vehicle_compatibilities: [row({ version: 32 })] }] };
  assert.equal(resolve({ ...input(mixed, { ...selected, vehicle_multimedia_system_id: null }), profile: vehicleProfile }).status, 'valid');
  assert.equal(resolve({ ...input({ ...p, variants: [variant(1, { rows: [] })] }, { ...selected, vehicle_multimedia_system_id: null }), profile: vehicleProfile }).status, 'insufficient_data');
});

test('un perfil exige año solo si lo declara; metadatos inactivos o cruzados no se reparan', () => {
  const i = input(); i.profile = { ...profile, requireYear: true };
  assert.equal(resolve(i).status, 'incomplete');
  assert.equal(resolve({ ...i, selection: { ...selected, year: 2016 } }).status, 'valid');
  const r = row(); r.vehicle_version.is_active = false;
  assert.equal(resolve(input(product([variant(1, { rows: [r] })]))).status, 'insufficient_data');
});

test('OEM null, legado o inactivo no equivalen a todos los sistemas', () => {
  const r = row({ oem: null });
  const p = product([variant(1, { rows: [r], vehicle_multimedia_system_id: 40 })]);
  assert.equal(resolve(input(p)).status, 'insufficient_data'); assert.equal(resolve(input(p)).options.oems.length, 0);
  const inactive = row(); inactive.vehicle_multimedia_system.is_active = false;
  assert.equal(resolve(input(product([variant(1, { rows: [inactive] })]))).status, 'nonexistent');
  const unknown = row(); delete unknown.vehicle_multimedia_system;
  assert.equal(resolve(input(product([variant(1, { rows: [unknown] })]))).status, 'insufficient_data');
});

test('universales permanecen separados de perfiles vehiculares/OEM', () => {
  const p = product([variant(1, { compatibility_type: 'universal', effective_compatibility_type: 'universal', rows: [] })], { compatibility_type: 'universal', product_category: { fields } });
  assert.equal(resolve(input(p)).status, 'nonexistent');
  const universal = { ...input(p, { ram_gb: 8, almacenamiento_gb: 128 }), profile: { ...profile, compatibility: 'universal' } };
  assert.equal(resolve(universal).status, 'valid'); assert.deepEqual(resolve(universal).options.vehicles, []);
  assert.equal(resolve({ ...universal, selection: selected }).status, 'nonexistent');
});

test('otra marca y generación sin condiciones específicas BMW/CIC', () => {
  const p = product([variant(1, { ram: 4, storage: 64, rows: [row({ brand: 11, model: 21, version: 31, oem: 42, naturalFrom: 2014, naturalTo: 2020 })] })]);
  const r = resolve(input(p, { vehicle_brand_id: 11, vehicle_model_id: 21, vehicle_version_id: 31, vehicle_multimedia_system_id: 42, year: 2019, ram_gb: 4, almacenamiento_gb: 64 }));
  assert.equal(r.status, 'valid'); assert.equal(r.options.oems[0].name, 'Toyota Touch');
});

test('perfiles explícitos: simples/tradicionales no se activan por categoría, nombre o IDs', () => {
  assert.equal(resolve({ ...input(), profile: null }).status, 'not_applicable');
  assert.equal(resolve(input(product([], { has_variants: false, product_category: { fields } }))).status, 'not_applicable');
  assert.equal(reconcileSelection({ ...input(), profile: null, previous: { variant_id: 1 }, patch: { ram_gb: 4 } }).selection.variant_id, 1);
  const renamed = product(); renamed.slug = 'otro-producto'; renamed.product_category.slug = 'otra-categoria';
  assert.equal(resolve(input(renamed)).status, 'valid');
});

test('cambios consecutivos OEM conservan solo memoria válida y eliminan ID obsoleto', () => {
  const p = product([variant(1), variant(2, { rows: [row({ oem: 41 })] }), variant(3, { storage: 256, rows: [row({ oem: 42 })] })]);
  let next = reconcileSelection({ ...input(p), previous: { ...selected, variant_id: 1 }, patch: { vehicle_multimedia_system_id: 41 } });
  assert.equal(next.selection.variant_id, null); assert.equal(next.selection.almacenamiento_gb, 128); assert.equal(next.resolution.variant.variant_id, 2);
  next = reconcileSelection({ ...input(p), previous: next.selection, patch: { vehicle_multimedia_system_id: 42 } });
  assert.equal(next.selection.ram_gb, 8); assert.equal(next.selection.almacenamiento_gb, null); assert.equal(next.resolution.status, 'incomplete');
  next = reconcileSelection({ ...input(p), previous: next.selection, patch: { almacenamiento_gb: 256 } });
  assert.equal(next.resolution.variant.variant_id, 3);
});

test('cambio de vehículo invalida hijos incompatibles sin inferir sistema por año', () => {
  const p = product([variant(1), variant(2, { rows: [row({ brand: 11, model: 21, version: 31, oem: 42 })] })]);
  const next = reconcileSelection({ ...input(p), previous: { ...selected, year: 2015, variant_id: 1 }, patch: { vehicle_brand_id: 11 } });
  assert.equal(next.selection.vehicle_model_id, null); assert.equal(next.selection.vehicle_version_id, null);
  assert.equal(next.selection.vehicle_multimedia_system_id, null); assert.equal(next.selection.variant_id, null);
  assert.equal(next.resolution.status, 'incomplete');
});

test('respuesta filtrada/unknown no demuestra unicidad ni inexistencia', () => {
  for (const coverage of ['filtered', 'unknown']) {
    const r = resolve(input(product(), selected, coverage));
    assert.equal(r.status, 'insufficient_data'); assert.equal(r.canSelectForPurchase, false);
    assert.ok(r.reasons.some(reason => reason.code === 'full_public_catalog_required'));
    assert.equal(resolve(input(product(), { ...selected, almacenamiento_gb: 256 }, coverage)).status, 'insufficient_data');
    assert.equal(resolve(input(product([], { has_variants: false }), selected, coverage)).status, 'insufficient_data');
  }
  const p = product([variant(1), variant(2)]);
  assert.equal(resolve(input(p)).status, 'ambiguous');
  assert.equal(resolve(input(product(undefined, { variants: undefined }))).status, 'insufficient_data');
});

test('sin variantes OEM públicas no se activa un fallback de producto simple', () => {
  assert.equal(resolve(input(product([], { has_variants: false }))).status, 'unavailable');
});

test('refresh de stock/catálogo mantiene ID agotado o ausente sin sustituirlo por otro SKU', () => {
  for (const p of [product([variant(1, { stock: 0 }), variant(2)]), product([variant(2)])]) {
    const next = reconcileSelection({ ...input(p), previous: { ...selected, variant_id: 1 }, patch: {} });
    assert.equal(next.selection.variant_id, 1);
    assert.ok(['out_of_stock', 'nonexistent'].includes(next.resolution.status));
    assert.equal(next.resolution.canSelectForPurchase, false);
  }
  const p = product([variant(1), variant(2, { rows: [row({ oem: 41 })] })]);
  const chosen = reconcileSelection({ ...input(p), previous: selected, patch: { vehicle_multimedia_system_id: 41, variant_id: 2 } });
  assert.equal(chosen.resolution.variant.variant_id, 2);
});

test('loading/error/stale no resuelven ni limpian memoria a partir de alternativas incompletas', () => {
  for (const status of ['idle', 'loading', 'error']) {
    const i = input(); i.snapshot.status = status;
    assert.equal(resolve(i).status, 'insufficient_data');
  }
  const i = input(); i.expectedRequestKey = 'new';
  assert.equal(resolve(i).reasons[0].code, 'stale_catalog');
  const next = reconcileSelection({ ...input(product(), selected, 'filtered'), previous: { ...selected, variant_id: 1 }, patch: { vehicle_multimedia_system_id: 41 } });
  assert.equal(next.selection.variant_id, null); assert.equal(next.selection.almacenamiento_gb, 128); assert.equal(next.resolution.canSelectForPurchase, false);
  const incomplete = reconcileSelection({ ...input(product([variant(1, { specs: {} })])), previous: selected, patch: {} });
  assert.equal(incomplete.selection.almacenamiento_gb, 128); assert.equal(incomplete.resolution.status, 'insufficient_data');
  assert.equal(incomplete.resolution.candidates[0].variant_id, 1);
});

test('respuestas fuera de orden o de otro producto se descartan; se preserva coverage', () => {
  const current = beginCatalogLoad('synthetic-screen', 'new');
  assert.equal(acceptCatalogResponse(current, catalogSnapshot(product(), 'old', 'complete_public')), current);
  assert.equal(acceptCatalogResponse(current, catalogSnapshot(product([], { slug: 'otro' }), 'new', 'complete_public')), current);
  const filtered = acceptCatalogResponse(current, catalogSnapshot(product(), 'new', 'filtered'));
  assert.equal(filtered.coverage, 'filtered');
  const ready = acceptCatalogResponse(current, catalogSnapshot(product(), 'new', 'complete_public'));
  assert.equal(ready.status, 'ready');
  assert.equal(rejectCatalogResponse(current, 'old'), current); assert.equal(rejectCatalogResponse(current, 'new').status, 'error');
  assert.equal(acceptCatalogResponse(ready, catalogSnapshot(product(), 'new', 'filtered')), ready);
});

test('lectura completa usa endpoint público sin query OEM, headers auth ni escrituras', async () => {
  const previous = globalThis.fetch;
  const controller = new AbortController();
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify({ data: product() }), { status: 200 }); };
  try {
    const result = await getCompleteConfiguratorCatalog('synthetic-screen', 'request-1', controller.signal);
    assert.equal(result.coverage, 'complete_public'); assert.equal(result.requestKey, 'request-1');
    assert.ok(new URL(calls[0].url, 'http://localhost').pathname.endsWith('/api/products/synthetic-screen')); // Existing public dev proxy may prefix /__public-api.
    assert.equal(new URL(calls[0].url, 'http://localhost').search, '');
    assert.equal(calls[0].options.method, 'GET'); assert.equal(calls[0].options.signal, controller.signal);
    assert.equal(calls[0].options.credentials, undefined); assert.deepEqual(calls[0].options.headers, { Accept: 'application/json' });
  } finally { globalThis.fetch = previous; }
});

test('lectura fallida/abortada no fabrica catálogo vacío ni altera selección', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ message: 'No disponible' }), { status: 503 });
    await assert.rejects(getCompleteConfiguratorCatalog('synthetic-screen', 'r1'), /No disponible/);
    globalThis.fetch = async () => { throw new DOMException('Abortado', 'AbortError'); };
    await assert.rejects(getCompleteConfiguratorCatalog('synthetic-screen', 'r1'), { name: 'AbortError' });
    globalThis.fetch = async () => new Response(JSON.stringify({ data: product([], { slug: 'wrong-product' }) }));
    await assert.rejects(getCompleteConfiguratorCatalog('synthetic-screen', 'r1'), /no corresponde/);
  } finally { globalThis.fetch = previous; }
});

test('reingreso desde filtros reutiliza parser de Tienda y conserva todos los IDs y año', () => {
  const parsed = selectionFromShopQuery('?vehicle_brand_id=10&vehicle_model_id=20&vehicle_version_id=30&vehicle_multimedia_system_id=41&year=2016');
  assert.deepEqual(parsed, { vehicle_brand_id: 10, vehicle_model_id: 20, vehicle_version_id: 30, vehicle_multimedia_system_id: 41, year: 2016 });
  assert.deepEqual(selectionFromShopQuery('?vehicle_multimedia_system_id=41'), {});
});

test('identidades repetidas no multiplican stock; conflictos fallan de forma segura', () => {
  const v = variant(1);
  assert.equal(resolve(input(product([v, structuredClone(v)]))).candidates.length, 1);
  assert.equal(resolve(input(product([v, { ...v, stock: 99 }]))).status, 'insufficient_data');
  assert.equal(resolve(input(product([variant(1, { product_id: 999 })]))).status, 'insufficient_data');
});

test('IDs inválidos, padres ausentes y metadatos de filas cruzadas no permiten compra', () => {
  for (const patch of [{ vehicle_brand_id: 0 }, { vehicle_brand_id: '10' }, { year: NaN }, { year: 1899 }, { ram_gb: true }, { vehicle_model_id: null }]) {
    const r = resolve(input(product(), { ...selected, ...patch })); assert.equal(r.canSelectForPurchase, false);
  }
  const bad = row(); bad.vehicle_multimedia_system.vehicle_brand_id = 99;
  assert.equal(resolve(input(product([variant(1, { rows: [bad] })]))).status, 'insufficient_data');
  const inconsistent = variant(1, { effective_compatibility_type: 'universal' });
  assert.equal(resolve(input(product([inconsistent]))).status, 'insufficient_data');
  assert.equal(matchesRow(row({ oem: null }), selected), false);
});

test('salida comercial es allowlist: datos internos accidentales nunca se propagan', () => {
  const r = resolve(input(product([variant(1, { cost_price: 900000, commission_amount: 100000, profit_amount: 100000, initial_stock: 100 })])));
  for (const key of ['cost_price', 'commission_amount', 'profit_amount', 'initial_stock']) assert.ok(!JSON.stringify(r).includes(key));
  assert.deepEqual(Object.keys(r.variant).sort(), ['product_id', 'variant_id', 'name', 'sku', 'price', 'image_url', 'ram_gb', 'almacenamiento_gb', 'availability'].sort());
});

test('funciones puras/deterministas aptas SSR: no mutan fixtures congeladas ni usan DOM/storage', () => {
  const i = deepFreeze(input(product([variant(1), variant(2, { rows: [row({ oem: 41 })] })])));
  assert.deepEqual(resolve(i), resolve(i));
  const previous = deepFreeze({ ...selected, variant_id: 1 });
  const a = reconcileSelection({ ...i, previous, patch: { vehicle_multimedia_system_id: 41 } });
  assert.deepEqual(previous, { ...selected, variant_id: 1 }); assert.equal(a.resolution.variant.variant_id, 2);
});
