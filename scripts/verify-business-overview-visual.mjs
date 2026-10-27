// Visual-only QA on the real CRM route, with isolated browser storage and API
// fixtures. No local accounts, database rows or application behavior are edited.
import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.BUSINESS_QA_URL || 'http://127.0.0.1:5173';
const widths = [1440, 1024, 768, 430, 390, 360];
const user = { id: 900001, name: 'Usuario QA visual', email: 'visual@example.test', role: 'user', permissions: ['business_overview.view'] };
const scope = { sales_count: 1250, product_units: 3480, quotations_count: 2040, quotation_conversion_rate: 68.75, customers_served: 985,
  top_products: [{ product_id: 1, product_name: 'Pantalla multimedia compatible con sistemas originales y controles del vehículo', sku: 'UPGRADE79-PANTALLA-COMPATIBLE-ORIGINAL-123456789', units: 12450 }] };
const populated = { employee_linked: true, period: { from: '2026-10-01', to: '2026-10-26', timezone: 'America/Bogota' },
  employee: { id: 900001, name: 'Empleado QA con nombre suficientemente largo para revisar los saltos de línea' },
  branch: { id: 900001, code: 'QA-79', name: 'Sede de validación visual con nombre extendido', city: 'Barranquilla', is_active: true },
  company: scope, my_branch: scope, personal: {
    sales: { available: true, sales_count: 328, product_units: 674, sales_total: '123456789123.45' },
    quotations: { available: true, quotation_count: 789, converted_count: 328, conversion_rate: 41.57 },
    commissions: { available: true, pending_amount: 123456789.12, earned_amount: 1234567891.45, voided_amount: 0, earned_units: 320.5 },
  } };
const empty = { ...populated, branch: null, company: { sales_count: 0, product_units: 0, quotations_count: 0, quotation_conversion_rate: 0, customers_served: 0, top_products: [] },
  my_branch: null, personal: { sales: { available: false }, quotations: { available: false }, commissions: { available: false } } };
const noEmployee = { ...empty, employee_linked: false, employee: null, company: null };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
const results = [];
const errors = [];
const requests = [];
let state = 'populated';
let releaseLoading;
let loadingGate;

