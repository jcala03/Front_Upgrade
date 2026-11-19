import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
const vite = await createServer({ configFile: false, esbuild: { jsx: 'automatic' }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => vite.close());
const { shippingCountries, colombianDepartments, colombianDepartment, colombianCity, colombianCityValue, composeStreet, parseStreet } = await vite.ssrLoadModule('/src/pages/Checkout/shippingAddress.ts');
const { CheckoutAddressFields } = await vite.ssrLoadModule('/src/pages/Checkout/CheckoutAddressFields.tsx');
const address = { recipient_name: 'Persona aislada', recipient_phone: '3000000000', country_code: 'CO', state: '', city: '', postal_code: '', address_line1: '', address_line2: '', delivery_notes: '' };
const render = (patch = {}, props = {}) => renderToString(createElement(CheckoutAddressFields, { address: { ...address, ...patch }, disabled: false, errors: {}, onChange: () => {}, ...props }));

test('catálogo local contiene países y las 33 divisiones DANE con códigos y municipios únicos', () => {
  assert.ok(shippingCountries.length >= 240);
  assert.equal(new Set(shippingCountries.map(([id]) => id)).size, shippingCountries.length);
  assert.ok(shippingCountries.every(([code, name]) => /^[A-Z]{2}$/.test(code) && name));
  assert.ok(shippingCountries.some(([code, name]) => code === 'CO' && name === 'Colombia'));
  assert.equal(colombianDepartments.length, 33);
  const cities = colombianDepartments.flatMap(department => department.cities);
  assert.ok(cities.length >= 1100);
  assert.equal(new Set(cities.map(([id]) => id)).size, cities.length);
  for (const department of colombianDepartments) {
    assert.match(department.shippingCode, /^[A-Z]{2}$/);
    assert.ok(department.cities.every(([id, name]) => id.startsWith(department.id) && name));
  }
});
test('selecciones de departamento aceptan nombres históricos, códigos Envia y tildes sin cruzar municipios', () => {
  for (const value of ['AT', '08', 'Atlántico', 'Atlantico']) assert.equal(colombianDepartment(value)?.id, '08');
  const atlantic = colombianDepartment('AT');
  assert.equal(colombianCity(atlantic, 'Soledad')?.[0], '08758');
  assert.equal(colombianCity(atlantic, '08758')?.[1], 'Soledad');
  assert.equal(colombianCity(atlantic, 'Medellín'), undefined);
  assert.equal(colombianDepartment('desconocido'), undefined);
});
test('Bogotá y San Andrés usan nombres confirmados del proveedor sin fabricar códigos de ciudad', () => {
  const bogota = colombianDepartment('Bogotá, D.C.');
  assert.equal(bogota.shippingCode, 'DC');
  assert.equal(bogota.shippingName, 'Bogotá DC');
  assert.equal(colombianCity(bogota, 'Bogotá')?.[0], '11001');
  assert.equal(colombianCityValue('11001', 'Bogotá, D.C.'), 'Bogotá');
  assert.equal(colombianDepartment('88').shippingCode, 'SA');
});
test('dirección urbana conserva letras, bis, puntos cardinales y ceros de la placa', () => {
  assert.equal(composeStreet({ type: 'Calle', main: '20', cross: '15B', door: '10' }), 'Calle 20 # 15B - 10');
  assert.equal(composeStreet({ type: 'Carrera', main: ' 12 A Bis Sur ', cross: ' 34 B ', door: '05' }), 'Carrera 12 A Bis Sur # 34 B - 05');
  assert.equal(composeStreet({ type: 'Avenida', main: 'Las Palmas', cross: '10', door: '25A' }), 'Avenida Las Palmas # 10 - 25A');
});
test('no compone direcciones parciales, vacías, con separadores duplicados o placa inválida', () => {
  const valid = { type: 'Calle', main: '20', cross: '15B', door: '10' };
  for (const key of Object.keys(valid)) assert.equal(composeStreet({ ...valid, [key]: '' }), null);
  for (const patch of [{ type: 'Inventada' }, { main: '#' }, { cross: '15#10' }, { door: 'NaN' }, { door: '10 - 20' }, { main: ' '.repeat(5) }]) assert.equal(composeStreet({ ...valid, ...patch }), null);
});
test('lectura de direcciones existentes reconoce abreviaturas sin perder ceros ni normalizar la persistencia', () => {
  assert.deepEqual(parseStreet('Cra 12#34-05'), { type: 'Carrera', main: '12', cross: '34', door: '05' });
  assert.equal(composeStreet(parseStreet('Av. Calle 80 Bis Sur # 12A - 09')), 'Avenida Calle 80 Bis Sur # 12A - 09');
  for (const value of ['', 'Vereda El Bosque, finca de prueba', 'Dirección extranjera 10', 'Calle 2 # 3']) assert.equal(parseStreet(value), null);
});
test('formulario inicial muestra listas dependientes y no asigna ciudad ni código postal por defecto', () => {
  const html = render();
  assert.match(html, /<select name="country_code"/);
  assert.match(html, /<select name="state"/);
  assert.match(html, /<select name="city"[^>]*disabled/);
  assert.match(html, /Elige primero un departamento/);
  assert.match(html, /name="postal_code"[^>]*value=""/);
  assert.match(html, /Completa los campos para formar tu dirección/);
});
test('dirección guardada se presenta sin ejecutar cambios y conserva valores históricos no reconocidos', () => {
  let changes = 0;
  const html = render({ state: 'Departamento histórico', city: 'Ciudad histórica', address_line1: 'Vereda de prueba' }, { onChange: () => changes++ });
  assert.match(html.replaceAll('<!-- -->', ''), /Departamento histórico \(dirección guardada\)/);
  assert.match(html.replaceAll('<!-- -->', ''), /Ciudad histórica \(dirección guardada\)/);
  assert.match(html, /value="Vereda de prueba"/);
  assert.equal(changes, 0);
});
test('formato internacional no impone nomenclatura colombiana ni retira países existentes', () => {
  const html = render({ country_code: 'US', state: 'NY', city: 'New York', postal_code: '10001', address_line1: '10 Example Avenue' });
  assert.match(html, /name="state"[^>]*value="NY"/);
  assert.match(html, /name="city"[^>]*value="New York"/);
  assert.match(html, /value="10 Example Avenue"/);
  assert.ok(!html.includes('Tipo de vía principal'));
});
test('formulario conserva bloqueo y errores de Laravel accesibles sin simular un guardado', () => {
  const html = render({}, { disabled: true, errors: { address_line1: ['Revisa la dirección.'], state: ['El departamento no es válido.'] } });
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /id="delivery-error-address_line1"/);
  assert.match(html, /Revisa la dirección\./);
  assert.match(html, /<fieldset[^>]*disabled/);
});
