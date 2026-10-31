// Real CRM ProductForm and API client; all writes intercepted in memory.
// Persistence/API integration is tested separately in upgrade_test, never here.
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const cacheDir = await mkdtemp(join(tmpdir(), 'upgrade79-variant-memory-qa.'));
const fields = [
  { id: 1, name: 'ram', field_key: 'ram', type: 'number', scope: 'product', is_required: false },
  { id: 2, name: 'Almacenamiento', field_key: 'almacenamiento', type: 'text', scope: 'product', is_required: true },
  ...['ram_gb', 'almacenamiento_gb'].map((field_key, index) => ({ id: index + 3, field_key, name: index ? 'Almacenamiento' : 'RAM', type: 'number', scope: 'variant', filter_unit: 'GB', is_required: false })),
].map(field => ({ ...field, is_active: true, options: null }));
const brand = { id: 1, name: 'BMW', is_active: true };
const systems = ['CIC', 'NBT'].map((name, index) => ({ id: index + 1, vehicle_brand_id: 1, name, is_active: true }));
const base = { id: 900001, name: 'Fixture solo en memoria', category_id: 6, compatibility_type: 'universal',
  price: 1000000, cost_price: 700000, tax_amount: 0, extra_charges: 0, pricing_mode: 'manual', target_profit_percent: null,
  sku: 'TEST-PARENT', commission_enabled: false, commission_amount: null,
  is_active: true, is_visible: false, is_featured: false, images: [], technical_specs: { ram: 2, almacenamiento: 'Histórico general' },
  vehicle_compatibilities: [], variants: [0, 1, 2].map(index => ({
    id: 900010 + index, name: index === 2 ? 'Histórica 8/128 sin datos estructurados' : `Kit ${systems[index].name}`,
    sku: `TEST-${index}`, price: 1000000 + index * 200000, cost_price: 700000, tax_amount: 10000, extra_charges: 5000,
    pricing_mode: 'manual', target_profit_percent: null, is_default: index === 0, is_active: true, is_visible: true, sort_order: index,
    attributes: {}, compatibility_type: 'vehicle_specific', main_image: null,
    specs: index === 2 ? {} : { ram_gb: index === 0 ? 4 : 8, almacenamiento_gb: index === 0 ? 64 : 256 },
    vehicle_compatibilities: [{ vehicle_brand_id: 1, vehicle_model_id: 1, vehicle_version_id: 1,
      vehicle_multimedia_system_id: index === 0 ? 1 : 2, year_from: null, year_to: null, notes: null }],
  })) };
const catalogs = { categories: [{ id: 6, name: 'Pantallas Android', slug: 'pantallas-android', is_active: true, fields, requires_oem_compatibility: false }],
  productBrands: [], vehicleBrands: [brand], vehicleModels: [{ id: 1, vehicle_brand_id: 1, name: 'Serie 3', is_active: true }],
  vehicleVersions: [{ id: 1, vehicle_model_id: 1, name: 'F30', is_active: true, multimedia_systems: systems }], vehicleMultimediaSystems: systems };
