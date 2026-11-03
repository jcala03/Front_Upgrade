import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, esbuild: { jsx: 'automatic' }, define: { __PUBLIC_SITE_URL__: JSON.stringify('https://upgradecolombia.com') }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => vite.close());
const { Header } = await vite.ssrLoadModule('/src/components/layout/Header/Header.tsx');
const { Footer } = await vite.ssrLoadModule('/src/components/layout/Footer/Footer.tsx');
const { CartProvider } = await vite.ssrLoadModule('/src/context/CartContext.tsx');
const { LoginPage } = await vite.ssrLoadModule('/src/modules/crm/auth/LoginPage.tsx');
const { renderRequest } = await vite.ssrLoadModule('/src/seo/entry-server.tsx');

test('public header has no CRM login link and retains public navigation, cart and quotation', () => {
  for (const pathname of ['/', '/tienda', '/tienda/producto-qa', '/carrito']) {
    const html = renderToStaticMarkup(createElement(CartProvider, null, createElement(Header, { pathname })));
    assert.doesNotMatch(html, /href="\/login"|Iniciar sesión|site-header__login/);
    assert.match(html, /href="\/carrito"/);
    assert.match(html, /aria-label="Cotizar upgrade automotriz por WhatsApp"/);
    assert.match(html, /aria-label="Navegación principal"/);
    assert.match(html, /href="(?:\/)?#projects"/);
    assert.match(html, /href="(?:\/)?#contact"/);
  }
});

test('every public footer exposes one native Employees link to the existing login route', () => {
  for (const pathname of ['/', '/tienda', '/tienda/producto-qa', '/politica-de-datos', '/terminos-y-condiciones']) {
    const html = renderToStaticMarkup(createElement(Footer, { pathname }));
    const matches = html.match(/<a class="footer__employees" href="\/login">Empleados<\/a>/g) ?? [];
    assert.equal(matches.length, 1, pathname);
    assert.equal((html.match(/href="\/login"/g) ?? []).length, 1);
    assert.match(html, /Navegación/);
    assert.match(html, /Powered by Innovative Online Industries/);
    assert.match(html, /href="(?:\/)?#contact"/);
  }
});

test('login return is a root-relative anchor, not a submit, without changing the stored user', (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const user = JSON.stringify({ id: 7, role: 'user', permissions: ['commissions.view_own'] });
  const storage = new Map([['upgrade79_crm_user', user]]);
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: (key) => storage.get(key) ?? null,
    removeItem: (key) => storage.delete(key),
  } });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor); else delete globalThis.sessionStorage; });
  const html = renderToStaticMarkup(createElement(LoginPage));
  assert.match(html, /<a class="crm-login__back" href="\/">[\s\S]*?Ir atrás<\/a>/);
  assert.equal((html.match(/type="submit"/g) ?? []).length, 1);
  assert.match(html, /type="email" autoComplete="username"/);
  assert.match(html, /type="password" autoComplete="current-password"/);
  assert.match(html, /Entrar al CRM/);
  assert.equal(storage.get('upgrade79_crm_user'), user);
});

test('login retains the current submit flow and role redirects, never history-based return', async () => {
  const source = await readFile(new URL('../src/modules/crm/auth/LoginPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /await login\(email, password\)/);
  assert.match(source, /saveAuthUser\(response\.user\)/);
  assert.match(source, /response\.user\.role === "admin" \? "\/crm" : "\/crm\/me"/);
  assert.doesNotMatch(source, /history\.back|history\.go|navigate\(-1\)|clearAuthSession|logout\(/);
});

test('employee and return controls provide 44px targets and keyboard focus without global style changes', async () => {
  for (const [file, selector] of [
    ['../src/components/layout/Footer/Footer.css', '.footer__employees'],
    ['../src/modules/crm/auth/LoginPage.css', '.crm-login__back'],
  ]) {
    const css = await readFile(new URL(file, import.meta.url), 'utf8');
    const escaped = selector.replaceAll('.', '\\.');
    assert.match(css, new RegExp(escaped + '\\s*\\{[^}]*min-height:\\s*44px'));
    assert.match(css, new RegExp(escaped + ':focus-visible\\s*\\{[^}]*outline:\\s*2px'));
  }
});

test('SSR includes the new public access once without restoring a header login', async (t) => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ data: [] });
  t.after(() => { globalThis.fetch = original; });
  for (const path of ['/', '/tienda']) {
    const result = await renderRequest(path, '<html><head><!--seo-head--></head><body><div id="root"></div></body></html>', { siteUrl: 'https://upgradecolombia.com', apiBase: 'http://api.example.test' });
    assert.equal(result.status, 200);
    assert.equal((result.body.match(/href="\/login"/g) ?? []).length, 1);
    assert.match(result.body, />Empleados<\/a>/);
    const header = result.body.match(/<header\b[\s\S]*?<\/header>/)?.[0];
    assert.ok(header);
    assert.doesNotMatch(header, /Iniciar sesión|href="\/login"/);
  }
});
