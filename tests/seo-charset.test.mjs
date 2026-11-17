import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apacheRules } from '../scripts/prerender.mjs';

const origin = 'https://upgradecolombia.com';

test('HTML UTF-8 uses a document-scoped core fallback outside optional Apache modules for LiteSpeed compatibility', () => {
  const rules = apacheRules([{ path: '/', file: 'index.html' }], origin);
  assert.match(rules, /<FilesMatch "\\\.\(\?:html\|txt\)\$">\n  AddDefaultCharset UTF-8\n<\/FilesMatch>/);
  assert.equal((rules.match(/AddDefaultCharset /g) ?? []).length, 1);
  assert.doesNotMatch(rules, /^AddDefaultCharset /m);
  assert.ok(rules.indexOf('AddDefaultCharset UTF-8') < rules.indexOf('<IfModule'));
  // Simulate a server that does not implement AddCharset. The core directive
  // must remain; no dependency on detecting a fabricated mod_mime module.
  assert.match(rules.replace(/^\s*AddCharset[^\r\n]*\r?\n/gm, ''), /  AddDefaultCharset UTF-8/);
  const extensions = new RegExp('\\.(?:html|txt)$');
  for (const file of ['index.html', 'private.html', 'robots.txt']) assert.equal(extensions.test(file), true);
  for (const file of ['app.js', 'styles.css', 'data.json', 'font.woff2', 'image.svg', 'photo.webp', 'movie.mp4', 'laravel-api.php']) assert.equal(extensions.test(file), false);
});

test('charset fallback never replaces asset MIME types or modifies dynamic backend routing', () => {
  const rules = apacheRules([{ path: '/', file: 'index.html' }], origin);
  assert.doesNotMatch(rules, /ForceType|Header\s+(?:always\s+)?set\s+Content-Type/i);
  assert.ok(rules.includes('RewriteRule ^tienda/[^/]+/?$ laravel-api.php [END,QSA]'));
  assert.ok(rules.includes('RewriteRule ^sitemap\\.xml$ laravel-api.php [END,QSA]'));
  assert.ok(rules.includes('RewriteCond %{REQUEST_URI} !^/(?:api|sanctum)(?:/|$) [NC]'));
  assert.match(rules, /RewriteRule \^ - \[R=404,L\]/);
});
