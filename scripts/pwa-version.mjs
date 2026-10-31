import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const serviceWorkerVersion = (source) => createHash('sha256').update(source).digest('hex');
export const currentServiceWorkerVersion = () => serviceWorkerVersion(readFileSync(new URL('../public/sw.js', import.meta.url)));

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const version = currentServiceWorkerVersion();
  console.log(JSON.stringify({ version, scriptURL: `/sw.js?v=${version}` }, null, 2));
}
