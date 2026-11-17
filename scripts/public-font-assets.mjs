// Only the licensed files shipped with this release, never a filesystem prefix.
export function publicFontMime(path) {
  if (/^\/fonts\/oswald\/oswald-(?:400|500|600|700)\.ttf$/.test(path)) return 'font/ttf';
  if (path === '/fonts/oswald/oswald.css') return 'text/css';
  if (path === '/fonts/oswald/OFL.txt') return 'text/plain';
  return null;
}
