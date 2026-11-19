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

test('only the two approved privacy policies publish; other drafts and URL activation stay closed', () => {
  assert.equal(config.legalPublicationReady(), false);
  assert.deepEqual(config.publicLegalPaths(), ['/politica-de-datos', '/politica-de-cookies']);
  assert.equal(config.legalIdentity.holderName, 'Juan Cano Jimenez'); assert.equal(config.legalIdentity.taxIdVerified, true);
  assert.equal(config.legalIdentity.taxIdType, 'NIT'); assert.equal(config.legalIdentity.taxId, '1143149923-4');
  assert.equal(config.legalIdentity.effectiveDate, '2026-11-19');
  assert.equal(config.legalIdentity.reviewed, false); assert.equal(config.LEGAL_RELEASE_READY, false);
  for (const [slug] of config.LEGAL_ROUTES) {
    assert.deepEqual(config.legalRoute('/' + slug, false), config.APPROVED_PRIVACY_SLUGS.includes(slug) ? { slug, review: false } : null);
    assert.equal(config.legalRoute('/__legal-review/' + slug, false), null);
    assert.deepEqual(config.legalRoute('/__legal-review/' + slug, true), { slug, review: true });
  }
  assert.equal(config.legalRoute('/__legal-review/unknown', true), null);
});
test('six documents use the approved natural-person identity without implying a separate company', () => {
  assert.equal(Object.keys(legal.legalDocuments).length, 6);
  for (const [slug, source] of Object.entries(legal.legalDocuments)) {
    const text = legal.interpolateLegal(source);
    assert.match(text, /Juan Cano Jimenez/); assert.match(text, /persona natural titular del establecimiento de comercio Light Tunning Store/);
    assert.match(text, /NIT 1143149923-4/);
    assert.doesNotMatch(text, /\{\{|tipo de identificación pendiente|S\.A\.S\./);
    const blocks = legal.parseLegalDocument(source);
    assert.equal(blocks.filter(block => block.kind === 'title').length, 1, slug);
    assert.ok(blocks.filter(block => block.kind === 'heading').length >= 5, slug);
    assert.ok(blocks.filter(block => block.kind === 'paragraph').length >= 5, slug);
    assert.ok(blocks.filter(block => block.kind === 'heading').every(block => !block.text.includes('\n') && block.text.length < 100), slug);
  }
});
test('public policy candidates have complete approved identity, date and no editorial placeholders', () => {
  for (const slug of ['politica-de-datos', 'politica-de-cookies']) {
    const source = legal.legalDocuments[slug];
    for (const value of ['Juan Cano Jimenez', 'Light Tunning Store', 'UP GRADE 79', '1143149923-4',
      'Carrera 44 #79-04', '302 388 7034', 'jcano@upgradecolombia.com', '19 de noviembre de 2026']) assert.ok(source.includes(value), value);
    assert.doesNotMatch(source, /\{\{|pendiente de (?:aprobar|aprobación|confirmar|verificar)|\b(?:borrador|propuesta)\b|debe verificarse|antes de publicar|requiere revisión/i);
    assert.match(source, /Configuración de cookies/);
    assert.match(source, /2 meses/); assert.match(source, /14 meses/);
    assert.match(source, /reinicio del plazo por nueva actividad está desactivado/i);
  }
  const privacy = legal.legalDocuments['politica-de-datos'];
  assert.match(privacy, /finalidades informadas/); assert.match(privacy, /obligaciones legales o contractuales/);
  assert.match(privacy, /diez días hábiles/); assert.match(privacy, /quince días hábiles/);
  assert.match(privacy, /cinco días hábiles adicionales/); assert.match(privacy, /ocho días hábiles adicionales/);
  const cookies = legal.legalDocuments['politica-de-cookies'];
  assert.match(cookies, /180 días/); assert.match(cookies, /500 referencias/);
  assert.match(cookies, /no es el período de conservación de datos en los servidores/);
  assert.match(cookies, /ad_storage, ad_user_data y ad_personalization permanecen denegados/);
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
test('approved policies have clean public HTML; legacy terms and unapproved drafts stay protected', async () => {
  for (const slug of ['politica-de-datos', 'politica-de-cookies']) {
    const response = await renderer.renderRequest('/' + slug, template, options);
    assert.equal(response.status, 200); assert.match(response.body, /NIT 1143149923-4/);
    assert.match(response.body, /19 de noviembre de 2026/);
    assert.doesNotMatch(response.body, /Revisión local editorial y jurídica|Inventario de código y observación|tabla definitiva exige|Borrador local|\{\{/);
    assert.doesNotMatch(response.body, /href="\/(?:legal-y-privacidad|envios-y-entregas|cambios-devoluciones-y-garantias|centro-de-privacidad)"/);
  }
  const terms = await renderer.renderRequest('/terminos-y-condiciones', template, options);
  assert.equal(terms.status, 200); assert.doesNotMatch(terms.body, /Juan Cano Jimenez/);
  for (const slug of ['legal-y-privacidad','envios-y-entregas','cambios-devoluciones-y-garantias','centro-de-privacidad']) {
    assert.equal((await renderer.renderRequest('/' + slug, template, options)).status, 404);
  }
});
