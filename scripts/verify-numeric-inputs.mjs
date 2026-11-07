// Real React forms, isolated fixture responses and intercepted writes. No database.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/verify-numeric-inputs.mjs
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement, StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = await mkdtemp(join(tmpdir(), 'upgrade79-numeric-inputs.'));
const branch = { id: 90001, name: 'Sede aislada', code: 'ISOLATED', is_active: true };
const product = { id: 90001, category_id: 90001, name: 'Referencia aislada', sku: 'ISOLATED-001', slug: 'isolated', price: 125000, cost_price: 100000, tax_amount: 0, extra_charges: 0, pricing_mode: 'manual', target_profit_percent: 0, compatibility_type: 'universal', is_active: true, is_visible: false, is_featured: false, commission_enabled: false, stock: 20, branch_stock: 20, has_variants: false, variants: [], technical_specs: {}, vehicle_compatibilities: [], images: [] };
const stock = { id: 90001, branch_id: branch.id, branch, inventory_item_id: 90001, product_id: product.id, product_variant_id: null, product, quantity: 20, minimum_quantity: 0, status: 'normal' };
const fields = [ { id: 1, field_key: 'ram_gb', name: 'RAM', scope: 'variant', type: 'number', filter_unit: 'GB', is_required: false, is_active: true }, { id: 2, field_key: 'almacenamiento_gb', name: 'Almacenamiento', scope: 'variant', type: 'number', filter_unit: 'GB', is_required: false, is_active: true } ];
const category = { id: product.category_id, name: 'Pantallas Android', slug: 'pantallas-android', is_active: true, fields, requires_oem_compatibility: false };
const variantProduct = { ...product, has_variants: true, variants: [ { id: 90002, name: 'Referencia A', display_name: 'Referencia A', sku: 'ISOLATED-A', price: 125000, cost_price: 100000, tax_amount: 0, extra_charges: 0, pricing_mode: 'manual', target_profit_percent: 0, specs: { ram_gb: 4, almacenamiento_gb: 64 }, attributes: {}, use_general_compatibility: true, is_default: true, is_active: true, is_visible: true, vehicle_compatibilities: [] } ] };
variantProduct.variants.push({ ...variantProduct.variants[0], id: 90003, name: 'Referencia B', sku: 'ISOLATED-B', is_default: false, specs: { ram_gb: 16, almacenamiento_gb: 256 } });
const quotation = { id: 90001, branch_id: branch.id, quotation_number: 'ISOLATED', items: [{ item_type: 'product', product_id: product.id, product, product_variant_id: null, quantity: 1, discount_amount: 0 }], customer: null };
const settings = { business: { business_name: 'Negocio aislado', legal_name: null, tax_id: null, phone: null, email: null, whatsapp: null, address: null, city: null }, sales: { quotation_validity_days: 15, order_notification_email: null }, regional: { currency: 'COP', timezone: 'America/Bogota' }, updated_at: null, updated_by: null };
const permissions = ['inventory.update', 'inventory.view', 'inventory_transfers.view', 'inventory_transfers.create', 'products.view', 'products.update', 'settings.update'];
const user = { id: 90001, name: 'Usuario aislado', email: 'isolated@example.invalid', role: 'admin', permissions };
const fixture = { product, variantProduct, category, quotation };
const shared = `
import { createElement as h } from 'react';
import { SaleForm } from '/src/modules/admin/orders/SaleForm.tsx';
import { QuotationForm } from '/src/modules/admin/quotations/QuotationForm.tsx';
import { MyCommercialForm } from '/src/modules/crm/my-commerce/MyCommercialForm.tsx';
import { ProductForm } from '/src/modules/admin/inventory/product-form/ProductForm.tsx';
import { AdminInventoryPage } from '/src/modules/admin/inventory/AdminInventoryPage.tsx';
import { AdminSettingsPage } from '/src/modules/admin/settings/AdminSettingsPage.tsx';
const f=${JSON.stringify(fixture)};
const noop=()=>{};
export function scenario(name,submit){
 if(name==='sale')return h(SaleForm,{open:true,onClose:noop,onCreated:noop,onSubmit:submit});
 if(name==='quotation'||name==='quotation-new')return h(QuotationForm,{open:true,quotation:name==='quotation'?f.quotation:null,onClose:noop,onSaved:noop,onSubmit:submit});
 if(name==='my-sale'||name==='my-quotation')return h(MyCommercialForm,{kind:name==='my-sale'?'sale':'quotation',saving:false,error:'',errors:{},onClose:noop,onSubmit:submit});
 if(name==='product'||name==='product-new')return h(ProductForm,{product:name==='product'?f.variantProduct:null,categories:[f.category],productBrands:[],vehicleBrands:[],vehicleModels:[],vehicleVersions:[],vehicleMultimediaSystems:[],onCancel:noop,onSaved:noop});
 if(name==='settings')return h(AdminSettingsPage);
 return h(AdminInventoryPage,{view:name==='transfer'?'transfers':'stocks'});
}
`;
const client = `import { createElement, StrictMode } from 'react';import { hydrateRoot } from 'react-dom/client';import { scenario } from '/__numeric-scenarios.js';import '/src/index.css';
window.__submissions=[];
hydrateRoot(document.getElementById('root'),createElement(StrictMode,null,scenario(new URL(location.href).searchParams.get('scenario'),async payload=>{window.__submissions.push(payload);return {id:90001};})),{onRecoverableError:error=>console.error('HYDRATION: '+error.message)});`;
globalThis.sessionStorage = { getItem: () => JSON.stringify(user) };
const vite = await createServer({ root, configFile: false, cacheDir: join(artifacts, 'cache'), esbuild: { jsx: 'automatic' }, optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'lucide-react'] }, server: { host: '127.0.0.1', port: 5197, strictPort: true, hmr: false }, plugins: [{ name: 'numeric-keyboard-regression', resolveId(id) { if (id === '/__numeric-scenarios.js' || id === '/__numeric-client.js') return '\0' + id; }, load(id) { if (id === '\0/__numeric-scenarios.js') return shared; if (id === '\0/__numeric-client.js') return client; }, configureServer(server) { server.middlewares.use(async (req, res, next) => {
  if (!req.url.startsWith('/__numeric-test?')) return next();
  try {
    const { scenario } = await vite.ssrLoadModule('/__numeric-scenarios.js');
    const html = renderToString(createElement(StrictMode, null, scenario(new URL(req.url, 'http://localhost').searchParams.get('scenario'), async () => ({ id: 90001 }))));
    res.setHeader('Content-Type', 'text/html');
    res.end(await server.transformIndexHtml(req.url, '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root">' + html + '</div><script type="module" src="/__numeric-client.js"></script></body></html>'));
  } catch (error) { res.statusCode = 500; res.end(String(error.stack)); }
}); } }] });
const errors = [], writes = [], results = [];
const paginate = data => ({ data, current_page: 1, last_page: 1, total: data.length, per_page: 100 });
let browser, debugPage;
try {
  await vite.listen();
  const origin = vite.resolvedUrls.local[0].replace(/\/$/, '');
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.addInitScript(user => sessionStorage.setItem('upgrade79_crm_user', JSON.stringify(user)), user);
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin !== origin) { errors.push('Blocked external request: ' + url.origin); return route.abort(); }
    const json = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) });
    if (!['GET', 'HEAD'].includes(req.method())) {
      writes.push({ path: url.pathname, method: req.method(), body: req.postData() });
      return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ message: 'Respuesta de validación aislada', errors: {} }) });
    }
    if (url.pathname === '/sanctum/csrf-cookie') return route.fulfill({ status: 204 });
    if (url.pathname.startsWith('/__public-api/api/')) return json([]);
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname === '/api/admin/branches') return json(paginate([branch, { ...branch, id: 90002, name: 'Otra sede aislada' }]));
    if (url.pathname === '/api/admin/settings') return json(settings);
    if (url.pathname === '/api/admin/products') return json([product]);
    if (url.pathname === '/api/admin/inventory/stocks') return json(paginate([stock]));
    if (url.pathname === '/api/admin/inventory/transfers') return json(paginate([]));
    if (url.pathname === '/api/admin/inventory') return json({ products: [product] });
    if (url.pathname.endsWith('/commercial-products')) return json({ branch, products: [product] });
    return json([]);
  });
  const page = await context.newPage();
  debugPage = page;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !/422|Respuesta de validación aislada/.test(message.text())) errors.push(message.text()); });
  async function open(name, width) { console.log('SCENARIO', name, width); await page.setViewportSize({ width, height: 1000 }); await page.goto(origin + '/__numeric-test?scenario=' + name, { waitUntil: 'networkidle' }); }
  async function edit(field, final = '42', decimal = false) {
    await field.fill('0'); await field.press('Backspace'); assert.equal(await field.inputValue(), '');
    await field.pressSequentially('17'); assert.equal(await field.inputValue(), '17');
    await field.press('ControlOrMeta+A'); await field.pressSequentially('1234'); assert.equal(await field.inputValue(), '1234');
    await field.press('ArrowLeft'); await field.press('Backspace'); assert.equal(await field.inputValue(), '124');
    await field.fill(''); await field.pressSequentially(final); assert.equal(await field.inputValue(), final);
    if (decimal) assert.equal(await field.evaluate(input => input.validity.valid), true);
  }
  for (const width of [1440, 390]) {
    for (const name of ['my-sale', 'my-quotation', 'quotation', 'quotation-new', 'sale']) {
      await open(name, width);
      if (name !== 'quotation') {
        if (name === 'sale' || name === 'quotation-new') await page.getByLabel(/^Sede \*/).selectOption(String(branch.id));
        await page.getByRole('button', { name: /Referencia aislada/ }).click();
      }
      const quantity = page.getByLabel('Cantidad', { exact: true }), discount = page.getByLabel(/Descuento/).first();
      await edit(discount, '20'); await edit(quantity, '2');
      const submit = page.locator('button[type="submit"]').last();
      await quantity.fill(''); await submit.click();
      assert.deepEqual(await page.evaluate(() => window.__submissions), []);
      assert.equal(await quantity.evaluate(input => input.validity.valueMissing), true);
      await quantity.fill('2.5'); assert.equal(await quantity.evaluate(input => input.validity.stepMismatch), true);
      await quantity.fill('1000'); await submit.click(); assert.deepEqual(await page.evaluate(() => window.__submissions), []);
      await quantity.fill('2'); await discount.fill(''); await submit.click(); assert.deepEqual(await page.evaluate(() => window.__submissions), []);
      await discount.fill('20'); await submit.click();
      const submissions = await page.evaluate(() => window.__submissions);
      assert.equal(submissions.length, 1, name); assert.equal(submissions[0].items[0].quantity, 2); assert.equal(submissions[0].items[0].discount_amount, 20);
      results.push({ name, width, keyboard: 'PASS', blankAndBounds: 'PASS', numericPayload: 'PASS' });
    }
    await open('settings', width); await page.getByRole('button', { name: 'Ventas y cotizaciones', exact: true }).click();
    const days = page.getByLabel('Vigencia predeterminada de cotizaciones'); await edit(days, '30');
    const before = writes.length; await days.fill(''); await page.getByRole('button', { name: 'Guardar cambios' }).click(); assert.equal(writes.length, before);
    await days.fill('30'); await page.getByRole('button', { name: 'Guardar cambios' }).click(); await page.getByRole('alert').waitFor();
    assert.equal(JSON.parse(writes.at(-1).body).quotation_validity_days, 30);
    results.push({ name: 'settings', width, keyboard: 'PASS', blankBlocked: 'PASS', interceptedPayload: 'PASS' });
    await open('inventory', width); await page.getByRole('button', { name: 'Mínimo', exact: true }).first().click();
    const minimum = page.getByLabel('Mínimo por sede'); await edit(minimum, '3'); const minBefore = writes.length;
    await minimum.fill(''); await page.getByRole('button', { name: 'Guardar mínimo' }).click(); assert.equal(writes.length, minBefore);
    await minimum.fill('3'); await page.getByRole('button', { name: 'Guardar mínimo' }).click(); await page.getByRole('alert').waitFor(); assert.equal(JSON.parse(writes.at(-1).body).minimum_quantity, 3);
    results.push({ name: 'inventory-minimum', width, keyboard: 'PASS', blankBlocked: 'PASS', interceptedPayload: 'PASS' });
    await open('inventory', width); await page.getByRole('button', { name: 'Movimiento', exact: true }).first().click();
    await edit(page.getByLabel('Cantidad *'), '4');
    results.push({ name: 'inventory-movement', width, keyboard: 'PASS' });
    await open('inventory', width); await page.getByRole('button', { name: 'Ajustar existencias', exact: true }).click();
    await edit(page.getByLabel('Cantidad *'), '4'); results.push({ name: 'inventory-entry', width, keyboard: 'PASS' });
    await open('transfer', width); await page.getByRole('button', { name: 'Nueva transferencia', exact: true }).click();
    await page.getByLabel('Artículo con stock').selectOption(String(stock.id)); await page.getByRole('button', { name: 'Agregar', exact: true }).click();
    await edit(page.getByLabel('Cantidad', { exact: true }), '4'); results.push({ name: 'inventory-transfer', width, keyboard: 'PASS' });
    for (const name of ['product', 'product-new']) {
      await open(name, width);
      if (name === 'product-new') {
        await page.locator('select[data-error-key="category_id"]').selectOption(String(category.id));
        await page.locator('input[data-error-key="name"]').fill('Referencia aislada nueva');
        await page.locator('input[name="product-compatibility"]').first().check();
      }
      await edit(page.getByLabel('Precio de venta', { exact: true }).first(), '125000.50', true);
      if (name === 'product-new') {
        await page.getByRole('button', { name: '+ Agregar variante', exact: true }).click();
        await page.getByRole('button', { name: '+ Agregar variante', exact: true }).click();
      }
      await edit(page.getByLabel('RAM (GB)', { exact: true }).first(), '8');
      await edit(page.getByLabel('Almacenamiento (GB)', { exact: true }).first(), '128');
      assert.equal(await page.getByLabel('RAM (GB)', { exact: true }).nth(1).inputValue(), name === 'product' ? '16' : '');
      assert.equal(await page.getByLabel('Almacenamiento (GB)', { exact: true }).nth(1).inputValue(), name === 'product' ? '256' : '');
      const variant = page.locator('.smart-product-form__variant').first();
      await edit(variant.getByLabel('Impuestos', { exact: true }), '12.50', true);
      await variant.getByLabel('Modo de precio').selectOption('margin'); await edit(variant.getByLabel('Margen deseado %'), '99.5', true);
      if (name === 'product-new') await page.locator('input[data-error-key="variants.1.name"]').fill('Referencia aislada B');
      const beforeSave = writes.length;
      await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'Respuesta de validación aislada' }).waitFor();
      assert.equal(writes.length, beforeSave + 1);
      assert.ok(writes.at(-1).body.includes('name="variants[0][specs][ram_gb]"\r\n\r\n8'));
      assert.ok(writes.at(-1).body.includes('name="price"\r\n\r\n125001')); // Existing COP rounding, unchanged.
      assert.ok(!/\r\n\r\n(?:NaN|Infinity)\r\n/.test(writes.at(-1).body));
      results.push({ name, width, keyboard: 'PASS', decimal: 'PASS', independentVariantDrafts: 'PASS', interceptedSave: 'PASS' });
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(join(artifacts, 'results.json'), JSON.stringify({ results, errors, interceptedWrites: writes.length, externalWrites: 0 }, null, 2));
  console.log(JSON.stringify({ scenarios: results.length, errors, interceptedWrites: writes.length, externalWrites: 0, artifacts }, null, 2));
} catch (error) {
  await writeFile(join(artifacts, 'failure.json'), JSON.stringify({ results, errors, interceptedWrites: writes.length, externalWrites: 0 }, null, 2));
  console.error('Browser errors:', errors);
  console.error('Current page:', await debugPage?.locator('body').innerText());
  throw error;
} finally { await browser?.close(); await vite.close(); delete globalThis.sessionStorage; }
