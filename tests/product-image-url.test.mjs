import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFile} from 'node:fs/promises';

const media = 'https://crmupgradecol.com/storage';
const vite = await createServer({configFile:false, appType:'custom', esbuild:{jsx:'automatic'},
  optimizeDeps:{noDiscovery:true,include:[]}, server:{middlewareMode:true,hmr:false,ws:false},
  define:{'import.meta.env.VITE_PUBLIC_STORAGE_URL':JSON.stringify(media)}});
after(()=>vite.close());
const {resolveProductImageUrl:resolve,getProductImageUrl} = await vite.ssrLoadModule('/src/utils/getProductImageUrl.ts');

test('public storage paths use a separate media origin, exactly one /storage and preserve case',()=>{
  for(const path of ['products/OriginalCase.png','/products/OriginalCase.png','storage/products/OriginalCase.png','/storage/products/OriginalCase.png']){
    assert.equal(resolve(path,media+'/','https://upgradecolombia.com/'),media+'/products/OriginalCase.png');
    assert.equal(getProductImageUrl(path),media+'/products/OriginalCase.png');
  }
});
test('valid absolute URLs are never rebased to the API or storage domain',()=>{
  for(const url of ['https://cdn.example.test/items/a.png?version=2#detail','https://crmupgradecol.com/storage/a.png','http://127.0.0.1:8000/storage/a.png','//cdn.example.test/a.png','blob:https://example.test/preview','data:image/png;base64,AA==']){
    assert.equal(resolve(url,media,'https://upgradecolombia.com'),url);
  }
});
test('empty values and local/production fallbacks do not concatenate domains or slashes',()=>{
  assert.equal(resolve(null,media),'');assert.equal(resolve('',media),'');assert.equal(resolve(undefined,media),'');
  assert.equal(resolve('/storage/products/a.png',undefined,''),'/storage/products/a.png');
  assert.equal(resolve('products/a.png',undefined,'http://127.0.0.1:8000/'),'http://127.0.0.1:8000/storage/products/a.png');
  assert.equal(resolve('products/a.png','  ', 'https://api.example.test/'),'https://api.example.test/storage/products/a.png');
  assert.equal(resolve('products/a.png',media+'/','https://upgradecolombia.com'),media+'/products/a.png');
});
test('development without a separate media URL uses the configured Laravel origin, not Vite /storage',async()=>{
  const dev=await createServer({configFile:false,appType:'custom',optimizeDeps:{noDiscovery:true,include:[]},
    server:{middlewareMode:true,hmr:false,ws:false},define:{
      'import.meta.env.DEV':'true',
      'import.meta.env.VITE_API_BASE_URL':JSON.stringify('http://127.0.0.1:8000/'),
      'import.meta.env.VITE_PUBLIC_STORAGE_URL':JSON.stringify(''),
    }});
  try{
    const {getProductImageUrl}=await dev.ssrLoadModule('/src/utils/getProductImageUrl.ts');
    assert.equal(getProductImageUrl('/storage/products/local.png'),'http://127.0.0.1:8000/storage/products/local.png');
  }finally{await dev.close();}
});
test('product gallery and selected variant resolve the same storage paths without changing records',async()=>{
  const {productGallery}=await vite.ssrLoadModule('/src/pages/ProductDetail/productPresentation.ts');
  const product={image_url:'products/main.png',images:[{image_url:'/storage/products/gallery.png',is_primary:false,sort_order:1}],variants:[]};
  const variant={image_url:'storage/products/variant.png'};
  const before=structuredClone({product,variant});
  assert.deepEqual(productGallery(product,variant).map(getProductImageUrl),['main','gallery','variant'].map(n=>`${media}/products/${n}.png`));
  assert.deepEqual({product,variant},before);
});
test('persisted cart and checkout render variant storage paths instead of stale absolute snapshots',async t=>{
  const oldStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const oldSession=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
  const product={id:880001,name:'DEMO image fixture',slug:'demo-image-fixture',price:10000,stock:5,has_variants:true,
    main_image:'products/cart-parent.png',image_url:'https://upgradecolombia.com/storage/products/cart-parent.png',variants:[]};
  const variant={id:880002,product_id:product.id,name:'Variant',price:12000,stock:3,
    main_image:'products/cart-variant.png',image_url:'https://upgradecolombia.com/storage/products/cart-variant.png'};
  const lines=JSON.stringify([{product,variant,quantity:1}]);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>k==='upgrade79_cart'?lines:null,setItem(){}}});
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:()=>null,setItem(){},removeItem(){}}});
  t.after(()=>{for(const[key,descriptor]of [['localStorage',oldStorage],['sessionStorage',oldSession]]){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  const {CartProvider}=await vite.ssrLoadModule('/src/context/CartContext.tsx');
  const {CartPage}=await vite.ssrLoadModule('/src/pages/Cart/CartPage.tsx');
  const {CheckoutPage}=await vite.ssrLoadModule('/src/pages/Checkout/CheckoutPage.tsx');
  // CartProvider deliberately ignores storage in SSR. A minimal window enables
  // the same historical-cart read path, without network, orders or payment calls.
  const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
  Object.defineProperty(globalThis,'window',{configurable:true,value:{}});
  t.after(()=>{if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else delete globalThis.window;});
  for(const Component of [CartPage,CheckoutPage]){
    const html=renderToStaticMarkup(createElement(CartProvider,null,createElement(Component)));
    assert.ok(html.includes(`src="${media}/products/cart-variant.png"`));
    assert.ok(!html.includes('src="https://upgradecolombia.com/storage/'));
    assert.ok(html.includes('12.000'));
  }
  assert.equal(lines,JSON.stringify([{product,variant,quantity:1}]));
});
test('cart, checkout and admin catalog reuse the image resolver; API/auth URL remains the bridge',async()=>{
  for(const path of ['src/pages/Cart/CartPage.tsx','src/pages/Checkout/CheckoutPage.tsx','src/modules/admin/products/AdminProductsPage.tsx']){
    const source=await readFile(new URL('../'+path,import.meta.url),'utf8');
    assert.match(source,/getProductImageUrl/);assert.doesNotMatch(source,/const getImageUrl\s*=/);
  }
  const env=await readFile(new URL('../.env.production',import.meta.url),'utf8');
  assert.match(env,/^VITE_API_BASE_URL=https:\/\/upgradecolombia\.com$/m);
  assert.match(env,/^VITE_PUBLIC_STORAGE_URL=https:\/\/crmupgradecol\.com\/storage$/m);
});
