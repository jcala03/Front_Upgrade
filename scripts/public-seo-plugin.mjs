import { loadEnv } from 'vite';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { siteOrigin } from '../src/seo/model.ts';

function isBackendRoute(pathname) {
  return (
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname === '/sanctum' ||
    pathname.startsWith('/sanctum/')
  );
}

function isPwaAsset(pathname) {
  return ['/manifest.webmanifest', '/sw.js', '/offline.html'].includes(pathname) || /^\/icons\/[a-z0-9-]+\.png$/.test(pathname);
}

export function publicSeoPlugin(mode) {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = siteOrigin(
    env.PUBLIC_SITE_URL || 'https://upgradecolombia.com'
  );

  const options = {
    siteUrl,
    apiBase: env.VITE_API_BASE_URL || 'http://localhost:8000',
  };

  const plugin = {
    name: 'public-initial-html',

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(
          req.url || '/',
          'http://localhost'
        ).pathname;

        // Las rutas del backend deben pasar al proxy de Vite.
        if (isBackendRoute(pathname) || isPwaAsset(pathname)) {
          if (pathname === '/sw.js') res.setHeader('Cache-Control', 'no-cache');
          return next();
        }

        if (
          pathname.startsWith('/@') ||
          pathname.startsWith('/src/') ||
          pathname.startsWith('/node_modules/') ||
          pathname.startsWith('/assets/') ||
          pathname.startsWith('/.vite/') ||
          pathname.startsWith('/.well-known/') ||
          pathname.startsWith('/__') ||
          /\.(?:js|ts|tsx|css|json|png|svg|webp|jpg|jpeg|gif|ico|mp4|woff2?|map)$/.test(pathname)
        ) {
          return next();
        }

        try {
          const renderer = await server.ssrLoadModule(
            '/src/seo/entry-server.tsx'
          );

          let template = await server.transformIndexHtml(
            pathname,
            await readFile(resolve('index.html'), 'utf8')
          );

          if ((pathname.replace(/\/+$/, '') || '/') === '/') {
            template = template.replace(
              '</head>',
              '<link rel="stylesheet" href="/src/styles/home-initial.css?direct"></head>'
            );
          } else if (!/^\/(?:crm|admin|login)(?:\/|$)/.test(pathname)) {
            template = template.replace(
              '</head>',
              '<link rel="stylesheet" href="/src/styles/storefront-initial.css?direct"></head>'
            );
          }

          const result = await renderer.renderRequest(
            req.url || '/',
            template,
            options
          );

          res.writeHead(result.status, result.headers);
          res.end(req.method === 'HEAD' ? undefined : result.body);
        } catch (error) {
          server.ssrFixStacktrace(error);
          next(error);
        }
      });
    },

    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(
          req.url || '/',
          'http://localhost'
        ).pathname;

        // No interpretar endpoints de Laravel como páginas SEO.
        if (
          isBackendRoute(pathname) || isPwaAsset(pathname) ||
          pathname.startsWith('/assets/')
        ) {
          return next();
        }

        try {
          const renderer = await import(
            pathToFileURL(resolve('dist/seo/entry-server.js')).href
          );

          const result = await renderer.renderRequest(
            req.url || '/',
            await readFile(resolve('dist/seo/template.html'), 'utf8'),
            renderer.buildOptions
          );

          res.writeHead(result.status, result.headers);
          res.end(req.method === 'HEAD' ? undefined : result.body);
        } catch (error) {
          next(error);
        }
      });
    },
  };

  return {
    siteUrl,
    apiBase: options.apiBase,
    plugin,
  };
}
