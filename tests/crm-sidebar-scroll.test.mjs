import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/modules/crm/layout/CrmLayout.tsx', import.meta.url), 'utf8');

test('el scroll del sidebar se persiste localmente por usuario y rol antes de navegar', () => {
  assert.match(source, /sidebarScrollStoragePrefix = "upgrade79_crm_sidebar_scroll"/);
  assert.match(source, /sessionStorage\.setItem\(sidebarScrollStorageKey\(user\)/);
  assert.match(source, /onScroll=\{persistSidebarScroll\}/);
  assert.match(source, /onClick=\{\(\) => \{ persistSidebarScroll\(\);/);
});

test('el contenedor scrollable se restaura al montarse sin desplazar el menú activo', () => {
  assert.match(source, /ref=\{setNavigationScroller\}/);
  assert.match(source, /node\.scrollTop = Math\.min\(readSidebarScroll\(getAuthUser\(\)\)/);
  assert.match(source, /requestAnimationFrame\(restore\)/);
  assert.doesNotMatch(source, /scrollIntoView/);
  assert.doesNotMatch(source, /scrollTop\s*=\s*0/);
});

test('la restauración cubre los contenedores de Usuario y Administrador', () => {
  assert.match(source, /crm-layout__user-nav" aria-label="Mi espacio" onScroll=\{persistSidebarScroll\}/);
  assert.match(source, /crm-layout__admin-nav" onScroll=\{persistSidebarScroll\}/);
});
