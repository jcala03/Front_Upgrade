import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const vite = await createServer({ configFile: false, envFile: false, esbuild: { jsx: 'automatic' },
  optimizeDeps: { noDiscovery: true, include: [] }, define: { __PUBLIC_SITE_URL__: JSON.stringify('https://upgradecolombia.com') },
  server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => vite.close());
const config = await vite.ssrLoadModule('/src/privacy/config.ts');
const legal = await vite.ssrLoadModule('/src/pages/Legal/LegalCenterPage.tsx');
const renderer = await vite.ssrLoadModule('/src/seo/entry-server.tsx');
const template = '<!doctype html><html lang="es"><head><!--seo-head--></head><body><div id="root"></div></body></html>';
const options = { siteUrl: 'https://upgradecolombia.com', apiBase: 'http://127.0.0.1:9999' };

test('unapproved legal identity cannot replace public policies or activate from a URL', () => {
  assert.equal(config.legalPublicationReady(), false); assert.deepEqual(config.publicLegalPaths(), []);
  assert.equal(config.legalIdentity.holderName, 'Juan Cano Jimenez'); assert.equal(config.legalIdentity.taxIdVerified, false);
  for (const [slug] of config.LEGAL_ROUTES) {
    assert.equal(config.legalRoute('/' + slug, false), null);
    assert.equal(config.legalRoute('/__legal-review/' + slug, false), null);
    assert.deepEqual(config.legalRoute('/__legal-review/' + slug, true), { slug, review: true });
  }
  assert.equal(config.legalRoute('/__legal-review/unknown', true), null);
});
test('six existing documents interpolate the natural person and never imply an independent company or a verified NIT', () => {
  assert.equal(Object.keys(legal.legalDocuments).length, 6);
  for (const [slug, source] of Object.entries(legal.legalDocuments)) {
    const text = legal.interpolateLegal(source);
    assert.match(text, /Juan Cano Jimenez/); assert.match(text, /persona natural titular del establecimiento de comercio Light Tunning Store/);
    assert.match(text, /1143149923 \(tipo de identificación pendiente de confirmar\)/);
    assert.doesNotMatch(text, /\{\{|NIT 1143149923|S\.A\.S\./);
    const blocks = legal.parseLegalDocument(source);
    assert.equal(blocks.filter(block => block.kind === 'title').length, 1, slug);
    assert.ok(blocks.filter(block => block.kind === 'heading').length >= 5, slug);
    assert.ok(blocks.filter(block => block.kind === 'paragraph').length >= 5, slug);
    assert.ok(blocks.filter(block => block.kind === 'heading').every(block => !block.text.includes('\n') && block.text.length < 100), slug);
  }
});
test('each local review document has SSR content, unique SEO, no canonical and working section anchors', async () => {
  for (const [slug, title] of config.LEGAL_ROUTES) {
    const response = await renderer.renderRequest('/__legal-review/' + slug, template, options);
    assert.equal(response.status, 200, slug); assert.equal(response.headers['X-Robots-Tag'], 'noindex, nofollow');
    assert.ok(response.body.includes(`<title>${title} |`)); assert.match(response.body, /Revisión local editorial y jurídica/);
    assert.doesNotMatch(response.body, /rel="canonical"|\{\{|Dato pendiente de aprobación.*NIT/);
    assert.equal((response.body.match(/<h1\b/g) ?? []).length, 1);
    for (const match of response.body.matchAll(/href="#(apartado-\d+)"/g)) assert.ok(response.body.includes(`id="${match[1]}"`));
    for (const [other] of config.LEGAL_ROUTES) assert.ok(response.body.includes(`href="/__legal-review/${other}"`));
  }
});
test('published legacy policies remain available; unapproved new public documents return real 404', async () => {
  for (const slug of ['politica-de-datos', 'terminos-y-condiciones']) {
    const response = await renderer.renderRequest('/' + slug, template, options);
    assert.equal(response.status, 200); assert.doesNotMatch(response.body, /Revisión local editorial y jurídica|Juan Cano Jimenez/);
  }
  for (const slug of ['politica-de-cookies','envios-y-entregas','cambios-devoluciones-y-garantias','centro-de-privacidad']) {
    assert.equal((await renderer.renderRequest('/' + slug, template, options)).status, 404);
  }
});