function inspectLayout() {
  const root = document.querySelector('.business-overview');
  const overflow = [...root.querySelectorAll('*')].filter(node => {
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 1);
  }).map(node => ({ tag: node.tagName, class: node.className, width: node.clientWidth, scroll: node.scrollWidth }));
  const card = root.querySelector('.business-overview__panel, .business-overview__state');
  return { viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, overflow,
    card: card ? { background: getComputedStyle(card).backgroundColor, image: getComputedStyle(card).backgroundImage, border: getComputedStyle(card).borderTopColor } : null,
    input: getComputedStyle(root.querySelector('input')).backgroundColor };
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  context.setDefaultNavigationTimeout(60_000);
  await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await context.addInitScript(user => sessionStorage.setItem('upgrade79_crm_user', JSON.stringify(user)), user);
  await context.route(url => url.pathname.startsWith('/api/') || url.pathname.startsWith('/sanctum/'), async route => {
    const request = route.request(); const url = new URL(request.url());
    requests.push({ path: url.pathname, query: url.search, method: request.method() });
    const headers = { 'access-control-allow-origin': new URL(origin).origin, 'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'content-type,x-xsrf-token', 'access-control-allow-methods': 'GET,OPTIONS' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (url.pathname === '/api/auth/me') return route.fulfill({ json: { user }, headers });
    if (url.pathname !== '/api/my/business-overview') return route.fulfill({ json: { data: {} }, headers });
    const requestedState = state;
    if (requestedState === 'loading') await loadingGate;
    if (requestedState === 'error') return route.fulfill({ status: 503, json: { message: 'No pudimos cargar el resumen. Intenta nuevamente.' }, headers });
    const data = requestedState === 'empty' ? empty : requestedState === 'no-employee' ? noEmployee : populated;
    return route.fulfill({ json: { data }, headers });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type()) && /hooks|hydrat|uncaught/i.test(message.text())) errors.push(message.text()); });
  await page.goto(origin + '/crm/me/business-overview');
  await page.getByRole('heading', { name: 'Actividad de la compañía' }).waitFor();
  assert.equal(await page.locator('.business-overview__metric').count(), 10);
  assert.equal(await page.locator('.business-overview__personal-card').count(), 3);
  const initialContent = await page.locator('.business-overview').innerText();

  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    const layout = await page.evaluate(inspectLayout);
    assert.ok(layout.pageWidth <= width, JSON.stringify(layout));
    assert.deepEqual(layout.overflow, [], JSON.stringify(layout));
    assert.equal(layout.card.image, 'none');
    assert.notEqual(layout.input, 'rgb(255, 255, 255)');
    assert.equal(await page.locator('.business-overview').innerText(), initialContent, 'No data disappears at narrow widths');
    const money = await page.locator('.business-overview__personal-card').first().locator('dd').last().evaluate(node => ({ height: node.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(node).lineHeight) }));
    assert.ok(money.height <= money.lineHeight + 1, 'Large currency values should not split their digits across lines: ' + JSON.stringify({ width, money }));
    await page.screenshot({ path: `/tmp/upgrade79-business-overview-${width}.png`, fullPage: true });
    const apply = page.getByRole('button', { name: 'Aplicar', exact: true });
    await apply.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    const focus = await apply.evaluate(node => ({ active: document.activeElement === node, outline: getComputedStyle(node).outlineStyle, width: getComputedStyle(node).outlineWidth }));
    assert.deepEqual(focus, { active: true, outline: 'solid', width: '3px' });
    await page.mouse.move(0, 0);
    const before = await apply.evaluate(node => getComputedStyle(node).backgroundColor);
    await apply.hover();
    await page.waitForFunction(({ selector, before }) => getComputedStyle(document.querySelector(selector)).backgroundColor !== before,
      { selector: '.business-overview__filters button[type="submit"]', before });
    assert.equal(await apply.evaluate(node => getComputedStyle(node).transform), 'none');
    const reset = page.getByRole('button', { name: 'Mes actual', exact: true });
    await page.mouse.move(0, 0);
    const resetBefore = await reset.evaluate(node => getComputedStyle(node).backgroundColor);
    await reset.hover();
    await page.waitForFunction(before => getComputedStyle(document.querySelector('.business-overview__filters .business-overview__secondary-button')).backgroundColor !== before, resetBefore);
    const dateInput = page.locator('.business-overview__filters input').first();
    await dateInput.focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await dateInput.evaluate(node => getComputedStyle(node).outlineWidth), '3px');
    if (width === 1440 || width === 360) await page.locator('.business-overview__personal-grid').screenshot({ path: `/tmp/upgrade79-business-overview-personal-${width}.png` });
    results.push({ state: 'populated', width, horizontalOverflow: false, visibleKeyboardFocus: true, hover: true, contentUnchanged: true });
  }

  // Existing validation and filter behavior must still work without extra writes.
  const dates = page.locator('.business-overview__filters input');
  await dates.nth(0).fill('2026-10-26'); await dates.nth(1).fill('2026-10-01');
  const countBeforeInvalid = requests.filter(request => request.path === '/api/my/business-overview').length;
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await page.getByText('La fecha final debe ser posterior o igual a la fecha inicial.', { exact: true }).waitFor();
  assert.equal(requests.filter(request => request.path === '/api/my/business-overview').length, countBeforeInvalid);
  assert.equal(await dates.nth(1).getAttribute('aria-invalid'), 'true');
  assert.equal(await page.locator('.business-overview__field-error').evaluate(node => getComputedStyle(node).color), 'rgb(254, 202, 202)');
  assert.deepEqual((await page.evaluate(inspectLayout)).overflow, []);
  await page.screenshot({ path: '/tmp/upgrade79-business-overview-validation-360.png', fullPage: true });
  await dates.nth(0).fill('2026-10-01'); await dates.nth(1).fill('2026-10-26');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.business-overview').getAttribute('aria-busy') === 'false');
  assert.ok(requests.some(request => request.path === '/api/my/business-overview' && request.query === '?from=2026-10-01&to=2026-10-26'));

  for (const nextState of ['empty', 'no-employee', 'error', 'loading']) {
    state = nextState;
    if (state === 'loading') loadingGate = new Promise(resolve => { releaseLoading = resolve; });
    // Reload clears the existing data only in this isolated browser test.
    await page.reload();
    if (state === 'empty') await page.getByText('Sin productos vendidos en este período.', { exact: true }).waitFor();
    if (state === 'no-employee') await page.getByText('Tu usuario todavía no tiene empleado asociado', { exact: true }).waitFor();
    if (state === 'error') await page.getByRole('alert').filter({ hasText: 'No pudimos cargar el resumen.' }).waitFor();
    if (state === 'loading') await page.getByText('Cargando resumen', { exact: true }).waitFor();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      const layout = await page.evaluate(inspectLayout);
      assert.ok(layout.pageWidth <= width, JSON.stringify(layout));
      assert.deepEqual(layout.overflow, [], JSON.stringify(layout));
      if (width === 1440 || width === 360) await page.screenshot({ path: `/tmp/upgrade79-business-overview-${state}-${width}.png`, fullPage: true });
      results.push({ state, width, horizontalOverflow: false });
    }
    if (state === 'error') assert.equal(await page.locator('.business-overview__error').evaluate(node => getComputedStyle(node).color), 'rgb(254, 202, 202)');
    if (state === 'loading') {
      releaseLoading();
      await page.getByRole('heading', { name: 'Actividad de la compañía' }).waitFor();
    }
  }
  assert.equal(requests.some(request => !['GET', 'OPTIONS'].includes(request.method)), false);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ origin, fixtureDataOnly: true, results, existingDateValidationAndQueryUnchanged: true, unexpectedWrites: false, errors }, null, 2));
  await context.close();
} finally { releaseLoading?.(); await browser.close(); }
