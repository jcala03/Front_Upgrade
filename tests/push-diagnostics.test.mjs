import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MessageChannel } from 'node:worker_threads';
import vm from 'node:vm';
import { createServer } from 'vite';

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const payload = { notification_id: 28, user_id: 7, title: 'Tarea asignada', body: 'Mensaje CRM', url: '/crm/tasks', unread_count: 3 };
const origin = 'https://upgrade.example';

function worker({ failStorage = false, realStorage = false } = {}) {
  const handlers = {}; const records = new Map(); const trace = []; const shown = []; const messages = []; const badges = [];
  let sequence = 0; let owner = 7; let ownerReads = 0;
  // Fake only IDB's storage boundary; production record sanitizing and ring pruning still run.
  const store = {
    add(entry) {
      const id = ++sequence;
      records.set(id, { ...entry, id }); trace.push(`persist:${entry.stage}`);
      const request = { result: id };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    },
    getAllKeys() {
      const request = { result: [...records.keys()] };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    },
    delete(key) { records.delete(key); },
    getAll() { return { result: [...records.values()] }; },
    clear() { records.clear(); return { result: undefined }; },
  };
  const context = vm.createContext({ URL, console, setTimeout, clearTimeout,
    indexedDB: { open() { throw new DOMException('SECRET endpoint token', 'QuotaExceededError'); } },
    harnessStore: async (_mode, action) => {
      if (failStorage) throw new Error('SECRET logging failed');
      const request = action(store);
      await new Promise((resolve) => setImmediate(resolve));
      return request.result;
    },
    harnessOwnerStore: async (mode, action) => {
      if (mode === 'readonly') { trace.push('owner_lookup'); ownerReads++; return owner; }
      return action({ put(value) { owner = value; return { result: value }; } }).result;
    },
    self: { location: { origin },
      navigator: { setAppBadge: async (count) => badges.push(count), clearAppBadge: async () => badges.push(0) },
      skipWaiting: async () => messages.push('SKIP_WAITING'),
      addEventListener: (type, handler) => { handlers[type] = handler; },
      registration: { showNotification: async (title, options) => shown.push({ title, options }), getNotifications: async () => [] },
      clients: { matchAll: async () => [{ postMessage: (message) => messages.push(message.type) }] },
    },
  });
  vm.runInContext(source, context);
  vm.runInContext('ownerStore = harnessOwnerStore', context);
  if (!realStorage) vm.runInContext('diagnosticsStore = harnessStore', context);
  async function emit(type, values = {}) {
    let pending;
    handlers[type]({ ports: [], ...values, waitUntil: (promise) => { pending = promise; } });
    await pending;
  }
  async function message(type) {
    const channel = new MessageChannel();
    try {
      const response = new Promise((resolve) => { channel.port1.once('message', resolve); });
      await emit('message', { source: { url: `${origin}/crm/profile?token=SECRET#SECRET` }, data: { type }, ports: [channel.port2] });
      return await response;
    } finally { channel.port1.close(); channel.port2.close(); }
  }
  return { context, emit, message, records, trace, shown, messages, badges, ownerReads: () => ownerReads, owner: () => owner };
}
const stages = (harness) => [...harness.records.values()].map((record) => record.stage);

test('receipt is persisted before JSON parsing and owner lookup; valid Push keeps all stages and original output', async () => {
  const harness = worker();
  await harness.emit('push', { data: { json() { harness.trace.push('json_parse'); return payload; } } });
  assert.ok(harness.trace.indexOf('persist:push_event_received') < harness.trace.indexOf('json_parse'));
  assert.ok(harness.trace.indexOf('persist:push_event_received') < harness.trace.indexOf('owner_lookup'));
  assert.deepEqual(stages(harness), ['push_event_received', 'payload_parsed', 'owner_loaded', 'owner_match',
    'show_notification_start', 'show_notification_resolved', 'clients_notified']);
  assert.equal(harness.shown.length, 1);
  const { title, options } = harness.shown[0];
  assert.equal(title, payload.title); assert.equal(options.body, payload.body);
  assert.equal(options.tag, 'crm-28'); assert.equal(options.renotify, false);
  assert.equal(options.icon, '/icons/pwa-192.png');
  assert.deepEqual(JSON.parse(JSON.stringify(options.data)), { url: `${origin}/crm/tasks`, user_id: 7, notification_id: 28 });
  assert.deepEqual(harness.badges, [3]); assert.deepEqual(harness.messages, ['CRM_PUSH_RECEIVED']);
  for (const record of harness.records.values()) assert.ok(Number.isFinite(Date.parse(record.timestamp)));
  assert.equal([...harness.records.values()].find((record) => record.stage === 'owner_loaded').stored_owner, 7);
});

