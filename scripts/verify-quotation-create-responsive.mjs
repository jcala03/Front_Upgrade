// Real route/form, isolated browser and API fixtures. Never forwards a write.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.QUOTATION_QA_URL || 'http://127.0.0.1:5173';
const widths = (process.env.QUOTATION_QA_WIDTHS || '1440,1280,1024,768,430,390,360').split(',').map(Number);
const branch = { id: 900001, code: 'QA-79', name: 'Sede QA para validación de cotizaciones', city: 'Barranquilla', is_active: true };
const user = { id: 900001, name: 'Usuario QA responsive', email: 'responsive@example.test', role: 'user',
  permissions: ['quotations.view_own', 'quotations.create_own'], employee: { id: 900001, name: 'Empleado QA', branch_id: branch.id, branch } };
const products = [
  { id: 101, name: 'Radio multimedia de instalación universal con conectividad y controles de volante', sku: 'RADIO-UNIVERSAL-UPGRADE79-123456789012345678901234567890', price: 1250000, has_variants: false, branch_stock: 10, variants: [] },
  { id: 102, name: 'Pantalla con variantes para distintos sistemas originales y versiones del vehículo', sku: 'PANTALLA-OEM-UPGRADE79-123456789012345678901234567890', price: 850000, has_variants: true, branch_stock: 10,
    variants: [{ id: 201, product_id: 102, name: 'Versión compatible', display_name: 'Versión compatible con sistema original, memoria y accesorios de instalación',
      sku: 'VARIANTE-UPGRADE79-COMPATIBLE-123456789012345678901234567890', price: 850000, branch_stock: 10, specs: {} }] },
];
const service = { id: 301, name: 'Servicio de instalación y configuración de accesorios multimedia originales', price: 150000, estimated_duration_minutes: 120,
  description: null, category: { id: 1, name: 'Instalaciones especializadas' } };
const customer = { id: 401, name: 'Cliente de prueba con nombre extendido para validar el espacio disponible',
  contact: { phone: '3001234567', email: 'cliente.con.contacto.extendido.para.prueba.responsive@example.test', document: '12345678901234567890' },
  vehicles: [{ id: 501, display_name: 'Vehículo con marca, modelo, versión extendida, sistema multimedia original, año 2026 y placa QA-123', nickname: null,
    brand: { id: 1, name: 'Marca QA' }, model: { id: 2, name: 'Modelo QA' }, version: { id: 3, name: 'Versión QA' }, year: 2026, plate: 'QA-123' }] };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
const results = [];
const errors = [];
const submissions = [];
const outbound = [];
let catalogState = 'full';

