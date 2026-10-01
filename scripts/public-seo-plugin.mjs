import { loadEnv } from 'vite';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { siteOrigin } from '../src/seo/model.ts';

export function publicSeoPlugin(mode) {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = siteOrigin(env.PUBLIC_SITE_URL || 'https://upgradecolombia.com');
  const options = { siteUrl, apiBase: env.VITE_API_BASE_URL || 'http://localhost:8000' };
  const plugin = {
    name: 'public-initial-html',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        if (pathname.startsWith('/@') || pathname.startsWith('/src/') || pathname.startsWith('/node_modules/') || pathname.startsWith('/assets/') || pathname.startsWith('/.vite/') || pathname.startsWith('/__') || /\.(?:js|ts|tsx|css|png|svg|webp|jpg|mp4|woff2?)(?:$)/.test(pathname)) return next();
        try {
          const renderer = await server.ssrLoadModule('/src/seo/entry-server.tsx');
          const template = await server.transformIndexHtml(pathname, await readFile(resolve('index.html'), 'utf8'));
          const result = await renderer.renderRequest(req.url || '/', template, options);
          res.writeHead(result.status, result.headers); res.end(req.method === 'HEAD' ? undefined : result.body);
        } catch (error) { server.ssrFixStacktrace(error); next(error); }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (new URL(req.url || '/', 'http://localhost').pathname.startsWith('/assets/')) return next();
        try {
          const renderer = await import(pathToFileURL(resolve('dist/seo/entry-server.js')).href);
          const result = await renderer.renderRequest(req.url || '/', await readFile(resolve('dist/index.html'), 'utf8'), renderer.buildOptions);
          res.writeHead(result.status, result.headers); res.end(req.method === 'HEAD' ? undefined : result.body);
        } catch (error) { next(error); }
      });
    },
  };
  return { siteUrl, plugin };
}