test('wrong or cleared owner still discards Push and records the mismatch', async () => {
  for (const user_id of [8, null]) {
    const harness = worker();
    await harness.emit('push', { data: { json: () => ({ ...payload, user_id }) } });
    assert.equal(harness.shown.length, 0);
    assert.deepEqual(stages(harness), ['push_event_received', 'payload_parsed', 'owner_loaded', 'owner_mismatch']);
    assert.equal([...harness.records.values()].at(-1).payload_user_id, user_id);
    assert.equal([...harness.records.values()].at(-1).stored_owner, 7);
  }
});

test('invalid payload and JSON failure retain the original short-circuit before owner lookup', async () => {
  for (const json of [() => null, () => ({ ...payload, notification_id: '28' }), () => { throw new SyntaxError('SECRET payload'); }]) {
    const harness = worker();
    await harness.emit('push', { data: { json } });
    assert.equal(harness.ownerReads(), 0); assert.equal(harness.shown.length, 0);
    assert.equal(stages(harness)[0], 'push_event_received');
    assert.doesNotMatch(JSON.stringify([...harness.records.values()]), /SECRET/);
  }
});

test('diagnostic storage rejection and synchronous IndexedDB errors never prevent a valid Push', async () => {
  for (const settings of [{ failStorage: true }, { realStorage: true }]) {
    const harness = worker(settings);
    await harness.emit('push', { data: { json: () => payload } });
    assert.equal(harness.shown.length, 1); assert.deepEqual(harness.messages, ['CRM_PUSH_RECEIVED']);
    assert.deepEqual(harness.badges, [3]);
  }
});

test('blocked diagnostic database never blocks Push and GET reports unavailable', async () => {
  const harness = worker({ realStorage: true });
  harness.context.indexedDB.open = () => {
    const request = {};
    queueMicrotask(() => request.onblocked());
    return request;
  };
  await harness.emit('push', { data: { json: () => payload } });
  assert.equal(harness.shown.length, 1);
  assert.deepEqual(await harness.message('PUSH_DIAGNOSTICS_GET'), { ok: false });
});

test('unresponsive IndexedDB is bounded by the logger timeout, not a permanently stalled Push', async () => {
  const harness = worker({ realStorage: true });
  // Exercise the production timeout branch with a short test clock, not a real one-second wait.
  harness.context.setTimeout = (callback) => setTimeout(callback, 5);
  harness.context.indexedDB.open = () => ({});
  await harness.emit('push', { data: { json: () => payload } });
  assert.equal(harness.shown.length, 1); assert.deepEqual(harness.badges, [3]);
});

test('showNotification rejection is logged without sensitive message and remains a delivery rejection', async () => {
  const harness = worker();
  const error = new TypeError('SECRET endpoint p256dh auth VAPID token');
  harness.context.self.registration.showNotification = async () => { throw error; };
  await assert.rejects(harness.emit('push', { data: { json: () => payload } }), (cause) => cause === error);
  assert.ok(stages(harness).includes('show_notification_error'));
  assert.ok(!stages(harness).includes('show_notification_resolved'));
  const record = [...harness.records.values()].at(-1);
  assert.equal(record.error, 'TypeError'); assert.equal(record.notification_id, 28);
  assert.doesNotMatch(JSON.stringify([...harness.records.values()]), /SECRET|p256dh|VAPID|token/);
});

test('owner lookup rejection identifies its stage without changing the failure', async () => {
  const harness = worker();
  vm.runInContext('ownerStore = async () => { throw new Error("SECRET owner"); }', harness.context);
  await assert.rejects(harness.emit('push', { data: { json: () => payload } }), /SECRET owner/);
  assert.equal(stages(harness).at(-1), 'owner_load_error'); assert.equal(harness.shown.length, 0);
  assert.doesNotMatch(JSON.stringify([...harness.records.values()]), /SECRET/);
});

