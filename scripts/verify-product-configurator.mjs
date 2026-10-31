// Hydrates the real ProductDetailPage + CartProvider with synthetic SSR/API data.
// Order writes in Stage E are intercepted synthetic responses; all other writes/external
// requests are blocked. Persistence against MySQL is covered separately by Laravel tests.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement, StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { configurableProduct, traditionalProduct } from '../tests/fixtures/configurator-products.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = await mkdtemp(join(tmpdir(), 'upgrade79-configurator-view.'));
const scenarioProduct = scenario => {
  if (scenario === 'traditional') return traditionalProduct();
  if (scenario === 'simple') return traditionalProduct(true);
  const product = configurableProduct(scenario === 'purchase' ? 'multi-oem' : scenario);
  if (scenario === 'single-vehicle') product.variants = product.variants.filter(v => v.vehicle_compatibilities.every(row => row.vehicle_brand_id === 10));
  if (scenario === 'purchase') product.configuration.purchase_enabled = true;
  return product;
};
const client = `
import { createElement, StrictMode, useState } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { CartProvider } from '/src/context/CartContext.tsx';
import { ProductDetailPage } from '/src/pages/ProductDetail/ProductDetailPage.tsx';
import { CartPage } from '/src/pages/Cart/CartPage.tsx';
import { CheckoutPage } from '/src/pages/Checkout/CheckoutPage.tsx';
import { OrderConfirmationPage } from '/src/pages/OrderConfirmation/OrderConfirmationPage.tsx';
import '/src/index.css';
const fixture=JSON.parse(document.getElementById('qa-fixture').textContent);
function Harness(){const [props,setProps]=useState(fixture);window.__navigateFixture=setProps;
if(props.view==='cart')return createElement(CartPage);
if(props.view==='checkout')return createElement(CheckoutPage);
if(props.view==='confirmation')return createElement(OrderConfirmationPage);
return createElement(ProductDetailPage,props);}
hydrateRoot(document.getElementById('root'),createElement(StrictMode,null,createElement(CartProvider,null,createElement(Harness))),
{onRecoverableError:error=>console.error('HYDRATION: '+error.message)});
`;
let ProductDetailPage, CartProvider;
const vite = await createServer({ root, configFile: false, cacheDir: join(artifacts, 'cache'),
  define: { __PUBLIC_SITE_URL__: JSON.stringify('https://upgradecolombia.com') }, esbuild: { jsx: 'automatic' },
  optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-dev-runtime', 'lucide-react'] },
  server: { host: '127.0.0.1', port: 5194, strictPort: true, hmr: false },
  plugins: [{ name: 'real-product-page-qa', resolveId(id) { if (id === '/__configurator-qa.js') return '\0configurator-qa'; }, load(id) { if (id === '\0configurator-qa') return client; },
    configureServer(server) { server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith('/tienda/')) return next();
      try {
        const url = new URL(req.url, 'http://localhost');
        const scenario = url.searchParams.get('scenario') || 'normal';
        let product = scenarioProduct(scenario);
        if (url.searchParams.get('filtered') === '1') product = { ...product, variants: product.variants.filter(v => v.vehicle_compatibilities.some(row => row.vehicle_multimedia_system_id === 40)) };
        const props = { slug: product.slug, initialProduct: product, query: url.search };
        const html = renderToString(createElement(StrictMode, null, createElement(CartProvider, null, createElement(ProductDetailPage, props))));
        const data = JSON.stringify(props).replaceAll('<', '\\u003c');
        const document = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA local</title></head><body><div id="root">'+html+'</div><script type="application/json" id="qa-fixture">'+data+'</script><script type="module" src="/__configurator-qa.js"></script></body></html>';
        res.setHeader('Content-Type','text/html; charset=utf-8'); res.end(await server.transformIndexHtml(req.url, document));
      } catch (error) { res.statusCode=500;res.end(String(error.stack)); }
    }); },
  }],
});
let browser, releaseOld, debugPage;
try {
  await vite.listen();
  ({ ProductDetailPage } = await vite.ssrLoadModule('/src/pages/ProductDetail/ProductDetailPage.tsx'));
  ({ CartProvider } = await vite.ssrLoadModule('/src/context/CartContext.tsx'));
  const origin = vite.resolvedUrls.local[0].replace(/\/$/, '');
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const errors = [], writes = [], unexpected = [], results = [], reads = [], expectedHttpErrors = [];
  let pendingExpectedHttpErrors=0;
  let scenario = 'normal', rejectNext = false, omitRegistration = false;
  const simulatedOrderRequests=[];
  let simulatedOrder=null,rejectOrder=false;
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) { unexpected.push(request.url()); console.error('Blocked external QA request:',request.url()); return route.abort(); }
    if (request.method() === 'POST' && url.pathname.endsWith('/api/orders') && scenario === 'purchase') {
      const payload=request.postDataJSON();
      simulatedOrderRequests.push({payload,key:request.headers()['idempotency-key']});
      if(rejectOrder){rejectOrder=false;pendingExpectedHttpErrors++;return route.fulfill({status:422,json:{message:'Revisa la configuración del vehículo.',errors:{items:['Revisa la configuración del vehículo.']}}});}
      const p=scenarioProduct('purchase');
      simulatedOrder={id:999,order_number:'QA-E-999',order_status:'pending',payment_status:'unpaid',fulfillment_type:'pickup',currency:'COP',
        subtotal:2400000,discount_total:0,charges_total:0,total:2400000,charges:[],shipping_address:null,created_at:new Date().toISOString(),ready_for_payment:false,
        items:payload.items.map((line,index)=>{const v=p.variants.find(v=>v.id===line.product_variant_id);const row=v.vehicle_compatibilities.find(r=>r.vehicle_multimedia_system_id===line.configuration_context.vehicle_multimedia_system_id);
          return {id:index+1,item_type:'product',product_id:p.id,product_variant_id:v.id,product_name:p.name,variant_name:v.name,variant_sku:v.sku,unit_price:v.price,quantity:line.quantity,total:v.price*line.quantity,
            configuration_context:{...line.configuration_context,vehicle_brand_name:row.vehicle_brand.name,vehicle_model_name:row.vehicle_model.name,vehicle_version_name:row.vehicle_version.name,vehicle_multimedia_system_name:row.vehicle_multimedia_system.name}};})};
      return route.fulfill({status:201,json:{public_token:'qa-local-only-token',data:simulatedOrder}});
    }
    if (request.method() !== 'GET') { writes.push(request.method()+' '+url.pathname); return route.abort(); }
    if(url.pathname.endsWith('/sanctum/csrf-cookie'))return route.fulfill({status:204});
    if(url.pathname.includes('/api/checkout/orders/qa-local-only-token'))return route.fulfill({json:{data:url.pathname.endsWith('/pickup-branches')?{branches:[]}:simulatedOrder}});
    if (url.pathname.startsWith('/__qa-image-')) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#171a1e"/><text x="50" y="300" fill="#a6c9db" font-size="24">Imagen sintética de prueba</text></svg>' });
    if (url.pathname.includes('/api/products/')) {
      reads.push(url.pathname + url.search);
      if (rejectNext) { rejectNext=false;pendingExpectedHttpErrors++;return route.fulfill({ status:503,json:{message:'Prueba de conexión'} }); }
      let product = scenarioProduct(scenario);
      if (omitRegistration) product = { ...product, configuration: null };
      if (url.pathname.endsWith('/new-fixture')) product = { ...product, id: 900002, slug:'new-fixture',name:'Nuevo producto de prueba', variants:product.variants.map(v=>({...v,product_id:900002})) };
      if (scenario === 'stale' && !url.pathname.endsWith('/new-fixture')) await new Promise(resolve=>{releaseOld=resolve;});
      return route.fulfill({ json:{data:product} }).catch(()=>{});
    }
    if (/^\/(?:__public-api\/)?api\//.test(url.pathname)) { unexpected.push(url.pathname); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  debugPage=page;
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  page.on('console', message => { if(message.type()==='error') {
    if(pendingExpectedHttpErrors>0 && /Failed to load resource.*(?:503|422)/.test(message.text())){pendingExpectedHttpErrors--;expectedHttpErrors.push(message.text());return;}
    errors.push(message.text());console.error(message.text());
  } });
  const controls = () => ({oem:page.getByRole('group',{name:'Sistema OEM',exact:true}),memory:page.getByRole('group',{name:'Configuración de memoria',exact:true})});
  const press = (group, value) => group.locator(`button[data-option-value="${value}"]`).click();
  const pressed = async group => await group.locator('button[aria-pressed="true"]').count()
    ? group.locator('button[aria-pressed="true"]').getAttribute('data-option-value') : '';
  const reference = value => press(page.getByRole('group',{name:'Elige la referencia exacta',exact:true}),value);
  const status = name => page.locator(`[data-configuration-status="${name}"]`).waitFor();
  const defaultVehicleQuery='&vehicle_brand_id=10&vehicle_model_id=20&vehicle_version_id=30';
  const open = async (next='normal',query) => {scenario=next;const context=query??(['multi-vehicle','single-vehicle'].includes(next)?'':defaultVehicleQuery);await page.goto(origin+'/tienda/configuration-fixture?scenario='+next+context); await page.locator('.product-detail').waitFor();};
  const choose = async (oem='40',memory='8/128') => { const c=controls();await press(c.oem,oem);await press(c.memory,memory); };
  const checkProtected = async () => {
    assert.equal(await page.getByRole('button',{name:'Compra online no habilitada',exact:true}).isDisabled(),true);
    assert.equal(await page.getByLabel('Versión del producto',{exact:true}).count(),0);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('upgrade79_cart')||'[]').length),0);
  };
  for(const width of [1440,1280,1024,768,430,390,360]) {
    await page.setViewportSize({width,height:1000}); await open(); await choose(); await status('valid');
    assert.match(await page.locator('.product-detail__sku').innerText(),/QA-CONFIG-2/);
    assert.match(await page.locator('.product-detail__price').innerText(),/1\.200\.000/);
    assert.match(await page.locator('.product-detail__media img').getAttribute('src'),/__qa-image-2/);
    await press(controls().oem,'41'); await status('valid');
    assert.match(await page.locator('.product-detail__sku').innerText(),/QA-CONFIG-3/);
    await press(controls().memory,'8/256'); await status('valid');
    assert.match(await page.locator('.product-detail__sku').innerText(),/QA-CONFIG-4/);
    await press(controls().oem,'40'); await status('incomplete');
    assert.equal(await pressed(controls().memory),'');
    assert.equal(await controls().memory.locator('button[data-option-value="8/256"]').isDisabled(),true);
    await press(controls().memory,'8/128'); await status('valid');
    await page.getByText('¿No sabes qué sistema original tiene tu vehículo?',{exact:true}).focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.product-configurator__help').evaluate(node=>node.open),true);
    assert.match(await page.locator('.product-configurator__help').innerText(),/año por sí solo no identifica/);
    await open('normal','&vehicle_brand_id=11&vehicle_model_id=21&vehicle_version_id=31');
    assert.equal(await pressed(controls().oem),'');
    await press(controls().oem,'42');await press(controls().memory,'8/256');await status('valid');
    assert.match(await page.locator('.product-detail__sku').innerText(),/QA-CONFIG-6/);
    await checkProtected();
    const layout=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,page:document.documentElement.scrollWidth,fields:[...document.querySelectorAll('.product-configurator select,.product-configurator input,.product-configurator__option,.product-detail__button')].map(node=>{const r=node.getBoundingClientRect();return{left:r.left,right:r.right,height:r.height};})}));
    assert.ok(layout.page<=layout.viewport,JSON.stringify(layout));
    assert.ok(layout.fields.every(r=>r.left>=0&&r.right<=layout.viewport+1&&r.height>=44),JSON.stringify(layout));
    const oemButton=controls().oem.getByRole('button').first();
    await oemButton.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    assert.equal(await oemButton.evaluate(node=>getComputedStyle(node).outlineStyle),'solid');
    await page.keyboard.press('Space');
    assert.equal(await oemButton.getAttribute('aria-pressed'),'true');
    if([1440,390].includes(width)) await page.screenshot({path:join(artifacts,`configurator-${width}.png`),fullPage:true});
    results.push({width,responsive:'PASS',vehicleOemMemory:'PASS',priceSkuImage:'PASS',purchaseBlocked:true});
  }
  await open('single-vehicle');await choose();await status('valid');
  assert.equal(await page.locator('.product-configurator select,.product-configurator input').count(),0);
  assert.match(await page.locator('.product-detail__sku').innerText(),/QA-CONFIG-2/);await checkProtected();
  await open('multi-vehicle');await page.locator('[data-vehicle-context="ambiguous"]').waitFor();await checkProtected();
  assert.equal(await controls().oem.getByRole('button').count(),0);
  assert.equal(await page.getByRole('link',{name:'Verificar compatibilidad en la tienda',exact:true}).getAttribute('href'),'/tienda');
  await open('normal','&vehicle_brand_id=999&vehicle_model_id=998&vehicle_version_id=997');
  await page.locator('[data-vehicle-context="unverified"]').waitFor();await checkProtected();
  await open('normal','&filtered=1&vehicle_brand_id=10&vehicle_model_id=20&vehicle_version_id=30&vehicle_multimedia_system_id=40&year=2016');
  await press(controls().memory,'8/128');await status('valid');
  assert.equal(await pressed(controls().oem),'40');
  await press(controls().oem,'41');await status('valid');
  assert.match(await page.locator('.product-detail__sku').innerText(),/QA-CONFIG-3/);
  assert.ok(reads.every(url=>!url.includes('vehicle_multimedia_system_id=')));
  await open('normal');await choose('41','4/64');await status('out_of_stock');
  assert.match(await page.locator('.product-detail__sku').innerText(),/QA-CONFIG-5/);await checkProtected();
  await open('ambiguous');await choose('41','8/256');await status('ambiguous');
  await reference('7');await status('valid');
  assert.match(await page.locator('.product-detail__sku').innerText(),/QA-EXTRA-HARNESS/);
  await reference('4');await status('valid');
  assert.match(await page.locator('.product-detail__sku').innerText(),/QA-CONFIG-4/);await checkProtected();
  await open('multi-oem');await choose('40','8/128');await status('valid');
  await press(controls().oem,'41');await status('ambiguous');await checkProtected();
  for(const next of ['disabled','unsupported','incomplete']) {await open(next);await checkProtected();if(next==='incomplete') await page.waitForFunction(()=>document.querySelector('[aria-busy="false"]'));}
  rejectNext=true;await open();await status('connection_error');await checkProtected();
  await page.getByRole('button',{name:'Reintentar configuraciones'}).click();await choose();await status('valid');
  omitRegistration=true;await open();await status('insufficient_data');await checkProtected();omitRegistration=false;
  // Same mounted real page, old fetch ignores abort: the old product must never replace the new one.
  await open('stale');await page.waitForFunction(()=>typeof window.__navigateFixture==='function');
  const oldDeadline=Date.now()+10000;
  while(!releaseOld && Date.now()<oldDeadline) await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(typeof releaseOld,'function');
  const newProduct={...configurableProduct('normal','new-fixture'),id:900002,name:'Nuevo producto de prueba'};
  newProduct.variants=newProduct.variants.map(v=>({...v,product_id:900002}));
  await page.evaluate(p=>window.__navigateFixture({slug:p.slug,initialProduct:p,query:'vehicle_brand_id=10&vehicle_model_id=20&vehicle_version_id=30'}),newProduct);
  await page.getByRole('heading',{name:'Nuevo producto de prueba',exact:true}).waitFor();
  releaseOld();await choose();await status('valid');
  assert.equal(await page.getByRole('heading',{name:'Nuevo producto de prueba',exact:true}).count(),1);await checkProtected();
  for(const next of ['traditional','simple']) {
    await page.evaluate(()=>localStorage.clear());await open(next);
    if(next==='traditional') await page.getByLabel('Versión del producto',{exact:true}).selectOption('1');
    await page.getByRole('button',{name:'Agregar al carrito',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Producto agregado.'}).waitFor();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('upgrade79_cart')).length),1);
  }
  const stageEResults=[];
  const switchView=async view=>page.evaluate(view=>window.__navigateFixture({view}),view);
  const noOverflow=async()=>{const sizes=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);assert.ok(sizes[0]<=sizes[1],JSON.stringify(sizes));};
  for(const width of [1440,1280,1024,768,430,390,360]) {
    await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
    await page.setViewportSize({width,height:1000});await open('purchase');await choose();await status('valid');
    await page.getByRole('button',{name:'Agregar al carrito',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Producto agregado.'}).waitFor();
    await press(controls().oem,'41');await status('ambiguous');
    await reference('2');await status('valid');
    await page.getByRole('button',{name:'Agregar al carrito',exact:true}).click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('upgrade79_cart')||'[]').length===2);
    const items=await page.evaluate(()=>JSON.parse(localStorage.getItem('upgrade79_cart')));
    assert.equal(items[0].variant.id,items[1].variant.id);
    assert.deepEqual(items.map(i=>i.configuration_context.vehicle_multimedia_system_id),[40,41]);
    await noOverflow();await switchView('cart');await page.getByRole('heading',{name:'Carrito',exact:true}).waitFor();await noOverflow();
    assert.equal(await page.locator('.configuration-summary').count(),2);
    await page.getByRole('button',{name:'Aumentar cantidad',exact:true}).first().click();
    assert.equal(await page.getByRole('button',{name:'Aumentar cantidad',exact:true}).first().isDisabled(),true);
    await page.getByRole('button',{name:'Reducir cantidad',exact:true}).first().click();
    await switchView('checkout');await page.getByRole('heading',{name:'Finalizar compra',exact:true}).waitFor();await noOverflow();
    const fields=await page.locator('input,select,textarea,button[type=submit]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,width:innerWidth};}));
    assert.ok(fields.every(r=>r.left>=0&&r.right<=r.width+1),JSON.stringify(fields));
    stageEResults.push({width,configuredAdd:'PASS',sharedSkuContexts:'PASS',cart:'PASS',checkout:'PASS',overflow:false});
    if(width===390)await page.screenshot({path:join(artifacts,'checkout-configured-390.png'),fullPage:true});
  }
  await page.getByRole('radio',{name:/Recoger en sede/}).check();
  await page.getByLabel('Nombre completo',{exact:false}).fill('Cliente QA');
  await page.getByLabel('Correo electrónico',{exact:false}).fill('qa@example.test');
  await page.locator('input[type="tel"]').fill('3001234567');
  rejectOrder=true;
  await page.getByRole('button',{name:'Preparar orden',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Revisa la configuración del vehículo.'}).waitFor();
  await page.getByRole('button',{name:'Preparar orden',exact:true}).click();
  await page.getByText('QA-E-999',{exact:true}).waitFor();
  assert.equal(simulatedOrderRequests.length,2);
  assert.equal(simulatedOrderRequests[0].key,simulatedOrderRequests[1].key);
  assert.deepEqual(simulatedOrderRequests[0].payload,simulatedOrderRequests[1].payload);
  for(const line of simulatedOrderRequests[1].payload.items){assert.equal(line.unit_price,undefined);assert.equal(line.configuration_context.vehicle_brand_name,undefined);}
  assert.equal(await page.locator('.configuration-summary').count(),2);await noOverflow();
  simulatedOrder={...simulatedOrder,payment_status:'paid',order_status:'confirmed',can_retry_payment:false};
  await switchView('confirmation');await page.locator('.order-confirmation-product').first().waitFor();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('upgrade79_cart')||'[]').length===0);
  assert.equal(await page.locator('.configuration-summary').count(),2);await noOverflow();
  await switchView('cart');await page.getByRole('heading',{name:'Carrito',exact:true}).waitFor();
  await switchView('confirmation');await page.locator('.order-confirmation-product').first().waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('upgrade79_cart')).length),0);
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.deepEqual(unexpected,[]);
  const report={results,stageEResults,internalVehicle:'PASS',multipleVehiclesBlocked:'PASS',invalidVehicleBlocked:'PASS',simulatedOrderRequests:simulatedOrderRequests.length,simulatedOrderPersistence:false,backendValidationRecovery:'PASS',paidReconciliationOnce:'PASS',filteredEntry:'PASS',ambiguity:'PASS',outOfStock:'PASS',multiOem:'PASS',errorsRetry:'PASS',staleResponses:'PASS',traditionalCart:'PASS',hydrationErrors:errors,expectedHttpErrors,writes,externalRequests:unexpected,artifacts};
  await writeFile(join(artifacts,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} catch(error) {
  console.error(error);
  console.error('QA artifacts:',artifacts);
  if(debugPage){
    console.error(await debugPage.locator('body').innerText({timeout:5000}).then(text=>text.slice(0,3500)).catch(()=>'(diagnostic body unavailable)'));
    await debugPage.screenshot({path:join(artifacts,'failure.png'),fullPage:true,timeout:5000}).catch(()=>{});
  }
  throw error;
} finally {releaseOld?.();await browser?.close();await vite.close();}
