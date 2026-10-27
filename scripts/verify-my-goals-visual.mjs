// Real route/components with isolated API fixtures. Never forwards a write.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.GOALS_QA_URL || 'http://127.0.0.1:5173';
const widths = (process.env.GOALS_QA_WIDTHS || '1440,1280,1024,768,430,390,360').split(',').map(Number);
const user = { id: 900001, name: 'Usuario QA visual', email: 'goals@example.test', role: 'user', permissions: [] };
const base = { id: 901, employee_id: 900001, employee: { id: 900001, name: 'Empleado QA con nombre extendido para revisar legibilidad', is_active: true },
  source: 'personal', title: 'Mejorar seguimiento comercial e instalación de accesorios compatibles durante el período de evaluación',
  description: 'Descripción extendida de la meta. ReferenciaSinEspaciosParaComprobarSaltosDeLínea1234567890123456789012345678901234567890',
  metric_type: 'manual', target_value: '100', current_value: '45.5', unit: 'ventas', progress_percentage: '45.5',
  starts_on: '2026-10-01', due_on: '2026-10-31', status: 'active', effective_status: 'active',
  completed_at: null, cancelled_at: null, created_at: '2026-10-01T14:30:00Z', updated_at: '2026-10-26T15:00:00Z' };
const goals = [
  base,
  { ...base, id: 902, title: 'Meta completada', status: 'completed', effective_status: 'completed', current_value: 100, progress_percentage: 100, completed_at: '2026-10-25T14:30:00Z' },
  { ...base, id: 903, title: 'Meta vencida asignada', source: 'assigned', effective_status: 'expired', due_on: '2026-10-01', current_value: 0, progress_percentage: 0 },
  { ...base, id: 904, title: 'Meta cancelada', status: 'cancelled', effective_status: 'cancelled', cancelled_at: '2026-10-25T14:30:00Z' },
  { ...base, id: 905, title: 'Avance manual sin objetivo numérico', target_value: null, current_value: 12, progress_percentage: null },
  { ...base, id: 906, title: 'Objetivo superado con unidad extendida', target_value: '1000000000.5', current_value: '1250000000.75', unit: 'unidades de seguimiento especializado', progress_percentage: '125.0000000125' },
];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
const results = [], errors = [], writes = [];
let state = 'populated', releaseLoading, gate;
let authUser = user;

