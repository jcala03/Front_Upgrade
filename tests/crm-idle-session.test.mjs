import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => vite.close());
const { startCrmIdleSession, clearSharedCrmSession, CRM_IDLE_STORAGE_KEY } = await vite.ssrLoadModule('/src/utils/crmIdleSession.ts');

const id = 'a'.repeat(64);
function harness(shared = new Map()) {
  let clock = 1_000_000;
  let counter = 0;
  const timers = new Map();
  const listeners = () => {
    const map = new Map();
    return {
      addEventListener: (name, listener) => { const group = map.get(name) ?? new Set(); group.add(listener); map.set(name, group); },
      removeEventListener: (name, listener) => map.get(name)?.delete(listener),
      emit: (name, event = {}) => { for (const listener of map.get(name) ?? []) listener(event); },
      size: () => [...map.values()].reduce((sum, group) => sum + group.size, 0),
    };
  };
  const doc = { ...listeners(), visibilityState: 'visible' };
  const win = { ...listeners(), localStorage: {
    getItem: key => shared.get(key) ?? null, setItem: (key, value) => shared.set(key, value), removeItem: key => shared.delete(key),
  }, setTimeout: (callback, delay) => { timers.set(++counter, { callback, at: clock + delay }); return counter; },
  setInterval: (callback, delay) => { timers.set(++counter, { callback, at: clock + delay, interval: delay }); return counter; },
  clearTimeout: key => timers.delete(key), clearInterval: key => timers.delete(key) };
  const calls = { status: 0, activity: 0, expired: [], warnings: [] };
  const info = () => ({ session_id: id, server_time: clock / 1000, expires_at: clock / 1000 + 1800, idle_timeout_seconds: 1800 });
  let options;
  const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  const start = (overrides = {}) => {
    options = { userId: 1, win, doc, now: () => clock,
      status: async () => { calls.status++; return info(); },
      activity: async () => { calls.activity++; return info(); },
      expire: sessionId => calls.expired.push(sessionId), warn: value => calls.warnings.push(value), ...overrides };
    return startCrmIdleSession(options);
  };
  const tick = async ms => {
    const target = clock + ms;
    while (true) {
      const next = [...timers.entries()].filter(([, value]) => value.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      const [key, timer] = next;
      clock = timer.at;
      if (timer.interval) timer.at += timer.interval; else timers.delete(key);
      timer.callback(); await settle();
    }
    clock = target; await settle();
  };
  return { start, settle, tick, win, doc, calls, info, timers, shared, jump: ms => { clock += ms; } };
}

test('inactive tab expires exactly once at 30 minutes; polling does not renew it', async () => {
  const h = harness(); const stop = h.start(); await h.settle();
  await h.tick(29 * 60_000); assert.deepEqual(h.calls.warnings, [true]);
  assert.equal(h.calls.expired.length, 0); assert.equal(h.calls.activity, 0);
  await h.tick(60_000); assert.deepEqual(h.calls.expired, [id]);
  await h.tick(60_000); assert.equal(h.calls.expired.length, 1); stop();
});

test('trusted keyboard, pointer, touch and scroll maintain an active session beyond 30 minutes', async () => {
  const h = harness(); const stop = h.start(); await h.settle();
  for (const event of ['keydown', 'input', 'pointerdown', 'pointermove', 'touchstart', 'wheel']) {
    await h.tick(20 * 60_000); h.doc.emit(event, { isTrusted: true }); await h.settle();
  }
  assert.equal(h.calls.activity, 6); assert.equal(h.calls.expired.length, 0); stop();
});

test('synthetic events, visibility and focus never count as user interaction', async () => {
  const h = harness(); const stop = h.start(); await h.settle();
  h.doc.emit('keydown', { isTrusted: false }); h.win.emit('focus'); await h.settle();
  h.doc.visibilityState = 'hidden'; h.doc.emit('pointerdown', { isTrusted: true });
  h.doc.emit('visibilitychange'); await h.settle();
  assert.equal(h.calls.activity, 0); stop();
});

test('continuous input is throttled, not an unconditional heartbeat', async () => {
  const h = harness(); const stop = h.start(); await h.settle();
  for (let i = 0; i < 10; i++) h.doc.emit('pointermove', { isTrusted: true });
  await h.settle(); assert.equal(h.calls.activity, 1);
  await h.tick(15_000); assert.equal(h.calls.activity, 2);
  await h.tick(60_000); assert.equal(h.calls.activity, 2); stop();
});

test('suspended browser checks wall time before sending activity on resume', async () => {
  const h = harness(); const stop = h.start(); await h.settle();
  h.jump(31 * 60_000); h.doc.emit('keydown', { isTrusted: true }); await h.settle();
  assert.deepEqual(h.calls.expired, [id]); assert.equal(h.calls.activity, 0); stop();
});

test('tabs share confirmed activity and logout through non-credential storage', async () => {
  const h = harness(); const stop = h.start(); await h.settle();
  const shared = JSON.parse(h.shared.get(CRM_IDLE_STORAGE_KEY));
  h.shared.set(CRM_IDLE_STORAGE_KEY, JSON.stringify({ ...shared, deadline: shared.deadline + 120_000 }));
  h.win.emit('storage', { key: CRM_IDLE_STORAGE_KEY });
  await h.tick(30 * 60_000); assert.equal(h.calls.expired.length, 0);
  h.shared.set(CRM_IDLE_STORAGE_KEY, JSON.stringify({ ...shared, expired: true }));
  h.win.emit('storage', { key: CRM_IDLE_STORAGE_KEY }); assert.deepEqual(h.calls.expired, [id]); stop();
});

test('failed network requests cannot extend known expiry', async () => {
  const h = harness(); const stop = h.start({ activity: async () => { throw new Error('offline'); } }); await h.settle();
  await h.tick(29 * 60_000); h.doc.emit('keydown', { isTrusted: true }); await h.settle();
  await h.tick(60_000); assert.equal(h.calls.expired.length, 1); stop();
});

test('cleanup removes timers and listeners and ignores late responses', async () => {
  const h = harness(); let resolve;
  const stop = h.start({ status: () => new Promise(done => { resolve = done; }) });
  stop(); resolve(h.info()); await h.settle();
  assert.equal(h.win.size(), 0); assert.equal(h.doc.size(), 0); assert.equal(h.timers.size, 0);
  assert.equal(h.shared.size, 0);
});

test('late status does not shorten newer confirmed activity from another tab', async () => {
  const h = harness(); let resolve;
  const stop = h.start({ status: () => new Promise(done => { resolve = done; }) });
  const newer = { id, userId: 1, deadline: 3_000_000, expired: false };
  h.shared.set(CRM_IDLE_STORAGE_KEY, JSON.stringify(newer));
  resolve(h.info()); await h.settle();
  assert.equal(JSON.parse(h.shared.get(CRM_IDLE_STORAGE_KEY)).deadline, newer.deadline); stop();
});

test('old session expiry cannot overwrite the new login marker', () => {
  const h = harness(); const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const newer = { id: 'c'.repeat(64), userId: 1, deadline: 3_000_000, expired: false };
  h.shared.set(CRM_IDLE_STORAGE_KEY, JSON.stringify(newer));
  Object.defineProperty(globalThis, 'window', { configurable: true, value: h.win });
  try {
    clearSharedCrmSession(id);
    assert.deepEqual(JSON.parse(h.shared.get(CRM_IDLE_STORAGE_KEY)), newer);
  } finally { if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window; }
});

test('no anonymous/public observer; login resets the previous shared session', () => {
  const layout = readFileSync('src/modules/crm/layout/CrmLayout.tsx', 'utf8');
  const login = readFileSync('src/modules/crm/auth/LoginPage.tsx', 'utf8');
  assert.match(layout, /if \(!user\) return;/);
  assert.match(login, /resetSharedCrmSession\(\)/);
  assert.doesNotMatch(readFileSync('src/main.tsx', 'utf8'), /startCrmIdleSession/);
  assert.match(readFileSync('src/api/auth.ts', 'utf8'), /idle_session_id: sessionId/);
});
