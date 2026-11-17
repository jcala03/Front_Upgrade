import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, envFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  define: Object.fromEntries(Object.entries({ DEV: true, VITE_GA4_ENABLED: 'true', VITE_GA4_MEASUREMENT_ID: 'G-TESTONLY01',
    VITE_GA4_SETTINGS_REVIEWED: 'true', VITE_ANALYTICS_INFORMATION_REVIEWED: 'true', VITE_GA4_LOCAL_DEBUG: 'true' })
    .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])),
  server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => vite.close());
const consent = await vite.ssrLoadModule('/src/privacy/consent.ts');
const a = await vite.ssrLoadModule('/src/privacy/analytics.ts');
const config = await vite.ssrLoadModule('/src/privacy/config.ts');
const store = new Map();
const scripts = new Map();
const location = { hostname: '127.0.0.1', origin: 'http://127.0.0.1', pathname: '/tienda', search: '' };
const eventTarget = new EventTarget();
globalThis.location = location;
globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) };
globalThis.window = { location, dispatchEvent: event => eventTarget.dispatchEvent(event) };
globalThis.document = { cookie: '', getElementById: id => scripts.get(id), querySelector: () => null,
  createElement: () => ({ remove() { scripts.delete(this.id); } }), head: { appendChild: script => scripts.set(script.id, script) } };
after(() => { for (const key of ['window', 'document', 'location', 'localStorage']) delete globalThis[key]; });
const commands = () => (window.dataLayer ?? []).map(args => Array.from(args));
const events = () => commands().filter(command => command[0] === 'event');
const accept = () => { consent.saveChoice(true); a.applySavedAnalyticsChoice(); };
const item = { productId: 40, variantId: 64, sku: 'BMW-4-64', price: 1250000, quantity: 1 };
const order = { id: 411, order_status: 'completed', payment_status: 'paid', currency: 'COP', total: '1250000.00',
  customer_email: 'private@example.test', items: [{ item_type: 'product', product_id: 40, product_variant_id: 64,
    variant_sku: 'BMW-4-64', quantity: 1, unit_price: '1250000.00' }] };

