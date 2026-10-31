import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const vite = await createServer({ configFile: false, esbuild: { jsx: 'automatic' }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const utils = await vite.ssrLoadModule('/src/modules/admin/commissions/commissionUtils.ts');
const { MyCommissionsPage } = await vite.ssrLoadModule('/src/modules/crm/my-commissions/MyCommissionsPage.tsx');
const { TeamCommissionKpis } = await vite.ssrLoadModule('/src/modules/admin/commissions/TeamCommissionKpis.tsx');

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