test('client_open strips query/hash, circular history is capped at 30, GET uses MessageChannel and CLEAR deletes it', async () => {
  const harness = worker();
  for (let index = 0; index < 36; index++) {
    await harness.emit('message', { source: { url: `${origin}/crm/profile?token=SECRET#SECRET` }, data: { type: 'PUSH_DIAGNOSTIC_CLIENT_OPEN' } });
  }
  assert.equal(harness.records.size, 30);
  const response = await harness.message('PUSH_DIAGNOSTICS_GET');
  assert.equal(response.ok, true); assert.equal(response.records.length, 30);
  assert.equal(response.records[0].id, 36); assert.equal(response.records.at(-1).id, 7);
  assert.ok(response.records.every((record) => record.stage === 'client_open' && record.path === '/crm/profile'));
  assert.doesNotMatch(JSON.stringify(response), /SECRET|token/);
  assert.deepEqual(await harness.message('PUSH_DIAGNOSTICS_CLEAR'), { ok: true, records: [] });
  assert.deepEqual(await harness.message('PUSH_DIAGNOSTICS_GET'), { ok: true, records: [] });
  assert.equal(harness.owner(), 7);
});

test('foreign/unidentified clients cannot read, clear or write diagnostics', async () => {
  const harness = worker();
  for (const type of ['PUSH_DIAGNOSTICS_CLEAR', 'PUSH_DIAGNOSTICS_GET', 'PUSH_DIAGNOSTIC_CLIENT_OPEN']) {
    for (const source of [undefined, { url: 'https://attacker.example/crm' }]) {
      await harness.emit('message', { source, data: { type }, ports: [{ postMessage: () => assert.fail('foreign client received diagnostics') }] });
    }
  }
  assert.equal(harness.records.size, 0);
});

test('PUSH_OWNER still persists the owner, closes foreign notifications, clears badge and replies', async () => {
  const harness = worker(); const closed = []; const replies = [];
  harness.context.self.registration.getNotifications = async () => [
    { data: { user_id: 7 }, close: () => closed.push(7) }, { data: { user_id: 8 }, close: () => closed.push(8) },
  ];
  const sendOwner = async (userId) => harness.emit('message', { source: { url: `${origin}/crm/profile` }, data: { type: 'PUSH_OWNER', userId }, ports: [{ postMessage: (reply) => replies.push(reply.ok) }] });
  await sendOwner(7); assert.deepEqual(closed, [8]); assert.equal(harness.owner(), 7);
  await sendOwner(null); assert.equal(harness.owner(), null); assert.deepEqual(harness.badges, [0]);
  await harness.emit('push', { data: { json: () => payload } }); assert.equal(harness.shown.length, 0);
  assert.deepEqual(replies, [true, true]);
  await sendOwner('7'); assert.equal(harness.owner(), null); assert.equal(replies.length, 2);
});

test('SKIP_WAITING keeps explicit update behavior', async () => {
  const harness = worker();
  await harness.emit('message', { source: { url: `${origin}/crm/profile` }, data: { type: 'SKIP_WAITING' } });
  assert.deepEqual(harness.messages, ['SKIP_WAITING']); assert.equal(harness.records.size, 0);
});

const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const api = await vite.ssrLoadModule('/src/pwa/diagnostics.ts');
const { SERVICE_WORKER_URL } = await vite.ssrLoadModule('/src/pwa/version.ts');
const scriptURL = `${origin}${SERVICE_WORKER_URL}`;

