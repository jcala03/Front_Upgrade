// Real App + real Laravel HTTP + upgrade_test; no fabricated API response bodies.
// --audit-network discards one committed response to test recovery after a transport fault.
// Provider navigation is blocked. Test-state changes are guarded CLI fixtures.
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { publicDevProxy } from './public-dev-proxy.mjs';

const execute = promisify(execFile);
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const backend = resolve(root, '../backendupgrade');
const artifacts = await mkdtemp(join(tmpdir(), 'upgrade79-configurator-real-'));
await mkdir(join(artifacts, 'sessions'));
const api = 'http://127.0.0.1:8196', origin = 'http://127.0.0.1:5196';
const auditNetwork = process.argv.includes('--audit-network');
const env = { ...process.env, APP_ENV: 'testing', DB_URL: '', DB_CONNECTION: 'mysql', DB_HOST: '127.0.0.1', DB_PORT: '3306',
  DB_DATABASE: 'upgrade_test', DB_USERNAME: 'root', DB_PASSWORD: '', TEST_DB_CONNECTION: 'mysql', TEST_DB_DATABASE: 'upgrade_test',
  APP_DEBUG: 'true', CONFIGURATOR_QA_DIR: artifacts, CONFIGURATOR_QA_APP_KEY: 'base64:'+randomBytes(32).toString('base64'),
  WEBPUSH_QUEUE_CONNECTION: 'database', SESSION_DRIVER: 'file', SESSION_DOMAIN: '', SESSION_SECURE_COOKIE: 'false',
  FRONTEND_URL: origin, SANCTUM_STATEFUL_DOMAINS: '127.0.0.1:5196,127.0.0.1:8196' };
