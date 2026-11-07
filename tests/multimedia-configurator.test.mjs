import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {configurableProduct} from './fixtures/configurator-products.mjs';

const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
after(()=>vite.close());
const {REFERENCE_OEM_PROFILE,MEMORY_OEM_PROFILE}=await vite.ssrLoadModule('/src/domain/productConfigurator/types.ts');
const {resolveConfiguration}=await vite.ssrLoadModule('/src/domain/productConfigurator/resolver.ts');
const {rowRequiresYear}=await vite.ssrLoadModule('/src/domain/productConfigurator/compatibility.ts');
const {catalogSnapshot}=await vite.ssrLoadModule('/src/domain/productConfigurator/catalog.ts');
const {reconcileSelection}=await vite.ssrLoadModule('/src/domain/productConfigurator/selection.ts');
const contract=await vite.ssrLoadModule('/src/types/productConfiguration.ts');
const cart=await vite.ssrLoadModule('/src/domain/cartLines.ts');
const {supportedConfiguration}=await vite.ssrLoadModule('/src/pages/ProductDetail/useProductConfigurator.ts');
const {ProductConfigurator,ProductConfigurationSummary}=await vite.ssrLoadModule('/src/pages/ProductDetail/ProductConfigurator.tsx');
const {ConfiguratorVehicleFields}=await vite.ssrLoadModule('/src/pages/ProductDetail/ConfiguratorVehicleFields.tsx');
const vehicle={vehicle_brand_id:10,vehicle_model_id:20,vehicle_version_id:30,vehicle_multimedia_system_id:40};
function referenceProduct(){
 const p=structuredClone(configurableProduct());p.name='Pantalla Linux';p.product_category.fields=[];
 p.configuration={...p.configuration,profile_id:REFERENCE_OEM_PROFILE.id,purchase_enabled:true};
 p.variants=p.variants.slice(0,2).map(v=>({...v,specs:{},spec_values:[]}));
 return p;
}
const input=(p,selection,profile=REFERENCE_OEM_PROFILE)=>({profile,snapshot:catalogSnapshot(p,'fresh','complete_public'),expectedRequestKey:'fresh',selection});

test('production approval allowlist blocks an unreviewed SKU without changing legacy contracts',()=>{
 const p=referenceProduct(), variant=p.variants[1];
 const context={schema_version:1,profile_id:REFERENCE_OEM_PROFILE.id,profile_version:1,...vehicle,year:2013};
 assert.equal(contract.configurationAllowsVariant(p.configuration,variant.id),true);
 for(const ids of [[],[999999],null]) {
  p.configuration.purchasable_variant_ids=ids;
  assert.equal(contract.configurationAllowsVariant(p.configuration,variant.id),false);
  assert.deepEqual(cart.addCartItem([],p,1,variant,context),[]);
 }
 p.configuration.purchasable_variant_ids=[variant.id];
 assert.equal(contract.configurationAllowsVariant(p.configuration,variant.id),true);
 assert.equal(cart.addCartItem([],p,1,variant,context).length,1);
 p.configuration.purchase_enabled=false;
 assert.equal(contract.configurationAllowsVariant(p.configuration,variant.id),false);
});

