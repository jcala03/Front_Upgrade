import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer, resolveConfig } from 'vite';
import { serviceWorkerVersion, currentServiceWorkerVersion } from '../scripts/pwa-version.mjs';

const source = await readFile(new URL('../public/sw.js', import.meta.url));
const version = currentServiceWorkerVersion();

test('SW version is deterministic SHA-256 of the exact published source, not time or package version', () => {
  assert.match(version, /^[a-f0-9]{64}$/);
  assert.equal(version, serviceWorkerVersion(source));
  assert.equal(serviceWorkerVersion('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(serviceWorkerVersion(source), serviceWorkerVersion(Buffer.from(source)));
  assert.notEqual(version, serviceWorkerVersion(Buffer.concat([source, Buffer.from('\n// next release\n')])));
});

test('real Vite production config embeds that same version and copies public files only to client dist', async () => {
  const config = await resolveConfig({ logLevel: 'silent' }, 'build', 'production');
  assert.equal(config.define.__PWA_SW_VERSION__, JSON.stringify(version));
  assert.equal(config.build.copyPublicDir, true);
  const ssr = await resolveConfig({ logLevel: 'silent', build: { ssr: 'src/seo/entry-server.tsx' } }, 'build', 'production');
  assert.equal(ssr.define.__PWA_SW_VERSION__, config.define.__PWA_SW_VERSION__);
  assert.equal(ssr.build.copyPublicDir, false);
});

const vite = await createServer({ configFile: false, define: { __PWA_SW_VERSION__: JSON.stringify(version), 'import.meta.env.PROD': 'true' },
  optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const versions = await vite.ssrLoadModule('/src/pwa/version.ts');
const pwa = await vite.ssrLoadModule('/src/pwa/register.ts');

test('worker URL is stable across reads and distinguishes old/unversioned workers', async () => {
  assert.equal(versions.SERVICE_WORKER_URL, `/sw.js?v=${version}`);
  assert.equal(versions.SERVICE_WORKER_URL, versions.SERVICE_WORKER_URL);
  assert.equal(versions.isCurrentServiceWorker({ scriptURL: `https://example.test/sw.js?v=${version}` }), true);
  for (const scriptURL of ['https://example.test/sw.js', 'https://example.test/sw.js?v=old', 'invalid']) {
    assert.equal(versions.isCurrentServiceWorker({ scriptURL }), false);
  }
  const register = await readFile(new URL('../src/pwa/register.ts', import.meta.url), 'utf8');
  const runtime = await readFile(new URL('../src/pwa/version.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(register + runtime, /Date\.now|Math\.random|crypto\.random/);
});

test('register uses versioned root scope and observes an already installing update; accept still posts SKIP_WAITING then reloads', async (t) => {
  const originals = new Map(['navigator', 'window', 'document', 'sessionStorage'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => { for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  const calls = []; const events = []; const listeners = {}; const stateListeners = {}; let reloads = 0;
  const active = { scriptURL: `https://example.test${versions.SERVICE_WORKER_URL}`, postMessage: (message) => calls.push(message.type) };
  const installing = { addEventListener: (type, handler) => { stateListeners[type] = handler; } };
  const registration = { active, waiting: null, installing, addEventListener: (type, handler) => { listeners[type] = handler; } };
  const serviceWorker = { ready: Promise.resolve(registration), register: async (url, options) => { calls.push({ url, options }); return registration; },
    addEventListener: (type, handler) => { listeners[type] = handler; } };
  for (const [key, value] of Object.entries({ navigator: { serviceWorker }, sessionStorage: { getItem: () => null },
    window: { isSecureContext: true, addEventListener() {}, dispatchEvent: (event) => events.push(event.type), location: { reload: () => { reloads++; } } },
    document: { addEventListener() {} } })) Object.defineProperty(globalThis, key, { configurable: true, value });
  pwa.registerPwa();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls[0], { url: `/sw.js?v=${version}`, options: { scope: '/', updateViaCache: 'none' } });
  assert.ok(calls.includes('PUSH_DIAGNOSTIC_CLIENT_OPEN'));
  assert.equal(events.includes(pwa.PWA_UPDATE_EVENT), false);
  assert.equal(typeof stateListeners.statechange, 'function', 'register() may have already emitted updatefound');
  registration.waiting = { postMessage: (message) => calls.push(message.type) };
  stateListeners.statechange();
  assert.ok(events.includes(pwa.PWA_UPDATE_EVENT));
  assert.ok(!calls.includes('SKIP_WAITING'));
  pwa.applyPwaUpdate(); assert.equal(calls.at(-1), 'SKIP_WAITING'); assert.equal(reloads, 0);
  listeners.controllerchange(); assert.equal(reloads, 1);
});
