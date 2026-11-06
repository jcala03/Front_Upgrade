import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
const vite=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
after(()=>vite.close());
const {Contact}=await vite.ssrLoadModule('/src/components/sections/Contact/Contact.tsx');
const {bookingDateSnapshot,initialBookingDate}=await vite.ssrLoadModule('/src/components/sections/Contact/publicBooking.ts');
const {renderRequest}=await vite.ssrLoadModule('/src/seo/entry-server.tsx');

function at(instant,run){
  const OriginalDate=globalThis.Date;
  globalThis.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[instant]));}static now(){return new OriginalDate(instant).getTime();}};
  try{return run();}finally{globalThis.Date=OriginalDate;}
}
test('SSR date snapshot uses Colombia, including UTC day/month/year boundaries',()=>{
  assert.equal(bookingDateSnapshot(new Date('2027-01-01T03:00:00Z')),'2026-12-31');
  assert.equal(bookingDateSnapshot(new Date('2027-01-01T05:00:00Z')),'2027-01-01');
});
test('first client calendar matches old prerender HTML despite different date/month/year',()=>{
  for(const [built,opened] of [['2026-11-03T17:00:00Z','2026-11-06T17:00:00Z'],['2026-10-31T17:00:00Z','2026-11-06T17:00:00Z'],['2026-12-31T17:00:00Z','2027-01-01T17:00:00Z']]){
    const snapshot=bookingDateSnapshot(new Date(built));
    const server=at(built,()=>renderToString(createElement(Contact,{initialDate:snapshot})));
    const client=at(opened,()=>renderToString(createElement(Contact,{initialDate:snapshot})));
    assert.equal(client,server,`${built} -> ${opened}: exact initial React tree`);
    // Without the serialized day this is the precise stale-prerender regression.
    assert.notEqual(at(opened,()=>renderToString(createElement(Contact))),server);
  }
});
test('client Contact reads the same serialized date from public bootstrap by default',()=>{
  const descriptors=['document','location'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]);
  const element={textContent:JSON.stringify({path:'/',bookingDate:'2026-11-03'})};
  Object.defineProperty(globalThis,'document',{configurable:true,value:{getElementById:()=>element}});
  Object.defineProperty(globalThis,'location',{configurable:true,value:{pathname:'/'}});
  try{
    const client=at('2026-11-06T17:00:00Z',()=>renderToString(createElement(Contact)));
    const server=at('2026-11-03T17:00:00Z',()=>renderToString(createElement(Contact,{initialDate:'2026-11-03'})));
    assert.equal(client,server);
  }finally{for(const[k,d]of descriptors){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
});
test('missing/invalid historical snapshots fall back safely without inventing calendar dates',()=>{
  for(const snapshot of [undefined,'','not-a-date','2026-02-31','2026-13-01'])assert.equal(at('2026-11-06T17:00:00Z',()=>initialBookingDate(snapshot).getDate()),6);
});
test('Home SSR serializes exactly the date used by its visible calendar, including catalog failure',async()=>{
  const original=globalThis.fetch;
  try{
    for(const fail of [false,true]){
      globalThis.fetch=async()=>fail?new Response('{}',{status:503}):new Response('{"data":[]}');
      const r=await renderRequest('/','<html><head><!--seo-head--></head><body><div id="root"></div></body></html>',{siteUrl:'https://upgradecolombia.com',apiBase:'http://127.0.0.1:1'});
      assert.equal(r.status,200);
      const bootstrap=JSON.parse(r.body.match(/id="public-bootstrap"[^>]*>(.*?)<\/script>/s)[1]);
      assert.equal(bootstrap.bookingDate,bookingDateSnapshot());
      assert.ok(r.body.includes(renderToString(createElement(Contact,{initialDate:bootstrap.bookingDate}))));
    }
  }finally{globalThis.fetch=original;}
});