test('reference profile resolves real Linux kits without inventing Android RAM or storage',()=>{
 const p=referenceProduct();let r=resolveConfiguration(input(p,vehicle));
 assert.equal(r.status,'ambiguous');assert.equal(r.differentiators.length,2);assert.deepEqual(r.options.memories,[]);
 r=resolveConfiguration(input(p,{...vehicle,variant_id:2}));
 assert.equal(r.status,'valid');assert.equal(r.variant.variant_id,2);assert.equal(r.variant.price,p.variants[1].price);
 assert.equal(r.variant.image_url,p.variants[1].image_url);assert.equal(r.variant.ram_gb,null);
 assert.equal(resolveConfiguration(input(p,{...vehicle,ram_gb:8})).status,'insufficient_data');
 assert.equal(resolveConfiguration(input(p,vehicle,MEMORY_OEM_PROFILE)).canSelectForPurchase,false);
});
test('profile comes only from versioned backend enrollment, never Android/Linux name or category',()=>{
 assert.equal(supportedConfiguration(referenceProduct().configuration),REFERENCE_OEM_PROFILE);
 assert.equal(supportedConfiguration({...referenceProduct().configuration,profile_version:2}),null);
 assert.equal(supportedConfiguration(null),null);
 assert.equal(resolveConfiguration({...input(referenceProduct(),vehicle),profile:null}).status,'not_applicable');
});
test('reference profile distinguishes missing, inactive, hidden and exhausted physical variants',()=>{
 for(const [extra,status] of [[{stock:0},'out_of_stock'],[{is_active:false},'unavailable'],[{is_visible:false},'unavailable']]){
  const p=referenceProduct();Object.assign(p.variants[1],extra);
  assert.equal(resolveConfiguration(input(p,{...vehicle,variant_id:2})).status,status);
 }
 assert.equal(resolveConfiguration(input(referenceProduct(),{...vehicle,variant_id:9876})).status,'nonexistent');
 const p=referenceProduct();p.variants[1].stock=0;
 assert.equal(resolveConfiguration(input(p,vehicle)).status,'ambiguous'); // No silent choice of the stocked kit.
});
test('partial OEM/commercial coverage requires a real year; full union does not fabricate one',()=>{
 const row=structuredClone(configurableProduct().variants[0].vehicle_compatibilities[0]);
 assert.equal(rowRequiresYear(row),false);
 row.oem_year_ranges=[{year_from:2012,year_to:2013}];assert.equal(rowRequiresYear(row),true);
 row.oem_year_ranges=[{year_from:2012,year_to:2013},{year_from:2014,year_to:2018}];assert.equal(rowRequiresYear(row),false);
 row.oem_year_ranges=[{year_from:2012,year_to:2013},{year_from:2015,year_to:2018}];assert.equal(rowRequiresYear(row),true);
 row.oem_year_ranges=[];row.year_from=2013;assert.equal(rowRequiresYear(row),true);
});
test('resolver enforces partial technical years, not only the view',()=>{
 const p=referenceProduct();p.variants=p.variants.slice(0,1);
 p.variants[0].vehicle_compatibilities[0].oem_year_ranges=[{year_from:2012,year_to:2013}];
 const missing=resolveConfiguration(input(p,vehicle));assert.equal(missing.status,'incomplete');assert.equal(missing.yearRequired,true);
 for(const year of [2012,2013])assert.equal(resolveConfiguration(input(p,{...vehicle,year})).status,'valid');
 assert.equal(resolveConfiguration(input(p,{...vehicle,year:2014})).status,'nonexistent');
});
test('changing OEM clears dependent reference; it never switches to another physical kit silently',()=>{
 const p=referenceProduct();p.variants[1].vehicle_compatibilities=structuredClone(configurableProduct().variants[2].vehicle_compatibilities);
 const next=reconcileSelection({...input(p,{}),previous:{...vehicle,variant_id:1},patch:{vehicle_multimedia_system_id:41}});
 assert.equal(next.selection.variant_id,null);assert.ok(next.cleared.includes('variant_id'));
 assert.equal(next.resolution.variant.variant_id,2); // Unique real reference after explicit OEM, not an arbitrary tie.
});
test('Linux DTO, historical JSON and shared physical stock preserve OEM context without fake memory',()=>{
 const p=referenceProduct(),v=p.variants[0];
 const ctx={schema_version:1,profile_id:REFERENCE_OEM_PROFILE.id,profile_version:1,...vehicle,year:2016,
  vehicle_brand_name:'BMW',vehicle_model_name:'Serie 3',vehicle_version_name:'F30',vehicle_multimedia_system_name:'CIC'};
 const dto=contract.purchaseConfiguration(ctx);assert.ok(!('ram_gb' in dto));assert.ok(!('almacenamiento_gb' in dto));
 assert.ok(!contract.configurationSummary(ctx).includes('undefined'));assert.ok(!contract.configurationSummary(ctx).includes('RAM'));
 let lines=cart.addCartItem([],p,1,v,ctx);lines=cart.addCartItem(lines,p,2,v,{...ctx,vehicle_multimedia_system_id:41});
 assert.equal(lines.length,2);assert.equal(cart.commercialQuantity(lines,p.id,v.id),3);
 assert.deepEqual(contract.purchaseConfiguration(JSON.parse(JSON.stringify(lines))[0].configuration_context),dto);
 assert.equal(cart.addCartItem(lines,p,1,v,ctx),lines);
});
test('guided vehicle fields expose only real tuples and pending year, not an arbitrary model',()=>{
 const p=configurableProduct();const resolution=resolveConfiguration(input(p,{},MEMORY_OEM_PROFILE));
 const model={selection:{},resolution,fullProduct:p,yearRequired:true,select:()=>{}};
 const html=renderToString(createElement(ConfiguratorVehicleFields,{model,product:p,disabled:false}));
 for(const name of ['BMW','Toyota','Marca del vehículo','Año del vehículo'])assert.ok(html.includes(name));
 assert.ok(!html.includes('value="20">Serie 3')); // No model until its real brand is selected.
});
test('reference UI has OEM and explicit kits but no forced RAM controls; summary names the vehicle',()=>{
 const p=referenceProduct(),resolution=resolveConfiguration(input(p,vehicle));
 const model={profile:REFERENCE_OEM_PROFILE,uiEnabled:true,selection:vehicle,resolution,vehicleContext:{status:'resolved'},
  loadStatus:'ready',failure:null,fullProduct:p,referenceOptions:resolution.differentiators,vehicleMemoryOptions:[],
  cleared:[],select:()=>{},retry:()=>{}};
 const html=renderToString(createElement(ProductConfigurator,{model,product:p,interactive:true}));
 assert.ok(html.includes('Sistema OEM'));assert.ok(html.includes('Elige la referencia exacta'));
 assert.ok(!html.includes('Configuración de memoria'));assert.ok(!html.includes('2 · RAM'));
 const summary=renderToString(createElement(ProductConfigurationSummary,{model}));
 assert.ok(summary.includes('BMW Serie 3 F30'));assert.ok(summary.includes('CIC'));assert.ok(!summary.includes('undefined'));
});
