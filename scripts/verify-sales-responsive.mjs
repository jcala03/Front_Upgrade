// Real route/form, isolated browser and API fixtures. Never forwards a write.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.SALES_QA_URL || 'http://127.0.0.1:5173';
const widths = (process.env.SALES_QA_WIDTHS || '1440,1280,1024,768,430,390,360').split(',').map(Number);
const branch = { id: 900001, code: 'QA-79', name: 'Sede QA para validación de ventas', city: 'Barranquilla', is_active: true };
const user = { id: 900001, name: 'Usuario QA responsive', email: 'responsive@example.test', role: 'user',
  permissions: ['orders.view_own', 'orders.create_own', 'orders.confirm_own', 'orders.complete_own', 'payments.create_own'], employee: { id: 900001, name: 'Empleado QA', branch_id: branch.id, branch } };
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

const sale = {
  id: 701, order_number: 'VTA-UPGRADE79-2026-123456789012345678901234567890', origin: 'crm', status: 'pending', payment_status: 'partial',
  branch, sales_employee: { id: user.employee.id, name: 'Empleado QA' }, customer: { id: customer.id, name: customer.name, email: customer.contact.email },
  total: 4740000, subtotal: 4750000, discount_total: 10000, items_count: 3, payments_count: 2,
  created_at: '2026-10-26T14:30:00Z', updated_at: '2026-10-26T14:30:00Z',
  items: [
    { id: 1, item_type: 'product', product_id: 101, product_name: products[0].name, product_sku: products[0].sku, quantity: 3, unit_price: 1250000, total: 3740000 },
    { id: 2, item_type: 'product', product_id: 102, product_variant_id: 201, product_name: products[1].name, variant_name: products[1].variants[0].display_name,
      variant_sku: products[1].variants[0].sku, quantity: 1, unit_price: 850000, total: 850000 },
    { id: 3, item_type: 'service', service_name: service.name, quantity: 1, unit_price: 150000, total: 150000 },
  ],
  payments: [
    { id: 1, amount: 200000, method: 'card_terminal', status: 'completed', paid_at: '2026-10-26T14:30:00Z' },
    { id: 2, amount: 100000, method: 'transfer', status: 'completed', paid_at: '2026-10-26T14:35:00Z' },
  ],
};
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
const results = [], errors = [], writes = [];
let listState = 'full', catalogState = 'full', currentSale = { ...sale };

