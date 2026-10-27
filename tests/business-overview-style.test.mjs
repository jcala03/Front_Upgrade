import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';

const css = await readFile(new URL('../src/modules/crm/business-overview/BusinessOverviewPage.css', import.meta.url), 'utf8');
const sheet = postcss.parse(css);

test('los ajustes visuales del resumen no afectan otros módulos ni tokens globales', () => {
  sheet.walkRules(rule => {
    for (const selector of rule.selectors) assert.ok(selector.startsWith('.business-overview'), selector);
  });
  sheet.walkDecls(declaration => assert.equal(declaration.prop.startsWith('--'), false));
});

test('el resumen reutiliza superficies/bordes globales y elimina el ámbar decorativo y fondos blancos', async () => {
  const tokens = await readFile(new URL('../src/styles/variables.css', import.meta.url), 'utf8');
  for (const name of ['--color-surface', '--color-border-soft']) {
    assert.ok(css.includes(`var(${name})`));
    assert.ok(tokens.includes(name + ':'));
  }
  assert.doesNotMatch(css, /#f59e0b|#fbbf24|background:\s*#fff(?:fff)?\b|linear-gradient|!important/i);
});

test('controles conservan focus visible, hover sin desplazamiento y error funcional legible', () => {
  const focus = sheet.nodes.find(node => node.type === 'rule' && node.selector.includes('input:focus-visible'));
  assert.ok(focus.nodes.some(node => node.prop === 'outline' && node.value === '3px solid #7dd3fc'));
  const hover = sheet.nodes.find(node => node.type === 'rule' && node.selector.includes(':hover'));
  assert.ok(hover.selector.includes(':not(:disabled)'));
  assert.equal(hover.nodes.some(node => node.prop === 'transform'), false);
  assert.ok(css.includes('input[aria-invalid="true"]'));
  assert.ok(css.includes('#fecaca'));
});
