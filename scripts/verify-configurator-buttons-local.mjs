// Read-only browser QA of the actual local CRM-created product, no API mocks or purchases.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = 'http://127.0.0.1:5173';
const api = 'http://127.0.0.1:8000';
const slug = 'qa-local-pantalla-bmw-f30-multi-oem';
const artifacts = await mkdtemp(join(tmpdir(), 'upgrade79-configurator-buttons-local-'));
const get = async slug => {
  const response = await fetch(`${api}/api/products/${slug}`);
  assert.equal(response.status, 200);return (await response.json()).data;
};
const product = await get(slug);
assert.equal(product.id, 6);
assert.equal(product.configuration.ui_enabled, true);
assert.equal(product.configuration.purchase_enabled, false);
const shared = product.variants.find(v => v.sku === 'QA-L29-F30-MULTI-464');
const cic = product.variants.find(v => v.sku === 'QA-L29-F30-MULTI-CIC-8128');
const nbt = product.variants.find(v => v.sku === 'QA-L29-F30-MULTI-NBT-8256');
const row = shared.vehicle_compatibilities[0];
const cicId = cic.vehicle_compatibilities[0].vehicle_multimedia_system_id;
const nbtId = nbt.vehicle_compatibilities[0].vehicle_multimedia_system_id;
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
const results = [], errors = [], consoleIssues = [], blocked = [], writes = [], reads = [];
let page;
try {
  const context = await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (!['127.0.0.1','localhost','fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)) {
      blocked.push(url.origin+url.pathname);return route.abort();
    }
    if (request.method() !== 'GET') {writes.push(url.pathname);return route.abort();}
    if(url.pathname.includes('/api/products/'))reads.push(url.pathname+url.search);
    return route.continue();
  });
  page = await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(45000);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {if(['error','warning'].includes(m.type()))consoleIssues.push({type:m.type(),text:m.text()});});
  const group = label => page.getByRole('group',{name:label,exact:true});
  const option = (label,value) => group(label).locator(`button[data-option-value="${value}"]`);
  const oem = value => option('Sistema OEM',value);
  const memory = value => option('Configuración de memoria',value);
  const status = value => page.locator(`[data-configuration-status="${value}"]`).waitFor();
  const matchesVariant = async variant => {
    await status('valid');
    assert.ok((await page.locator('.product-detail__sku').innerText()).includes(variant.sku));
    assert.ok((await page.locator('.product-detail__price').innerText()).includes(new Intl.NumberFormat('es-CO').format(variant.price)));
    assert.ok((await page.locator('.product-detail__stock').innerText()).includes(`${variant.stock} disponibles`));
    assert.equal(await page.getByRole('button',{name:'Compra online no habilitada',exact:true}).isDisabled(),true);
  };
  const visit = async query => {
    const response = await page.goto(`${origin}/tienda/${slug}${query || ''}`,{waitUntil:'domcontentloaded'});
    assert.equal(response.status(),200);
    assert.ok((await response.text()).includes('Configuración del producto') || (await page.locator('.product-configurator').count())>0);
    await oem(cicId).waitFor();
    assert.equal(await page.locator('.product-configurator select,.product-configurator input').count(),0);
  };
  for(const width of [1440,1280,1024,768,430,390,360]) {
    await page.setViewportSize({width,height:1000});await visit();
    assert.equal(await page.getByLabel('Versión del producto',{exact:true}).count(),0);
    assert.equal(await group('Sistema OEM').locator('select').count(),0);
    assert.equal(await group('Configuración de memoria').locator('select').count(),0);
    await oem(cicId).click();
    assert.equal(await memory('8/256').isDisabled(),true);
    await memory('4/64').click();await matchesVariant(shared);
    await oem(nbtId).click();await matchesVariant(shared); // One physical SKU, not duplicated by OEM.
    assert.equal(await memory('4/64').getAttribute('aria-pressed'),'true');
    await memory('8/256').click();await matchesVariant(nbt);
    await oem(cicId).click();await status('incomplete');
    assert.equal(await group('Configuración de memoria').locator('[aria-pressed="true"]').count(),0);
    assert.equal(await memory('8/256').isDisabled(),true);
    await memory('8/128').click();await matchesVariant(cic);
    await memory('4/64').click();
    for(let i=0;i<4;i++){await oem(nbtId).click();await oem(cicId).click();}
    await matchesVariant(shared);
    await oem(nbtId).focus();await page.keyboard.press('Space');
    assert.equal(await oem(nbtId).getAttribute('aria-pressed'),'true');await matchesVariant(shared);
    await oem(cicId).focus();await page.keyboard.press('Enter');
    assert.equal(await oem(cicId).getAttribute('aria-pressed'),'true');
    assert.equal(await oem(cicId).evaluate(n=>getComputedStyle(n).outlineStyle),'solid');
    await memory('8/128').click();await matchesVariant(cic);
    const layout = await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
      controls:[...document.querySelectorAll('.product-configurator__option,.product-configurator input,.product-configurator select')].map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,height:r.height};})}));
    assert.ok(layout.scroll<=layout.viewport,JSON.stringify(layout));
    assert.ok(layout.controls.every(r=>r.left>=0&&r.right<=layout.viewport+1&&r.height>=44),JSON.stringify(layout));
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('upgrade79_cart')||'[]').length),0);
    if([1440,390].includes(width)){
      await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:join(artifacts,`real-product-${width}.png`),fullPage:true});
      await page.locator('.product-configurator').screenshot({path:join(artifacts,`real-buttons-${width}.png`)});
    }
    results.push({width,internalVehicle:true,noVehicleOrYearFields:true,buttons:true,disabledNonexistent:true,priceSkuStock:true,sharedSku:true,keyboard:true,overflow:false,purchaseBlocked:true});
  }
  const query = new URLSearchParams({vehicle_brand_id:String(row.vehicle_brand_id),vehicle_model_id:String(row.vehicle_model_id),vehicle_version_id:String(row.vehicle_version_id),vehicle_multimedia_system_id:String(nbtId),year:'2015'});
  await visit('?'+query);
  assert.equal(await oem(nbtId).getAttribute('aria-pressed'),'true');
  await oem(cicId).click();await memory('8/128').click();await matchesVariant(cic);
  assert.ok(reads.some(url=>url.endsWith('/api/products/'+slug))); // Actual unfiltered recovery.
  const traditional = await get('qa-local-pantalla-bmw-f30-kits-dedicados');
  await page.goto(`${origin}/tienda/${traditional.slug}`,{waitUntil:'domcontentloaded'});
  await page.getByLabel('Versión del producto',{exact:true}).selectOption(String(traditional.variants[0].id));
  assert.equal(await page.locator('.product-configurator').count(),0);
  assert.equal(await page.getByRole('button',{name:'Agregar al carrito',exact:true}).isEnabled(),true);
  await page.goto(`${origin}/tienda/qa-local-radio-de-banco-2-gb`,{waitUntil:'domcontentloaded'});
  // Simple products are deliberately disabled in SSR until hydration restores UI state.
  await page.locator('.product-detail__button:not([disabled])').waitFor();
  assert.equal(await page.locator('.product-configurator').count(),0);
  assert.equal(await page.getByLabel('Versión del producto',{exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Agregar al carrito',exact:true}).isEnabled(),true);
  assert.deepEqual(errors,[]);assert.deepEqual(consoleIssues,[]);assert.deepEqual(writes,[]);assert.deepEqual(blocked,[]);
  const report={status:'PASS',apiMocks:false,productId:product.id,previewOnly:true,results,filteredEntry:'PASS',traditional:'PASS',simple:'PASS',errors,consoleIssues,writes,blocked,reads,artifacts};
  await writeFile(join(artifacts,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} catch(error) {
  console.error(error);
  console.error('Artifacts:',artifacts);
  if(page)await page.screenshot({path:join(artifacts,'failure.png'),fullPage:true,timeout:5000}).catch(()=>{});
  throw error;
} finally {await browser.close();}
