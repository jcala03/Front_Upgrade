import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const vite = await createServer({ configFile: false, esbuild: { jsx: 'automatic' }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => vite.close());
const { Header } = await vite.ssrLoadModule('/src/components/layout/Header/Header.tsx');
const { Footer } = await vite.ssrLoadModule('/src/components/layout/Footer/Footer.tsx');
const { LoginPage } = await vite.ssrLoadModule('/src/modules/crm/auth/LoginPage.tsx');
const { CartProvider } = await vite.ssrLoadModule('/src/context/CartContext.tsx');

test('todos los consumidores de identidad y generador usan exclusivamente el arte original', async () => {
  for (const file of [
    'src/components/layout/Header/Header.tsx', 'src/components/layout/Footer/Footer.tsx',
    'src/components/ui/SplashScreen/SplashScreen.tsx', 'src/components/ui/SplashScreen/SplashFirstPaint.tsx',
    'src/modules/crm/auth/LoginPage.tsx', 'src/modules/crm/layout/CrmLayout.tsx',
    'src/seo/client.ts', 'src/seo/entry-server.tsx', 'scripts/generate-pwa-icons.php', 'index.html',
  ]) {
    const source = await read(file);
    assert.match(source, /upgrade79-logo\.png/, file);
    assert.doesNotMatch(source, /upgrade79-logo-hq/, file);
  }
});

test('header, footer y login renderizan el original con proporción intrínseca estable', t => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: () => null, removeItem() {} } });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor); else delete globalThis.sessionStorage; });
  for (const Component of [Header, Footer, LoginPage]) {
    const html = renderToStaticMarkup(createElement(CartProvider, null, createElement(Component)));
    assert.match(html, /<img[^>]*src="[^"]*upgrade79-logo\.png"[^>]*alt="UP GRADE 79"[^>]*width="150" height="150"/);
    assert.doesNotMatch(html, /logo-hq|skewX/);
  }
});

test('cada contexto conserva dimensiones propias, contain y marca sin filtros artificiales', async () => {
  for (const [path, selector, width] of [
    ['src/components/layout/Header/Header.css', '.site-header__brand img', '100%'],
    ['src/components/layout/Footer/Footer.css', '.footer__logo img', '100%'],
    ['src/modules/crm/auth/LoginPage.css', '.crm-login__logo', '150px'],
    ['src/modules/crm/layout/CrmLayout.css', '.crm-layout__brand img', '76px'],
  ]) {
    const css = await read(path);
    const block = css.slice(css.indexOf(`${selector} {`)).split('}')[0];
    assert.ok(block.includes(`width: ${width}`));
    assert.match(block, /height:\s*auto/);
    assert.match(block, /object-fit:\s*contain/);
    assert.doesNotMatch(block, /(?:filter|mask|skew)\s*[:(]/);
  }
  const header = await read('src/components/layout/Header/Header.css');
  assert.doesNotMatch(header.slice(header.indexOf('.site-header__brand {'), header.indexOf('.site-header__nav {')), /drop-shadow|filter:/);
});

// Decode committed true-colour PNGs without requiring PHP/GD in Node CI.
function pngPixels(png) {
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.equal(png[24], 8);
  assert.ok([2, 6].includes(png[25]));
  assert.equal(png[28], 0);
  const channels = png[25] === 6 ? 4 : 3;
  const chunks = [];
  for (let offset = 8; offset < png.length;) {
    const size = png.readUInt32BE(offset);
    if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + size));
    offset += size + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * channels, pixels = Buffer.alloc(stride * height);
  const paeth = (a, b, c) => {
    const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c);
    return da <= db && da <= dc ? a : db <= dc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    assert.ok(filter <= 4);
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x;
      const left = x >= channels ? pixels[i - channels] : 0;
      const up = y ? pixels[i - stride] : 0;
      const upperLeft = y && x >= channels ? pixels[i - stride - channels] : 0;
      pixels[i] = (raw[y * (stride + 1) + 1 + x] + [0, left, up, Math.floor((left + up) / 2), paeth(left, up, upperLeft)][filter]) & 255;
    }
  }
  return { width, height, channels, pixels };
}

test('los cuatro iconos tienen tamaños técnicos y arte maskable dentro del círculo seguro', async () => {
  for (const [file, size] of [['pwa-192.png', 192], ['pwa-512.png', 512], ['pwa-maskable-512.png', 512], ['apple-touch-icon.png', 180]]) {
    const png = pngPixels(await readFile(new URL(`../public/icons/${file}`, import.meta.url)));
    assert.equal(png.width, size); assert.equal(png.height, size);
    let ink = 0;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * png.channels;
      if (png.pixels[i] === 8 && png.pixels[i + 1] === 11 && png.pixels[i + 2] === 18) continue;
      ink++;
      if (file.includes('maskable')) assert.ok(Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) <= size * 0.4);
    }
    assert.ok(ink > 100, `${file} must contain real artwork, not an empty canvas`);
  }
});
