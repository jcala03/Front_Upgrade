import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apacheRules } from '../scripts/prerender.mjs';

const origin = 'https://upgradecolombia.com';

test('HTML UTF-8 uses a core fallback outside optional Apache modules for LiteSpeed compatibility', () => {
  const rules = apacheRules([{ path: '/', file: 'index.html' }], origin);
  assert.match(rules, /^AddDefaultCharset UTF-8$/m);
  assert.equal((rules.match(/^AddDefaultCharset /gm) ?? []).length, 1);
  assert.ok(rules.indexOf('AddDefaultCharset UTF-8') < rules.indexOf('<IfModule'));
  // Simulate a server that does not implement AddCharset. The core directive
  // must remain; no dependency on detecting a fabricated mod_mime module.
  assert.match(rules.replace(/^\s*AddCharset[^\r\n]*\r?\n/gm, ''), /^AddDefaultCharset UTF-8$/m);
});

test('charset fallback never replaces asset MIME types or modifies dynamic backend routing', () => {
  const rules = apacheRules([{ path: '/', file: 'index.html' }], origin);
  assert.doesNotMatch(rules, /ForceType|Header\s+(?:always\s+)?set\s+Content-Type/i);
  assert.ok(rules.includes('RewriteRule ^tienda/[^/]+/?$ laravel-api.php [END,QSA]'));
  assert.ok(rules.includes('RewriteRule ^sitemap\\.xml$ laravel-api.php [END,QSA]'));
  assert.ok(rules.includes('RewriteCond %{REQUEST_URI} !^/(?:api|sanctum)(?:/|$) [NC]'));
  assert.match(rules, /RewriteRule \^ - \[R=404,L\]/);
});
