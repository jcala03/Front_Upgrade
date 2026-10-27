// Local browser regression: hold the entry module to inspect the actual SSR
// first paint, then release it and verify the uninterrupted animated handoff.
// No app source/storage is rewritten. PLAYWRIGHT_MODULE is optional.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, preview } from 'vite';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const cache = await mkdtemp(join(tmpdir(), 'upgrade79-splash-first-paint-'));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
const results = [];
const errors = [];

function traceFirstPaint() {
  const trace = window.__splashTrace = { frames: 0, uncoveredFrames: 0, mounts: 0, handoff: null, ready: false };
  let mounted = false;
  new MutationObserver(() => {
    window.__ssrHeading ??= document.querySelector('#root h1');
    const next = Boolean(document.querySelector('.splash:not(.splash--initial)'));
    if (next && !mounted) trace.mounts += 1;
    if (!next && mounted && trace.animation) trace.animation.endedAt = performance.now() - trace.animation.startedAt;
    mounted = next;
  }).observe(document, { childList: true, subtree: true });
  window.addEventListener('upgrade79:splash-ready', () => {
    const real = document.querySelector('.splash:not(.splash--initial)');
    const logoRect = real.querySelector('.splash__logo-wrap').getBoundingClientRect();
    trace.animation = { startedAt: performance.now(), logoCenter: logoRect.x + logoRect.width / 2,
      logoMotionAt: null, trackMotionAt: null, firstEffectAt: null, tracksReadyAt: null,
      smokeReadyAt: null, fadeAt: null, logoOutsideAtFade: null, endedAt: null, maxSmokeOpacity: 0, effectsVisibleFrames: 0 };
    trace.handoff = {
      rootVisible: getComputedStyle(document.getElementById('root')).visibility === 'visible',
      backdropOpacity: Number(getComputedStyle(real.querySelector('.splash__backdrop')).opacity),
      logoOpacity: Number(getComputedStyle(real.querySelector('.splash__logo-wrap')).opacity),
      imageReady: real.querySelector('img').complete,
    };
  });
  function frame() {
    const root = document.getElementById('root');
    const real = document.querySelector('.splash:not(.splash--initial)');
    const animation = trace.animation;
    if (real && animation) {
      const elapsed = performance.now() - animation.startedAt;
      if (getComputedStyle(real.querySelector('.splash__effects')).display !== 'none') {
        animation.effectsVisibleFrames += 1;
        const smoke = [...real.querySelectorAll('.splash__smoke-form')].map(node => Number(getComputedStyle(node).opacity));
        animation.maxSmokeOpacity = Math.max(animation.maxSmokeOpacity, ...smoke);
        if (smoke[0] > 0.05) animation.firstEffectAt ??= elapsed;
        if (smoke[0] >= 0.5 && smoke[1] >= 0.38 && smoke[2] >= 0.28) animation.smokeReadyAt ??= elapsed;
        const logoRect = real.querySelector('.splash__logo-wrap').getBoundingClientRect();
        if (logoRect.x + logoRect.width / 2 > animation.logoCenter + 8) animation.logoMotionAt ??= elapsed;
        if (Number(real.querySelector('.splash__track-reveal--upper').getAttribute('width')) >= 8) animation.trackMotionAt ??= elapsed;
        if (Number(real.querySelector('.splash__track-reveal--lower').getAttribute('width')) >= 939) animation.tracksReadyAt ??= elapsed;
      }
      if (animation.fadeAt === null && Number(getComputedStyle(real.querySelector('.splash__backdrop')).opacity) < 0.999) {
        animation.fadeAt = elapsed;
        animation.logoOutsideAtFade = real.querySelector('.splash__logo-wrap').getBoundingClientRect().left >= innerWidth;
      }
    }
    if (root && !trace.ready) {
      trace.frames += 1;
      const visible = getComputedStyle(root).visibility === 'visible';
      const initial = document.getElementById('initial-splash');
      const initiallyCovered = initial && getComputedStyle(initial).display !== 'none';
      const animatedCover = real && Number(getComputedStyle(real.querySelector('.splash__backdrop')).opacity) === 1;
      if (visible && !initiallyCovered && !animatedCover) trace.uncoveredFrames += 1;
      if (visible && animatedCover) trace.ready = true;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

try {
  for (const mode of ['dev', 'preview']) {
    const server = mode === 'dev'
      ? await createServer({ root, cacheDir: cache, server: { host: '127.0.0.1', port: 4186, strictPort: true } })
      : await preview({ root, preview: { host: '127.0.0.1', port: 4177, strictPort: true } });
    if (mode === 'dev') await server.listen();
    const origin = `http://127.0.0.1:${mode === 'dev' ? 4186 : 4177}`;
    try {
      for (const device of ['desktop', 'mobile']) {
        const context = await browser.newContext({ viewport: device === 'desktop' ? { width: 1365, height: 900 } : { width: 390, height: 844 },
          isMobile: device === 'mobile', deviceScaleFactor: 1, serviceWorkers: mode === 'preview' ? 'allow' : 'block', reducedMotion: 'no-preference' });
        try {
          await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
          await context.addInitScript(traceFirstPaint);
          const page = await context.newPage();
          page.setDefaultNavigationTimeout(60_000);
          page.on('pageerror', error => errors.push(`${mode}/${device}: ${error.message}`));
          page.on('console', message => {
            if (['error', 'warning'].includes(message.type()) && /hooks|hydrat|#418|#423/i.test(message.text())) errors.push(`${mode}/${device}: ${message.text()}`);
          });
          const cdp = await context.newCDPSession(page);
          await cdp.send('Network.enable');
          let release;
          let held = false;
          let hold = Promise.resolve();
          await page.route(url => mode === 'dev' ? url.pathname === '/src/main.tsx' : /^\/assets\/index-[^/]+\.js$/.test(url.pathname), async route => {
            held = true;
            await hold;
            await route.continue();
          });
          for (const load of ['clean-first-visit', 'hard-reload', 'cache-bypassing-reload']) {
            console.log(`[splash-first-paint] ${mode}/${device}/${load}`);
            held = false;
            hold = new Promise(resolve => { release = resolve; });
            await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
            if (load === 'clean-first-visit') await page.goto(origin, { waitUntil: 'commit' });
            else if (load === 'hard-reload') await page.reload({ waitUntil: 'commit' });
            else {
              await cdp.send('Page.enable');
              await cdp.send('Page.reload', { ignoreCache: true });
            }
            await page.waitForFunction(() => document.getElementById('root')?.querySelector('h1')
              && document.documentElement.getAttribute('data-home-splash') === 'pending'
              && document.querySelector('#initial-splash img')?.complete
              && !document.querySelector('.splash:not(.splash--initial)'));
            const initial = await page.evaluate(() => ({
              rootVisibility: getComputedStyle(document.getElementById('root')).visibility,
              coverDisplay: getComputedStyle(document.getElementById('initial-splash')).display,
              coverBackground: getComputedStyle(document.querySelector('#initial-splash .splash__backdrop')).backgroundColor,
              logoReady: document.querySelector('#initial-splash img').naturalWidth > 0,
              storage: [localStorage.length, sessionStorage.length],
              animationNotStarted: !window.__splashTrace.animation,
            }));
            assert.equal(held, true, 'The entry script is still held, not already hydrated');
            assert.equal(initial.rootVisibility, 'hidden');
            assert.equal(initial.coverDisplay, 'grid');
            assert.equal(initial.coverBackground, 'rgb(5, 7, 10)');
            assert.equal(initial.logoReady, true);
            assert.equal(initial.animationNotStarted, true, 'The SSR cover cannot consume any animation time');
            if (load === 'clean-first-visit') assert.deepEqual(initial.storage, [0, 0]);
            if (load === 'clean-first-visit') await page.screenshot({ path: `/tmp/upgrade79-first-paint-${mode}-${device}.png` });
            release();
            await page.waitForFunction(() => window.__splashTrace?.mounts === 1 && window.__splashTrace.ready && !document.querySelector('.splash'));
            const complete = await page.evaluate(() => ({
              ...window.__splashTrace,
              headingPreserved: document.querySelector('#root h1') === window.__ssrHeading,
              rootVisibility: getComputedStyle(document.getElementById('root')).visibility,
              pending: document.documentElement.hasAttribute('data-home-splash'),
              serviceWorker: Boolean(navigator.serviceWorker?.controller),
            }));
            assert.equal(complete.uncoveredFrames, 0);
            assert.equal(complete.headingPreserved, true, 'Hydration must preserve the actual SSR heading node');
            assert.equal(complete.rootVisibility, 'visible');
            assert.equal(complete.pending, false);
            assert.deepEqual(complete.handoff, { rootVisible: true, backdropOpacity: 1, logoOpacity: 1, imageReady: true });
            const animation = complete.animation;
            assert.ok(animation.firstEffectAt > 0 && animation.firstEffectAt < 700, JSON.stringify(animation));
            assert.ok(animation.tracksReadyAt !== null && animation.smokeReadyAt !== null, JSON.stringify(animation));
            assert.ok(animation.logoMotionAt !== null && animation.trackMotionAt !== null, JSON.stringify(animation));
            assert.ok(Math.abs(animation.logoMotionAt - animation.trackMotionAt) <= 110, 'Logo and tire marks must visibly launch together: ' + JSON.stringify(animation));
            assert.ok(animation.fadeAt >= animation.tracksReadyAt, 'Tracks finish on an opaque backdrop');
            assert.equal(animation.logoOutsideAtFade, true, 'The logo finishes exiting before the landing transition');
            assert.ok(animation.fadeAt - animation.smokeReadyAt >= 300, 'Smoke is legible before revealing the landing');
            assert.ok(animation.endedAt >= 1400 && animation.endedAt < 2300, JSON.stringify(animation));
            if (mode === 'preview') {
              assert.equal(await page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).active)), true);
              // Chrome deliberately bypasses the controller on an ignoreCache
              // reload (Ctrl+Shift+R). Check active control on normal reloads.
              if (load !== 'cache-bypassing-reload') await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
              if (load === 'hard-reload') assert.equal(complete.serviceWorker, true);
            }
            results.push({ mode, device, load, initialCoverBeforeHydration: true, uncoveredFrames: complete.uncoveredFrames,
              hydrationPreserved: complete.headingPreserved, serviceWorker: complete.serviceWorker,
              animationDurationMs: Math.round(animation.endedAt), launchDesyncMs: Math.round(Math.abs(animation.logoMotionAt - animation.trackMotionAt)),
              fullyDrawnTracksBeforeFadeMs: Math.round(animation.fadeAt - animation.tracksReadyAt) });
          }
          await page.evaluate(() => { location.hash = 'services'; });
          await page.waitForFunction(() => location.hash === '#services');
          assert.equal(await page.evaluate(() => window.__splashTrace.mounts), 1, 'Internal anchors do not replay the splash');

          await page.emulateMedia({ reducedMotion: 'reduce' });
          hold = Promise.resolve();
          await page.reload({ waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => window.__splashTrace?.mounts === 1 && !document.querySelector('.splash'));
          assert.equal(await page.evaluate(() => window.__splashTrace.uncoveredFrames), 0);
          const reduced = await page.evaluate(() => window.__splashTrace.animation);
          assert.equal(reduced.effectsVisibleFrames, 0, 'Reduced motion never shows burnout effects');
          // The exact 240 ms GSAP schedule is covered by the unit test. Wall
          // time includes browser startup/GC; still require a shorter transition.
          assert.ok(reduced.endedAt > 0 && reduced.endedAt < results.at(-1).animationDurationMs, JSON.stringify(reduced));
          results.push({ mode, device, reducedMotion: true, reducedMotionDurationMs: Math.round(reduced.endedAt),
            noInitialFlash: true, anchorDoesNotReplay: true });

          await page.goto(origin + '/politica-de-datos');
          assert.equal(await page.locator('.splash').count(), 0);
          assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-home-splash')), false);
          assert.equal(await page.locator('h1').innerText(), 'Política de Tratamiento de Datos Personales');
        } finally { await context.close(); }
      }

      const noJs = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
      try {
        await noJs.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
        const page = await noJs.newPage(); await page.goto(origin);
        assert.equal(await page.locator('#root').evaluate(node => getComputedStyle(node).visibility), 'visible');
        assert.equal(await page.locator('#initial-splash').evaluate(node => getComputedStyle(node).display), 'none');
        assert.match(await page.locator('h1').innerText(), /Tu carro/);
        results.push({ mode, noJavaScriptSsrUsable: true });
      } finally { await noJs.close(); }

      const failedJs = await browser.newContext({ serviceWorkers: 'block' });
      try {
        await failedJs.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
        const page = await failedJs.newPage();
        await page.route(url => mode === 'dev' ? url.pathname === '/src/main.tsx' : /^\/assets\/index-[^/]+\.js$/.test(url.pathname), route => route.abort());
        await page.goto(origin);
        await page.waitForFunction(() => !document.documentElement.hasAttribute('data-home-splash'));
        assert.equal(await page.locator('#root').evaluate(node => getComputedStyle(node).visibility), 'visible');
        results.push({ mode, entryModuleFailureRevealsSsr: true });
      } finally { await failedJs.close(); }
    } finally {
      if (mode === 'dev') await server.close();
      else await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
    }
  }
  assert.deepEqual(errors, [], 'No browser runtime, hydration, or Hook errors');
  console.log(JSON.stringify({ results, errors }, null, 2));
} finally {
  await browser.close();
  await rm(cache, { recursive: true, force: true }); // Only this mkdtemp-created test cache.
}
