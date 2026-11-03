import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import ts from 'typescript';
import { createServer as createHttpServer } from 'node:http';
import { runInNewContext } from 'node:vm';

const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => vite.close());
const { useSplash } = await vite.ssrLoadModule('/src/hooks/useSplash.ts');
const { splashBootScript } = await vite.ssrLoadModule('/src/components/ui/SplashScreen/firstPaint.ts');
const { SplashScreen } = await vite.ssrLoadModule('/src/components/ui/SplashScreen/SplashScreen.tsx');
const { SplashFirstPaint, splashLogo } = await vite.ssrLoadModule('/src/components/ui/SplashScreen/SplashFirstPaint.tsx');
const { Hero } = await vite.ssrLoadModule('/src/components/sections/Hero/Hero.tsx');

test('los CTA del Hero conservan enlaces y texto con SVG decorativos, no caracteres emoji', () => {
  const html = renderToString(createElement(Hero));
  const links = [...html.matchAll(/<a\b[^>]*class="hero__cta[^>]*>[\s\S]*?<\/a>/g)].map(match => match[0]);
  assert.equal(links.length, 2);
  assert.match(links[0], /href="\/tienda"/);
  assert.match(links[0], /Explorar artículos/);
  assert.match(links[1], /Cotizar transformación/);
  assert.match(links[1], /target="_blank"/);
  for (const link of links) {
    assert.match(link, /<svg[^>]*width="16"[^>]*height="16"/);
    assert.match(link, /stroke-width="1\.8"/);
    assert.match(link, /lucide-arrow-up-right/);
    assert.match(link, /aria-hidden="true"/);
    assert.match(link, /focusable="false"/);
    assert.doesNotMatch(link, /[↗\uFE0F\p{Extended_Pictographic}]/u);
  }
});

test('el CSS inicial muestra el logo y oculta los efectos todavía sin inicializar', async () => {
  const initial = await readFile(new URL('../src/components/ui/SplashScreen/SplashScreen.initial.css', import.meta.url), 'utf8');
  const effects = await readFile(new URL('../src/components/ui/SplashScreen/SplashScreen.css', import.meta.url), 'utf8');
  assert.match(initial.match(/\.splash__logo-wrap\s*\{([^}]+)\}/)[1], /opacity:\s*1/);
  assert.match(effects.match(/\.splash__effects\s*\{([^}]+)\}/)[1], /visibility:\s*hidden/);
  for (const selector of ['streak', 'smoke-form']) {
    assert.match(effects.match(new RegExp(`\\.splash__${selector}\\s*\\{([^}]+)\\}`))[1], /opacity:\s*0/);
  }
});

test('primer paint y animación usan el mismo PNG original con dimensiones intrínsecas correctas', async () => {
  const png = await readFile(new URL('../src/assets/logos/upgrade79-logo.png', import.meta.url));
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.equal(width, 150);
  assert.equal(height, 150);
  const initial = renderToString(createElement(SplashFirstPaint));
  const animated = renderToString(createElement(SplashScreen, { onComplete() {} }));
  const image = (html) => html.match(/<img\b[^>]*class="splash__logo"[^>]*>/)?.[0];
  for (const html of [initial, animated]) {
    const tag = image(html);
    assert.ok(tag);
    assert.ok(tag.includes(`src="${splashLogo}"`));
    assert.match(tag, new RegExp(`width="${width}" height="${height}"`));
    assert.doesNotMatch(tag, /logo-hq/);
  }
  assert.match(splashLogo, /\/upgrade79-logo\.png$/);
});

test('ambas etapas comparten tamaño moderado y contienen el logo sin deformación ni filtros', async () => {
  const css = await readFile(new URL('../src/components/ui/SplashScreen/SplashScreen.initial.css', import.meta.url), 'utf8');
  const effects = await readFile(new URL('../src/components/ui/SplashScreen/SplashScreen.css', import.meta.url), 'utf8');
  assert.match(effects, /@import\s+"\.\/SplashScreen\.initial\.css"/);
  const wrap = css.match(/\.splash__logo-wrap\s*\{([^}]+)\}/)?.[1];
  const image = css.match(/\.splash__logo\s*\{([^}]+)\}/)?.[1];
  assert.match(wrap, /width:\s*min\(200px,\s*48vw\)/);
  assert.match(image, /height:\s*auto/);
  assert.match(image, /object-fit:\s*contain/);
  assert.doesNotMatch(wrap + image, /(?:filter|mask|mix-blend-mode)\s*:/);
});

