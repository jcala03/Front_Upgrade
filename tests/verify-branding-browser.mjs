// Local visual fixture only. No login, database, registration or commercial writes.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.env.BRAND_ROOT || process.cwd();
const output = process.env.BRAND_OUTPUT || '/tmp/upgrade79-branding-captures/after';
await mkdir(output, { recursive: true });
const fixture = `import React from 'react';import {createRoot} from 'react-dom/client';import '/src/index.css';
import {Header} from '/src/components/layout/Header/Header.tsx';import {Footer} from '/src/components/layout/Footer/Footer.tsx';
import {LoginPage} from '/src/modules/crm/auth/LoginPage.tsx';import {CrmLayout} from '/src/modules/crm/layout/CrmLayout.tsx';
import {CartProvider} from '/src/context/CartContext.tsx';
sessionStorage.setItem('upgrade79_crm_user',JSON.stringify({id:1,name:'Vista de componentes',email:'fixture@example.test',role:'admin',permissions:[]}));
const view=new URLSearchParams(location.search).get('view');
createRoot(document.querySelector('#root')).render(<CartProvider>{view==='login'?<LoginPage/>:view==='crm'?<CrmLayout><p>Vista aislada de identidad visual, sin datos comerciales.</p></CrmLayout>:<><Header/><main style={{height:220,paddingTop:150}}>Identidad visual</main><Footer/></>}</CartProvider>);`;
const server = await createServer({ root, configFile: false, envFile: false, appType: 'custom', esbuild: { jsx: 'automatic' },
  define: { __PUBLIC_SITE_URL__: JSON.stringify('https://upgradecolombia.com'), __PWA_SW_VERSION__: JSON.stringify('fixture') },
  optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-dev-runtime'] },
  plugins: [{ name: 'brand-fixture', resolveId: id => id === '/brand-fixture.tsx' ? id : undefined,
    load: id => id === '/brand-fixture.tsx' ? fixture : undefined }],
  server: { host: '127.0.0.1', port: 4190, strictPort: true, hmr: false, ws: false } });
server.middlewares.use((req,res,next)=>{if(!req.url.startsWith('/?'))return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/brand-fixture.tsx"></script></body></html>');});
let browser;
try {
  await server.listen(); browser = await chromium.launch({ executablePath: '/opt/google/chrome/chrome', args: ['--no-sandbox'], headless: true });
  const page = await browser.newPage(); const errors = []; page.on('pageerror',error=>errors.push(error.message));
  for (const width of [1440,1280,1024,768,430,390,360]) {
    await page.setViewportSize({width,height:1000});
    for (const view of ['public','login','crm']) {
      await page.goto(`http://127.0.0.1:4190/?view=${view}`);
      await page.locator(view==='public'?'.footer__logo':view==='login'?'.crm-login__brand':'.crm-layout__topbar').waitFor();
      if(view==='crm'&&width<=1024)await page.getByRole('button',{name:/Abrir menú/}).click();
      await page.evaluate(()=>Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{}))));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true,`${view} ${width}`);
      if(width===1440||width===390)await page.screenshot({path:`${output}/${view}-${width}.png`,fullPage:true});
    }
  }
  assert.deepEqual(errors,[]); console.log(`PASS: 3 real component views × 7 widths, no overflow or runtime errors. Captures ${output}`);
} finally {await browser?.close();await server.close();}