function geometry() {
  const panel = document.querySelector('.my-quotation-create-dialog .crm-dialog__panel');
  const form = panel.querySelector('form');
  const overflow = [panel, form, ...form.querySelectorAll('*')].filter(node => {
    const rect = node.getBoundingClientRect();
    if (!rect.width) return false;
    const nativeText = ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(node.tagName);
    return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1
      || (!nativeText && node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 1);
  }).map(node => ({ tag: node.tagName, class: String(node.className), width: node.clientWidth, scroll: node.scrollWidth }));
  const footer = form.querySelector('footer');
  const clippedResults = [...form.querySelectorAll('.my-product-results button, .my-customer-results > button')].filter(node => node.scrollHeight > node.clientHeight + 1)
    .map(node => ({ text: node.textContent.slice(0, 70), height: node.clientHeight, scroll: node.scrollHeight }));
  const finalButtons = [...footer.querySelectorAll('button')].map(node => {
    const rect = node.getBoundingClientRect();
    return { text: node.textContent, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, height: rect.height };
  });
  return { viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth,
    panel: [panel.clientWidth, panel.scrollWidth], form: [form.clientWidth, form.scrollWidth], overflow, clippedResults, finalButtons,
    productLayout: [...form.querySelectorAll('.my-product-results button')].slice(0, 2).map(node => {
      const style = getComputedStyle(node); const span = node.querySelector('span'); const b = node.querySelector('b');
      return { direction: style.flexDirection, wrap: style.flexWrap, display: style.display,
        width: style.width, columns: style.gridTemplateColumns, x: node.getBoundingClientRect().x,
        children: [span, b].filter(Boolean).map(child => { const s = getComputedStyle(child); return { tag: child.tagName, width: s.width, max: s.maxWidth, basis: s.flexBasis, wrap: s.overflowWrap, x: child.getBoundingClientRect().x, right: child.getBoundingClientRect().right }; }) };
    }),
    panelHasVerticalOverflow: panel.scrollHeight > panel.clientHeight + 1, height: innerHeight };
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  context.setDefaultNavigationTimeout(60_000);
  await context.addInitScript(user => sessionStorage.setItem('upgrade79_crm_user', JSON.stringify(user)), user);
  await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await context.route(url => url.pathname.startsWith('/api/') || url.pathname.startsWith('/sanctum/'), async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    outbound.push({ path, method: request.method() });
    const headers = { 'access-control-allow-origin': new URL(origin).origin, 'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'content-type,x-xsrf-token', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
    if (request.method() === 'OPTIONS' || path.startsWith('/sanctum/')) return route.fulfill({ status: 204, headers });
    if (path === '/api/auth/me') return route.fulfill({ json: { user }, headers });
    if (path === '/api/my/quotations' && request.method() === 'POST') {
      submissions.push(request.postDataJSON());
      return route.fulfill({ status: 422, json: { message: 'Validación QA sin guardar datos.', errors: { items: ['Revisa las líneas comerciales antes de guardar esta cotización de prueba.'] } }, headers });
    }
    if (path === '/api/my/quotations') return route.fulfill({ json: { data: { employee_linked: true, quotations: { data: [], current_page: 1, total: 0, last_page: 1 } } }, headers });
    if (path === '/api/my/commercial-products') {
      if (catalogState === 'error') return route.fulfill({ status: 503, json: { message: 'Catálogo temporalmente no disponible.' }, headers });
      return route.fulfill({ json: { data: { branch, products: catalogState === 'empty' ? [] : products } }, headers });
    }
    if (path === '/api/my/service-options') return route.fulfill({ json: { data: [service] }, headers });
    if (path === '/api/my/customer-options') return route.fulfill({ json: { data: [customer] }, headers });
    throw new Error('Unexpected QA request: ' + request.method() + ' ' + path);
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type()) && /hooks|hydrat|uncaught/i.test(message.text())) errors.push(message.text()); });
  await page.goto(origin + '/crm/me/quotations');
  const dialog = page.locator('.my-quotation-create-dialog');
  const check = async (state, width) => {
    const layout = await page.evaluate(geometry);
    assert.ok(layout.page <= layout.viewport, JSON.stringify({ state, width, layout }));
    assert.deepEqual(layout.overflow, [], JSON.stringify({ state, width, layout }));
    assert.deepEqual(layout.clippedResults, [], 'Picker rows must not clip descriptions/prices: ' + JSON.stringify({ state, width, layout }));
    assert.equal(layout.panelHasVerticalOverflow, false, 'Only the body should scroll, keeping actions visible: ' + JSON.stringify(layout));
    for (const button of layout.finalButtons) {
      assert.ok(button.left >= 0 && button.right <= layout.viewport + 1 && button.top >= 0 && button.bottom <= layout.height + 1, JSON.stringify(button));
      assert.ok(button.height >= 44);
    }
    results.push({ state, width, documentFits: true, dialogFits: true, fieldsFit: true, finalActionsVisible: true });
  };

  for (const width of widths) {
    console.log(`[quotation-responsive] ${width}`);
    await page.setViewportSize({ width, height: width <= 430 ? 844 : 1000 });
    await page.getByRole('button', { name: 'Nueva cotización', exact: true }).click();
    const productArea = dialog.locator('section[aria-labelledby="products-title"]');
    const serviceArea = dialog.locator('section[aria-labelledby="services-title"]');
    await productArea.getByRole('button', { name: /Radio multimedia/ }).waitFor();
    await serviceArea.getByRole('button', { name: /Servicio de instalación/ }).waitFor();
    await check('catalog', width);

    await productArea.getByRole('button', { name: /Pantalla con variantes/ }).click();
    await productArea.getByRole('button', { name: /Versión compatible/ }).waitFor();
    await check('variant-picker', width);
    await page.screenshot({ path: `/tmp/upgrade79-quotation-variants-${width}.png` });
    await productArea.getByRole('button', { name: /Versión compatible/ }).click();
    await productArea.getByRole('button', { name: /Radio multimedia/ }).click();
    await serviceArea.getByRole('button', { name: /Servicio de instalación/ }).click();
    const lines = dialog.locator('.my-commerce-lines article');
    assert.equal(await lines.count(), 3);
    await lines.nth(1).getByLabel('Cantidad', { exact: true }).fill('3');
    await lines.nth(1).getByLabel('Descuento', { exact: true }).fill('10000');
    assert.match(await dialog.locator('footer strong').innerText(), /4\.740\.000/);
    await check('items-quantity-discount-total', width);

    await dialog.getByLabel('Cliente ad hoc', { exact: true }).check();
    await dialog.getByLabel('Nombre', { exact: true }).fill('Cliente de prueba');
    await dialog.getByLabel('Email', { exact: true }).fill('qa@example.test');
    await dialog.getByLabel('Teléfono', { exact: true }).fill('3001234567');
    await dialog.getByLabel('Ciudad', { exact: true }).fill('Barranquilla');
    await check('adhoc-customer', width);

    await dialog.getByLabel('Cliente registrado', { exact: true }).check();
    await dialog.getByLabel('Buscar cliente registrado', { exact: true }).fill('Cliente');
    await dialog.locator('.my-customer-results button').first().waitFor();
    await check('customer-picker', width);
    await dialog.locator('.my-customer-results button').first().click();
    await dialog.locator('.my-selected-customer').waitFor();
    await dialog.locator('.my-customer-discovery select').selectOption('501');
    await check('selected-customer-vehicle', width);
    await dialog.getByLabel('Válida hasta', { exact: true }).fill('2026-11-30');
    await dialog.getByLabel('Notas', { exact: true }).fill('Notas de prueba responsive, sin cambios de flujo.');
    await dialog.getByRole('button', { name: 'Crear cotización', exact: true }).click();
    await dialog.getByRole('alert').waitFor();
    await check('validation-feedback', width);
    const payload = submissions.at(-1);
    assert.equal(payload.customer_id, 401); assert.equal(payload.customer_vehicle_id, 501);
    assert.equal(payload.valid_until, '2026-11-30');
    assert.deepEqual(payload.items, [
      { item_type: 'product', product_id: 102, product_variant_id: 201, quantity: 1, discount_amount: 0 },
      { item_type: 'product', product_id: 101, product_variant_id: null, quantity: 3, discount_amount: 10000 },
      { item_type: 'service', service_id: 301, quantity: 1, discount_amount: 0 },
    ]);
    await page.screenshot({ path: `/tmp/upgrade79-quotation-complete-${width}.png` });
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.equal(await dialog.count(), 0);

    for (const state of ['empty', 'error']) {
      catalogState = state;
      await page.getByRole('button', { name: 'Nueva cotización', exact: true }).click();
      await dialog.getByText(state === 'empty' ? 'No hay coincidencias.' : 'Catálogo temporalmente no disponible.', { exact: true }).waitFor();
      await check('catalog-' + state, width);
      await page.keyboard.press('Escape');
      assert.equal(await dialog.count(), 0);
    }
    catalogState = 'full';
  }
  assert.equal(submissions.length, widths.length);
  assert.deepEqual(errors, []);
  assert.equal(outbound.some(request => request.method !== 'GET' && request.method !== 'OPTIONS' && !(request.method === 'POST' && request.path === '/api/my/quotations')), false);
  console.log(JSON.stringify({ origin, isolatedFixtures: true, results, calculationsAndPayloadUnchanged: true, allSubmissionsInterceptedWithoutDatabaseWrites: true, errors }, null, 2));
  await context.close();
} finally { await browser.close(); }
