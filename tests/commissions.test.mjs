import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const vite = await createServer({ configFile: false, esbuild: { jsx: 'automatic' }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => vite.close());
const utils = await vite.ssrLoadModule('/src/modules/admin/commissions/commissionUtils.ts');
const { MyCommissionsPage } = await vite.ssrLoadModule('/src/modules/crm/my-commissions/MyCommissionsPage.tsx');
const { TeamCommissionKpis } = await vite.ssrLoadModule('/src/modules/admin/commissions/TeamCommissionKpis.tsx');
const { CommissionPeriodActions } = await vite.ssrLoadModule('/src/modules/admin/commissions/CommissionPeriodActions.tsx');
const api = await vite.ssrLoadModule('/src/api/commissions.ts');

test('commission displayed dates follow earned/created/voided event, never creation for earnings', () => {
  const row = { created_at: '2026-07-01', earned_at: '2026-08-05', voided_at: '2026-09-02' };
  assert.equal(utils.commissionEventDate({ ...row, status: 'earned' }), row.earned_at);
  assert.equal(utils.commissionEventDate({ ...row, status: 'pending' }), row.created_at);
  assert.equal(utils.commissionEventDate({ ...row, status: 'voided' }), row.voided_at);
  assert.equal(utils.commissionEventDate({ ...row, status: 'earned', earned_at: null }), null);
});

test('commercial labels require completion and payment without promising employee settlement', () => {
  assert.match(utils.commissionDescriptions.pending, /pago total/);
  assert.match(utils.commissionDescriptions.earned, /pago total confirmado/);
  assert.match(utils.commissionDescriptions.earned, /No significa pagada/);
});

test('my commissions retains one page and real period controls without asking seller identity', () => {
  const html = renderToStaticMarkup(createElement(MyCommissionsPage));
  assert.match(html, /Mis comisiones/);
  assert.equal((html.match(/type="date"/g) || []).length, 2);
  assert.ok(!html.includes('employee_id'));
  assert.match(html, /no significa pagadas al empleado/);
});

test('team dashboard links preserve period and historical branch and never use client page totals', () => {
  const html = renderToStaticMarkup(createElement(TeamCommissionKpis, { filters: { branch_id: 19, date_from: '2026-08-01', date_to: '2026-08-31', date_basis: 'event' } }));
  assert.match(html, /Comisiones del equipo/);
  assert.match(html, /branch_id=19/);
  assert.match(html, /date_from=2026-08-01/);
  assert.match(html, /date_basis=event/);
  assert.match(html, /ni pagadas al vendedor/);
  assert.ok(!html.includes('type="date"'));
});

test('month shortcuts use Colombia at the UTC month boundary and preserve leap years', () => {
  assert.deepEqual(utils.commissionMonth(0, new Date('2026-11-01T04:59:59Z')), { from: '2026-10-01', to: '2026-10-31' });
  assert.deepEqual(utils.commissionMonth(-1, new Date('2026-11-01T05:00:00Z')), { from: '2026-10-01', to: '2026-10-31' });
  assert.deepEqual(utils.commissionMonth(0, new Date('2026-11-01T05:00:00Z')), { from: '2026-11-01', to: '2026-11-30' });
  assert.deepEqual(utils.commissionMonth(-1, new Date('2026-01-15T12:00:00Z')), { from: '2025-12-01', to: '2025-12-31' });
  assert.deepEqual(utils.commissionMonth(-1, new Date('2028-03-01T12:00:00Z')), { from: '2028-02-01', to: '2028-02-29' });
});

test('period controls expose history explicitly without submitting a filter form', () => {
  const html = renderToStaticMarkup(createElement(CommissionPeriodActions, { onSelect() {} }));
  assert.match(html, /Mes anterior/);
  assert.match(html, /Este mes/);
  assert.match(html, /Por defecto se consulta el mes actual/);
  assert.equal((html.match(/type="button"/g) || []).length, 2);
});

test('commission API preserves historical filters, pagination and genuine empty responses', async (t) => {
  const originals = new Map(['fetch', 'document'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => { for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { cookie: '' } });
  const filters = { date_basis: 'event', date_from: '2026-10-01', date_to: '2026-10-31' };
  const calls = [];
  const paginator = { current_page: 1, data: [{ id: 1, amount: 50000, status: 'earned' }], last_page: 1, per_page: 20, total: 1 };
  globalThis.fetch = async (url) => { calls.push(String(url)); return Response.json({ data: { employee_linked: true, commissions: paginator } }); };
  const admin = await api.listAdminCommissions({ ...filters, employee_id: 4, branch_id: 1 });
  const own = await api.listMyCommissions(filters);
  assert.equal(admin.commissions.data[0].amount, 50000);
  assert.equal(own.commissions.total, 1);
  assert.match(calls[0], /employee_id=4/);
  for (const call of calls) { assert.match(call, /date_from=2026-10-01/); assert.match(call, /date_to=2026-10-31/); assert.match(call, /date_basis=event/); }
  assert.ok(!calls[1].includes('employee_id'));
  globalThis.fetch = async () => Response.json({ data: { employee_linked: true, commissions: { ...paginator, data: [], total: 0 } } });
  assert.equal((await api.listMyCommissions(filters)).commissions.total, 0);
});

test('commission APIs propagate authorization, validation and server errors instead of empty data', async (t) => {
  const originals = new Map(['fetch', 'document', 'window'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => { for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { cookie: '' } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { href: '' } } });
  for (const status of [401, 403, 422, 500]) {
    globalThis.fetch = async () => Response.json({ message: 'Error real de API' }, { status });
    for (const load of [api.listAdminCommissions, api.listMyCommissions, api.getMyCommissionSummary, api.getAdminCommissionSummary]) {
      await assert.rejects(load(), (cause) => cause.status === status);
    }
  }
  globalThis.fetch = async () => { throw new TypeError('Network unavailable'); };
  await assert.rejects(api.listMyCommissions(), (cause) => cause.status === 0);
});