function inspect() {
  const root = document.querySelector('.goals-page--my');
  const nodes = [root, ...root.querySelectorAll('*')];
  const overflow = nodes.filter(node => {
    const rect = node.getBoundingClientRect();
    if (!rect.width || getComputedStyle(node).position === 'absolute' && node.classList.contains('sr-only')) return false;
    const native = ['INPUT', 'SELECT', 'OPTION', 'TEXTAREA'].includes(node.tagName);
    return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1 || (!native && node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 1);
  }).map(node => ({ tag: node.tagName, class: String(node.className), width: node.clientWidth, scroll: node.scrollWidth }));
  const surface = root.querySelector('.goal-card, .goals-state, .goals-page__header');
  const backdrop = root.querySelector('.crm-dialog__backdrop');
  return { viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth, overflow,
    backdrop: backdrop ? getComputedStyle(backdrop).backgroundColor : null,
    surface: { background: getComputedStyle(surface).backgroundColor, image: getComputedStyle(surface).backgroundImage },
    progress: [...root.querySelectorAll('[role="progressbar"]')].filter(node => node.getBoundingClientRect().width).map(node => ({
      label: node.getAttribute('aria-label'), current: node.getAttribute('aria-valuenow'), target: node.getAttribute('aria-valuemax'),
      width: node.firstElementChild.style.width, background: getComputedStyle(node.firstElementChild).backgroundImage,
    })) };
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  context.setDefaultNavigationTimeout(60000);
  await context.addInitScript(user => sessionStorage.setItem('upgrade79_crm_user', JSON.stringify(user)), user);
  await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await context.route(url => url.pathname.startsWith('/api/') || url.pathname.startsWith('/sanctum/'), async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    const headers = { 'access-control-allow-origin': new URL(origin).origin, 'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET,OPTIONS', 'access-control-allow-headers': 'content-type,x-xsrf-token' };
    const respond = (json, status = 200) => route.fulfill({ status, json, headers });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (request.method() !== 'GET') { writes.push(path); return respond({ message: 'Blocked QA write' }, 400); }
    if (path === '/api/auth/me') return respond({ user: authUser });
    if (path === '/api/admin/goals') return respond({ data: { data: goals, current_page: 1, last_page: 1, total: goals.length, per_page: 25 } });
    if (path === '/api/admin/employees') return respond({ data: { data: [], current_page: 1, last_page: 1, total: 0, per_page: 100 } });
    if (path === '/api/my/goals') {
      const requested = state;
      if (requested === 'loading') await gate;
      if (requested === 'error') return respond({ message: 'Error de prueba al cargar metas.' }, 503);
      return respond({ data: { employee_linked: requested !== 'no-employee',
        goals: { data: ['empty', 'no-employee'].includes(requested) ? [] : goals, current_page: 1, last_page: 1, total: ['empty', 'no-employee'].includes(requested) ? 0 : goals.length, per_page: 25 } } });
    }
    if (/^\/api\/my\/goals\/\d+$/.test(path)) return respond({ data: goals.find(goal => goal.id === Number(path.split('/').at(-1))) });
    errors.push('Unexpected request: ' + path); return respond({ message: 'Unconfigured fixture' }, 404);
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (['error', 'warn'].includes(message.type()) && /hooks|hydrat|uncaught/i.test(message.text())) errors.push(message.text()); });
  const check = async (name, width) => {
    const layout = await page.evaluate(inspect);
    assert.ok(layout.page <= layout.viewport, JSON.stringify({ name, width, layout }));
    assert.deepEqual(layout.overflow, [], JSON.stringify({ name, width, layout }));
    assert.equal(layout.surface.image, 'none');
    assert.notEqual(layout.surface.background, 'rgb(255, 255, 255)');
    if (layout.backdrop) assert.equal(layout.backdrop, 'rgba(2, 6, 13, 0.78)');
    for (const progress of layout.progress) assert.equal(progress.background, 'none');
    results.push({ state: name, width, fits: true });
    console.log('[my-goals] ' + width + ' ' + name);
    return layout;
  };
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    state = 'populated'; await page.goto(origin + '/crm/me/goals');
    const root = page.locator('.goals-page--my');
    await root.locator('.goals-page__content').waitFor();
    const visibleRows = width > 1300 ? root.locator('tbody tr') : root.locator('.goal-card');
    assert.equal(await root.getByRole('button', { name: 'Filtrar', exact: true }).isVisible(), width <= 640);
    assert.equal(await visibleRows.count(), 6);
    let layout = await check('populated-six-goal-states', width);
    assert.deepEqual(layout.progress.map(item => item.width), ['45.5%', '100%', '0%', '45.5%', '100%']);
    assert.deepEqual(layout.progress.map(item => Number(item.current)), [45.5, 100, 0, 45.5, 1250000000.75]);
    assert.match(await visibleRows.nth(5).innerText(), /125%/);
    const expectedColors = ['rgb(186, 230, 253)', 'rgb(187, 247, 208)', 'rgb(253, 230, 138)', 'rgb(254, 202, 202)'];
    for (let index = 0; index < 4; index++) {
      const badge = visibleRows.nth(index).locator('.crm-status-badge').first();
      assert.equal(await badge.evaluate(node => getComputedStyle(node).color), expectedColors[index]);
      assert.equal(await badge.locator('span').last().evaluate(node => getComputedStyle(node).color), expectedColors[index]);
    }
    await page.screenshot({ path: '/tmp/upgrade79-my-goals-' + width + '.png', fullPage: true });
    if (width <= 640) await root.getByRole('button', { name: 'Filtrar', exact: true }).click();
    await check('filters-open', width);
    const search = root.getByRole('searchbox');
    await search.focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await search.evaluate(node => getComputedStyle(node).outlineWidth), '3px');
    const create = root.locator('.goals-page__header button');
    await create.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    assert.equal(await create.evaluate(node => getComputedStyle(node).outlineWidth), '3px');
    await page.mouse.move(0, 0);
    const before = await create.evaluate(node => getComputedStyle(node).backgroundColor);
    await create.hover();
    await page.waitForFunction(before => getComputedStyle(document.querySelector('.goals-page__header button')).backgroundColor !== before, before);
    assert.equal(await create.evaluate(node => getComputedStyle(node).transform), 'none');
    await create.click();
    let modal = page.getByRole('dialog');
    await modal.getByRole('heading', { name: 'Crear meta personal' }).waitFor();
    await check('create-dialog', width);
    assert.notEqual(await modal.getByLabel('Título', { exact: true }).evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)');
    await page.keyboard.press('Escape');
    await visibleRows.first().getByRole('button', { name: 'Ver', exact: true }).click();
    await modal.locator('.goal-detail__body').waitFor();
    await check('detail-dialog', width);
    await page.screenshot({ path: '/tmp/upgrade79-my-goals-detail-' + width + '.png' });
    await page.keyboard.press('Escape');
    for (const [action, title, name] of [
      ['Editar', 'Editar meta', 'edit-dialog'],
      ['Avance', 'Actualizar avance', 'progress-dialog'],
      ['Completar', 'Completar meta', 'complete-dialog'],
      ['Cancelar', 'Cancelar meta', 'cancel-dialog'],
    ]) {
      await visibleRows.first().getByRole('button', { name: action, exact: true }).click();
      await modal.getByRole('heading', { name: title, exact: true }).waitFor();
      await check(name, width);
      await page.keyboard.press('Escape');
    }
    for (const next of ['empty', 'error', 'no-employee', 'loading']) {
      state = next;
      if (next === 'loading') gate = new Promise(resolve => { releaseLoading = resolve; });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByText(next === 'empty' ? 'Aún no tienes metas'
        : next === 'error' ? 'No pudimos cargar las metas'
        : next === 'no-employee' ? 'Tu cuenta todavía no está vinculada a un empleado.' : 'Cargando metas...', { exact: true }).waitFor();
      await check(next, width);
      if (next === 'loading') { releaseLoading(); await page.locator('.goals-page__content').waitFor(); }
    }
  }
  // Compare admin before/after explicitly loading the same personal stylesheet.
  authUser = { ...user, role: 'admin', permissions: ['goals.view', 'goals.create', 'goals.update', 'goals.cancel'] };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await context.addInitScript(admin => sessionStorage.setItem('upgrade79_crm_user', JSON.stringify(admin)), authUser);
  await page.goto(origin + '/crm/goals');
  await page.locator('.goals-page--admin .goals-page__content').waitFor();
  const inspectAdmin = root => ({
    text: getComputedStyle(root).color,
    header: getComputedStyle(root.querySelector('.goals-page__header')).backgroundImage,
    primary: getComputedStyle(root.querySelector('.goals-page__header button')).backgroundColor,
    bar: getComputedStyle(root.querySelector('.goal-progress__bar span')).backgroundImage,
  });
  const beforeAdmin = await page.locator('.goals-page--admin').evaluate(inspectAdmin);
  await page.addStyleTag({ content: await readFile(new URL('../src/modules/crm/my-goals/MyGoalsPage.css', import.meta.url), 'utf8') });
  const admin = await page.locator('.goals-page--admin').evaluate(inspectAdmin);
  assert.deepEqual(admin, beforeAdmin);
  assert.equal(admin.text, 'rgb(36, 23, 17)');
  assert.match(admin.header, /linear-gradient/);
  assert.equal(admin.primary, 'rgb(124, 63, 32)');
  assert.match(admin.bar, /linear-gradient/);
  assert.deepEqual(errors, []); assert.deepEqual(writes, []);
  await context.unrouteAll({ behavior: 'wait' });
  await context.close();
  console.log(JSON.stringify({ origin, results, errors, writes, progressUnchanged: true, adminStylesUnchanged: true }, null, 2));
} finally { await browser.close(); }