function SplashState({ deferUntilMounted }) {
  const { isSplashVisible } = useSplash({ deferUntilMounted });
  return createElement('span', { 'data-splash-visible': String(isSplashVisible) });
}

test('el primer render de hidratación coincide con el SSR sin splash', () => {
  assert.match(renderToString(createElement(SplashState, { deferUntilMounted: true })), /data-splash-visible="false"/);
});

test('el render puramente cliente conserva el splash visible desde el inicio', () => {
  assert.match(renderToString(createElement(SplashState, { deferUntilMounted: false })), /data-splash-visible="true"/);
});

function bootFirstPaint() {
  const attributes = new Map();
  const listeners = new Map();
  class ErrorEvent {}
  const window = {
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
  };
  const document = { documentElement: {
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
  } };
  runInNewContext(splashBootScript, { window, document, ErrorEvent });
  return { attributes, listeners, ErrorEvent };
}

test('el head activa la cubierta síncronamente, sin timers ni almacenamiento', () => {
  const { attributes, listeners } = bootFirstPaint();
  assert.equal(attributes.get('data-home-splash'), 'pending');
  assert.equal(listeners.has('error'), true);
  assert.doesNotMatch(splashBootScript, /setTimeout|setInterval|localStorage|sessionStorage/);
});

test('un fallo del script revela el SSR y elimina listeners, sin esperar un timeout', () => {
  for (const kind of ['resource', 'runtime']) {
    const { attributes, listeners, ErrorEvent } = bootFirstPaint();
    listeners.get('error')(kind === 'resource' ? { target: { tagName: 'SCRIPT' } } : new ErrorEvent());
    assert.equal(attributes.has('data-home-splash'), false);
    assert.equal(listeners.size, 0);
  }
});

test('errores de fuentes/imágenes no descubren el landing antes del splash; el relevo limpia listeners', () => {
  const { attributes, listeners } = bootFirstPaint();
  listeners.get('error')({ target: { tagName: 'LINK' } });
  listeners.get('error')({ target: { tagName: 'IMG' } });
  assert.equal(attributes.get('data-home-splash'), 'pending');
  listeners.get('upgrade79:splash-ready')();
  assert.equal(listeners.size, 0);
});

test('Home no omite el splash cuando hay bootstrap: difiere su montaje', async () => {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /useSplash\(\{ deferUntilMounted: Boolean\(publicBootstrap\(\)\) \}\)/);
  assert.match(app, /\{isSplashVisible \? <SplashScreen onComplete=\{completeSplash\} \/> : null\}/);
  assert.doesNotMatch(app, /isSplashVisible\s*&&\s*!publicBootstrap\(\)/);
});

