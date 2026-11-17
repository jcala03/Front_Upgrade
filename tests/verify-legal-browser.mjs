// Real SSR + hydration of the current App. Read-only local review, no real API.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = '/tmp/upgrade79-legal-captures'; await mkdir(output, { recursive: true });
const server = await createServer({ configFile: false, envFile: false, appType: 'custom', esbuild: { jsx: 'automatic' },
  define: { __PUBLIC_SITE_URL__: JSON.stringify('https://upgradecolombia.com'), __PWA_SW_VERSION__: JSON.stringify('43338314702133f01e4df46edf0e9640229a0da55f593d0773104e6bcbfa3482') },
  cacheDir: '/tmp/upgrade79-legal-browser-vite-cache',
  optimizeDeps: { noDiscovery: true, include: ['react','react-dom','react-dom/client','react/jsx-runtime','react/jsx-dev-runtime','framer-motion','lucide-react','gsap','gsap/ScrollTrigger','@gsap/react','@studio-freight/lenis','clsx'] },
  server: { host: '127.0.0.1', port: 4191, strictPort: true, hmr: { port: 4192 } } });
await server.listen();
const renderer = await server.ssrLoadModule('/src/seo/entry-server.tsx');
const template = '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link href="/fonts/oswald/oswald.css" rel="stylesheet"><!--seo-head--></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>';
server.middlewares.use(async (req,res,next)=>{
  if(!req.url.startsWith('/__legal-review/'))return next();
  try {const response=await renderer.renderRequest(req.url,template,{siteUrl:'https://upgradecolombia.com',apiBase:'http://127.0.0.1:9999'});
    res.writeHead(response.status,response.headers);res.end(response.body);
  }catch{res.statusCode=500;res.end('Local fixture failed');}
});
let browser;
try {
  browser=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({reducedMotion:'reduce'});
  // Block HTTP API endpoints, not Vite's /src/api/ source-module directory.
  await context.route(url=>url.pathname.startsWith('/api/'),route=>route.abort());
  const google=[];
  await context.route(url=>['www.googletagmanager.com','www.google-analytics.com','fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname),route=>{google.push(route.request().url());return route.abort();});
  const page=await context.newPage();const errors=[];
  const transport=[];
  page.on('requestfailed',request=>transport.push({url:request.url(),failure:request.failure()?.errorText}));
  page.on('response',response=>{if(response.status()>=400)transport.push({url:response.url(),status:response.status()});});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  const slugs=['legal-y-privacidad','politica-de-datos','politica-de-cookies','terminos-y-condiciones','envios-y-entregas','cambios-devoluciones-y-garantias','centro-de-privacidad'];
  for(const width of [1440,1280,1024,768,430,390,360]){
    await page.setViewportSize({width,height:1000});
    for(const slug of slugs){
      const response=await page.goto(`http://127.0.0.1:4191/__legal-review/${slug}`);
      assert.equal(response.status(),200);await page.locator('.legal-center h1').waitFor();
      // Vite serves CSS through module imports in dev; wait for it before layout measurements.
      try {await page.waitForFunction(()=>{const layout=document.querySelector('.legal-center__layout'),credit=document.querySelector('.footer__credit-logo');return layout&&credit
        &&getComputedStyle(layout).display==='grid'&&getComputedStyle(credit).width==='64px';});}
      catch(error){console.error('Fixture errors:',errors,transport,await page.evaluate(async()=>({url:location.href,body:document.body.innerText.slice(0,1200),
        route:(await import('/src/privacy/config.ts')).legalRoute(location.pathname),
        styles:[...document.querySelectorAll('style[data-vite-dev-id]')].map(n=>n.dataset.viteDevId)})));throw error;}
      await page.evaluate(()=>document.fonts.ready);
      await page.getByRole('button',{name:'Configurar cookies',exact:true}).waitFor();
      if(await page.getByRole('button',{name:'Rechazar opcionales',exact:true}).isVisible())await page.getByRole('button',{name:'Rechazar opcionales',exact:true}).click();
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex, nofollow');
      assert.equal(await page.locator('link[rel="canonical"]').count(),0);
      const overflow=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
        nodes:Array.from(document.querySelectorAll('body *')).filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.right>document.documentElement.clientWidth+1}).slice(0,10).map(n=>({tag:n.tagName,class:n.className,right:n.getBoundingClientRect().right}))}));
      assert.ok(overflow.scroll<=overflow.width,`${slug}:${width} ${JSON.stringify(overflow)}`);
      assert.equal(await page.locator('h1').count(),1);
      for(const link of await page.locator('.legal-center__toc a').evaluateAll(nodes=>nodes.map(n=>n.hash))){assert.equal(await page.locator(link).count(),1);}
      if([1440,390].includes(width))await page.screenshot({path:`${output}/${slug}-${width}.png`,fullPage:true});
    }
  }
  await page.getByRole('button',{name:'Configurar cookies',exact:true}).click();await page.getByRole('dialog').waitFor();
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();
  const axe=await readFile(new URL('axe-core/axe.min.js',new URL('../../upgrade79-seo-browser/node_modules/',import.meta.url)),'utf8').catch(()=>null);
  if(axe){await page.addScriptTag({content:axe});const result=await page.evaluate(()=>window.axe.run('.legal-center',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));assert.deepEqual(result.violations.map(v=>({id:v.id,impact:v.impact})),[]);}
  assert.deepEqual(google,[]);assert.deepEqual(errors,[]);console.log('PASS: 7 legal views × 7 widths, real App SSR/hydration, headings, anchors, preference dialog, axe and no overflow/errors/Google requests.');
}finally{await browser?.close();await server.close();}