test('preference rejects malformed, old, future and expired storage; rejection persists', () => {
  for (const raw of [null, '{', '{}', JSON.stringify({ version: 'old', analytics: true, updatedAt: Date.now() }),
    JSON.stringify({ version: config.PRIVACY_VERSION, analytics: true, updatedAt: Date.now() + 10000 }),
    JSON.stringify({ version: config.PRIVACY_VERSION, analytics: true, updatedAt: Date.now() - 181 * 86400000 })]) assert.equal(consent.parseChoice(raw), null);
  assert.equal(consent.saveChoice(false).analytics, false);
  assert.equal(consent.readChoice().analytics, false);
});
test('first visit and rejected preference load no Google script and emit no events', () => {
  store.clear(); a.syncAnalytics(); assert.equal(a.trackCommerce('add_to_cart', [item]), false);
  assert.equal(scripts.size, 0); assert.equal(events().length, 0);
  consent.saveChoice(false); a.syncAnalytics(); assert.equal(scripts.size, 0);
});
test('explicit acceptance uses basic Consent Mode v2, denies ads and initializes one script', () => {
  accept(); a.syncAnalytics(); assert.equal(scripts.size, 1);
  assert.match(scripts.get('upgrade79-ga4').src, /G-TESTONLY01/);
  assert.deepEqual(commands()[0], ['consent', 'default', a.deniedConsent]);
  const update = commands().find(command => command[0] === 'consent' && command[1] === 'update')[2];
  assert.equal(update.analytics_storage, 'granted');
  for (const key of ['ad_storage', 'ad_user_data', 'ad_personalization']) assert.equal(update[key], 'denied');
  assert.equal(commands().find(command => command[0] === 'config')[2].send_page_view, false);
});
test('SPA views and impressions are deduplicated without leaking URLs, queries or contact details', () => {
  location.pathname = '/tienda/private-slug'; location.search = '?email=private@example.test';
  a.trackPage(location.pathname + location.search); a.trackPage(location.pathname + location.search);
  assert.equal(a.trackCommerce('view_item', [item], '40:64'), true);
  assert.equal(a.trackCommerce('view_item', [item], '40:64'), false);
  const view = events().filter(command => command[1] === 'page_view'); assert.equal(view.length, 1);
  assert.equal(view[0][2].page_location, 'http://127.0.0.1/tienda/producto');
  assert.equal(JSON.stringify(events()).includes('private'), false);
  location.pathname = '/carrito'; location.search = ''; a.trackPage('/carrito');
  assert.equal(events().filter(command => command[1] === 'page_view').length, 2);
  assert.equal(a.analyticsRoute('/crm/commissions'), null);
});
test('commercial events preserve variant, COP and finite prices; invalid items are discarded', () => {
  for (const name of ['view_item_list', 'select_item', 'view_item', 'add_to_cart', 'remove_from_cart', 'begin_checkout']) {
    assert.equal(a.trackCommerce(name, [item], name), true);
    const payload = events().at(-1)[2]; assert.equal(payload.currency, 'COP'); assert.equal(payload.value, 1250000);
    assert.equal(payload.items[0].item_id, '40:64'); assert.equal(payload.items[0].item_sku, 'BMW-4-64');
  }
  for (const invalid of [{ ...item, price: NaN }, { ...item, price: Infinity }, { ...item, quantity: 0 }, { ...item, variantId: -1 }]) assert.equal(a.trackCommerce('add_to_cart', [invalid]), false);
});
test('purchase requires actual paid API data, never pending, partial, cancelled or refunded; stable ID deduplicates retries', () => {
  for (const payment_status of ['unpaid', 'partial', 'refunded']) assert.equal(a.trackConfirmedPurchase({ ...order, payment_status }), false);
  assert.equal(a.trackConfirmedPurchase({ ...order, order_status: 'cancelled' }), false);
  assert.equal(a.trackConfirmedPurchase(null), false);
  assert.equal(a.trackConfirmedPurchase(order), true); assert.equal(a.trackConfirmedPurchase(order), false);
  const payload = events().at(-1)[2]; assert.equal(payload.transaction_id, 'upgrade79-order-411');
  assert.equal(payload.value, 1250000); assert.equal(JSON.stringify(payload).includes('private'), false);
  assert.deepEqual(JSON.parse(store.get('upgrade79_ga4_purchases')), ['upgrade79-order-411']);
});
test('withdrawal removes optional tags and blocks events without touching cart/session; later acceptance is explicit', () => {
  store.set('upgrade79_cart', 'preserved'); store.set('session', 'preserved');
  a.denyAnalyticsNow(); consent.saveChoice(false); a.syncAnalytics();
  assert.equal(scripts.size, 0); assert.equal(window['ga-disable-G-TESTONLY01'], true);
  const count = events().length; assert.equal(a.trackCommerce('add_to_cart', [item]), false); assert.equal(events().length, count);
  assert.equal(store.get('upgrade79_cart'), 'preserved'); assert.equal(store.get('session'), 'preserved');
  assert.equal(store.has('upgrade79_ga4_purchases'), false);
  accept(); assert.equal(a.analyticsAllowed(), true); assert.equal(scripts.size, 1);
});
test('private routes and unapproved legal identity remain closed', () => {
  location.pathname = '/crm'; a.syncAnalytics(); assert.equal(a.analyticsAllowed(), false); assert.equal(scripts.size, 0);
  assert.equal(config.legalIdentity.holderName, 'Juan Cano Jimenez');
  assert.equal(config.legalIdentity.taxIdVerified, false); assert.equal(config.legalPublicationReady(), false);
});
test('missing ID, disabled measurement, unreviewed settings and an unknown host cannot activate analytics', () => {
  location.pathname = '/'; accept();
  const original = { ...a.ga4Settings };
  for (const change of [{ id: '' }, { id: 'not-a-measurement-id' }, { enabled: false }, { reviewed: false }]) {
    Object.assign(a.ga4Settings, original, change); assert.equal(a.analyticsAllowed(), false);
  }
  Object.assign(a.ga4Settings, original); location.hostname = 'unapproved.example.test';
  assert.equal(a.analyticsAllowed(), false); location.hostname = '127.0.0.1';
});
