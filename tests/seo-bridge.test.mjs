import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, readdir, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { setTimeout as pause } from 'node:timers/promises';
import { apacheRules } from '../scripts/prerender.mjs';

const installer = fileURLToPath(new URL('../scripts/install-seo-routing.php', import.meta.url));
const originalGuard = `if (!preg_match('#^/(api|sanctum)(/|$)#', $uri)) {
    http_response_code(404);
    exit;
}`;
const prefix = `<?php
// Preserve the existing bootstrap, private paths and any other validations.
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
`;
// Only a bridge stub: Laravel's real lookup/HTML is covered separately by
// PublicCatalogRuntimeTest. No MySQL, credentials or production requests here.
const suffix = `
if ($uri === '/sitemap.xml') {
    header('Content-Type: application/xml; charset=utf-8');
    echo '<?xml version="1.0"?><urlset><url><loc>https://upgradecolombia.com/tienda/qa-existing</loc></url></urlset>';
} elseif ($uri === '/tienda/qa-existing') {
    echo '<title>QA product</title><h1>QA product</h1>';
} elseif (preg_match('#^/(api|sanctum)(/|$)#', $uri)) {
    echo 'UNCHANGED_BACKEND';
} else {
    http_response_code(404);
}
`;

async function fixture(t, guard = originalGuard) {
  const directory = await mkdtemp(join(tmpdir(), 'upgrade79-bridge-test-'));
  const root = join(directory, 'public');
  await mkdir(join(root, 'seo'), { recursive: true });
  const bridge = prefix + guard + suffix;
  await writeFile(join(root, 'laravel-api.php'), bridge, { mode: 0o640 });
  await writeFile(join(root, '.htaccess'), '# EXISTING SETTINGS\n');
  await writeFile(join(root, 'seo/apache.conf'), apacheRules([], 'https://upgradecolombia.com'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const install = (...args) => execFileSync('php', [installer, root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return { directory, root, bridge, install };
}

async function phpServer(t, root) {
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const server = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', root, join(root, 'laravel-api.php')], { stdio: ['ignore', 'ignore', 'ignore'] });
  t.after(async () => {
    if (server.exitCode === null) {
      const exited = new Promise(resolve => server.once('exit', resolve));
      server.kill('SIGTERM');
      await exited;
    }
  });
  const get = path => fetch(`http://127.0.0.1:${port}${path}`);
  for (let attempt = 0; attempt < 50; attempt++) {
    try { await get('/'); return get; } catch { await pause(20); }
  }
  throw new Error('Isolated PHP bridge fixture did not start');
}

test('confirmed Hostinger guard causes empty 404; reviewed extension admits dynamic GETs without opening other paths', async t => {
  const f = await fixture(t);
  const get = await phpServer(t, f.root);
  for (const path of ['/tienda/qa-existing', '/sitemap.xml']) {
    const response = await get(path);
    assert.equal(response.status, 404);
    assert.equal(await response.text(), '');
  }
  assert.equal(await (await get('/api/products')).text(), 'UNCHANGED_BACKEND');
  f.install();
  const changed = await readFile(join(f.root, 'laravel-api.php'), 'utf8');
  assert.ok(changed.startsWith(prefix));
  assert.ok(changed.endsWith(suffix));
  assert.equal((await stat(join(f.root, 'laravel-api.php'))).mode & 0o777, 0o640);
  for (const path of ['/tienda/qa-existing', '/tienda/qa-existing?year=2020&vehicle_multimedia_system_id=4']) {
    const response = await get(path);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes('<h1>QA product</h1>'));
  }
  const sitemap = await get('/sitemap.xml');
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.headers.get('content-type'), /application\/xml/);
  assert.ok((await sitemap.text()).includes('/tienda/qa-existing'));
  for (const path of ['/tienda/missing', '/tienda/qa-existing/extra', '/tienda', '/crm/users', '/checkout', '/.env', '/storage', '/sitemap.xml/extra', '/api-secret']) {
    assert.equal((await get(path)).status, 404, path);
  }
  for (const path of ['/api', '/api/products', '/sanctum', '/sanctum/csrf-cookie']) {
    assert.equal(await (await get(path)).text(), 'UNCHANGED_BACKEND');
  }
  const backups = (await readdir(f.directory)).filter(name => name.startsWith('.laravel-api.before-seo-'));
  assert.equal(backups.length, 1);
  assert.equal(await readFile(join(f.directory, backups[0]), 'utf8'), f.bridge);
  assert.equal((await stat(join(f.directory, backups[0]))).mode & 0o777, 0o600);
  f.install();
  assert.equal(await readFile(join(f.root, 'laravel-api.php'), 'utf8'), changed);
  assert.equal((await readdir(f.directory)).filter(name => name.startsWith('.laravel-api.before-seo-')).length, 1);
});

test('check-only detects the supported guard before publication without changing files or creating backups', async t => {
  const f = await fixture(t);
  const before = await readFile(join(f.root, '.htaccess'), 'utf8');
  assert.match(f.install('--check', join(f.root, 'seo/apache.conf')), /no files changed/);
  assert.equal(await readFile(join(f.root, 'laravel-api.php'), 'utf8'), f.bridge);
  assert.equal(await readFile(join(f.root, '.htaccess'), 'utf8'), before);
  assert.deepEqual(await readdir(f.directory), ['public']);
});

test('previous partial deployment: unchanged SEO block does not skip the old bridge guard repair', async t => {
  const f = await fixture(t);
  const rules = await readFile(join(f.root, 'seo/apache.conf'), 'utf8');
  await writeFile(join(f.root, '.htaccess'), rules + '\n# EXISTING SETTINGS\n');
  assert.match(f.install(), /API bridge allowlist extended/);
  assert.equal(await readFile(join(f.root, '.htaccess'), 'utf8'), rules + '\n# EXISTING SETTINGS\n');
  assert.equal((await readdir(f.directory)).filter(name => name.startsWith('.htaccess.before-seo-')).length, 0);
});

test('unknown, duplicate or comment-only bridge guards fail closed before altering bridge or Apache rules', async t => {
  for (const guard of [originalGuard.replace('(api|sanctum)', '(api|sanctum|other)'), originalGuard + '\n' + originalGuard, '/* ' + originalGuard + ' */']) {
    const f = await fixture(t, guard);
    const apache = await readFile(join(f.root, '.htaccess'), 'utf8');
    for (const args of [[], ['--check', join(f.root, 'seo/apache.conf')]]) assert.throws(() => f.install(...args));
    assert.equal(await readFile(join(f.root, 'laravel-api.php'), 'utf8'), f.bridge);
    assert.equal(await readFile(join(f.root, '.htaccess'), 'utf8'), apache);
    assert.deepEqual(await readdir(f.directory), ['public']);
  }
});

test('raw REQUEST_URI also retains query strings without allowing additional path segments', async t => {
  const f = await fixture(t);
  await writeFile(join(f.root, 'laravel-api.php'), prefix.replace("parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH)", "($_SERVER['REQUEST_URI'] ?? '/')") + originalGuard + '\necho "ALLOWED";');
  f.install();
  const get = await phpServer(t, f.root);
  for (const path of ['/tienda/qa-existing?year=2020', '/sitemap.xml?test=1']) assert.equal(await (await get(path)).text(), 'ALLOWED');
  for (const path of ['/tienda/a/b?x=1', '/sitemap.xml/extra?x=1']) assert.equal((await get(path)).status, 404);
});
