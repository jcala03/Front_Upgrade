// Read-only visual QA against the real local catalogue. Never creates orders or stock.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const before = process.argv.includes('--before');
const artifacts = await mkdtemp(join(tmpdir(), `upgrade79-product-premium-${before ? 'before' : 'after'}-`));
const origin = 'http://127.0.0.1:5173', api = 'http://127.0.0.1:8000';
const slug = 'qa-local-pantalla-bmw-f30-multi-oem';
const product = await fetch(`${api}/api/products/${slug}`).then(r => r.json()).then(r => r.data);
assert.equal(product.id, 6);assert.equal(product.configuration.purchase_enabled, false);
const cic = product.variants.find(v => v.sku === 'QA-L29-F30-MULTI-CIC-8128');
const nbt = product.variants.find(v => v.sku === 'QA-L29-F30-MULTI-NBT-8256');
const shared = product.variants.find(v => v.sku === 'QA-L29-F30-MULTI-464');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/google/chrome/chrome', headless: true, args: ['--no-sandbox'] });
const errors = [], consoleIssues = [], blocked = [], writes = [], results = [];
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const req = route.request(), url = new URL(req.url());
    if (!['127.0.0.1', 'localhost', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) { blocked.push(url.origin + url.pathname); return route.abort(); }
    if (req.method() !== 'GET') { writes.push(url.pathname); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(45000);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['warning', 'error'].includes(m.type())) consoleIssues.push(m.text()); });
  const group = label => page.getByRole('group', { name: label, exact: true });
  const oem = id => group('Sistema OEM').locator(`button[data-option-value="${id}"]`);
  const memory = value => group('Configuración de memoria').locator(`button[data-option-value="${value}"]`);
  const matches = async variant => {
    await page.locator('[data-configuration-status="valid"]').waitFor();
    assert.ok((await page.locator('.product-detail__sku').innerText()).includes(variant.sku));
    assert.ok((await page.locator('.product-detail__price').innerText()).includes(new Intl.NumberFormat('es-CO').format(variant.price)));
    assert.ok((await page.locator('.product-detail__stock').innerText()).includes(String(variant.stock)));
    if (!before) {
      assert.equal(await page.locator('.product-detail__price').count(), 1);
      assert.equal(await page.locator('.product-detail__sku').count(), 1);
      assert.equal(await page.locator('.product-detail__stock').count(), 1);
      const panelText = await page.locator('.product-detail__content').innerText();
      assert.equal(panelText.split(variant.sku).length - 1, 1);
      assert.equal(panelText.split(new Intl.NumberFormat('es-CO').format(variant.price)).length - 1, 1);
    }
  };
  for (const width of before ? [1440, 390] : [1440, 1280, 1024, 768, 430, 390, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${origin}/tienda/${slug}`, { waitUntil: 'domcontentloaded' });
    await oem(cic.vehicle_compatibilities[0].vehicle_multimedia_system_id).click();
    await memory('8/128').click();await matches(cic);
    assert.equal(await page.locator('.product-configurator select,.product-configurator input').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Compra online no habilitada', exact: true }).isDisabled(), true);
    if (!before) {
      assert.equal(await page.locator('.product-detail__qa-notice').count(), 1);
      await page.getByText('Especificaciones', { exact: true }).click();
      const specs = await page.locator('#product-specifications').innerText();
      assert.match(specs, /RAM/);assert.match(specs, /8 GB/);assert.match(specs, /Almacenamiento/);assert.match(specs, /128 GB/);
      assert.ok(!/ram_gb|almacenamiento_gb/.test(specs));
      await page.getByText('Especificaciones', { exact: true }).click();
      const thumbs = page.getByRole('group', { name: 'Galería del producto' }).getByRole('button');
      assert.ok(await thumbs.count() >= 2);
      await thumbs.nth(1).click();
      assert.equal(await page.locator('.product-detail__media img').getAttribute('src'), product.images[1].image_url);
      await thumbs.nth(0).click();
      assert.equal(await page.locator('.product-detail__media img').getAttribute('src'), product.image_url);
      const imageLayout = await page.locator('.product-detail__media img').evaluate(async img => {
        if (!img.complete) await new Promise(resolve => img.addEventListener('load', resolve, { once: true }));
        const r = img.getBoundingClientRect();return { fit: getComputedStyle(img).objectFit, loaded: img.naturalWidth > 0, width: r.width, height: r.height };
      });
      assert.equal(imageLayout.fit, 'contain');assert.equal(imageLayout.loaded, true);
      await oem(nbt.vehicle_compatibilities[0].vehicle_multimedia_system_id).click();
      await memory('8/256').click();await matches(nbt);
      await oem(cic.vehicle_compatibilities[0].vehicle_multimedia_system_id).click();
      await page.locator('[data-configuration-status="incomplete"]').waitFor();
      assert.equal(await memory('8/256').isDisabled(), true);
      await memory('4/64').click();await matches(shared);
      await oem(nbt.vehicle_compatibilities[0].vehicle_multimedia_system_id).click();await matches(shared);
      await oem(cic.vehicle_compatibilities[0].vehicle_multimedia_system_id).focus();
      await page.keyboard.press('Enter');await memory('8/128').click();await matches(cic);
      const geometry = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
        controls: [...document.querySelectorAll('.product-configurator__option,.product-detail__buy-box button,.product-detail__thumbnails button')].map(n => { const r = n.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height }; }) }));
      assert.ok(geometry.scroll <= geometry.width, JSON.stringify(geometry));
      assert.ok(geometry.controls.every(r => r.left >= 0 && r.right <= geometry.width + 1 && r.width >= 44 && r.height >= 44), JSON.stringify(geometry));
      await page.getByRole('link', { name: 'Ver detalle', exact: false }).click();
      assert.equal(await page.locator('#product-compatibility').evaluate(n => n.open), true);
      await page.locator('#product-compatibility > summary').click();
    }
    if ([1440, 390].includes(width)) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: join(artifacts, `product-${width}.png`), fullPage: true });
      await page.screenshot({ path: join(artifacts, `viewport-${width}.png`) });
    }
    results.push({ width, status: 'PASS', purchaseBlocked: true });
  }
  if (!before) {
    for (const traditionalSlug of ['qa-local-pantalla-bmw-f30-kits-dedicados', 'qa-local-radio-de-banco-2-gb']) {
      const traditional = await fetch(`${api}/api/products/${traditionalSlug}`).then(r => r.json()).then(r => r.data);
      for (const width of [1440, 1280, 1024, 768, 430, 390, 360]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(`${origin}/tienda/${traditionalSlug}`, { waitUntil: 'domcontentloaded' });
        assert.equal(await page.locator('.product-configurator').count(), 0);
        if (traditional.has_variants) await page.getByLabel('Versión del producto', { exact: true }).selectOption(String(traditional.variants[0].id));
        await page.getByRole('button', { name: 'Agregar al carrito', exact: true }).waitFor({ state: 'visible' });
        await page.locator('.product-detail__button:not([disabled])').waitFor();
        assert.equal(await page.locator('.product-detail__price').count(), 1);
        assert.equal(await page.locator('.product-detail__stock').count(), 1);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        assert.equal(overflow, false);
      }
      results.push({ productId: traditional.id, type: traditional.has_variants ? 'traditional' : 'simple', widths: 7, status: 'PASS' });
    }
  }
  assert.deepEqual(errors, []);assert.deepEqual(consoleIssues, []);assert.deepEqual(blocked, []);assert.deepEqual(writes, []);
  const report = { status: 'PASS', phase: before ? 'before' : 'after', productId: product.id, apiMocks: false, results, errors, consoleIssues, blocked, writes, artifacts };
  await writeFile(join(artifacts, 'report.json'), JSON.stringify(report, null, 2));console.log(JSON.stringify(report, null, 2));
} catch (e) { console.error('Artifacts:', artifacts); throw e; }
finally { await browser.close(); }
