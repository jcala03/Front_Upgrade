import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
