import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';

const css = await readFile(new URL('../src/modules/crm/my-commerce/MySalesPage.css', import.meta.url), 'utf8');
const sheet = postcss.parse(css);
const source = await readFile(new URL('../src/modules/crm/my-commerce/MySalesPage.tsx', import.meta.url), 'utf8');

test('Ventas utiliza el mismo layout responsive del formulario comercial, con opt-in en sus tres diálogos', () => {
  assert.match(source, /import "\.\/MyCommercialDialogResponsive.css"/);
  assert.match(source, /className="my-commerce my-sales"/);
  const dialogs = [...source.matchAll(/<CrmDialog className="([^"]+)"/g)];
  assert.equal(dialogs.length, 3);
  assert.ok(dialogs.every(([, classes]) => classes.split(' ').includes('my-sales-dialog')));
});

test('el CSS de Ventas queda aislado y no oculta el overflow ni altera el tema', () => {
  sheet.walkRules(rule => {
    for (const selector of rule.selectors) assert.match(selector, /^\.my-sales(?:\s|[-.]|$)/);
  });
  sheet.walkDecls(decl => assert.ok(![
    'overflow', 'overflow-x', 'overflow-inline', 'transform', 'zoom',
    'background', 'background-color', 'color', 'font-size',
  ].includes(decl.prop), decl.toString()));
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /min-width:\s*0/);
  assert.match(css, /flex:\s*1 1 0/);
});

test('productos, importes y pagos se reorganizan dentro del diálogo en móvil', () => {
  const mobile = sheet.nodes.find(node => node.type === 'atrule' && node.params === '(max-width: 700px)');
  assert.ok(mobile);
  assert.ok(mobile.nodes.some(node => node.selector === '.my-sales-dialog .my-detail-items li'
    && node.nodes.some(decl => decl.prop === 'grid-template-columns' && decl.value === 'repeat(2, minmax(0, 1fr))')));
  assert.ok(mobile.nodes.some(node => node.selector === '.my-sales-dialog .my-payments li'
    && node.nodes.some(decl => decl.prop === 'grid-template-columns' && decl.value === 'minmax(0, 1fr)')));
});
