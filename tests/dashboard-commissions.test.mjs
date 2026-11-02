import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const vite = await createServer({configFile: false, esbuild: {jsx: 'automatic'}, optimizeDeps: {noDiscovery: true, include: []}, server: {middlewareMode: true, hmr: false}, appType: 'custom'});
after(() => vite.close());
const {DashboardCommissionKpis, DashboardCommissionKpisView} = await vite.ssrLoadModule('/src/modules/admin/dashboard/DashboardCommissionKpis.tsx');
const {TeamCommissionKpis} = await vite.ssrLoadModule('/src/modules/admin/commissions/TeamCommissionKpis.tsx');
const summary = {period: {from: '2026-11-01', to: '2026-11-30', timezone: 'America/Bogota'},
  totals: {earned_amount: 50000, pending_amount: 12000, sales_count: 2, review_amount: 5000},
  by_employee: [{employee: {id: 99, name: 'SELLER_ONLY_IN_COMMISSION_MODULE'}}]};
const view = (props = {}) => renderToStaticMarkup(createElement(DashboardCommissionKpisView, {
  summary, error: '', href: '/crm/commissions?date_from=2026-11-01&date_to=2026-11-30&branch_id=19', onRetry() {}, ...props,
}));

test('dashboard commissions render only four real KPIs and a link, never management controls or seller breakdown', () => {
  const html = view();
  assert.equal((html.match(/class="dashboard-metric"/g) || []).length, 4);
  for (const label of ['Ganadas del mes', 'Pendientes del mes', 'Ventas con comisión', 'Sujetas a revisión']) assert.ok(html.includes(label));
  for (const value of ['50.000', '12.000', '5.000']) assert.ok(html.includes(value));
  assert.doesNotMatch(html, /<(?:form|input|select|table|textarea|ul)\b/);
  assert.ok(!html.includes('SELLER_ONLY_IN_COMMISSION_MODULE'));
  assert.ok(!html.includes('Mes anterior'));
  assert.match(html, /class="dashboard-panel dashboard-commission-kpis"/);
  assert.match(html, /class="dashboard-metrics"/);
  assert.match(html, /branch_id=19/);
  assert.match(html, /Ganadas no significa pagadas al vendedor/);
});

test('zero API totals remain zero indicators, not a management empty state', () => {
  const html = view({summary: {...summary, totals: {earned_amount: 0, pending_amount: 0, sales_count: 0, review_amount: 0}, by_employee: []}});
  assert.equal((html.match(/class="dashboard-metric"/g) || []).length, 4);
  assert.equal((html.match(/\$\s*0/g) || []).length, 3);
  assert.doesNotMatch(html, /<(?:form|input|select|table)\b/);
  assert.ok(!html.includes('No se encontraron comisiones'));
});

test('loading and API failure never invent zero totals and retry is operational, not a filter', () => {
  const loading = view({summary: null});
  assert.match(loading, /role="status"/);
  assert.ok(!loading.includes('class="dashboard-metric"'));
  const failure = view({summary: null, error: 'No tienes permiso para consultar comisiones.'});
  assert.match(failure, /role="alert"/);
  assert.match(failure, /No tienes permiso/);
  assert.match(failure, /Reintentar/);
  assert.ok(!failure.includes('class="dashboard-metric"'));
  assert.doesNotMatch(failure, /<(?:form|input|select|table)\b/);
});

test('dashboard respects admin/own permissions and its detail link retains the selected branch', (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  let user;
  Object.defineProperty(globalThis, 'sessionStorage', {configurable: true, value: {getItem: () => JSON.stringify(user)}});
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'sessionStorage', previous); else delete globalThis.sessionStorage; });
  const render = () => renderToStaticMarkup(createElement(DashboardCommissionKpis, {branchId: 19}));
  user = {id: 1, name: 'QA', email: 'qa@example.test', role: 'user', permissions: ['commissions.view_own']};
  assert.equal(render(), '');
  user = {...user, role: 'admin', permissions: ['dashboard.view']};
  assert.equal(render(), '');
  user = {...user, permissions: ['dashboard.view', 'commissions.view']};
  const html = render();
  assert.match(html, /Comisiones del equipo/);
  assert.match(html, /branch_id=19/);
  assert.match(html, /date_basis=event/);
  assert.doesNotMatch(html, /<(?:form|input|select|table)\b/);
});

test('full period controls remain available in the commission module component', () => {
  const html = renderToStaticMarkup(createElement(TeamCommissionKpis));
  assert.equal((html.match(/type="date"/g) || []).length, 2);
  assert.match(html, /Mes anterior/);
  assert.match(html, /Este mes/);
});
