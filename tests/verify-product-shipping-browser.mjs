// Optional browser regression. Isolated fixtures only; every save is intercepted in memory.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/verify-product-shipping-browser.mjs
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const directory = process.env.SHIPPING_SCREENSHOTS || '/tmp/upgrade79-product-shipping-evidence';
await mkdir(directory, { recursive: true });
const fixture = `import React from 'react'; import {createRoot} from 'react-dom/client';
import {ProductForm} from '/src/modules/admin/inventory/product-form/ProductForm.tsx';
const product = {id:900001,name:'Artículo de prueba aislada',category_id:1,compatibility_type:'universal',sku:'ISOLATED',
price:100000,cost_price:50000,tax_amount:0,extra_charges:0,pricing_mode:'manual',target_profit_percent:null,
commission_enabled:false,commission_amount:null,is_active:true,is_visible:false,is_featured:false,requires_shipping:true,
images:[],technical_specs:{},weight_grams:100,length_mm:100,width_mm:100,height_mm:100};
const mode=new URLSearchParams(location.search).get('mode');
if(mode==='variants')product.variants=[{id:900002,name:'4/64',sku:'ISOLATED-A',price:100000,cost_price:50000,tax_amount:0,
extra_charges:0,pricing_mode:'manual',target_profit_percent:null,is_default:true,is_active:true,is_visible:true,sort_order:0,
main_image:null,specs:{},attributes:null,weight_grams:200,length_mm:null,width_mm:120,height_mm:null},
{id:900003,name:'8/128',sku:'ISOLATED-B',price:120000,cost_price:60000,tax_amount:0,extra_charges:0,
pricing_mode:'manual',target_profit_percent:null,is_default:false,is_active:true,is_visible:true,sort_order:1,
main_image:null,specs:{},attributes:null,weight_grams:null,length_mm:null,width_mm:null,height_mm:null}];
window.savedPayloads=[];window.savedResults=[];
window.fetch=async (url,options={})=>{
 if(String(url)==='/sanctum/csrf-cookie')return new Response(null,{status:204});
 if(/^\\/api\\/admin\\/products(?:\\/\\d+)?$/.test(String(url)) && options.method==='POST'){
   if(window.rejectSave)return new Response(JSON.stringify({message:'Datos inválidos',errors:{'variants.0.length_mm':['Medida rechazada por Laravel.']}}),{status:422,headers:{'Content-Type':'application/json'}});
   const entries=[...options.body.entries()].map(([key,value])=>[key,typeof value==='string'?value:'FILE']);
   window.savedPayloads.push(Object.fromEntries(entries));
   return new Response(JSON.stringify({data:product}),{status:200,headers:{'Content-Type':'application/json'}});
 }
 throw new Error('Blocked network request in isolated fixture');
};
sessionStorage.setItem('upgrade79_crm_user',JSON.stringify({id:900000,name:'Prueba aislada',email:'fixture@example.invalid',role:'admin',permissions:['products.view','products.create','products.update','inventory.view']}));
createRoot(document.getElementById('root')).render(<ProductForm product={mode==='create'?null:product}
 categories={[{id:1,name:'Categoría aislada',slug:'isolated',is_active:true,fields:[]}]}
 productBrands={[]} vehicleBrands={[]} vehicleModels={[]} vehicleVersions={[]} vehicleMultimediaSystems={[]}
 onSaved={(...args)=>window.savedResults.push(args)} onCancel={()=>{}}/>);`;
const server = await createServer({ configFile: false, envFile: false, appType: 'custom',
  esbuild: { jsx: 'automatic' }, optimizeDeps: { include: ['react', 'react-dom/client'] },
  plugins: [{ name: 'shipping-isolated-fixture', resolveId: id => id === '/shipping-fixture.tsx' ? id : undefined,
    load: id => id === '/shipping-fixture.tsx' ? fixture : undefined }],
  server: { host: '127.0.0.1', port: 4193, strictPort: true, hmr: false, ws: false } });
