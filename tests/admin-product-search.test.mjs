import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
after(()=>vite.close());
const {productSearchText}=await vite.ssrLoadModule('/src/modules/admin/products/productSearchText.ts');
const simple={id:1,name:'Cámara de reversa',sku:'CAM-001',category:'Cámaras',product_brand:{name:'Marca Uno'},vehicle_compatibilities:[{vehicle_label:'Vehículo de referencia'}]};
const variantProduct={...simple,id:2,name:'Pantalla',sku:'PARENT-002',is_visible:false,variants:[{name:'Kit físico A',sku:'SKU-UNICO-A',is_visible:false},{name:'Kit físico B',sku:'SKU-UNICO-B',is_active:false}]};
test('catalog search preserves parent name, SKU, category, brand and compatibility for simple products',()=>{
  for(const query of ['cámara','cam-001','cámaras','marca uno','vehículo de referencia'])assert.ok(productSearchText(simple).includes(query),query);
  assert.equal(productSearchText(simple).includes('sku-inexistente'),false);
});
test('variant name and SKU find the parent, including hidden and inactive references in admin',()=>{
  const before=structuredClone(variantProduct);
  for(const query of ['sku-unico-a','kit físico a','sku-unico-b','kit físico b','parent-002'])assert.ok(productSearchText(variantProduct).includes(query),query);
  assert.deepEqual(variantProduct,before);
  assert.deepEqual([simple,variantProduct].filter(p=>productSearchText(p).includes('sku-unico-b')).map(p=>p.id),[2]);
});
test('empty or absent variants do not break legacy products or an empty search',()=>{
  assert.equal(productSearchText({...simple,variants:[]}),productSearchText(simple));
  assert.ok(productSearchText(simple).includes(''));
  assert.match(productSearchText({name:'Simple',sku:null}),/simple.*sin categoría.*sin marca/);
});
