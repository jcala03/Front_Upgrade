import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import ts from 'typescript';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(() => vite.close());
const { parseNumericDraft, numericPreview, numericPayload, validateNumericInputs } = await vite.ssrLoadModule('/src/utils/numericInput.ts');

test('empty numeric drafts remain distinct from an intentional zero', () => {
  assert.equal(parseNumericDraft(''), null);
  assert.equal(parseNumericDraft('   '), null);
  assert.equal(parseNumericDraft('0'), 0);
  assert.equal(parseNumericDraft(0), 0);
  assert.throws(() => numericPayload(''), /número válido/);
});

test('numeric serialization preserves existing numbers and decimal precision without rounding', () => {
  for (const [draft, number] of [['12.50', 12.5], ['0.25', 0.25], ['.5', 0.5], ['99.5', 99.5], [125000, 125000], ['0008', 8]]) {
    assert.equal(parseNumericDraft(draft), number);
    assert.equal(numericPayload(draft), number);
  }
});

test('NaN, Infinity, malformed text and nondecimal formats cannot become payload numbers', () => {
  for (const value of [NaN, Infinity, -Infinity, 'NaN', 'Infinity', '1e999', '0x10', '0b10', '12abc', '1,5', '-', '.', '1e']) {
    assert.equal(parseNumericDraft(value), null, String(value));
    assert.throws(() => numericPayload(value), /número válido/, String(value));
    assert.equal(numericPreview(value), 0);
  }
});

test('preview fallback never normalizes or mutates the draft sent to validation', () => {
  const line = { quantity: '', discount: '0', unitPrice: 25000 };
  assert.equal(line.unitPrice * numericPreview(line.quantity) - numericPreview(line.discount), 0);
  assert.equal(line.quantity, '');
  assert.throws(() => numericPayload(line.quantity));
});

const input = (value, { required = false, disabled = false, badInput = false } = {}) => ({
  value, required, disabled, validity: { badInput }, message: '', listener: null,
  setCustomValidity(message) { this.message = message; },
  addEventListener(type, listener, options) { assert.equal(type, 'input'); assert.equal(options.once, true); this.listener = listener; },
});

test('submit-time numeric validation reports required blank and invalid values, not zero', () => {
  for (const field of [input('', { required: true }), input('Infinity'), input('', { badInput: true })]) {
    const form = { querySelectorAll: () => [field], reportValidity: () => !field.message };
    assert.equal(validateNumericInputs(form), false);
    assert.ok(field.message);
    field.listener();
    assert.equal(field.message, '');
  }
});

test('optional blanks and disabled fields remain optional; native min/max/step validation is retained', () => {
  const fields = [input(''), input('0', { required: true }), input('', { required: true, disabled: true })];
  const form = { querySelectorAll: () => fields, reportValidity: () => fields.every(field => !field.message) };
  assert.equal(validateNumericInputs(form), true);
  form.reportValidity = () => false; // Native range/step errors must not be bypassed.
  assert.equal(validateNumericInputs(form), false);
});

test('commerce forms keep raw drafts during editing and validate before serialization', async () => {
  for (const path of ['admin/orders/SaleForm', 'admin/quotations/QuotationForm', 'crm/my-commerce/MyCommercialForm']) {
    const source = await readFile(new URL(`../src/modules/${path}.tsx`, import.meta.url), 'utf8');
    assert.match(source, /quantity: NumericDraft; discount: NumericDraft/);
    assert.match(source, /quantity:\s*(?:e|event)\.target\.value/);
    assert.match(source, /discount:\s*(?:e|event)\.target\.value/);
    assert.ok(source.indexOf('validateNumericInputs(event.currentTarget)') < source.indexOf('quantity: numericPayload(') || source.indexOf('validateNumericInputs(event.currentTarget)') < source.indexOf('quantity:numericPayload('));
    assert.match(source, /required inputMode="numeric" type="number" min="1"/);
    assert.match(source, /required inputMode="numeric" type="number" min="0"/);
  }
});

test('inventory and settings no longer convert the empty string to zero during onChange', async () => {
  for (const path of ['admin/inventory/AdminInventoryPage', 'admin/settings/AdminSettingsPage']) {
    const source = await readFile(new URL(`../src/modules/${path}.tsx`, import.meta.url), 'utf8');
    assert.ok(!source.includes('Number(event.target.value)'));
    assert.ok(!source.includes('Number(e.target.value)'));
    assert.match(source, /validateNumericInputs\(event.currentTarget\)/);
  }
});

test('all numeric controls avoid unguarded coercion while typing, including multiline JSX', async () => {
  let controls = 0;
  const violations = [];
  const root = new URL('../src/', import.meta.url);
  for (const path of await readdir(root, { recursive: true })) {
    if (!path.endsWith('.tsx')) continue;
    const source = await readFile(new URL(path, root), 'utf8');
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(file) === 'input') {
        const props = node.attributes.properties;
        const type = props.find(prop => prop.name?.getText(file) === 'type')?.initializer?.getText(file);
        if (type?.includes('number')) {
          controls++;
          const handler = props.find(prop => prop.name?.getText(file) === 'onChange')?.initializer?.getText(file) ?? '';
          if (/Number\(|parseInt\(|parseFloat\(/.test(handler)) {
            // The vehicle resolver already explicitly preserves empty as null.
            if (path !== 'pages/ProductDetail/ConfiguratorVehicleFields.tsx' || !handler.includes('event.target.value ? Number(event.target.value) : null')) violations.push(path);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
  assert.ok(controls >= 43);
  assert.deepEqual(violations, []);
});

test('product and variant drafts retain existing pricing rules, decimal input and explicit validation', async () => {
  const source = await readFile(new URL('../src/modules/admin/inventory/product-form/ProductForm.tsx', import.meta.url), 'utf8');
  assert.match(source, /validatePricingDraft\(form, "pricing"\)/);
  assert.match(source, /validatePricingDraft\(variant,/);
  assert.match(source, /step="any" inputMode="decimal"/);
  assert.match(source, /toDecimal\(draft|toDecimal\(form/);
  assert.match(source, /toDecimal\(variant.target_profit_percent\) >= 100/);
});
