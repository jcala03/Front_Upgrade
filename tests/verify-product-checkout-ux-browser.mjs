// Isolated UI fixtures: no production requests, no database, no real orders or payments.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/verify-product-checkout-ux-browser.mjs
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { configurableProduct, traditionalProduct } from './fixtures/configurator-products.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const directory = process.env.UX_SCREENSHOTS || '/tmp/upgrade79-product-checkout-ux-evidence';
await mkdir(directory, { recursive: true });
const p = configurableProduct('multi-oem', 'pantalla-aislada');
p.name = 'Pantalla Android BMW Serie 3 F30';
p.description = 'Pantalla multimedia con versiones de memoria independientes. Verifica el sistema original de tu vehículo antes de elegir.';
p.variants = p.variants.slice(0, 2);
p.variants[0].vehicle_compatibilities.push(structuredClone(p.variants[1].vehicle_compatibilities[1]));
p.configuration.purchase_enabled = true;
p.images = [{ image_url: '/fixture-image-2.svg', is_primary: false, sort_order: 1 }];
const simple = traditionalProduct(true);
simple.slug = 'producto-simple';
const fixture = `import React from 'react';import{createRoot}from'react-dom/client';
import{ProductDetailPage}from'/src/pages/ProductDetail/ProductDetailPage.tsx';
import{CheckoutDelivery}from'/src/pages/Checkout/CheckoutDelivery.tsx';
import{CartProvider}from'/src/context/CartContext.tsx';
import'/src/index.css';import'/src/pages/Checkout/CheckoutPage.css';
const mode=new URLSearchParams(location.search).get('mode');
const product=mode==='simple'?${JSON.stringify(simple)}:${JSON.stringify(p)};
const original={id:900001,order_number:'UI-ISOLATED',order_status:'pending',payment_status:'pending',fulfillment_type:'shipping',customer_name:'Persona de prueba',customer_phone:'3000000000',currency:'COP',subtotal:100000,total:100000,discount_total:0,charges_total:0,items:[],charges:[],shipping_address:null};
if(mode==='existing')original.shipping_address={recipient_name:'Persona de prueba',recipient_phone:'3000000000',country_code:'CO',state:'AT',city:'Soledad',postal_code:'083002',address_line1:'Cra 12#34-05',address_line2:'Oficina 2',delivery_notes:''};
if(mode==='rural')original.shipping_address={recipient_name:'Persona de prueba',recipient_phone:'3000000000',country_code:'CO',state:'Atlantico',city:'Soledad',postal_code:'083002',address_line1:'Vereda de prueba, finca aislada',address_line2:'',delivery_notes:''};
window.savedAddresses=[];window.checkoutIssues=[];window.requestMethods=[];
window.fetch=async(url,options={})=>{
const path=String(url);window.requestMethods.push(options.method||'GET');
if(path.endsWith('/sanctum/csrf-cookie'))return new Response(null,{status:204});
if(/\\/api\\/products\\//.test(path))return new Response(JSON.stringify({data:product}),{headers:{'Content-Type':'application/json'}});
if(path.endsWith('/shipping-address')&&options.method==='PUT'){
if(window.failSave)return new Response(JSON.stringify({message:'Dirección inválida',errors:{address_line1:['Revisa la dirección ingresada.']}}),{status:422,headers:{'Content-Type':'application/json'}});
const payload=JSON.parse(options.body);window.savedAddresses.push(payload);original.shipping_address=payload;
return new Response(JSON.stringify({data:original}),{headers:{'Content-Type':'application/json'}});}
if(path.endsWith('/pickup-branches'))return new Response(JSON.stringify({data:{branches:[{slug:'sede-aislada',name:'Sede de prueba',city:'Ciudad de prueba'}]}}),{headers:{'Content-Type':'application/json'}});
if(/\\/api\\/checkout\\/orders\\/isolated$/.test(path))return new Response(JSON.stringify({data:original}),{headers:{'Content-Type':'application/json'}});
throw new Error('Unexpected request blocked in isolated UI fixture');};
const onOrder=()=>{};const onIssue=code=>window.checkoutIssues.push(code);
const delivery=['delivery','existing','rural'].includes(mode);
createRoot(document.getElementById('root')).render(<CartProvider>{delivery?<main className="checkout-page"><div style={{maxWidth:860,margin:'auto',padding:'0 20px'}}><CheckoutDelivery token="isolated" buyerName="Persona de prueba" buyerPhone="3000000000" initialMode="shipping" onModeChange={()=>{}} onOrderChange={onOrder} onCheckoutIssue={onIssue}/></div></main>:<ProductDetailPage slug={product.slug} initialProduct={product} query=""/>}</CartProvider>);`;
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="600" viewBox="0 0 720 600"><rect width="720" height="600" fill="#f2f2f0"/><rect x="72" y="140" width="576" height="320" rx="20" fill="#1b1e23"/><rect x="91" y="160" width="538" height="275" rx="6" fill="#263d58"/><path d="M100 390L290 200 420 340 520 250 620 390" fill="none" stroke="#58aada" stroke-width="8"/><circle cx="220" cy="290" r="36" fill="#318abe"/><text x="360" y="510" font-size="16" text-anchor="middle" fill="#444">Ilustración de prueba aislada · no es fotografía comercial</text></svg>';
const server = await createServer({configFile:false,envFile:false,appType:'custom',esbuild:{jsx:'automatic'},optimizeDeps:{include:['react','react-dom/client']},
plugins:[{name:'product-checkout-fixture',resolveId:id=>id==='/ux-fixture.tsx'?id:undefined,load:id=>id==='/ux-fixture.tsx'?fixture:undefined}],
server:{host:'127.0.0.1',port:4197,strictPort:true,hmr:false,ws:false}});
server.middlewares.use((req,res,next)=>{
if(req.url?.endsWith('.svg')&&(req.url.includes('qa-image')||req.url.includes('fixture-image'))){res.setHeader('Content-Type','image/svg+xml');return res.end(svg);}
if(!req.url?.startsWith('/?'))return next();
res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link href="/fonts/oswald/oswald.css" rel="stylesheet"><title>QA aislado: ficha y dirección</title></head><body><div id="root"></div><script type="module" src="/ux-fixture.tsx"></script></body></html>');});
let browser;let scenarios=0;const pass=()=>scenarios++;
try{
await server.listen();browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
const context=await browser.newContext();const errors=[];const external=[];
await context.route('**/*',route=>{if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();external.push(route.request().url());return route.abort();});
const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
await page.goto(`${origin}/?mode=product`);await page.getByRole('heading',{name:p.name,exact:true}).waitFor();
for(const width of [1440,1280,1024,768,430,390,360]){
await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true,`product overflow ${width}`);pass();
if([1440,390].includes(width))await page.screenshot({path:`${directory}/product-${process.env.UX_BEFORE?'before':'after'}-${width}.png`,fullPage:true});}
if(process.env.UX_BEFORE){console.log(`Captured baseline: ${directory}`);}
else{
await page.getByRole('combobox',{name:'Sistema OEM'}).selectOption('41');
await page.getByRole('combobox',{name:'Configuración de memoria'}).selectOption('8/128');
assert.equal(await page.getByRole('button',{name:'Agregar al carrito',exact:true}).isEnabled(),true);pass();
await page.getByRole('button',{name:'Agregar al carrito',exact:true}).click();
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('upgrade79_cart'))[0].variant.id),2);pass();
await page.getByRole('button',{name:/Ver imagen 2/}).click();assert.equal(await page.locator('.product-detail__media img').getAttribute('src'),'/storage/fixture-image-2.svg');pass();
await page.goto(`${origin}/?mode=simple`);await page.getByRole('heading',{name:'Producto simple',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Agregar al carrito',exact:true}).isEnabled(),true);pass();
await page.goto(`${origin}/?mode=delivery`);
const country=page.getByRole('combobox',{name:'País',exact:true});const state=page.getByRole('combobox',{name:'Departamento / Estado',exact:true});const city=page.getByRole('combobox',{name:'Ciudad / Municipio',exact:true});
await country.waitFor();assert.equal(await country.inputValue(),'CO');assert.equal(await city.isDisabled(),true);pass();
await state.selectOption({label:'Atlántico'});await city.selectOption({label:'Soledad'});
assert.equal(await city.locator('option').count(),24);pass();
await page.getByLabel('Código postal',{exact:true}).fill('083002');
await page.getByRole('combobox',{name:'Tipo de vía principal',exact:true}).selectOption('Calle');
await page.getByLabel('Número o nombre de vía',{exact:true}).fill('20');
await page.getByLabel('Vía generadora',{exact:true}).fill('15B');
await page.getByLabel('Placa o puerta',{exact:true}).fill('10');
assert.match(await page.locator('.checkout-address__preview').innerText(),/Calle 20 # 15B - 10/);pass();
for(const width of [1440,1280,1024,768,430,390,360]){
await page.setViewportSize({width,height:1100});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true,`delivery overflow ${width}`);pass();
if([1440,390].includes(width))await page.screenshot({path:`${directory}/delivery-${width}.png`,fullPage:true});}
await page.getByRole('button',{name:'Guardar dirección',exact:true}).click();await page.waitForFunction(()=>window.savedAddresses.length===1);
const saved=await page.evaluate(()=>window.savedAddresses[0]);assert.equal(saved.country_code,'CO');assert.equal(saved.state,'Atlantico');assert.equal(saved.city,'Soledad');assert.equal(saved.postal_code,'083002');assert.equal(saved.address_line1,'Calle 20 # 15B - 10');pass();
await state.selectOption({label:'Antioquia'});assert.equal(await city.inputValue(),'');assert.equal(await page.getByLabel('Código postal',{exact:true}).inputValue(),'');assert.equal(await page.getByRole('button',{name:'Calcular envío',exact:true}).count(),0);assert.equal(await page.evaluate(()=>window.checkoutIssues.at(-1)),'ADDRESS_DIRTY');pass();
await page.getByRole('button',{name:'Guardar dirección',exact:true}).click();assert.equal(await page.evaluate(()=>window.savedAddresses.length),1);pass();
await country.selectOption('US');assert.equal(await page.getByRole('textbox',{name:'Departamento / Estado',exact:true}).count(),1);assert.equal(await page.getByLabel('Dirección completa',{exact:true}).inputValue(),'Calle 20 # 15B - 10');pass();
await page.goto(`${origin}/?mode=existing`);await page.getByRole('combobox',{name:'Tipo de vía principal',exact:true}).waitFor();assert.equal(await page.getByRole('combobox',{name:'Tipo de vía principal',exact:true}).inputValue(),'Carrera');assert.equal(await page.getByLabel('Placa o puerta',{exact:true}).inputValue(),'05');assert.equal(await page.evaluate(()=>window.savedAddresses.length),0);pass();
await page.getByLabel('Número o nombre de vía',{exact:true}).fill('45');await page.getByRole('button',{name:'Guardar dirección',exact:true}).click();await page.waitForFunction(()=>window.savedAddresses.length===1);assert.equal(await page.evaluate(()=>window.savedAddresses[0].address_line2),'Oficina 2');pass();
await page.goto(`${origin}/?mode=rural`);await page.getByLabel('Dirección completa',{exact:true}).waitFor();assert.equal(await page.getByLabel('Dirección completa',{exact:true}).inputValue(),'Vereda de prueba, finca aislada');pass();
await page.getByLabel('Dirección completa',{exact:true}).fill('Vereda de prueba, finca aislada 2');await page.evaluate(()=>{window.failSave=true;});await page.getByRole('button',{name:'Guardar dirección',exact:true}).click();await page.getByText('Revisa la dirección ingresada.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.savedAddresses.length),0);pass();
await page.getByRole('radio',{name:'Recoger en sede',exact:false}).check();await page.getByText('Sede de prueba',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.savedAddresses.length),0);pass();
assert.deepEqual(errors,[]);assert.deepEqual(external,[]);pass();
console.log(`PASS: ${scenarios} browser scenarios. Product variants/OEM/cart/gallery, structured address and dependent selectors, saved and rural addresses, errors, pickup, seven responsive widths. All requests intercepted; zero provider/production/database access. Evidence: ${directory}`);
}
}finally{await browser?.close();await server.close();}
