// Real dev, preview and Node SSR servers; GET/HEAD only, no database or payment.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer, preview } from 'vite';
import { publicFontMime } from '../scripts/public-font-assets.mjs';
const paths = ['/fonts/oswald/oswald.css','/fonts/oswald/OFL.txt',...[400,500,600,700].map(n=>`/fonts/oswald/oswald-${n}.ttf`)];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let dev, built, node;
try {
  dev = await createServer({server:{host:'127.0.0.1',port:4196,strictPort:true,hmr:false,ws:false}});await dev.listen();
  built = await preview({preview:{host:'127.0.0.1',port:4197,strictPort:true}});
  node = spawn(process.execPath,['scripts/seo-server.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:'4198'},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Node SSR startup timeout')),10000);
    node.stdout.once('data',()=>{clearTimeout(timer);resolve();});node.once('error',error=>{clearTimeout(timer);reject(error);});});
  for(const port of [4196,4197,4198]){
    for(const path of paths){
      const source=await readFile('public'+path);
      for(const method of ['GET','HEAD']){
        const response=await fetch(`http://127.0.0.1:${port}${path}`,{method});
        assert.equal(response.status,200,`${port} ${method} ${path}`);
        assert.ok(response.headers.get('content-type').startsWith(publicFontMime(path)),`${port} ${path}`);
        const bytes=Buffer.from(await response.arrayBuffer());
        if(method==='GET')assert.equal(hash(bytes),hash(source),`${port} ${path}`);else assert.equal(bytes.length,0);
      }
    }
    const review=await fetch(`http://127.0.0.1:${port}/__legal-review/legal-y-privacidad`);
    assert.equal(review.status,port===4196?200:404);
    if(port===4196){const html=await review.text();assert.match(html,/Juan Cano Jimenez/);assert.match(html,/noindex, nofollow/);}
  }
  console.log('PASS: 36 font GET/HEAD responses with exact bytes and MIME; dev review SSR 200, production preview/Node review 404. No database requests.');
}finally{
  if(node&&node.exitCode===null){const exit=new Promise(resolve=>node.once('exit',resolve));node.kill('SIGTERM');await exit;}
  if(built)await new Promise(resolve=>built.httpServer.close(resolve));await dev?.close();
}
