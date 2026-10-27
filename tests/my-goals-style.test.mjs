import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';

const css = await readFile(new URL('../src/modules/crm/my-goals/MyGoalsPage.css', import.meta.url), 'utf8');
const sheet = postcss.parse(css);

test('Mis metas queda aislado del administrador y de los estilos globales', async () => {
  sheet.walkRules(rule => {
    for (const selector of rule.selectors) assert.ok(selector.startsWith('.goals-page.goals-page--my'), selector);
  });
  sheet.walkDecls(decl => assert.equal(decl.prop.startsWith('--'), false));
  const personal = await readFile(new URL('../src/modules/crm/my-goals/index.ts', import.meta.url), 'utf8');
  const admin = await readFile(new URL('../src/modules/admin/goals/index.ts', import.meta.url), 'utf8');
  assert.match(personal, /import "\.\/MyGoalsPage.css"/);
  assert.doesNotMatch(admin, /MyGoalsPage.css/);
});

test('reutiliza superficies, bordes y acento CRM sin la paleta crema/cobre ni degradados', async () => {
  const tokens = await readFile(new URL('../src/styles/variables.css', import.meta.url), 'utf8');
  for (const token of ['--color-surface', '--color-border-soft', '--color-accent']) {
    assert.ok(css.includes('var(' + token + ')'));
    assert.ok(tokens.includes(token + ':'));
  }
  assert.doesNotMatch(css, /linear-gradient|#7c3f20|#9a653f|#d6975b|#fff8ef|#f0dfd1|!important/i);
  sheet.walkDecls(decl => {
    if (decl.prop === 'overflow-x') assert.equal(decl.value, 'visible');
    if (decl.prop === 'transform') assert.equal(decl.value, 'none');
  });
});

test('mantiene los colores semánticos del StatusBadge compartido y el foco visible', async () => {
  const badge = await readFile(new URL('../src/components/crm/StatusBadge/StatusBadge.css', import.meta.url), 'utf8');
  for (const color of ['#bae6fd', '#bbf7d0', '#fde68a', '#fecaca']) {
    assert.ok(css.includes(color)); assert.ok(badge.includes(color));
  }
  assert.match(css, /outline:\s*3px solid #7dd3fc/);
  assert.match(css, /button\.is-success:hover:not\(:disabled\)/);
  assert.match(css, /button\.is-danger:hover:not\(:disabled\)/);
});

test('las barras solo cambian su aspecto, sin reemplazar valores/progreso desde CSS', () => {
  sheet.walkRules(rule => {
    if (!rule.selector.includes('.goal-progress')) return;
    rule.walkDecls(decl => assert.ok(!['width', 'inline-size', 'content'].includes(decl.prop), decl.toString()));
  });
  assert.match(css, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /min-width:\s*0/);
});