test('los cuatro Hooks de useSplash son incondicionales, estables y anteriores al return', async () => {
  const source = await readFile(new URL('../src/components/ui/SplashScreen/SplashScreen.tsx', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('SplashScreen.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = ast.statements.filter(ts.isVariableStatement).flatMap(statement => [...statement.declarationList.declarations])
    .find(item => item.name.getText(ast) === 'useSplash');
  const body = declaration.initializer.body;
  const hooks = [];
  const allHooks = [];
  for (const statement of body.statements) {
    const calls = ts.isVariableStatement(statement)
      ? statement.declarationList.declarations.map(item => item.initializer)
      : ts.isExpressionStatement(statement) ? [statement.expression] : [];
    for (const call of calls) if (call && ts.isCallExpression(call) && /^use[A-Z]/.test(call.expression.getText(ast))) {
      hooks.push(call.expression.getText(ast));
    }
  }
  function visit(node) {
    if (ts.isCallExpression(node) && /^use[A-Z]/.test(node.expression.getText(ast))) allHooks.push(node.expression.getText(ast));
    ts.forEachChild(node, visit);
  }
  visit(body);
  assert.deepEqual(hooks, ['useState', 'useRef', 'useEffect', 'useCallback']);
  assert.deepEqual(allHooks, hooks, 'No Hook may be nested inside a condition or callback');
  assert.equal(body.statements.filter(ts.isReturnStatement).length, 1);
  assert.ok(ts.isReturnStatement(body.statements.at(-1)));
});

test('AppContent llama useSplash antes de cualquier return de rutas', async () => {
  const source = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const app = ast.statements.filter(ts.isVariableStatement).flatMap(statement => [...statement.declarationList.declarations])
    .find(item => item.name.getText(ast) === 'AppContent');
  const first = app.initializer.body.statements[0];
  assert.ok(ts.isVariableStatement(first));
  assert.equal(first.declarationList.declarations[0].initializer.expression.getText(ast), 'useSplash');
});

test('Fast Refresh registra la firma real de useSplash en su módulo React', async () => {
  const hmrServer = createHttpServer();
  const dev = await createServer({ configFile: false, plugins: [react()], optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: { server: hmrServer } } });
  try {
    const transformed = await dev.transformRequest('/src/components/ui/SplashScreen/SplashScreen.tsx');
    assert.match(transformed.code, /createSignatureFunctionForTransform/);
    assert.match(transformed.code, /_s\d*\(useSplash,/);
    assert.match(transformed.code, /\$RefreshReg\$\([^\n]*"SplashScreen"/);
    const facade = await readFile(new URL('../src/hooks/useSplash.ts', import.meta.url), 'utf8');
    assert.match(facade, /export \{ useSplash \} from/);
    assert.doesNotMatch(facade, /use(State|Ref|Effect|Callback)\(/);
  } finally { await dev.close(); hmrServer.close(() => {}); }
});

// Exercise the actual startTimeline body with a recording GSAP adapter, not a
// second copy of the animation schedule. Browser tests verify rendered frames.
async function recordSplashTimeline(reducedMotion, viewportWidth = 1440) {
  const source = await readFile(new URL('../src/components/ui/SplashScreen/SplashScreen.tsx', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('SplashScreen.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let start;
  function find(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'startTimeline') start = node.initializer;
    ts.forEachChild(node, find);
  }
  find(ast);
  assert.ok(start);
  const tweens = [];
  const labels = {};
  const events = [];
  const initialSets = [];
  const logoWidth = Math.min(200, viewportWidth * 0.48);
  const svgWidth = viewportWidth * (viewportWidth <= 760 ? 1.48 : 1);
  const svgLeft = viewportWidth <= 760 ? -svgWidth * 0.18 : 0;
  const logoElement = { getBoundingClientRect: () => ({ width: logoWidth, left: (viewportWidth - logoWidth) / 2 }) };
  const splashElement = { clientWidth: viewportWidth, querySelector: () => ({ getBoundingClientRect: () => ({ width: svgWidth, left: svgLeft }) }) };
  const targetName = target => target === logoElement ? 'logo' : target === splashElement ? 'splash' : target;
  let duration = 0;
  const timeline = {
    addLabel(name, time) { labels[name] = time; return this; },
    to(target, vars, position = duration) {
      const [label, offset = 0] = typeof position === 'string' ? position.split('+=') : [];
      const time = typeof position === 'number' ? position : labels[label] + Number(offset);
      assert.ok(Number.isFinite(time));
      tweens.push({ target: targetName(target), vars, start: time, end: time + vars.duration });
      duration = Math.max(duration, time + vars.duration);
      return this;
    },
    set(target, vars, position) { return this.to(target, { ...vars, duration: 0 }, position); },
  };
  const script = ts.transpileModule(`const startTimeline = ${start.getText(ast)}; startTimeline();`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(script, {
    cancelled: false, reducedMotion, logoElement, backdropElement: 'backdrop', splashElement,
    finish: () => {}, hasInitialSplash: () => true,
    handoffInitialSplash: () => {
      events.push('handoff');
      assert.equal(initialSets.find(item => item.target === 'logo')?.vars.opacity, 1);
      const effects = initialSets.find(item => item.target === '.splash__effects');
      assert.ok(effects, 'Effects must be prepared before revealing the React overlay');
      assert.equal(reducedMotion ? effects.vars.display : effects.vars.visibility, reducedMotion ? 'none' : 'visible');
      if (!reducedMotion) {
        for (const target of ['.splash__streak', '.splash__smoke-form']) {
          assert.equal(initialSets.find(item => item.target === target)?.vars.opacity, 0);
        }
      }
    },
    gsap: { set(target, vars) { initialSets.push({ target: targetName(target), vars }); }, timeline() { events.push('animation'); return timeline; } },
  });
  return { tweens, labels, duration, events, initialSets, svgWidth, svgLeft, logoWidth };
}

test('la punta de ambas huellas acompaña al logo sin hueco en escritorio y móvil', async () => {
  for (const width of [1440, 768, 430, 390, 360]) {
    const { tweens, initialSets, svgWidth, svgLeft, logoWidth } = await recordSplashTimeline(false, width);
    const origin = initialSets.find(item => item.target === '.splash__track-reveal').vars.attr.x;
    const tracks = tweens.filter(item => item.target.startsWith?.('.splash__track-reveal'));
    const launch = tweens.find(item => item.target === 'logo' && typeof item.vars.x === 'function');
    const exit = launch.vars.x();
    for (const track of tracks) for (const progress of [0, 0.1, 0.5, 0.9, 1]) {
      const front = svgLeft + (origin + track.vars.attr.width * progress) * svgWidth / 1600;
      const rear = (width - logoWidth) / 2 - 6 + (exit + 6) * progress;
      assert.ok(front >= rear && front <= rear + 12.001, `${width}px: trail must overlap the logo by at most 12px`);
    }
  }
  const html = renderToString(createElement(SplashScreen, { onComplete() {} }));
  const fade = html.match(/<linearGradient[^>]*id="[^"]*track-fade"[^>]*>([\s\S]*?)<\/linearGradient>/)[1];
  assert.match(fade, /offset="1"[^>]*stop-opacity="0\.72"/);
});

test('logo, huellas y estela arrancan sincronizados, sin pausa con el logo inmóvil', async () => {
  const { tweens, labels, duration, events } = await recordSplashTimeline(false);
  assert.deepEqual(events, ['handoff', 'animation'], 'The cover hands off before any animation starts');
  assert.equal(labels.burnout, 0.24);
  assert.equal(labels.launch, 0.4);
  assert.equal(labels.reveal, 1.08);
  assert.equal(duration, 1.5);
  const launch = tweens.find(tween => tween.target === 'logo' && typeof tween.vars.x === 'function');
  const tracks = tweens.filter(tween => tween.target.startsWith?.('.splash__track-reveal'));
  assert.equal(tracks.length, 2);
  const streak = tweens.find(tween => tween.target === '.splash__streak' && tween.vars.opacity > 0);
  for (const effect of [...tracks, streak]) {
    assert.equal(effect.start, launch.start);
    assert.equal(effect.vars.duration, launch.vars.duration);
    assert.equal(effect.vars.ease, launch.vars.ease);
    assert.ok(effect.end <= labels.reveal);
  }
  assert.equal(launch.vars.ease, 'power1.in');
  for (const rev of tweens.filter(tween => tween.target === 'logo' && typeof tween.vars.x === 'number')) {
    assert.ok(rev.end <= launch.start, 'No recoil tween may fight the launch');
  }
  const smoke = tweens.filter(tween => tween.target.startsWith?.('.splash__smoke-form'));
  assert.equal(smoke.length, 3);
  for (const plume of smoke) {
    assert.ok(plume.end < labels.reveal);
    assert.ok(plume.vars.opacity >= 0.3);
  }
  assert.ok(launch.end <= labels.reveal);
  assert.equal(tweens.find(tween => tween.target === 'backdrop').start, labels.reveal);
});

test('movimiento reducido conserva los 240 ms y no anima humo, huellas ni desplazamiento del logo', async () => {
  const { duration, tweens, events } = await recordSplashTimeline(true);
  assert.ok(Math.abs(duration - 0.24) < Number.EPSILON);
  assert.deepEqual(events, ['handoff', 'animation']);
  assert.equal(tweens.some(tween => typeof tween.target === 'string' && tween.target.startsWith('.splash__')), false);
  assert.equal(tweens.some(tween => 'x' in tween.vars || 'rotation' in tween.vars), false);
});
