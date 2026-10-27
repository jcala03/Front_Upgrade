import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const begin = '# BEGIN UPGRADE79 PUBLIC SEO';
const end = '# END UPGRADE79 PUBLIC SEO';
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function apacheRules(pages, origin) {
  const host = new URL(origin).hostname;
  const lines = [begin, 'ErrorDocument 404 /seo/404.html', '<IfModule mod_mime.c>',
    '  AddType text/plain .txt', '  AddType application/xml .xml', '</IfModule>',
    '<IfModule mod_headers.c>', '  <FilesMatch "\\.(?:html|txt|xml|webmanifest)$">',
    '    Header set Cache-Control "no-cache"', '  </FilesMatch>',
    '  <Files "sw.js">', '    Header set Cache-Control "no-cache"',
    '    Header set Service-Worker-Allowed "/"', '  </Files>',
    '  <FilesMatch "^(?:private|404)\\.html$">',
    '    Header set X-Robots-Tag "noindex, nofollow"',
    '    Header set Cache-Control "no-store"', '  </FilesMatch>',
    '  <FilesMatch "-query\\.html$">', '    Header set X-Robots-Tag "noindex, follow"', '  </FilesMatch>',
    '</IfModule>', '<IfModule mod_rewrite.c>', '  RewriteEngine On',
    `  RewriteCond %{HTTP_HOST} ^www\\.${escapeRegex(host)}$ [NC]`,
    `  RewriteRule ^ ${origin}%{REQUEST_URI} [R=301,L,NE]`,
    '  RewriteCond %{THE_REQUEST} "\\s/+index\\.html(?:[?\\s])" [NC]',
    `  RewriteRule ^index\\.html$ ${origin}/ [R=301,L,NE]`,
    // Internal rewrites/error documents may read snapshots; direct duplicate
    // URLs cannot expose templates, old snapshots or the SSR module.
    '  RewriteCond %{ENV:REDIRECT_STATUS} ^$',
    '  RewriteCond %{THE_REQUEST} "\\s/+seo(?:[/\\s?])" [NC]',
    '  RewriteRule ^seo(?:/|$) - [R=404,L]'];
  for (const page of pages) {
    const pattern = page.path === '/' ? '^$' : `^${escapeRegex(decodeURIComponent(page.path.slice(1)))}/?$`;
    const quoted = `"${pattern.replaceAll('"', '\\"')}"`;
    if (page.queryFile) {
      lines.push('  RewriteCond %{QUERY_STRING} !^$',
        '  RewriteCond %{QUERY_STRING} !^(?:(?:utm_[^=&]+|gclid|fbclid|msclkid)=[^&]*(?:&|$))+$ [NC]',
        `  RewriteRule ${quoted} ${page.queryFile} [END]`);
    }
    lines.push(`  RewriteRule ${quoted} ${page.file} [END]`);
  }
  lines.push('  RewriteRule ^(?:crm|admin)(?:/|$) seo/private.html [END]',
    '  RewriteRule ^(?:login|carrito|orden-confirmada)/?$ seo/private.html [END]',
    '  RewriteRule ^checkout(?:/|$) seo/private.html [END]',
    '  RewriteCond %{REQUEST_FILENAME} -f',
    '  RewriteRule ^ - [END]',
    '  RewriteCond %{REQUEST_URI} !^/(?:api|sanctum)(?:/|$) [NC]',
    '  RewriteCond %{REQUEST_FILENAME} !-f',
    '  RewriteRule ^ - [R=404,L]', '</IfModule>', end);
  return lines.join('\n') + '\n';
}

