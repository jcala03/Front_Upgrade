import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';

const entry = await readFile(new URL('../src/modules/crm/my-commerce/MyQuotationCreate.css', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/modules/crm/my-commerce/MyCommercialDialogResponsive.css', import.meta.url), 'utf8');
const sheet = postcss.parse(css);

test('el layout compartido requiere opt-in explícito: nueva cotización o Ventas, no edición', async () => {
  assert.match(entry, /@import "\.\/MyCommercialDialogResponsive.css"/);
  sheet.walkRules(rule => {
    for (const selector of rule.selectors) assert.ok(selector.startsWith(':is(.my-quotation-create-dialog, .my-sales-dialog) '), selector);
  });
  const quotations = await readFile(new URL('../src/modules/crm/my-commerce/MyQuotationsPage.tsx', import.meta.url), 'utf8');
  assert.match(quotations, /className=\{form === "new" \? "my-quotation-create-dialog" : ""\}/);
  const sales = await readFile(new URL('../src/modules/crm/my-commerce/MySalesPage.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(sales, /MyQuotationCreate|my-quotation-create-dialog/);
  assert.match(sales, /import "\.\/MyCommercialDialogResponsive.css"/);
});

test('corrige tamaños intrínsecos y anchos sin ocultar el overflow horizontal', () => {
  sheet.walkDecls(declaration => {
    assert.notEqual(declaration.prop, 'overflow-x');
    assert.ok(!['overflow', 'overflow-inline'].includes(declaration.prop), declaration.toString());
  });
  assert.match(css, /min-inline-size:\s*0/);
  assert.match(css, /width:\s*min\(880px, 100%\)/);
  assert.match(css, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /flex:\s*1 1 0/);
  const mobile = sheet.nodes.find(node => node.type === 'atrule' && node.params === '(max-width: 700px)');
  const buttons = mobile.nodes.find(node => node.type === 'rule' && node.selector.endsWith('.my-product-results button'));
  assert.ok(buttons.nodes.some(node => node.prop === 'flex-wrap' && node.value === 'nowrap'), 'Mobile column results must not wrap prices into another column');
});

test('conserva el aspecto CRM: no añade escalado, colores ni fondos nuevos', () => {
  sheet.walkDecls(declaration => assert.ok(!['transform', 'background', 'background-color', 'color'].includes(declaration.prop), declaration.toString()));
  assert.match(css, /min-width:\s*0/);
  assert.match(css, /max-width:\s*100%/);
});
