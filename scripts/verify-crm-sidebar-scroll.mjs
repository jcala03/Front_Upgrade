// Uses real hard navigations from the CRM sidebar. API responses are fixtures;
// no account or database state is changed.
import assert from 'node:assert/strict';
const playwright = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { chromium } = playwright.default ?? playwright;
const origin = process.env.SIDEBAR_QA_URL || 'http://127.0.0.1:5173';
const chrome = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
const results = [], errors = [];
const user = { id: 900011, name: 'Usuario QA sidebar', email: 'sidebar-user@example.test', role: 'user', permissions: ['inventory.view_own', 'quotations.view_own', 'orders.view_own', 'business_overview.view'] };
const admin = { id: 900012, name: 'Administrador QA sidebar', email: 'sidebar-admin@example.test', role: 'admin', permissions: ['dashboard.view', 'inventory.view', 'orders.view', 'quotations.view', 'appointments.view', 'calendar.view', 'goals.view', 'employees.view', 'employee_schedules.view', 'employee_leaves.view', 'tasks.view', 'products.view', 'services.view', 'payments.view', 'commissions.view', 'reports.view', 'notifications.view', 'branches.view', 'settings.view'] };

async function addFixtures(context) {
  await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await context.route(url => url.pathname.startsWith('/api/') || url.pathname.startsWith('/sanctum/'), route => {
    const request = route.request();
    const headers = { 'access-control-allow-origin': new URL(origin).origin, 'access-control-allow-credentials': 'true' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    return route.fulfill({ status: 200, json: { data: { employee_linked: true, goals: { data: [], current_page: 1, last_page: 1, total: 0, per_page: 25 }, sales: { data: [], current_page: 1, last_page: 1, total: 0, per_page: 25 }, quotations: { data: [], current_page: 1, last_page: 1, total: 0, per_page: 25 } } }, headers });
  });
}

async function scrollAndNavigate(page, selector, href, label) {
  const before = await page.locator(selector).evaluate((node, targetHref) => {
    const target = node.querySelector(`a[href="${targetHref}"]`);
    if (!target) throw new Error(`Missing sidebar link: ${targetHref}`);
    const maximum = node.scrollHeight - node.clientHeight;
    const targetTop = target.offsetTop - node.offsetTop;
    const desired = Math.min(maximum, Math.max(1, targetTop - Math.max(8, (node.clientHeight - target.offsetHeight) / 2)));
    node.scrollTop = desired;
    node.dispatchEvent(new Event('scroll'));
    const navBounds = node.getBoundingClientRect();
    const targetBounds = target.getBoundingClientRect();
    return {
      top: node.scrollTop,
      maximum,
      targetVisible: targetBounds.top >= navBounds.top && targetBounds.bottom <= navBounds.bottom,
    };
  }, href);
  assert.ok(before.maximum > 0, label + ' must be scrollable');
  assert.ok(before.top > 0, label + ' must accept a non-zero scroll position');
  assert.equal(before.targetVisible, true, label + ' link must be visible before activation');
  await Promise.all([
    page.waitForURL(new RegExp(href.replaceAll('/', '\\/') + '$')),
    // The link has been placed within the visible scroll area above, so this
    // normal user-like click cannot cause Playwright to alter its scroll first.
    page.locator(selector + ' a[href="' + href + '"]').click(),
  ]);
  await page.locator(selector).waitFor({ state: 'attached' });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const after = await page.locator(selector).evaluate(node => ({ top: node.scrollTop, maximum: node.scrollHeight - node.clientHeight }));
  const stored = await page.evaluate(() => sessionStorage.getItem('upgrade79_crm_sidebar_scroll:' + JSON.parse(sessionStorage.getItem('upgrade79_crm_user')).id + ':' + JSON.parse(sessionStorage.getItem('upgrade79_crm_user')).role));
  assert.ok(after.top >= Math.min(before.top, after.maximum) - 2, JSON.stringify({ label, before, after, stored }));
  results.push({ label, before: before.top, after: after.top, persisted: true });
}

try {
  // A short mobile viewport makes the real Usuario drawer scrollable without
  // changing its menu or injecting artificial options.
  const userContext = await chrome.newContext({ viewport: { width: 360, height: 400 }, serviceWorkers: 'block' });
  await userContext.addInitScript(value => sessionStorage.setItem('upgrade79_crm_user', JSON.stringify(value)), user);
  await addFixtures(userContext);
  const page = await userContext.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type()) && /hooks|hydration|uncaught/i.test(message.text())) errors.push(message.text()); });
  await page.goto(origin + '/crm/me/quotations');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await scrollAndNavigate(page, '.crm-layout__user-nav', '/crm/me/goals', 'usuario cotizaciones → metas');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await scrollAndNavigate(page, '.crm-layout__user-nav', '/crm/me/calendar', 'usuario metas → calendario');
  await page.goBack(); await page.locator('.crm-layout__user-nav').waitFor({ state: 'attached' });
  const afterBack = await page.locator('.crm-layout__user-nav').evaluate(node => node.scrollTop);
  assert.ok(afterBack > 0, 'usuario atrás conserva sidebar');
  await page.goForward(); await page.locator('.crm-layout__user-nav').waitFor({ state: 'attached' });
  const afterForward = await page.locator('.crm-layout__user-nav').evaluate(node => node.scrollTop);
  assert.ok(afterForward > 0, 'usuario adelante conserva sidebar');
  await page.reload(); await page.locator('.crm-layout__user-nav').waitFor({ state: 'attached' });
  assert.ok(await page.locator('.crm-layout__user-nav').evaluate(node => node.scrollTop) > 0, 'usuario refresh conserva sidebar');
  await userContext.close();

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ origin, results, errors, noWrites: true }, null, 2));
} finally { await chrome.close(); }