export async function prerender({ dist, renderer, options }) {
  const templatePath = resolve(dist, 'seo/template.html');
  // vite build refreshes index.html; keep that raw template for Node SSR/preview.
  const template = await readFile(resolve(dist, 'index.html'), 'utf8');
  if (!template.includes('<!--seo-head-->') || !template.includes('<div id="root"></div>')) {
    throw new Error('Run the client and SSR builds before prerendering.');
  }
  await mkdir(resolve(dist, 'seo/pages'), { recursive: true });
  const render = path => renderer.renderRequest(path, template, options);
  const sitemap = await render('/sitemap.xml');
  if (sitemap.status !== 200 || !sitemap.body.startsWith('<?xml')) {
    throw new Error('Public catalog unavailable: refusing to publish incomplete SEO snapshots.');
  }
  const entities = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&lt;': '<', '&gt;': '>' };
  const urls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(match => match[1].replace(/&(?:amp|quot|apos|#39|lt|gt);/g, entity => entities[entity]));
  const paths = urls.map(value => {
    const url = new URL(value);
    const decodedPath = decodeURIComponent(url.pathname);
    if (/[\r\n\0]/.test(decodedPath) || url.pathname.startsWith('/tienda/') && !/^\/tienda\/[^/]+$/.test(decodedPath)) {
      throw new Error('Sitemap contains an unsupported product path.');
    }
    if (url.origin !== options.siteUrl || url.search || url.hash || !['/', '/tienda', '/politica-de-datos'].includes(url.pathname) && !/^\/tienda\/[^/]+$/.test(url.pathname)) {
      throw new Error('Sitemap contains a noncanonical or nonpublic URL.');
    }
    return url.pathname;
  });
  if (!paths.includes('/') || !paths.includes('/tienda')) throw new Error('Sitemap lacks public entry pages.');
  const pages = [];
  for (const path of [...new Set([...paths, '/politica-de-datos', '/terminos-y-condiciones'])]) {
    const result = await render(path);
    if (result.status !== 200 || result.body.includes('<!--seo-head-->') || !/<h1\b/.test(result.body)) {
      throw new Error(`Cannot prerender public route ${path}.`);
    }
    const bootstrap = result.body.match(/<script id="public-bootstrap" type="application\/json">([\s\S]*?)<\/script>/);
    if (!bootstrap) throw new Error(`Missing hydration data for ${path}.`);
    const data = JSON.parse(bootstrap[1]);
    const body = result.body.replace(bootstrap[0], `<script id="public-bootstrap" type="application/json">${renderer.safeJson({ ...data, prerendered: true })}</script>`);
    const id = createHash('sha256').update(path).digest('hex').slice(0, 24);
    const file = path === '/' ? 'index.html' : `seo/pages/${id}.html`;
    const page = { path, file, robots: data.seo.robots };
    await writeFile(resolve(dist, file), body);
    if (path === '/tienda' || path.startsWith('/tienda/')) {
      // Arbitrary filters are noindex and retain the existing client/API flow;
      // never hydrate an unfiltered snapshot as if it matched a vehicle query.
      page.queryFile = `seo/pages/${id}-query.html`;
      const seo = { ...data.seo, robots: 'noindex, follow', structuredData: [] };
      await writeFile(resolve(dist, page.queryFile), template.replace('<!--seo-head-->', renderer.seoHead(seo)));
    }
    pages.push(page);
  }
  const robots = await render('/robots.txt');
  const privatePage = await render('/crm');
  const missing = await render('/__public_not_found__');
  await writeFile(templatePath, template);
  await writeFile(resolve(dist, 'seo/private.html'), privatePage.body);
  await writeFile(resolve(dist, 'seo/404.html'), missing.body);
  await writeFile(resolve(dist, 'robots.txt'), robots.body);
  await writeFile(resolve(dist, 'sitemap.xml'), sitemap.body);
  const rules = apacheRules(pages, options.siteUrl);
  const existing = await readFile(resolve(dist, '.htaccess'), 'utf8');
  await writeFile(resolve(dist, '.htaccess'), rules + '\n' + existing);
  await writeFile(resolve(dist, 'seo/apache.conf'), rules);
  // Replaces an obsolete SPA .htaccess copied into seo/ by older SSR builds.
  // Internal rewrites and ErrorDocument can still read these protected files.
  await writeFile(resolve(dist, 'seo/.htaccess'), [
    '<IfModule mod_rewrite.c>', '  RewriteEngine On',
    '  RewriteCond %{ENV:REDIRECT_STATUS} !^404$',
    '  RewriteCond %{THE_REQUEST} "\\s/+seo(?:[/\\s?])" [NC]',
    '  RewriteRule ^ - [R=404,L]', '</IfModule>', '',
  ].join('\n'));
  await writeFile(resolve(dist, 'seo/routes.json'), JSON.stringify({ siteUrl: options.siteUrl, generatedAt: new Date().toISOString(), pages }, null, 2));
  return pages;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dist = resolve('dist');
  const renderer = await import(pathToFileURL(resolve(dist, 'seo/entry-server.js')).href);
  const pages = await prerender({ dist, renderer, options: renderer.buildOptions });
  console.log(`Prerender: ${pages.length} public pages, robots.txt, sitemap.xml and Apache routing ready.`);
}
