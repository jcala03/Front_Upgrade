export const registration = { schema_version: 1, required: true, profile_id: 'vehicle-oem-memory-v1', profile_version: 1, ui_enabled: true, purchase_enabled: false };
const fields = ['ram_gb', 'almacenamiento_gb'].map((field_key, i) => ({ id: i + 1, field_key, name: i ? 'Almacenamiento' : 'RAM', scope: 'variant', type: 'number', filter_unit: 'GB', is_active: true, is_required: false }));
function row(oem, second = false) {
  const brand = second ? 11 : 10, model = second ? 21 : 20, version = second ? 31 : 30;
  return { vehicle_brand_id: brand, vehicle_model_id: model, vehicle_version_id: version, vehicle_multimedia_system_id: oem, year_from: null, year_to: null,
    vehicle_brand: { id: brand, name: second ? 'Toyota' : 'BMW', is_active: true },
    vehicle_model: { id: model, vehicle_brand_id: brand, name: second ? 'Corolla' : 'Serie 3', is_active: true },
    vehicle_version: { id: version, vehicle_model_id: model, name: second ? 'E170' : 'F30', display_name: second ? 'E170' : 'F30', year_from: 2012, year_to: 2018, is_active: true },
    vehicle_multimedia_system: { id: oem, vehicle_brand_id: brand, name: oem === 40 ? 'CIC' : oem === 41 ? 'NBT' : 'Toyota Touch', is_active: true } };
}
function variant(id, oem, ram, storage, extra = {}) {
  return { id, product_id: 900001, name: `Referencia ${id}`, display_name: `Referencia ${id}`, sku: `QA-CONFIG-${id}`, price: id * 100000 + 1000000,
    stock: 3, is_active: true, is_visible: true, is_default: id === 1, attributes: {}, specs: { ram_gb: ram, almacenamiento_gb: storage }, spec_values: [],
    compatibility_type: 'vehicle_specific', effective_compatibility_type: 'vehicle_specific', vehicle_compatibilities: [row(oem)], image_url: `/__qa-image-${id}.svg`, ...extra };
}
export function configurableProduct(scenario = 'normal', slug = 'configuration-fixture') {
  const variants = [variant(1, 40, 4, 64), variant(2, 40, 8, 128), variant(3, 41, 8, 128), variant(4, 41, 8, 256),
    variant(5, 41, 4, 64, { stock: 0 }), variant(6, 42, 8, 256, { vehicle_compatibilities: [row(42, true)] })];
  if (scenario === 'ambiguous') variants.push(variant(7, 41, 8, 256, { name: 'Kit con arnés específico', sku: 'QA-EXTRA-HARNESS' }));
  if (scenario === 'multi-oem') variants[1].vehicle_compatibilities.push(row(41));
  if (scenario === 'incomplete') for (const v of variants) v.specs = {};
  const config = scenario === 'disabled' ? { ...registration, ui_enabled: false } : scenario === 'unsupported' ? { ...registration, profile_version: 99 } : registration;
  return { id: 900001, slug, name: 'Pantalla Android · configuración de prueba', description: 'Fixture sintética, no referencia comercial certificada.', configuration: config,
    is_active: true, is_visible: true, has_variants: true, is_universal: false, compatibility_type: 'vehicle_specific', product_category: { name: 'Equipos multimedia', fields, requires_oem_compatibility: true },
    price: 1100000, lowest_variant_price: 1100000, total_variant_stock: 15, stock: 15, sku: 'QA-PARENT', technical_specs: {}, vehicle_compatibilities: [],
    image_url: '/__qa-image-parent.svg', images: [], variants };
}
export function traditionalProduct(simple = false) {
  const p = configurableProduct();
  return { ...p, configuration: null, name: simple ? 'Producto simple' : 'Producto tradicional', product_category: { ...p.product_category, requires_oem_compatibility: false },
    has_variants: !simple, stock: 3, variants: simple ? [] : p.variants.slice(0, 2) };
}