const cli = async action => {
  const { stdout } = await execute('php', ['tests/Browser/configurator-fixtures.php', action], { cwd: backend, env, maxBuffer: 2*1024*1024 });
  const state = JSON.parse(stdout);assert.equal(state.database, 'upgrade_test');return state;
};
const seed = await cli('seed'), fixture = seed.manifest;
const results = [], errors = [], unexpected = [], providerNavigations = [], requests = [], expectedErrors = [];
const lostOrderResponses = [];
let loseNextOrder = false, releaseCheckout = null;
let apiLog = '', browser, vite, renderer, currentPage;
const server = spawn('php', ['-S', '127.0.0.1:8196', 'tests/Browser/configurator-router.php'], { cwd: backend, env, stdio: ['ignore','pipe','pipe'] });
server.stdout.on('data', data => apiLog += data);server.stderr.on('data', data => apiLog += data);
const sha = async path => createHash('sha256').update(await readFile(path)).digest('hex');
const swBefore = await sha(join(root,'public/sw.js'));
try {
  const deadline = Date.now()+15000;
  while (true) {
    if (server.exitCode !== null) throw new Error('QA backend failed: '+apiLog);
    try { const r=await fetch(api+'/api/health');if(r.ok&&r.headers.get('X-Configurator-QA-Database')==='upgrade_test')break; } catch {}
    assert.ok(Date.now()<deadline,'QA backend startup timed out');await new Promise(resolve=>setTimeout(resolve,100));
  }
  const initial = await fetch(api+'/api/products/'+fixture.slug).then(r=>r.json());
  assert.equal(initial.data.configuration.purchase_enabled,true);
  assert.equal(initial.data.variants[0].stock,4);
  const client = `import {createElement,StrictMode} from 'react';import {createRoot,hydrateRoot} from 'react-dom/client';
import App from '/src/App.tsx';import {publicBootstrap} from '/src/seo/client.ts';import '/src/index.css';
const root=document.getElementById('root');const app=createElement(StrictMode,null,createElement(App));
if(publicBootstrap()&&root.hasChildNodes())hydrateRoot(root,app,{onRecoverableError:e=>console.error('HYDRATION: '+e.message)});else createRoot(root).render(app);`;
  // Match the existing CRM dev proxy's session behavior, scoped to this QA port.
  const privateProxy={target:api,changeOrigin:true,cookieDomainRewrite:'',cookiePathRewrite:'/',
    configure(proxy){proxy.on('proxyReq',request=>request.setHeader('Referer',origin+'/'));}};
  vite = await createServer({ root, configFile:false, cacheDir:join(artifacts,'vite-cache'),
    define:{__PUBLIC_SITE_URL__:JSON.stringify('https://upgradecolombia.com')},esbuild:{jsx:'automatic'},
    optimizeDeps:{noDiscovery:true,include:['react','react-dom/client','react/jsx-dev-runtime','lucide-react','framer-motion','gsap','@gsap/react']},
    server:{host:'127.0.0.1',port:5196,strictPort:true,hmr:false,proxy:{
      ...publicDevProxy(api),'/api':privateProxy,'/sanctum':privateProxy,
    }},
    plugins:[{name:'real-configurator-http-qa',resolveId(id){if(id==='/__real-qa.js')return '\0real-qa';},load(id){if(id==='\0real-qa')return client;},
      configureServer(v){v.middlewares.use(async(req,res,next)=>{
        const pathname=new URL(req.url,origin).pathname;
        if(pathname==='/__qa-product.svg'){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#171a1e"/><text x="40" y="300" fill="white" font-size="26">QA aislado · no comercial</text></svg>');return;}
        if(!/^\/(?:tienda(?:\/[^/]+)?|carrito|checkout(?:\/payment\/return)?|orden-confirmada|crm(?:\/orders)?|login)\/?$/.test(pathname))return next();
        try{
          const template='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><!--seo-head--></head><body><div id="root"></div><script type="module" src="/__real-qa.js"></script></body></html>';
          const rendered=await renderer.renderRequest(req.url,template,{siteUrl:'https://upgradecolombia.com',apiBase:api});
          res.statusCode=rendered.status;for(const [key,value]of Object.entries(rendered.headers))res.setHeader(key,value);
          res.end(await v.transformIndexHtml(req.url,rendered.body));
        }catch(error){res.statusCode=500;res.end(error.stack);}
      });},
    }],
  });
  await vite.listen();renderer=await vite.ssrLoadModule('/src/seo/entry-server.tsx');
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}});
  context.on('page',page=>{
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'){
      if(/Failed to load resource.*(?:422|409)|net::ERR_(?:FAILED|CONNECTION_FAILED)/.test(m.text()))expectedErrors.push(m.text());else errors.push(m.text());
    }});
    page.on('response',r=>{const u=new URL(r.url());if(/^\/(?:__public-api\/)?api\//.test(u.pathname))requests.push({path:u.pathname,status:r.status(),method:r.request().method(),database:r.headers()['x-configurator-qa-database']});});
  });
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin===origin && url.pathname==='/__public-api/api/orders' && route.request().method()==='POST' && loseNextOrder){
      loseNextOrder=false;
      const response=await route.fetch(); // Real Laravel already committed this Order.
      assert.equal(response.status(),201);
      assert.equal(response.headers()['x-configurator-qa-database'],'upgrade_test');
      const created=await response.json();
      lostOrderResponses.push({orderId:created.data.id,key:route.request().headers()['idempotency-key'],payload:route.request().postDataJSON()});
      await new Promise(resolve=>{releaseCheckout=resolve;});
      return route.abort('connectionfailed'); // Transport fault only; no fabricated API response.
    }
    if(url.origin===origin)return route.continue();
    if(url.origin==='https://checkout.wompi.co'){providerNavigations.push(url.origin+url.pathname);return route.abort();}
    unexpected.push(url.origin+url.pathname);return route.abort();
  });
  const page=await context.newPage();currentPage=page;
  const cart=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('upgrade79_cart')||'[]'));
  const buyer=fixture.run+'-buyer@example.test';
  const choose=async oem=>{
    await page.getByRole('group',{name:'Sistema OEM',exact:true}).locator(`button[data-option-value="${fixture.systems[oem]}"]`).click();
    await page.getByRole('group',{name:'Configuración de memoria',exact:true}).locator('button[data-option-value="8/128"]').click();
    await page.locator('[data-configuration-status="valid"]').waitFor();
  };
  const add=async()=>{await page.getByRole('button',{name:'Agregar al carrito',exact:true}).click();await page.getByRole('status').filter({hasText:'Producto agregado.'}).waitFor();};
  const createResponse=()=>page.waitForResponse(r=>r.url().endsWith('/api/orders')&&r.request().method()==='POST');
  const post=async(path,body,key)=>page.evaluate(async({path,body,key})=>{
    const r=await fetch('/__public-api/api'+path,{method:'POST',credentials:'include',headers:{Accept:'application/json','Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},body:JSON.stringify(body)});
    return {status:r.status,data:await r.json()};
  },{path,body,key});

  await page.goto(origin+'/tienda/'+fixture.slug);await choose('CIC');await add();
  await page.getByRole('group',{name:'Sistema OEM',exact:true}).locator(`button[data-option-value="${fixture.systems.NBT}"]`).click();
  await page.locator('[data-configuration-status="valid"]').waitFor();await add();
  let lines=await cart();assert.equal(lines.length,2);assert.ok(lines.every(line=>line.variant.id===fixture.variant_id));
  assert.deepEqual(lines.map(line=>line.configuration_context.vehicle_multimedia_system_id),[fixture.systems.CIC,fixture.systems.NBT]);
  await page.goto(origin+'/carrito');await page.getByRole('heading',{name:'Carrito',exact:true}).waitFor();
  assert.equal(await page.locator('.configuration-summary').count(),2);
  await page.reload();await page.getByRole('heading',{name:'Carrito',exact:true}).waitFor();assert.equal((await cart()).length,2);
  results.push({check:'same SKU, two OEM contexts, real catalog, persisted cart reload',status:'PASS'});
  await page.goto(origin+'/checkout');await page.getByRole('radio',{name:/Recoger en sede/}).check();
  await page.getByLabel('Nombre completo').fill('Cliente QA integral');await page.getByLabel('Correo electrónico').fill(buyer);await page.locator('input[type="tel"]').fill('3001234567');
  for(const [off,on,label]of [['compatibility-off','compatibility-on','compatibility'],['catalog-off','catalog-on','catalog'],['stock-zero','stock-restore','stock']]){
    await cli(off);const response=createResponse();await page.getByRole('button',{name:'Preparar orden',exact:true}).click();
    const received=await response;assert.equal(received.status(),422,await received.text());
    await page.locator('.checkout-form__error[role="alert"]').waitFor();
    const state=await cli(on);assert.equal(state.orders.length,0);assert.equal(state.sale_movements,0);
    results.push({check:'real '+label+' error before order/reservation',status:'PASS'});
  }
  await cli('price-change');
  if(auditNetwork){
    loseNextOrder=true;
    await page.getByRole('button',{name:'Preparar orden',exact:true}).click();
    const heldDeadline=Date.now()+15000;
    while(!releaseCheckout && Date.now()<heldDeadline)await new Promise(resolve=>setTimeout(resolve,20));
    assert.equal(typeof releaseCheckout,'function');
    // Force repeated form events while the real response is held: submitLock must reject them.
    await page.locator('.checkout-form').evaluate(form=>{for(let i=0;i<5;i++)form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
    releaseCheckout();releaseCheckout=null;
    await page.locator('.checkout-form__error[role="alert"]').waitFor();
    assert.equal(lostOrderResponses.length,1);
    assert.equal((await cli('inspect')).orders.length,1);
    await page.reload();
    await page.getByRole('radio',{name:/Recoger en sede/}).check();
    await page.getByLabel('Nombre completo').fill('Cliente QA integral');await page.getByLabel('Correo electrónico').fill(buyer);
    await page.locator('input[type="tel"]').fill('3001234567');
  }
  let createdResponse=createResponse();await page.getByRole('button',{name:'Preparar orden',exact:true}).click();
  const response=await createdResponse;assert.equal(response.status(),auditNetwork?200:201,await response.text());
  const created=await response.json(), orderId=created.data.id, token=created.public_token;
  assert.equal(created.data.total,2500000);assert.equal(created.data.items.length,2);
  const payload=response.request().postDataJSON(), key=response.request().headers()['idempotency-key'];
  if(auditNetwork){
    assert.equal(orderId,lostOrderResponses[0].orderId);assert.equal(key,lostOrderResponses[0].key);
    assert.deepEqual(payload,lostOrderResponses[0].payload);
    results.push({check:'real committed Order with lost response, repeated submits, reload and idempotent recovery',status:'PASS'});
  }
  const sql=await cli('inspect');assert.equal(sql.orders.length,1);assert.equal(sql.physical_inventory_items,1);assert.equal(sql.shared_stock,4);
  assert.deepEqual(sql.orders[0].items.map(item=>item.configuration_context),created.data.items.map(item=>item.configuration_context));
  await page.getByRole('radio',{name:/Sede QA integral/}).check();await page.getByRole('button',{name:'Recoger en esta sede',exact:true}).click();
  await page.getByText('Sede de recogida aplicada',{exact:true}).waitFor();
  assert.equal((await post('/orders',payload,key)).data.data.id,orderId);
  const changed=structuredClone(payload);changed.items[0].configuration_context.vehicle_multimedia_system_id=fixture.systems.NBT;
  const conflict=await post('/orders',changed,key);assert.equal(conflict.status,422);assert.equal(conflict.data.code,'IDEMPOTENCY_CONFLICT');
  const omitted=structuredClone(payload);delete omitted.items[0].configuration_context;
  assert.equal((await post('/orders',omitted,fixture.run+'-omitted')).status,422);
  results.push({check:'real SQL snapshot, server price, same-order idempotency, omitted context rejected',status:'PASS',orderId});

  // Add a later quantity before reserving, while the catalog still has four units.
  // It is not part of the immutable two-unit Order and must survive reconciliation.
  await page.goto(origin+'/tienda/'+fixture.slug);await choose('CIC');await add();
  assert.equal((await cart()).find(line=>line.configuration_context?.vehicle_multimedia_system_id===fixture.systems.CIC).quantity,2);
  await page.goto(origin+'/checkout');await page.getByRole('button',{name:'Continuar al pago',exact:true}).waitFor();

  const firstPayment=page.waitForResponse(r=>r.url().includes('/payments/wompi')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Continuar al pago',exact:true}).click();
  // Navigation to the blocked provider can discard response bodies; status remains available.
  const first=await firstPayment;assert.equal(first.status(),201);
  const firstKey=first.request().headers()['idempotency-key'];
  await cli('decline');await page.goto(origin+'/checkout/payment/return');
  await page.getByRole('button',{name:'Intentar pago nuevamente',exact:true}).waitFor();
  const replay=await post(`/checkout/orders/${token}/payments/wompi`,{},firstKey);assert.equal(replay.status,200);
  const secondPayment=page.waitForResponse(r=>r.url().includes('/payments/wompi')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Intentar pago nuevamente',exact:true}).click();
  const second=await secondPayment;assert.equal(second.status(),201);
  let state=await cli('inspect');assert.equal(state.orders.length,1);assert.equal(state.orders[0].id,orderId);
  assert.equal(state.orders[0].payments.length,2);assert.equal(state.shared_stock,2);assert.equal(state.sale_movements,2);
  assert.deepEqual(state.orders[0].items,sql.orders[0].items);
  results.push({check:'real first reservation, decline, replay and browser retry on same order; no duplicate stock',status:'PASS'});

  // Add later items that must survive reconciliation of the original order snapshot.
  await page.goto(origin+'/tienda/'+fixture.simple_slug);await add();
  const beforePaid=await cart();assert.equal(beforePaid.find(line=>line.configuration_context?.vehicle_multimedia_system_id===fixture.systems.CIC).quantity,2);
  await cli('paid');await page.goto(origin+'/orden-confirmada');
  await page.getByRole('heading',{name:'Tu pago fue confirmado',exact:true}).waitFor();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('upgrade79_cart')||'[]').reduce((sum,line)=>sum+line.quantity,0)===2);
  const afterPaid=await cart();assert.equal(afterPaid.length,2);assert.equal(afterPaid.find(line=>line.configuration_context).quantity,1);
  assert.ok(afterPaid.some(line=>line.product.id===fixture.simple_id));
  await page.reload();await page.getByRole('heading',{name:'Tu pago fue confirmado',exact:true}).waitFor();
  assert.deepEqual(await cart(),afterPaid);
  await page.screenshot({path:join(artifacts,'confirmation-real.png'),fullPage:true});
  results.push({check:'real persisted paid state via CLI-only test control; exact-once reconciliation preserves later items',status:'PASS'});

  const crm=await context.newPage();currentPage=crm;
  await crm.goto(origin+'/login');await crm.getByLabel('Email',{exact:true}).fill(fixture.admin_email);
  await crm.getByLabel('Contraseña',{exact:true}).fill('QA-only-not-a-real-account-2026');
  const login=crm.waitForResponse(r=>r.url().endsWith('/api/auth/login'));
  await crm.getByRole('button',{name:'Entrar al CRM',exact:true}).click();const auth=await login;assert.equal(auth.status(),200);
  await crm.waitForURL(origin+'/crm');
  const sessionStatus=await crm.evaluate(async()=>{const r=await fetch('/api/auth/me',{headers:{Accept:'application/json'},credentials:'include'});return r.status;});
  assert.equal(sessionStatus,200,'Real authenticated CRM session must persist');
  await crm.goto(origin+'/crm/orders');
  const row=crm.locator('.orders-list__row').filter({hasText:created.data.order_number});
  await row.getByRole('button',{name:'Ver orden',exact:true}).click();
  await crm.locator('.orders-detail .configuration-summary').first().waitFor();
  assert.equal(await crm.locator('.orders-detail .configuration-summary').count(),2);
  const summary=await crm.locator('.orders-detail').innerText();assert.ok(summary.includes('Sistema OEM: CIC'));assert.ok(summary.includes('Sistema OEM: NBT'));
  const crmSnapshot=await crm.evaluate(async id=>{const r=await fetch('/api/admin/orders/'+id,{headers:{Accept:'application/json'},credentials:'include'});return {status:r.status,data:await r.json()};},orderId);
  assert.equal(crmSnapshot.status,200);assert.deepEqual(crmSnapshot.data.data.items.map(item=>item.configuration_context),created.data.items.map(item=>item.configuration_context));
  await crm.screenshot({path:join(artifacts,'crm-order-real.png'),fullPage:true});
  results.push({check:'real admin login, real CRM order detail and snapshot parity with SQL',status:'PASS'});

  // Separate browser session: ordinary products still create real contextless orders.
  const traditionalPage=await context.newPage();currentPage=traditionalPage;
  await traditionalPage.goto(origin+'/carrito');await traditionalPage.getByRole('heading',{name:'Carrito',exact:true}).waitFor();
  await traditionalPage.getByRole('button',{name:'Vaciar carrito',exact:true}).click();
  await traditionalPage.goto(origin+'/tienda/'+fixture.simple_slug);
  await traditionalPage.getByRole('button',{name:'Agregar al carrito',exact:true}).click();
  await traditionalPage.getByRole('status').filter({hasText:'Producto agregado.'}).waitFor();
  await traditionalPage.goto(origin+'/tienda/'+fixture.traditional_slug);
  await traditionalPage.getByLabel('Versión del producto',{exact:true}).selectOption(String(fixture.traditional_variant_id));
  await traditionalPage.getByRole('button',{name:'Agregar al carrito',exact:true}).click();
  await traditionalPage.getByRole('status').filter({hasText:'Producto agregado.'}).waitFor();
  await traditionalPage.goto(origin+'/carrito');
  await traditionalPage.getByRole('link',{name:'Continuar compra',exact:true}).click();
  await traditionalPage.getByRole('radio',{name:/Recoger en sede/}).check();
  await traditionalPage.getByLabel('Nombre completo').fill('Cliente tradicional QA');
  await traditionalPage.getByLabel('Correo electrónico').fill(fixture.run+'-traditional@example.test');
  await traditionalPage.locator('input[type="tel"]').fill('3001234567');
  const traditionalResponse=traditionalPage.waitForResponse(r=>r.url().endsWith('/api/orders')&&r.request().method()==='POST');
  await traditionalPage.getByRole('button',{name:'Preparar orden',exact:true}).click();
  const traditionalReceived=await traditionalResponse;assert.equal(traditionalReceived.status(),201,await traditionalReceived.text());
  const traditionalOrder=await traditionalReceived.json();
  assert.ok(traditionalOrder.data.items.every(item=>item.configuration_context===null));
  assert.equal(traditionalOrder.data.total,500000);
  await traditionalPage.goto(origin+'/orden-confirmada');await traditionalPage.locator('.order-confirmation-product').first().waitFor();
  assert.equal(await traditionalPage.locator('.order-confirmation-product').count(),2);
  assert.equal(await traditionalPage.locator('.configuration-summary').count(),0);
  results.push({check:'simple and traditional variants: real page/cart/checkout/order/confirmation with no OEM context',status:'PASS'});

  state=await cli('inspect');assert.equal(state.orders.length,2);assert.equal(state.shared_stock,2);assert.equal(state.physical_inventory_items,1);
  assert.equal(await sha(join(root,'public/sw.js')),swBefore);
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
  assert.ok(requests.length>0&&requests.every(r=>r.database==='upgrade_test'),'Every API response must prove upgrade_test');
  await writeFile(join(artifacts,'report.json'),JSON.stringify({status:'PASS',database:'upgrade_test',results,fixture,sql:state,requests,
    apiMocks:false,auditNetwork,lostOrderResponses,paidStateSimulation:'CLI only, testing/upgrade_test/fixture-scoped; no real payment',providerNavigationsBlocked:providerNavigations,
    errors,expectedErrors,externalRequests:unexpected,swBefore,swAfter:await sha(join(root,'public/sw.js')),artifacts},null,2));
  console.log(JSON.stringify({status:'PASS',checks:results,orders:state.orders.map(order=>order.id),sharedStock:state.shared_stock,artifacts},null,2));
} catch(error) {
  await writeFile(join(artifacts,'failure-report.json'),JSON.stringify({results,errors,requests,unexpected,providerNavigations},null,2));
  console.error('Artifacts:',artifacts);
  if(currentPage){console.error((await currentPage.locator('body').innerText().catch(()=>'' )).slice(-5500));await currentPage.screenshot({path:join(artifacts,'failure.png'),fullPage:true}).catch(()=>{});}
  throw error;
} finally {
  releaseCheckout?.();await browser?.close();await vite?.close();server.kill('SIGTERM');
  await writeFile(join(artifacts,'backend.log'),apiLog);
}