const appModule = `
import { createElement, StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ProductForm } from '/src/modules/admin/inventory/product-form/ProductForm.tsx';
import '/src/index.css';
function Harness() {
  const [product, setProduct] = useState(window.__fixture.product);
  const [revision, setRevision] = useState(0);
  return createElement('main', { style: {maxWidth:'1200px', margin:'auto'} },
    createElement('output', {id:'saved-revision'}, revision),
    createElement(ProductForm, {...window.__fixture.catalogs, key:revision, product, onCancel:()=>{},
      onSaved:(_message,saved)=>{setProduct(saved);setRevision(value=>value+1);} }));
}
createRoot(document.getElementById('root')).render(createElement(StrictMode, null, createElement(Harness)));
`;
const server = await createServer({ root, configFile: false, cacheDir,
  esbuild: { jsx: 'automatic' }, optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-dev-runtime'] },
  server: { host: '127.0.0.1', port: 5193, strictPort: true, hmr: false },
  plugins: [{ name: 'isolated-variant-memory-harness',
    resolveId(id) { if (id === '/__memory-qa.js') return '\0memory-qa'; },
    load(id) { if (id === '\0memory-qa') return appModule; },
    configureServer(vite) { vite.middlewares.use(async (req, res, next) => {
      if (req.url !== '/__memory-qa') return next();
      res.setHeader('Content-Type', 'text/html');
      res.end(await vite.transformIndexHtml(req.url, '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/__memory-qa.js"></script></body></html>'));
    }); },
  }],
});
let browser;
try {
  await server.listen();
  const origin = server.resolvedUrls.local[0];
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const errors = [], unexpected = [], results = [];
  let saved = structuredClone(base), submissions = [];
  await context.addInitScript(fixture => { window.__fixture = fixture; }, { product: base, catalogs });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(origin).origin) { unexpected.push(request.url()); return route.abort(); }
    if (url.pathname === '/sanctum/csrf-cookie') return route.fulfill({ status: 204 });
    if (url.pathname === '/api/admin/products/900001' && request.method() === 'POST') {
      const data = await new Request(request.url(), { method: 'POST', headers: request.headers(), body: request.postDataBuffer() }).formData();
      const entries = Object.fromEntries(data.entries());
      submissions.push(entries);
      for (const [index, variant] of saved.variants.entries()) {
        assert.equal(entries[`variants[${index}][id]`], String(variant.id));
        for (const key of ['sku', 'price', 'cost_price', 'tax_amount', 'extra_charges']) assert.equal(entries[`variants[${index}][${key}]`], String(variant[key]));
        for (const key of ['vehicle_brand_id', 'vehicle_model_id', 'vehicle_version_id', 'vehicle_multimedia_system_id'])
          assert.equal(entries[`variants[${index}][vehicle_compatibilities][0][${key}]`], String(variant.vehicle_compatibilities[0][key]));
        for (const key of ['ram_gb', 'almacenamiento_gb']) {
          const value = entries[`variants[${index}][specs][${key}]`];
          if (value === '') delete variant.specs[key];
          else if (value !== undefined) variant.specs[key] = Number(value);
        }
      }
      assert.equal(entries['technical_specs[ram]'], '2');
      assert.equal(entries['technical_specs[almacenamiento]'], 'Histórico general');
      return route.fulfill({ json: { data: saved } });
    }
    if (url.pathname.startsWith('/api/') || request.method() !== 'GET') { unexpected.push(request.method() + ' ' + request.url()); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  page.on('console', message => { if (message.type() === 'error') { errors.push(message.text()); console.error(message.text()); } });
  for (const width of [1440, 1280, 1024, 768, 430, 390, 360]) {
    saved = structuredClone(base); submissions = [];
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(origin + '__memory-qa');
    const variants = page.locator('.smart-product-form__variant');
    await variants.nth(2).waitFor();
    const input = (index, key) => variants.nth(index).locator(`[data-error-key="variants.${index}.specs.${key}"]`);
    assert.equal(await variants.count(), 3);
    assert.equal(await input(0, 'ram_gb').inputValue(), '4');
    assert.equal(await input(1, 'almacenamiento_gb').inputValue(), '256');
    assert.equal(await input(2, 'ram_gb').inputValue(), '');
    assert.equal(await input(2, 'almacenamiento_gb').inputValue(), '');
    if ([1440, 390].includes(width)) await page.screenshot({ path: join(cacheDir, `form-${width}.png`), fullPage: true });
    await input(0, 'ram_gb').fill('8');
    await input(1, 'almacenamiento_gb').fill('128');
    assert.equal(await input(1, 'ram_gb').inputValue(), '8');
    await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
    await page.locator('#saved-revision').filter({ hasText: '1' }).waitFor();
    assert.deepEqual(saved.variants.map(v => v.specs), [{ ram_gb: 8, almacenamiento_gb: 64 }, { ram_gb: 8, almacenamiento_gb: 128 }, {}]);
    assert.equal(await input(0, 'ram_gb').inputValue(), '8');
    assert.equal(await input(1, 'almacenamiento_gb').inputValue(), '128');
    await input(0, 'ram_gb').fill('');
    await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
    await page.locator('#saved-revision').filter({ hasText: '2' }).waitFor();
    assert.equal(await input(0, 'ram_gb').inputValue(), '');
    assert.equal(await input(1, 'ram_gb').inputValue(), '8');
    const count = submissions.length;
    await input(1, 'ram_gb').fill('0');
    await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
    await variants.nth(1).getByText('RAM debe ser un entero positivo en GB.', { exact: true }).waitFor();
    assert.equal(submissions.length, count);
    const layout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, width: document.documentElement.scrollWidth }));
    assert.ok(layout.width <= layout.viewport, JSON.stringify(layout));
    results.push({ width, fields: 'PASS', editAndRemount: 'PASS', clear: 'PASS', validation: 'PASS', noOverflow: true });
  }
  await page.addInitScript(() => { window.__fixture.product = null; });
  await page.goto(origin + '__memory-qa');
  await page.locator('select[data-error-key="category_id"]').selectOption('6');
  await page.getByRole('button', { name: '+ Agregar variante', exact: true }).click();
  const newVariant = page.locator('.smart-product-form__variant');
  await newVariant.getByLabel('RAM (GB)', { exact: true }).fill('4');
  await newVariant.getByLabel('Almacenamiento (GB)', { exact: true }).fill('64');
  await page.getByRole('button', { name: '+ Agregar variante', exact: true }).click();
  assert.equal(await newVariant.count(), 2);
  assert.equal(await newVariant.nth(0).getByLabel('RAM (GB)', { exact: true }).inputValue(), '4');
  assert.equal(await newVariant.nth(1).getByLabel('RAM (GB)', { exact: true }).inputValue(), '');
  assert.equal(await newVariant.nth(1).getByLabel('Almacenamiento (GB)', { exact: true }).inputValue(), '');
  results.push({ createForm: 'PASS', newVariantDoesNotInheritMemory: 'PASS' });
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
  console.log(JSON.stringify({ results, consoleErrors: errors, externalRequests: unexpected, databaseWrites: 0, artifacts: cacheDir }, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
