import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const api = await vite.ssrLoadModule('/src/api/commercialDocuments.ts');
const { CommercialDocumentActions } = await vite.ssrLoadModule('/src/components/CommercialDocumentActions.tsx');
const store = new Map();
globalThis.sessionStorage = { getItem: key => store.get(key) ?? null, setItem: (k, v) => store.set(k, v), removeItem: key => store.delete(key) };
const user = permissions => sessionStorage.setItem('upgrade79_crm_user', JSON.stringify({ id: 1, name: 'QA', email: 'qa@example.test', role: 'user', permissions }));
test('document endpoints preserve admin/own scopes and reject invalid IDs', () => {
  assert.equal(api.documentPath('quotation', 'admin', 125), '/api/admin/quotations/125');
  assert.equal(api.documentPath('quotation', 'own', 125), '/api/my/quotations/125');
  assert.equal(api.documentPath('sale', 'admin', 411), '/api/admin/orders/411');
  assert.equal(api.documentPath('sale', 'own', 411), '/api/my/sales/411');
  for (const id of [0, -1, NaN, 1.5, '411/../125']) assert.throws(() => api.documentPath('sale', 'own', id));
});
test('WhatsApp normalization handles Colombian shorthand, explicit country code and invalid contacts', () => {
  for (const value of ['3001234567', '+57 (300) 123-4567', '00573001234567', '573001234567']) assert.equal(api.whatsappNumber(value), '573001234567');
  assert.equal(api.whatsappNumber('+1 202 555 0123'), '12025550123');
  for (const value of ['', '123', '1234567890', '3001234567 ext 2', 'https://bad.test', '0000', '1234567890123456']) assert.equal(api.whatsappNumber(value), null);
});
test('prepared WhatsApp message names the actual kind without claiming transmission or confirmed payment', () => {
  const doc = { title: 'Orden pendiente', code: 'ORDEN-000411', number: 'HISTORIC-411', customer: { name: 'Cliente histórico' } };
  const text = api.whatsappMessage(doc);
  assert.ok(text.includes('orden pendiente ORDEN-000411'));
  assert.ok(text.includes('Adjuntaré el PDF'));
  assert.ok(!text.includes('pago confirmado'));assert.ok(!text.includes('enviado automáticamente'));
});
test('read-only users can download but cannot see email actions', () => {
  user(['quotations.view_own']);
  const html = renderToString(createElement(CommercialDocumentActions, { kind: 'quotation', scope: 'own', id: 125 }));
  assert.ok(html.includes('Descargar PDF'));assert.ok(html.includes('Enviar por WhatsApp'));assert.ok(!html.includes('Enviar por correo'));
  assert.ok(html.includes('no cambia el estado'));
  user([]);
  assert.equal(renderToString(createElement(CommercialDocumentActions, { kind: 'quotation', scope: 'own', id: 125 })), '');
});
test('email action requires the existing send or create capability in its matching scope', () => {
  for (const kind of ['quotation', 'sale']) {
    const entity = kind === 'quotation' ? 'quotations' : 'orders';
    user([entity + '.view_own', kind === 'quotation' ? 'quotations.send_own' : 'orders.create_own']);
    assert.ok(renderToString(createElement(CommercialDocumentActions, { kind, scope: 'own', id: 125 })).includes('Enviar por correo'));
    assert.equal(renderToString(createElement(CommercialDocumentActions, { kind, scope: 'admin', id: 125 })), '');
  }
  user(['quotations.view', 'quotations.update']);
  assert.ok(renderToString(createElement(CommercialDocumentActions, { kind: 'quotation', scope: 'admin', id: 125 })).includes('Enviar por correo'));
});
