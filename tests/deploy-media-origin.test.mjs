import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const workflow=await readFile(new URL('../.github/workflows/deploy.yml',import.meta.url),'utf8');
const guard=workflow.match(/node --input-type=module -e '([\s\S]*?)'\s*\n/)?.[1];
assert.ok(guard,'Run the actual pre-upload domain guard from the workflow');

async function check(files){
  const dir=await mkdtemp(join(tmpdir(),'upgrade79-media-gate-'));
  try{
    for(const [name,content]of Object.entries(files)){
      const path=join(dir,'dist/assets',name);
      await mkdir(join(path,'..'),{recursive:true});await writeFile(path,content);
    }
    return spawnSync(process.execPath,['--input-type=module','-e',guard],{cwd:dir,encoding:'utf8'}).status;
  }finally{await rm(dir,{recursive:true,force:true});}
}
test('production gate accepts the public API and the exact HTTPS storage exception',async()=>{
  for(const url of ['https://upgradecolombia.com/api','https://crmupgradecol.com/storage','https://crmupgradecol.com/storage/a.png','https://crmupgradecol.com/storage?x=1','https://crmupgradecol.com/storage#gallery']){
    assert.equal(await check({'main.js':JSON.stringify(url)}),0,url);
  }
});
test('production gate rejects old API, insecure or lookalike media URLs in every JS chunk',async()=>{
  for(const url of ['https://crmupgradecol.com/api','https://crmupgradecol.com','http://crmupgradecol.com/storage/a.png','https://crmupgradecol.com/storage-evil','https://crmupgradecol.com/storage.evil/a']){
    assert.notEqual(await check({'main.js':'"https://upgradecolombia.com"','nested/lazy.js':JSON.stringify(url)}),0,url);
  }
});
