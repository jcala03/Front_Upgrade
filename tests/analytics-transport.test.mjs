import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const vite = await createServer({ configFile:false, envFile:false, optimizeDeps:{noDiscovery:true,include:[]},
  server:{middlewareMode:true,hmr:false,ws:false},appType:'custom' });
after(() => vite.close());
const { installAnalyticsTransportGuard } = await vite.ssrLoadModule('/src/privacy/analyticsTransport.ts');
const id = 'G-9SGBHZ5YT9';
const collect = `https://www.google-analytics.com/g/collect?tid=${id}`;
function fixture() {
  const calls = [], reply = Promise.resolve('native response');
  class XHR {
    open(...args) { this.openArgs = args; }
    send(...args) { calls.push({type:'xhr',receiver:this,args}); }
    abort() { this.aborted = true; }
  }
  const target = {location:{href:'https://upgradecolombia.com/tienda'}, XMLHttpRequest:XHR,
    navigator:{sendBeacon(...args){ calls.push({type:'beacon',receiver:this,args});return true; }},
    fetch(...args){ calls.push({type:'fetch',receiver:this,args});return reply; }};
  let consent = false;
  assert.equal(installAnalyticsTransportGuard(target, () => consent, id), true);
  return {target,calls,reply,accept:() => {consent=true;},reject:() => {consent=false;}};
}
test('cached SDK fetch checks current consent at dispatch, including queued batches and later acceptance', async () => {
  const f = fixture();const captured = f.target.fetch.bind(f.target);
  await assert.rejects(captured(collect), {name:'AbortError'});assert.equal(f.calls.length,0);
  f.accept();const options = {method:'POST',body:'en=page_view',keepalive:true};
  assert.equal(captured(collect, options), f.reply);assert.equal(f.calls[0].args[1],options);
  f.reject();await assert.rejects(captured(collect,options),{name:'AbortError'});assert.equal(f.calls.length,1);
  f.accept();await captured(collect,options);assert.equal(f.calls.length,2);
});
test('all observed GA collection endpoints block after withdrawal and refuse other/missing destination IDs', async () => {
  const f=fixture();
  for (const host of ['www.google-analytics.com','region1.google-analytics.com','www.google.com','analytics.google.com','www.googletagmanager.com']) {
    const url=`https://${host}/g/collect?tid=${id}`;
    await assert.rejects(f.target.fetch(url),{name:'AbortError'});
    assert.equal(f.target.navigator.sendBeacon(url,'en=page_view'),false);
    f.accept();await f.target.fetch(url);f.reject();
  }
  f.accept();const count=f.calls.length;
  for (const suffix of ['?tid=G-RXJ570E5BE','?tid=G-UNAPPROVED','']) {
    await assert.rejects(f.target.fetch('https://www.google-analytics.com/g/collect'+suffix),{name:'AbortError'});
  }
  assert.equal(f.calls.length,count);
});
test('Request and URL inputs receive the same current-choice protection', async () => {
  const f=fixture();
  await assert.rejects(f.target.fetch(new Request(collect)),{name:'AbortError'});
  await assert.rejects(f.target.fetch(new URL(collect)),{name:'AbortError'});
  f.accept();await f.target.fetch(new Request(collect));await f.target.fetch(new URL(collect));assert.equal(f.calls.length,2);
});
test('beacon fallback cannot bypass withdrawal; non-Analytics receiver, arguments and return value are preserved', () => {
  const f=fixture();const captured=f.target.navigator.sendBeacon.bind(f.target.navigator);
  f.accept();assert.equal(captured(collect,'batch'),true);f.reject();assert.equal(captured(collect,'batch'),false);
  const data=new Blob(['unchanged']);assert.equal(captured('/api/telemetry',data),true);
  assert.equal(f.calls.at(-1).receiver,f.target.navigator);assert.equal(f.calls.at(-1).args[1],data);
});
test('XHR opened before withdrawal is aborted before native send; authorized and commercial XHR remain unchanged', () => {
  const f=fixture();f.accept();const xhr=new f.target.XMLHttpRequest();xhr.open('POST',collect,true);
  f.reject();xhr.send('queued');assert.equal(xhr.aborted,true);assert.equal(f.calls.length,0);
  const api=new f.target.XMLHttpRequest();const payload={untouched:true};
  api.open('POST','/api/checkout/orders',false,'name','password');api.send(payload);
  assert.deepEqual(api.openArgs,['POST','/api/checkout/orders',false,'name','password']);assert.equal(f.calls[0].args[0],payload);
  const ga=new f.target.XMLHttpRequest();ga.open('POST',collect,true);f.accept();ga.send('allowed');assert.equal(f.calls.length,2);
});
test('native API, Envia, Wompi, resource requests and native failures are not intercepted', async () => {
  const f=fixture();const options={method:'POST',body:'unchanged',credentials:'include'};
  for (const url of ['/api/auth/me','/api/checkout/orders/1/shipping-quotes','https://api.envia.com/ship/rate/',
    'https://production.wompi.co/v1/transactions','https://checkout.wompi.co/p/',
    'https://www.google.com/maps/api/test','https://www.google-analytics.com.example.test/g/collect',
    'https://www.googletagmanager.com/gtag/js?id='+id]) {
    assert.equal(f.target.fetch(url,options),f.reply);assert.equal(f.calls.at(-1).receiver,f.target);
    assert.equal(f.calls.at(-1).args[0],url);assert.equal(f.calls.at(-1).args[1],options);
  }
  const expected=new Error('native failure');const target={...f.target,fetch(){throw expected;},XMLHttpRequest:undefined};
  installAnalyticsTransportGuard(target,()=>false,id);
  assert.throws(()=>target.fetch('/api/auth/me'),error=>error===expected);
});
test('a browser that forbids guarding transport is reported unsafe rather than loading an unguarded SDK', () => {
  const target={location:{href:'https://upgradecolombia.com'},navigator:{}};
  Object.defineProperty(target,'fetch',{value:()=>{},writable:false});
  assert.equal(installAnalyticsTransportGuard(target,()=>true,id),false);
});
