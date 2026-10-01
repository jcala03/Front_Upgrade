// Runtime público: HTML para todos los User-Agents. No SPA fallback estático.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { renderRequest, buildOptions } from '../dist/seo/entry-server.js';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const assets = resolve(dist, 'assets');
const template = await readFile(resolve(dist, 'index.html'), 'utf8');
if (!template.includes('<!--seo-head-->') || !template.includes('<div id="root"></div>')) throw new Error('Template SEO inválido: reconstruye dist completo.');
const options = buildOptions;
if (process.env.PUBLIC_SITE_URL && process.env.PUBLIC_SITE_URL.replace(/\/$/, '') !== buildOptions.siteUrl) throw new Error('PUBLIC_SITE_URL difiere del build: reconstruye con el mismo dominio.');
if (process.env.VITE_API_BASE_URL && process.env.VITE_API_BASE_URL.replace(/\/$/, '') !== buildOptions.apiBase.replace(/\/$/, '')) throw new Error('VITE_API_BASE_URL difiere del build: SSR y SPA deben consultar el mismo catálogo.');
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };

http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD', 'X-Robots-Tag': 'noindex, nofollow' }); return res.end(); }
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname.startsWith('/assets/')) {
      let file;
      try { file = resolve(dist, '.' + decodeURIComponent(pathname)); } catch { res.writeHead(400); return res.end(); }
      if (!file.startsWith(assets + '/')) { res.writeHead(404); return res.end(); }
      const info = await stat(file).catch(() => null);
      if (!info?.isFile()) { res.writeHead(404); return res.end(); }
      const headers = { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' };
      const range = req.headers.range;
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        const start = match?.[1] ? Number(match[1]) : match?.[2] ? Math.max(0, info.size - Number(match[2])) : NaN;
        const end = match?.[1] && match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); return res.end(); }
        res.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${info.size}` });
        if (req.method === 'HEAD') return res.end();
        createReadStream(file, { start, end }).pipe(res); return;
      }
      if (/\.(js|css|svg)$/.test(file) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
        const bytes = gzipSync(await readFile(file));
        res.writeHead(200, { ...headers, Vary: 'Accept-Encoding', 'Content-Encoding': 'gzip', 'Content-Length': bytes.length }); return res.end(req.method === 'HEAD' ? undefined : bytes);
      }
      res.writeHead(200, { ...headers, 'Content-Length': info.size });
      if (req.method === 'HEAD') return res.end();
      createReadStream(file).pipe(res); return;
    }
    const result = await renderRequest(req.url, template, options);
    const compress = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    const bytes = compress ? gzipSync(result.body) : Buffer.from(result.body);
    res.writeHead(result.status, { ...result.headers, ...(compress ? { Vary: 'Accept-Encoding', 'Content-Encoding': 'gzip' } : {}), 'Content-Length': bytes.length });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Retry-After': '60' }); res.end('Temporalmente no disponible.');
  }
}).listen(Number(process.env.PORT || 4173), process.env.HOST || '127.0.0.1', () => console.log('Servidor SEO local listo; PUBLIC_SITE_URL=' + options.siteUrl));
