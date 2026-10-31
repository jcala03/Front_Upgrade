import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { configurableProduct, traditionalProduct } from './fixtures/configurator-products.mjs';

const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const cart = await vite.ssrLoadModule('/src/domain/cartLines.ts');
const contract = await vite.ssrLoadModule('/src/types/productConfiguration.ts');
const storage = await vite.ssrLoadModule('/src/utils/checkoutStorage.ts');
const { ConfigurationSummary } = await vite.ssrLoadModule('/src/components/ConfigurationSummary.tsx');
const product = () => { const p = configurableProduct(); p.configuration.purchase_enabled = true; return p; };
const context = (oem = 40) => ({ schema_version: 1, profile_id: 'vehicle-oem-memory-v1', profile_version: 1,
  vehicle_brand_id: 10, vehicle_model_id: 20, vehicle_version_id: 30, vehicle_multimedia_system_id: oem,
  year: 2016, ram_gb: 8, almacenamiento_gb: 128, vehicle_brand_name: 'BMW', vehicle_model_name: 'Serie 3',
  vehicle_version_name: 'F30', vehicle_multimedia_system_name: oem === 40 ? 'CIC' : 'NBT' });

test('same physical variant keeps two OEM lines, same contextual selection merges only itself', () => {
  const p = product(), v = p.variants[1];
  let items = cart.addCartItem([], p, 1, v, context());
  items = cart.addCartItem(items, p, 1, v, context(41));
  items = cart.addCartItem(items, p, 1, v, context());
  assert.equal(items.length, 2);
  assert.deepEqual(items.map(i => i.quantity), [2, 1]);
  assert.equal(cart.commercialQuantity(items, p.id, v.id), 3);
  assert.equal(cart.addCartItem(items, p, 1, v, context(41)), items);
  assert.notEqual(cart.cartItemKey(p.id,v.id,context()), cart.cartItemKey(p.id,v.id,context(41)));
});
test('increment/decrement respect shared stock without changing another context', () => {
  const p = product(), v = p.variants[1];
  let items = cart.addCartItem(cart.addCartItem([],p,1,v,context()),p,1,v,context(41));
  items = cart.changeCartQuantity(items,p.id,v.id,99,context());
  assert.deepEqual(items.map(i=>i.quantity),[2,1]);
  items = cart.changeCartQuantity(items,p.id,v.id,1,context());
  assert.deepEqual(items.map(i=>i.quantity),[1,1]);
  items = cart.changeCartQuantity(items,p.id,v.id,2,context(41));
  assert.deepEqual(items.map(i=>i.quantity),[1,2]);
});
test('consumption is contextual and duplicate stored lines never double-subtract', () => {
  const p = product(), v = p.variants[1];
  const items = [ { product:p,variant:v,quantity:2,configuration_context:context() }, { product:p,variant:v,quantity:2,configuration_context:context(41) } ];
  const remaining = cart.consumeCartLines(items,[{productId:p.id,variantId:v.id,quantity:1,configuration_context:context()}]);
  assert.deepEqual(remaining.map(i=>i.quantity),[1,2]);
  const duplicate = [items[0],items[0]];
  assert.equal(cart.consumeCartLines(duplicate,[{productId:p.id,variantId:v.id,quantity:1,configuration_context:context()}]).reduce((s,i)=>s+i.quantity,0),3);
});
test('traditional/simple identities and historical contextless cart consumption remain supported', () => {
  const p = traditionalProduct(true);
  let items = cart.addCartItem([],p,2,null);
  assert.equal(cart.cartItemKey(p.id,null),`${p.id}:product`);
  items = cart.consumeCartLines(items,[{productId:p.id,variantId:null,quantity:1}]);
  assert.equal(items[0].quantity,1);
  assert.equal(cart.addCartItem([], product(),1,product().variants[1]).length,0);
  const off = product();off.configuration.purchase_enabled=false;
  assert.equal(cart.addCartItem([],off,1,off.variants[1],context()).length,0);
});
test('purchase DTO strips display labels, commercial details and arbitrary client fields', () => {
  const dto = contract.purchaseConfiguration({...context(),price:1,sku:'injected',variant_id:123,cost_price:1});
  assert.deepEqual(Object.keys(dto),['schema_version','profile_id','profile_version','vehicle_brand_id','vehicle_model_id','vehicle_version_id','vehicle_multimedia_system_id','year','ram_gb','almacenamiento_gb']);
  assert.equal(contract.configurationKey(context()),contract.configurationKey({...context(),vehicle_brand_name:'Renamed'}));
});
test('snapshot and paid reconciliation survive serialization and consume exactly once per order token', () => {
  const data = new Map();
  globalThis.sessionStorage = {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
  try {
    const p=product(),v=p.variants[1];
    let items=cart.addCartItem(cart.addCartItem([],p,1,v,context()),p,1,v,context(41));
    storage.storeCreatedCheckout({public_token:'test-token'},[items[0]]);
    let calls=0;
    const consume=lines=>{calls++;items=cart.consumeCartLines(items,lines);};
    storage.reconcilePaidCart('test-token',consume);
    storage.reconcilePaidCart('test-token',consume);
    assert.equal(calls,1);assert.equal(items.length,1);assert.equal(items[0].configuration_context.vehicle_multimedia_system_id,41);
    storage.finishActiveCheckout('test-token');
    assert.equal(storage.readActiveCheckout(),null);assert.equal(storage.readLastOrder().public_token,'test-token');
    assert.equal(data.get(storage.CREATE_IDEMPOTENCY_KEY),undefined);
  } finally { delete globalThis.sessionStorage; }
});
test('one summary renders identical real vehicle/OEM/memory for cart, checkout and order snapshot', () => {
  const ctx=context();
  const html=renderToString(createElement(ConfigurationSummary,{context:ctx}));
  for (const label of ['BMW','F30','Sistema OEM: CIC','RAM: 8 GB','Almacenamiento: 128 GB']) assert.ok(html.includes(label));
  assert.equal(renderToString(createElement(ConfigurationSummary,{context:null})), '');
  assert.equal(contract.configurationSummary(ctx),contract.configurationSummary({...ctx,variant_id:2,variant_sku:'REAL-SKU'}));
});