function geometry() {
  const panel = document.querySelector('.crm-dialog .crm-dialog__panel');
  const form = panel.firstElementChild;
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
  context.setDefaultNavigationTimeout(60000);
  await context.addInitScript(user => sessionStorage.setItem('upgrade79_crm_user', JSON.stringify(user)), user);
  await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await context.route(url => url.pathname.startsWith('/api/') || url.pathname.startsWith('/sanctum/'), async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    const headers = { 'access-control-allow-origin': new URL(origin).origin, 'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'content-type,x-xsrf-token', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
    const respond = (json, status = 200) => route.fulfill({ json, status, headers });
    if (request.method() === 'OPTIONS' || path.startsWith('/sanctum/')) return route.fulfill({ status: 204, headers });
    if (path === '/api/auth/me') return respond({ user });
    if (request.method() !== 'GET') {
      writes.push({ path, payload: request.postDataJSON() });
      if (path === '/api/my/sales' || path.endsWith('/payments')) return respond({ message: 'Validación QA sin guardar datos.',
        errors: path.endsWith('/payments') ? { amount: ['Verifica el monto informado antes de registrar este pago de prueba.'] } : { items: ['Revisa las líneas comerciales antes de guardar esta venta de prueba.'] } }, 422);
      if (path.endsWith('/confirm') || path.endsWith('/complete')) {
        currentSale = { ...currentSale, status: path.endsWith('/confirm') ? 'confirmed' : 'completed' };
        return respond({ data: currentSale });
      }
      errors.push('Unexpected write: ' + path);
      return respond({ message: 'Blocked QA write' }, 400);
    }
    if (path === '/api/my/sales') {
      if (listState === 'error') return respond({ message: 'Ventas temporalmente no disponibles.' }, 503);
      return respond({ data: { employee_linked: true, sales: { data: listState === 'empty' ? [] : [currentSale], current_page: 1, total: listState === 'empty' ? 0 : 1, last_page: 1 } } });
    }
    if (path === '/api/my/sales/701') return respond({ data: currentSale });
    if (path === '/api/my/commercial-products') {
      if (catalogState === 'error') return respond({ message: 'Catálogo temporalmente no disponible.' }, 503);
      return respond({ data: { branch, products: catalogState === 'empty' ? [] : products } });
    }
    if (path === '/api/my/service-options') return respond({ data: [service] });
    if (path === '/api/my/customer-options') return respond({ data: [customer] });
    errors.push('Unexpected request: ' + path);
    return respond({ message: 'Unconfigured QA endpoint' }, 404);
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  page.on('console', message => { if (['error', 'warning'].includes(message.type()) && /hooks|hydrat|uncaught/i.test(message.text())) errors.push(message.text()); });
  await page.goto(origin + '/crm/me/sales');
  const dialog = page.getByRole('dialog');
  const check = async (state, width, modal = true) => {
    console.log('[sales-responsive] ' + width + ' ' + state);
    const layout = modal ? await page.evaluate(geometry) : await page.evaluate(() => {
      const viewport = document.documentElement.clientWidth;
      return { viewport, page: document.documentElement.scrollWidth, overflow: [...document.querySelectorAll('.my-commerce, .my-commerce *')].filter(node => {
        const rect = node.getBoundingClientRect();
        return rect.width && (rect.left < -1 || rect.right > viewport + 1 || (!['INPUT','SELECT','OPTION','TEXTAREA'].includes(node.tagName) && node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 1));
      }).map(node => ({ tag: node.tagName, class: String(node.className), width: node.clientWidth, scroll: node.scrollWidth })) };
    });
    if (process.env.SALES_QA_BASELINE) { console.log(JSON.stringify({ state, width, layout })); return; }
    assert.ok(layout.page <= layout.viewport, JSON.stringify({ state, width, layout }));
    assert.deepEqual(layout.overflow, [], JSON.stringify({ state, width, layout }));
    if (modal) {
      assert.deepEqual(layout.clippedResults, [], JSON.stringify({ state, width, layout }));
      assert.equal(layout.panelHasVerticalOverflow, false, JSON.stringify({ state, width, layout }));
      for (const button of layout.finalButtons) {
        assert.ok(button.left >= 0 && button.right <= layout.viewport + 1 && button.top >= 0 && button.bottom <= layout.height + 1 && button.height >= 44, JSON.stringify({ state, width, button }));
      }
    }
    results.push({ state, width, fits: true });
  };
  for (const width of widths) {
    console.log('[sales-responsive] ' + width);
    await page.setViewportSize({ width, height: width <= 430 ? 844 : 1000 });
    currentSale = { ...sale }; listState = 'full';
    await page.reload();
    await page.getByRole('button', { name: 'Ver venta', exact: true }).waitFor();
    await check('list', width, false);
    await page.screenshot({ path: '/tmp/upgrade79-sales-list-' + width + '.png' });
    await page.getByRole('button', { name: 'Nueva venta', exact: true }).click();
    const productArea = dialog.locator('section[aria-labelledby="products-title"]');
    const serviceArea = dialog.locator('section[aria-labelledby="services-title"]');
    await productArea.getByRole('button', { name: /Radio multimedia/ }).waitFor();
    await serviceArea.getByRole('button', { name: /Servicio de instalación/ }).waitFor();
    await check('catalog', width);
    await page.screenshot({ path: '/tmp/upgrade79-sales-catalog-' + width + '.png' });
    if (process.env.SALES_QA_BASELINE) {
      await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await page.getByRole('button', { name: 'Ver venta', exact: true }).click();
      await dialog.locator('.my-payments').waitFor();
      await check('detail', width);
      await dialog.getByRole('button', { name: 'Registrar pago', exact: true }).click();
      await dialog.getByLabel('Monto *', { exact: true }).waitFor();
      await check('payment', width);
      await page.keyboard.press('Escape');
      continue;
    }
    await productArea.getByRole('button', { name: /Pantalla con variantes/ }).click();
    await productArea.getByRole('button', { name: /Versión compatible/ }).waitFor();
    await check('variant-picker', width);
    await page.screenshot({ path: '/tmp/upgrade79-sales-variants-' + width + '.png' });
    await productArea.getByRole('button', { name: /Versión compatible/ }).click();
    await productArea.getByRole('button', { name: /Radio multimedia/ }).click();
    await serviceArea.getByRole('button', { name: /Servicio de instalación/ }).click();
    const lines = dialog.locator('.my-commerce-lines article');
    assert.equal(await lines.count(), 3);
    await lines.nth(1).getByLabel('Cantidad', { exact: true }).fill('3');
    await lines.nth(1).getByLabel('Descuento', { exact: true }).fill('10000');
    assert.match(await dialog.locator('footer strong').innerText(), /4\.740\.000/);
    await check('items-totals', width);
    await page.screenshot({ path: '/tmp/upgrade79-sales-items-' + width + '.png' });
    await dialog.getByLabel('Cliente ad hoc', { exact: true }).check();
    await dialog.getByLabel('Nombre', { exact: true }).fill('Cliente de prueba');
    await check('adhoc-customer', width);
    await dialog.getByLabel('Cliente registrado', { exact: true }).check();
    await dialog.getByLabel('Buscar cliente registrado', { exact: true }).fill('Cliente');
    await dialog.locator('.my-customer-results button').first().waitFor();
    await check('customer-picker', width);
    await dialog.locator('.my-customer-results button').first().click();
    await dialog.locator('.my-customer-discovery select').selectOption('501');
    await check('customer-vehicle', width);
    await dialog.getByLabel('Notas', { exact: true }).fill('Notas QA responsive.');
    await dialog.getByRole('button', { name: 'Crear venta pendiente', exact: true }).click();
    await dialog.getByRole('alert').waitFor();
    await check('sale-validation', width);
    const payload = writes.at(-1).payload;
    assert.equal(payload.customer_id, 401); assert.equal(payload.customer_vehicle_id, 501);
    assert.equal('valid_until' in payload, false);
    assert.deepEqual(payload.items, [
      { item_type: 'product', product_id: 102, product_variant_id: 201, quantity: 1, discount_amount: 0 },
      { item_type: 'product', product_id: 101, product_variant_id: null, quantity: 3, discount_amount: 10000 },
      { item_type: 'service', service_id: 301, quantity: 1, discount_amount: 0 },
    ]);
    await page.screenshot({ path: '/tmp/upgrade79-sales-create-' + width + '.png' });
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    for (const state of ['empty', 'error']) {
      catalogState = state;
      await page.getByRole('button', { name: 'Nueva venta', exact: true }).click();
      await dialog.getByText(state === 'empty' ? 'No hay coincidencias.' : 'Catálogo temporalmente no disponible.', { exact: true }).waitFor();
      await check('catalog-' + state, width);
      await page.keyboard.press('Escape');
    }
    catalogState = 'full';
    await page.getByRole('button', { name: 'Ver venta', exact: true }).click();
    await dialog.locator('.my-payments').waitFor();
    await check('detail-pending', width);
    await page.screenshot({ path: '/tmp/upgrade79-sales-detail-' + width + '.png' });
    await dialog.getByRole('button', { name: 'Confirmar venta', exact: true }).click();
    await dialog.getByRole('button', { name: 'Completar venta', exact: true }).waitFor();
    await check('detail-confirmed', width);
    await dialog.getByRole('button', { name: 'Completar venta', exact: true }).click();
    await dialog.getByText('Completada', { exact: true }).waitFor();
    await check('detail-completed', width);
    await dialog.getByRole('button', { name: 'Registrar pago', exact: true }).click();
    await dialog.getByLabel('Monto *', { exact: true }).waitFor();
    assert.equal(await dialog.getByLabel('Monto *', { exact: true }).inputValue(), '4440000');
    for (const method of ['cash', 'transfer', 'card_terminal', 'wompi', 'other']) {
      await dialog.locator('.my-commerce-form-grid select').selectOption(method);
      await check('payment-' + method, width);
    }
    await dialog.getByLabel('Monto *', { exact: true }).fill('100000');
    await dialog.getByLabel('Referencia', { exact: true }).fill(' QA-REF ');
    await dialog.getByLabel('Notas', { exact: true }).fill(' QA pago ');
    await dialog.getByRole('button', { name: 'Registrar pago', exact: true }).click();
    await dialog.getByRole('alert').waitFor();
    await check('payment-validation', width);
    assert.deepEqual(writes.at(-1), { path: '/api/my/sales/701/payments', payload: { amount: 100000, method: 'other', reference: 'QA-REF', notes: 'QA pago' } });
    await page.screenshot({ path: '/tmp/upgrade79-sales-payment-' + width + '.png' });
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    for (const state of ['empty', 'error']) {
      listState = state; await page.reload();
      if (state === 'empty') await page.getByText('Aún no tienes ventas.', { exact: true }).waitFor();
      else await page.getByRole('alert').filter({ hasText: 'Ventas temporalmente no disponibles.' }).waitFor();
      await check('list-' + state, width, false);
    }
  }
  assert.deepEqual(errors, []);
  if (!process.env.SALES_QA_BASELINE) assert.equal(writes.length, widths.length * 4);
  console.log(JSON.stringify({ origin, isolatedFixtures: true, results, writesInterceptedWithoutDatabaseChanges: writes.length, errors }, null, 2));
  await context.close();
} finally { await browser.close(); }