server.middlewares.use((req, res, next) => {
  if (!req.url?.startsWith('/?')) return next();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Formulario aislado: datos para envío</title><style>body{margin:0;background:#0f1013;font-family:Arial,sans-serif}#root{max-width:960px;margin:auto}*,*:before,*:after{box-sizing:border-box}</style></head><body><div id="root"></div><script type="module" src="/shipping-fixture.tsx"></script></body></html>');
});
let browser;
let scenarios = 0;
const pass = () => scenarios++;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const external = []; const errors = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    external.push(url.origin); return route.abort();
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const input = key => page.locator(`input[data-error-key="${key}"]`);
  const save = () => page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
  await page.goto(`${origin}/?mode=edit`);
  await input('weight_grams').waitFor();
  assert.equal(await input('weight_grams').inputValue(), '100'); pass();
  assert.equal(await input('length_mm').inputValue(), '10'); pass();
  await input('weight_grams').focus(); await input('weight_grams').press('Control+A'); await input('weight_grams').press('Backspace');
  assert.equal(await input('weight_grams').inputValue(), ''); pass();
  await input('weight_grams').pressSequentially('250');
  assert.equal(await input('weight_grams').inputValue(), '250'); pass();
  await input('weight_grams').press('Control+A'); await input('weight_grams').pressSequentially('100');
  assert.equal(await input('weight_grams').inputValue(), '100'); pass();
  await input('length_mm').fill('12.3'); await save();
  await page.waitForFunction(() => window.savedPayloads.length === 1);
  let result = await page.evaluate(() => window.savedPayloads.at(-1));
  assert.equal(result.length_mm, '123'); assert.equal(result.price, '100000'); assert.equal(result.sku, 'ISOLATED'); pass();
  await input('length_mm').fill('1.01'); await save();
  assert.equal(await input('length_mm').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.evaluate(() => window.savedPayloads.length), 1); pass();
  await input('length_mm').fill('10'); await input('weight_grams').fill('0'); await save();
  assert.equal(await page.evaluate(() => window.savedPayloads.length), 1); pass();
  await input('weight_grams').fill('1.5'); await save();
  assert.equal(await page.evaluate(() => window.savedPayloads.length), 1); pass();
  await input('weight_grams').fill(''); await save();
  await page.waitForFunction(() => window.savedPayloads.length === 2);
  assert.equal(await page.evaluate(() => window.savedPayloads.at(-1).weight_grams), '');
  await page.getByText(/Pendiente para cotizar envío: Peso embalado/).waitFor(); pass();
  await page.goto(`${origin}/?mode=variants`);
  const cards = page.locator('.smart-product-form__variant');
  await cards.first().waitFor();
  const inherit = card => card.getByRole('checkbox', { name: 'Usar peso y medidas generales del producto' });
  assert.equal(await inherit(cards.nth(0)).isChecked(), false);
  assert.equal(await inherit(cards.nth(1)).isChecked(), true); pass();
  assert.equal(await input('variants.0.weight_grams').inputValue(), '200');
  assert.equal(await input('variants.0.length_mm').inputValue(), '');
  assert.equal(await input('variants.0.width_mm').inputValue(), '12'); pass();
  await save(); await page.waitForFunction(() => window.savedPayloads.length === 1);
  result = await page.evaluate(() => window.savedPayloads.at(-1));
  assert.equal(result['variants[0][weight_grams]'], '200');
  assert.equal(result['variants[0][length_mm]'], '');
  assert.equal(result['variants[0][width_mm]'], '120');
  assert.equal(result['variants[1][weight_grams]'], ''); pass();
  await inherit(cards.nth(1)).uncheck(); await input('variants.1.weight_grams').fill('350');
  await input('variants.1.length_mm').fill('15.5'); await save();
  await page.waitForFunction(() => window.savedPayloads.length === 2);
  result = await page.evaluate(() => window.savedPayloads.at(-1));
  assert.equal(result['variants[1][weight_grams]'], '350');
  assert.equal(result['variants[1][length_mm]'], '155');
  assert.equal(result['variants[0][weight_grams]'], '200'); pass();
  await inherit(cards.nth(1)).check(); await save();
  await page.waitForFunction(() => window.savedPayloads.length === 3);
  assert.equal(await page.evaluate(() => window.savedPayloads.at(-1)['variants[1][weight_grams]']), ''); pass();
  await inherit(cards.nth(1)).uncheck();
  assert.equal(await input('variants.1.weight_grams').inputValue(), '350'); pass();
  await input('weight_grams').fill('500');
  assert.equal(await input('variants.0.weight_grams').inputValue(), '200'); pass();
  await cards.nth(1).getByRole('button', { name: 'Duplicar', exact: true }).click();
  assert.equal(await input('variants.2.weight_grams').inputValue(), '350'); pass();
  // Duplicating deliberately leaves a blank SKU; this fixture doesn't invent a commercial reference.
  await page.evaluate(() => { window.rejectSave = true; });
  await save();
  try { await page.getByText('Medida rechazada por Laravel.', { exact: true }).first().waitFor({ timeout: 5000 }); }
  catch (error) {
    console.error(await page.evaluate(() => ({ alerts: [...document.querySelectorAll('[role="alert"],.smart-product-form__section-error,.smart-product-form__field-error')].map(node => node.textContent), invalid: [...document.querySelectorAll('input')].filter(node => !node.validity.valid).map(node => ({ key: node.dataset.errorKey, message: node.validationMessage })) })));
    throw error;
  }
  assert.equal(await input('variants.0.length_mm').getAttribute('aria-invalid'), 'true'); pass();
  await page.evaluate(() => { window.rejectSave = false; });
  await save();
  await page.waitForFunction(() => window.savedPayloads.length === 4);
  assert.equal(await input('variants.0.length_mm').getAttribute('aria-invalid'), 'false'); pass();
  for (const width of [1440, 1024, 768, 430, 390, 360]) {
    await page.setViewportSize({ width, height: 960 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `overflow ${width}`);
    pass();
    if ([1440, 390].includes(width)) {
      await page.evaluate(() => {
        const title = document.querySelector('#product-shipping-title');
        const header = document.querySelector('.smart-product-form__header');
        window.scrollTo(0, title.getBoundingClientRect().top + window.scrollY - header.getBoundingClientRect().height - 20);
      });
      await page.screenshot({ path: `${directory}/shipping-${width}.png`, fullPage: false });
      await cards.first().locator('h4').filter({ hasText: 'Datos para envío de esta variante' }).scrollIntoViewIfNeeded();
      await page.evaluate(() => {
        const title = [...document.querySelectorAll('.smart-product-form__variant h4')].find(node => node.textContent === 'Datos para envío de esta variante');
        const header = document.querySelector('.smart-product-form__header');
        window.scrollTo(0, title.getBoundingClientRect().top + window.scrollY - header.getBoundingClientRect().height - 20);
      });
      await page.screenshot({ path: `${directory}/shipping-variant-${width}.png`, fullPage: false });
    }
  }
  await page.goto(`${origin}/?mode=create`);
  await input('weight_grams').waitFor();
  assert.equal(await input('weight_grams').inputValue(), ''); pass();
  await input('name').fill('Producto aislado'); await page.locator('select[data-error-key="category_id"]').selectOption('1');
  await page.getByText('Universal', { exact: true }).click();
  await input('weight_grams').fill('100');
  for (const key of ['length_mm', 'width_mm', 'height_mm']) await input(key).fill('10');
  await save(); await page.waitForFunction(() => window.savedPayloads.length === 1);
  result = await page.evaluate(() => window.savedPayloads.at(-1));
  assert.equal(result.weight_grams, '100'); assert.equal(result.length_mm, '100'); pass();
  assert.deepEqual(errors, []); assert.deepEqual(external, []); pass();
  console.log(`PASS: ${scenarios} browser scenarios. Creation/editing, Backspace/Ctrl+A, decimals, invalid input, inheritance/overrides, payloads, duplication, six responsive widths. All saves intercepted; no backend/database/provider access. Screenshots: ${directory}`);
} finally { await browser?.close(); await server.close(); }