test('page diagnostic reader uses MessageChannel, sorts newest first and does not call backend', async (t) => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalWindow = globalThis.window;
  t.after(() => { if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator); else delete globalThis.navigator; globalThis.window = originalWindow; });
  const messages = [];
  const active = { scriptURL, postMessage(message, [port]) {
    messages.push(message);
    port.postMessage({ ok: true, records: message.type === 'PUSH_DIAGNOSTICS_CLEAR' ? [] : [
      { id: 1, timestamp: '2026-10-27T10:00:00.000Z', stage: 'push_event_received' },
      { id: 2, timestamp: '2026-10-27T10:00:01.000Z', stage: 'client_open' },
    ] });
    port.close();
  } };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { serviceWorker: { getRegistration: async () => ({ active }) } } });
  globalThis.window = { setTimeout, clearTimeout };
  assert.deepEqual((await api.getPushDiagnostics()).map((record) => record.id), [2, 1]);
  assert.deepEqual(await api.clearPushDiagnostics(), []);
  assert.deepEqual(messages, [{ type: 'PUSH_DIAGNOSTICS_GET' }, { type: 'PUSH_DIAGNOSTICS_CLEAR' }]);
  const opened = []; api.recordPushClientOpen({ postMessage: (message) => opened.push(message) });
  assert.deepEqual(opened, [{ type: 'PUSH_DIAGNOSTIC_CLIENT_OPEN' }]);
  assert.doesNotThrow(() => api.recordPushClientOpen({ postMessage: () => { throw new Error('Unavailable'); } }));
});

test('page reader reports unavailable/old Service Workers and cleans up unanswered MessageChannels', async (t) => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalWindow = globalThis.window;
  t.after(() => { if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator); else delete globalThis.navigator; globalThis.window = originalWindow; });
  globalThis.window = { setTimeout: (callback) => setTimeout(callback, 5), clearTimeout };
  const serviceWorker = { getRegistration: async () => ({ active: null }) };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { serviceWorker } });
  await assert.rejects(api.getPushDiagnostics(), /no tiene un Service Worker activo/);
  let sent = false;
  serviceWorker.getRegistration = async () => ({ active: { scriptURL: `${origin}/sw.js`, postMessage() { sent = true; } } });
  await assert.rejects(api.getPushDiagnostics(), (error) => error.code === 'worker_outdated');
  assert.equal(sent, false, 'A known old URL is identified without waiting for a message timeout.');
  serviceWorker.getRegistration = async () => ({ active: { scriptURL, postMessage() {} } });
  await assert.rejects(api.getPushDiagnostics(), (error) => error.code === 'timeout');
  serviceWorker.getRegistration = async () => ({ active: { scriptURL, postMessage(_message, [port]) { port.postMessage({ ok: false }); port.close(); } } });
  await assert.rejects(api.getPushDiagnostics(), (error) => error.code === 'rejected');
});

test('diagnostic errors distinguish unsupported, registration, protocol and MessageChannel failures without leaking exceptions', async (t) => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalWindow = globalThis.window; const originalChannel = globalThis.MessageChannel;
  t.after(() => { if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator); else delete globalThis.navigator; globalThis.window = originalWindow; globalThis.MessageChannel = originalChannel; });
  globalThis.window = { setTimeout, clearTimeout };
  const setNavigator = (value) => Object.defineProperty(globalThis, 'navigator', { configurable: true, value });
  setNavigator({});
  await assert.rejects(api.getPushDiagnostics(), (error) => error.code === 'unsupported');
  setNavigator({ serviceWorker: { getRegistration: async () => { throw new Error('SECRET cookie'); } } });
  await assert.rejects(api.getPushDiagnostics(), (error) => error.code === 'registration_error' && !error.message.includes('SECRET'));
  for (const response of [null, { ok: true }, { ok: true, records: 'SECRET' }]) {
    setNavigator({ serviceWorker: { getRegistration: async () => ({ active: { scriptURL, postMessage(_message, [port]) { port.postMessage(response); port.close(); } } }) } });
    await assert.rejects(api.getPushDiagnostics(), (error) => error.code === 'invalid_response' && !error.message.includes('SECRET'));
  }
  setNavigator({ serviceWorker: { getRegistration: async () => ({ active: { scriptURL, postMessage() { throw new Error('SECRET endpoint'); } } }) } });
  await assert.rejects(api.getPushDiagnostics(), (error) => error.code === 'channel_error' && !error.message.includes('SECRET'));
  globalThis.MessageChannel = class { constructor() { throw new Error('SECRET token'); } };
  await assert.rejects(api.getPushDiagnostics(), (error) => error.code === 'channel_error' && !error.message.includes('SECRET'));
});
