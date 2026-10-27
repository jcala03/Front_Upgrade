// Isolated, in-memory Fast Refresh regression. No application files are rewritten.
// PLAYWRIGHT_MODULE may point to an existing Playwright installation.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import ts from 'typescript';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const source = await readFile(new URL('../src/components/ui/SplashScreen/SplashScreen.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('useSplash.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declaration = ast.statements.find((statement) => ts.isVariableStatement(statement)
  && statement.declarationList.declarations.some((item) => item.name.getText(ast) === 'useSplash'));
assert.ok(declaration, 'useSplash definition is required');
const hook = 'import { useCallback, useEffect, useRef, useState } from "react";\n' + declaration.getText(ast);
const effect = /\n\s*useEffect\(\(\) => \{[\s\S]*?\}, \[deferUntilMounted\]\);/;
assert.match(hook, effect);
const previous = hook.replace(effect, ''); // Only a fixture: the previous three-Hook layout.
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
const results = [];

try {
  for (const registered of [false, true]) {
    const cache = await mkdtemp(join(tmpdir(), 'upgrade79-splash-hmr-'));
    const prefix = '/src/__splash_hmr_fixture__/';
    const virtualRoot = resolve(root, '.' + prefix);
    const filename = registered ? 'useSplash.tsx' : 'useSplash.ts';
    const hookId = join(virtualRoot, filename);
    let revision = 1;
    let current = previous;
    const boundary = registered ? '\nexport function SplashBoundaryFixture() { return null; }' : '';
    const fixture = {
      name: 'isolated-splash-hmr-fixture',
      resolveId(id, importer) {
        if (id.startsWith(prefix)) return resolve(root, '.' + id);
        if (importer?.startsWith(virtualRoot) && id.startsWith('./')) return resolve(dirname(importer), id);
      },
      load(id) {
        if (id === hookId) return `globalThis.__hookRevision = ${revision};\n${current}${boundary}`;
        if (id === join(virtualRoot, 'entry.tsx')) return `
          import { StrictMode } from 'react';
          import { createRoot } from 'react-dom/client';
          import AppContent from './App.tsx';
          createRoot(document.getElementById('root')).render(<StrictMode><AppContent /></StrictMode>);`;
        if (id === join(virtualRoot, 'App.tsx')) return `
          import { useState } from 'react';
          import { useSplash } from './${filename}';
          export default function AppContent() {
            const { isSplashVisible, completeSplash } = useSplash({ deferUntilMounted: globalThis.__defer ?? false });
            const [counter, setCounter] = useState(0);
            return <main><output id="counter">{counter}</output><output id="visible">{String(isSplashVisible)}</output>
              <button onClick={() => setCounter(n => n + 1)}>Increment</button>
              <button onClick={completeSplash}>Complete</button>
              <button onClick={() => { globalThis.__defer = !globalThis.__defer; setCounter(n => n + 1); }}>Toggle hydration flag</button>
            </main>;
          }`;
      },
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          if (new URL(request.url, 'http://localhost').pathname !== '/') return next();
          const html = await server.transformIndexHtml('/', `<html><head></head><body><div id="root"></div><script type="module" src="${prefix}entry.tsx"></script></body></html>`);
          response.setHeader('Content-Type', 'text/html'); response.end(html);
        });
      },
    };
    const server = await createServer({ root, cacheDir: cache, configFile: false, plugins: [fixture, react()],
      optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-dev-runtime'] }, server: { host: '127.0.0.1', port: 4194, strictPort: true } });
    const context = await browser.newContext();
    try {
      await server.listen();
      const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
      const page = await context.newPage(); const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      await page.addInitScript(() => { window.__documentToken = crypto.randomUUID(); });
      await page.goto(origin); await page.locator('#counter').waitFor();
      const token = await page.evaluate(() => window.__documentToken);
      await page.getByRole('button', { name: 'Increment', exact: true }).click({ clickCount: 2 });
      assert.equal(await page.locator('#counter').innerText(), '2');
      current = hook; revision = 2;
      await server.reloadModule(server.moduleGraph.getModuleById(hookId));
      await page.waitForFunction(() => window.__hookRevision === 2);
      await page.waitForTimeout(400);
      const hookErrors = errors.filter((message) => /order of Hooks|Rendered more hooks|Rendered fewer hooks/i.test(message));
      if (!registered) {
        assert.ok(hookErrors.length > 0, 'The previous untracked .ts module must reproduce the reported error');
        results.push({ fixture: 'previous untracked hook', reproduced: true, orderWarning: hookErrors.find((message) => /order of Hooks/.test(message))?.split('\n').slice(0, 12).join('\n') });
      } else {
        assert.deepEqual(hookErrors, []);
        assert.equal(await page.evaluate(() => window.__documentToken), token, 'Fast Refresh, not a page reload');
        assert.equal(await page.locator('#counter').innerText(), '0', 'A changed Hook signature must safely remount');
        await page.getByRole('button', { name: 'Complete', exact: true }).click();
        await page.getByRole('button', { name: 'Increment', exact: true }).click({ clickCount: 2 });
        revision = 3; current = hook + '\n// Non-structural HMR edit.\n';
        await server.reloadModule(server.moduleGraph.getModuleById(hookId));
        await page.waitForFunction(() => window.__hookRevision === 3);
        await page.waitForTimeout(400);
        assert.equal(await page.locator('#counter').innerText(), '2', 'An unchanged signature must preserve state');
        assert.equal(await page.locator('#visible').innerText(), 'false', 'A completed splash must not restart');
        await page.getByRole('button', { name: 'Toggle hydration flag' }).click({ clickCount: 2 });
        await page.waitForTimeout(100);
        assert.equal(await page.locator('#visible').innerText(), 'false');
        assert.deepEqual(errors, []);
        results.push({ fixture: 'registered React boundary', structuralHmrSafe: true, nonStructuralStatePreserved: true, hydrationFlagChangesSafe: true, splashNotRepeated: true, fullPageReload: false, hookErrors: [] });
      }
    } finally {
      await context.close(); await server.close();
      await rm(cache, { recursive: true, force: true }); // Only this mkdtemp-generated test cache.
    }
  }

  // The real landing and config, with source variants held in memory only.
  const cache = await mkdtemp(join(tmpdir(), 'upgrade79-splash-real-hmr-'));
  const splashId = resolve(root, 'src/components/ui/SplashScreen/SplashScreen.tsx');
  let actualRevision = 1;
  let actualSource = source;
  const server = await createServer({ root, cacheDir: cache, configFile: resolve(root, 'vite.config.ts'),
    plugins: [{ name: 'in-memory-splash-hmr-edit', enforce: 'pre', load(id) {
      if (id.split('?')[0] === splashId) return `${actualSource}\nif (typeof window !== 'undefined') window.__actualSplashRevision = ${actualRevision};\n`;
    } }], server: { host: '127.0.0.1', port: 4195, strictPort: true } });
  const context = await browser.newContext({ serviceWorkers: 'block', reducedMotion: 'no-preference' });
  try {
    await server.listen();
    await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
    await context.addInitScript(() => {
      window.__documentToken = crypto.randomUUID(); window.__splashMounts = 0;
      let mounted = false;
      new MutationObserver(() => {
        window.__ssrHeading ??= document.querySelector('#root h1');
        const next = Boolean(document.querySelector('.splash:not(.splash--initial)'));
        if (next && !mounted) window.__splashMounts += 1;
        mounted = next;
      }).observe(document, { childList: true, subtree: true });
    });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (['error', 'warning'].includes(message.type()) && /hooks|hydrat|#418|#423/i.test(message.text())) errors.push(message.text());
    });
    await page.goto('http://127.0.0.1:4195/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__splashMounts === 1 && !document.querySelector('.splash'));
    assert.equal(await page.evaluate(() => document.querySelector('#root h1') === window.__ssrHeading), true);
    const token = await page.evaluate(() => window.__documentToken);
    const refresh = async (revision, text) => {
      actualRevision = revision; actualSource = text;
      await server.reloadModule(server.moduleGraph.getModuleById(splashId));
      await page.waitForFunction(revision => window.__actualSplashRevision === revision, revision);
    };
    await refresh(2, source + '\n// Ordinary Fast Refresh edit, same Hook signature.\n');
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => window.__splashMounts), 1);
    assert.equal(await page.evaluate(() => document.querySelector('#root h1') === window.__ssrHeading), true);
    const structural = source.replace('const isComplete = useRef(false);', 'const isComplete = useRef(false);\n  const hmrSignatureProbe = useRef(null);');
    assert.notEqual(structural, source);
    await refresh(3, structural);
    await page.waitForFunction(() => window.__splashMounts === 2 && !document.querySelector('.splash'));
    await refresh(4, source);
    await page.waitForFunction(() => window.__splashMounts === 3 && !document.querySelector('.splash'));
    await page.evaluate(() => { location.hash = 'services'; });
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.__splashMounts), 3);
    assert.equal(await page.evaluate(() => window.__documentToken), token);
    assert.deepEqual(errors, []);
    results.push({ application: 'real landing', ssrHydrationPreserved: true, ordinaryHmrDoesNotReplaySplash: true,
      addedHookSafelyRemounts: true, removedHookSafelyRemounts: true, anchorDoesNotReplaySplash: true, fullPageReload: false, hookErrors: [] });
  } finally {
    await context.close(); await server.close(); await rm(cache, { recursive: true, force: true });
  }
  console.log(JSON.stringify({ results }, null, 2));
} finally { await browser.close(); }
