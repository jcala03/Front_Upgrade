import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicFontMime } from '../scripts/public-font-assets.mjs';
import { publicSeoPlugin } from '../scripts/public-seo-plugin.mjs';
const read = (file, encoding) => readFile(new URL('../' + file, import.meta.url), encoding);
test('Oswald conserva familia, pesos, formato y licencia sin conexiones tipográficas a Google', async () => {
  const html = await read('index.html', 'utf8');
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(html, /href="\/fonts\/oswald\/oswald\.css"/);
  const css = await read('public/fonts/oswald/oswald.css', 'utf8');
  assert.equal((css.match(/@font-face/g) ?? []).length, 4); assert.doesNotMatch(css, /https?:/);
  for (const weight of [400,500,600,700]) {
    assert.match(css, new RegExp('font-weight: ' + weight));
    assert.match(css, new RegExp('/fonts/oswald/oswald-' + weight + '\\.ttf'));
    const font = await read(`public/fonts/oswald/oswald-${weight}.ttf`);
    assert.equal(font.readUInt32BE(0), 0x00010000); assert.ok(font.length > 10000);
  }
  assert.match(await read('public/fonts/oswald/OFL.txt', 'utf8'), /SIL OPEN FONT LICENSE Version 1\.1/);
});
test('la excepción estática admite únicamente los seis archivos públicos de Oswald', () => {
  for (const weight of [400,500,600,700]) assert.equal(publicFontMime(`/fonts/oswald/oswald-${weight}.ttf`), 'font/ttf');
  assert.equal(publicFontMime('/fonts/oswald/oswald.css'), 'text/css');
  assert.equal(publicFontMime('/fonts/oswald/OFL.txt'), 'text/plain');
  for (const path of ['/fonts/oswald/secret.txt','/fonts/oswald/../../.env','/fonts/oswald/%2e%2e/.env','/api/products','/sw.js','/fonts/other.ttf']) assert.equal(publicFontMime(path), null);
});
test('Vite dev/preview deja servir fuentes y dev entrega la revisión legal a SSR, preservando el proxy privado', async () => {
  const { plugin } = publicSeoPlugin('development');
  let handle; let rendered = false;
  const server = { middlewares: { use(fn) { handle = fn; } },
    ssrLoadModule: async () => ({ renderRequest: async () => { rendered = true; return { status: 200, headers: {}, body: 'review' }; } }),
    transformIndexHtml: async (_, html) => html, ssrFixStacktrace() {} };
  plugin.configureServer(server);
  const response = { writeHead() {}, end() {}, setHeader() {} };
  for (const path of ['/fonts/oswald/oswald-400.ttf','/fonts/oswald/oswald.css','/api/products','/sanctum/csrf-cookie','/sw.js','/__public-api/api/products']) {
    let next = false; await handle({url:path}, response, () => { next = true; }); assert.equal(next, true, path);
  }
  await handle({url:'/__legal-review/legal-y-privacidad',method:'GET'},response,()=>assert.fail('Review must reach SSR'));
  assert.equal(rendered, true);
  plugin.configurePreviewServer(server);
  let next = false; await handle({url:'/fonts/oswald/oswald-400.ttf'},response,()=>{next=true;});assert.equal(next,true);
});
