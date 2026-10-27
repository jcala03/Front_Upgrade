# SEO público en Apache / Hostinger

## Causa comprobada

En producción, Home, `/robots.txt` y `/sitemap.xml` respondían con el mismo
`dist/index.html`: root vacío y `<!--seo-head-->` intacto. El renderer existente
solo se ejecutaba en dev, preview o `npm start`. El build SSR producía un módulo
JavaScript (`dist/seo/entry-server.js`), no archivos HTML renderizados. El deploy
copiaba `dist` y descartaba `.htaccess`, y Apache aplicaba el fallback SPA.
Tener el módulo SSR en disco no hace que Apache lo ejecute.

## Mecanismo reutilizado

`npm run build` conserva build cliente y SSR y añade `scripts/prerender.mjs`.
Ese paso usa **el mismo `renderRequest`, sitemap, componentes React, metadata,
JSON-LD y bootstrap de hidratación**. No se ejecuta Node permanentemente en el
hosting ni se detectan User-Agents. Humanos y crawlers reciben el mismo HTML.

Artefactos:

- `dist/index.html`: Home renderizada, title, description, canonical, OG, Twitter,
  H1, contenido y datos públicos para hidratar; mantiene la cubierta del splash.
- `dist/robots.txt`: texto real, sitemap canónico y exclusión de rutas privadas.
  Permite expresamente los GET públicos de catálogo y referencias que necesita
  el renderer cliente; no bloquea assets, CSS, JavaScript ni imágenes.
- `dist/sitemap.xml`: XML real; Home, tienda, política y productos publicados
  indexables devueltos por la API pública. Términos conserva su `noindex` existente.
- `dist/seo/pages/`: tienda, detalles y legales renderizados. Los nombres hash
  evitan convertir slugs en rutas arbitrarias del sistema de archivos.
- `dist/seo/private.html`: shell noindex del CRM/login/checkout sin datos de sesión.
- `dist/seo/404.html`: página de error existente, noindex, servida con HTTP 404.
- `dist/seo/template.html`: template original, solo para SSR/preview opcionales.
- `dist/seo/apache.conf`: bloque de reglas generado para esas rutas.
- `dist/seo/.htaccess`: protege accesos directos a los artefactos internos y
  reemplaza el fallback SPA que builds SSR anteriores copiaban a esa carpeta.
- `dist/seo/routes.json`: inventario de rutas y fecha de generación para QA.

El build consulta exclusivamente el catálogo público sin cookies ni credenciales.
Si falla la enumeración del sitemap o una página pública no puede renderizarse,
el build falla: no despliega un sitemap parcial ni inventa productos. Un catálogo
vacío legítimo genera Home/tienda/legales y ningún producto ficticio.

Los snapshots tienen la fecha del build. Cambios de publicación, nombres o slugs
requieren repetir build/deploy para actualizar el HTML SEO y sitemap. No se afirma
que un snapshot sea SSR por petición. La marca `prerendered` permite hidratar el
HTML exacto y consultar después la API para actualizar el catálogo/precio/stock;
las validaciones comerciales del backend permanecen vigentes. Un producto nuevo
no tiene ruta pública prerenderizada hasta el siguiente build/deploy.

Los filtros arbitrarios de tienda/vehículo no generan URLs en el sitemap. Apache
sirve para esas consultas un shell con metadata `noindex, follow`, canonical base
y sin un bootstrap del catálogo equivocado; se conserva el flujo cliente/API
actual. Las consultas que solo contienen atribución `utm_*`, `gclid`, `fbclid` o
`msclkid` conservan el snapshot canónico. No se incorporan parámetros a canonical.

## Deploy y reglas del servidor

El workflow sigue construyendo con `PUBLIC_SITE_URL` y `VITE_API_BASE_URL` en
`https://upgradecolombia.com`. Copia los artefactos SEO además de los PWA existentes.
No reemplaza el puente `laravel-api.php`.

Después de copiar, el instalador CLI `scripts/install-seo-routing.php` inserta o
actualiza únicamente el bloque delimitado `UPGRADE79 PUBLIC SEO` en el `.htaccess`
existente. Conserva sus otras reglas y hace un backup fuera de `public_html` antes
de reemplazarlo de forma atómica. Repetir la instalación no duplica bloques. El
instalador rechaza peticiones web y configuraciones con marcadores ambiguos.

Vite copia `public/` solo en el build cliente; el build SSR ya no duplica su
`.htaccess`, iconos ni SW dentro de `seo/`. El guard de esa carpeta se publica
también para sustituir copias antiguas en despliegues incrementales.

Las reglas generadas:

- conservan 301 de `www` al mismo path/query sin www;
- sirven las rutas públicas desde los archivos renderizados;
- dejan `/api` y `/sanctum` al puente existente, sin fallback SEO;
- conservan archivos reales, manifest, SW, iconos y assets;
- sirven rutas cliente privadas con metadata noindex;
- devuelven 404 público real para rutas inexistentes;
- impiden indexar/acceder directamente a los templates y snapshots internos;
- declaran MIME de texto/XML y revalidación del SW.

Requiere reglas `.htaccess` permitidas y `mod_rewrite` en Apache 2.4 o compatibilidad
equivalente del servidor. El instalador usa el PHP CLI ya disponible en el deploy;
**no hay nuevo servicio PHP o Node en ejecución permanente**. Las verificaciones
HTTP del workflow fallan si el servidor continúa entregando el shell incorrecto.

Los archivos nuevos de scripts/tests/documentación deben incluirse en el próximo
commit junto con los cambios de fuentes y workflow. No se hizo commit/push/deploy.

La inspección de producción detectó además **Hostinger CDN (`server: hcdn`) con
respuestas antiguas `HIT`** para robots. Un request `Cache-Control: no-cache`
obtuvo `MISS`. No hay integración de purga CDN en el repositorio: después de
publicar, invalidar la caché de esas URLs desde hPanel si las peticiones canónicas
siguen devolviendo el shell viejo. Las comprobaciones del workflow usan las URLs
reales sin cache-busting y detectan ese estado; no se presenta un request con
parámetros o un servidor local como prueba de que la caché pública ya se renovó.

## Verificación local

```bash
NODE_OPTIONS=--max-old-space-size=512 node --test --test-concurrency=1 tests/*.test.mjs
VITE_API_BASE_URL=https://upgradecolombia.com PUBLIC_SITE_URL=https://upgradecolombia.com npm run build
```

`scripts/verify-static-seo.mjs` prueba los artefactos con Apache real aislado,
incluyendo MIME, Home/tienda/legales, rutas de producto si existen, privados,
404, consultas, puente API y redirección www. Variables opcionales:
`APACHE_BINARY`, `APACHE_MODULE_DIR`, y `LD_LIBRARY_PATH` si se usan paquetes
extraídos en un directorio temporal. No modifica servicios del sistema.

`npm run preview` y `npm start` siguen ejecutando SSR por petición sobre el template
separado. La comprobación Apache es necesaria para no confundir esos entornos
con un hosting estático. La prueba PWA existente se ejecuta contra el servidor SSR
y usa proveedor/API simulados; no prueba entrega de Push a un dispositivo físico.

## Resultado local de la revisión (2026-10-27)

- Suite completa: **81/81 PASS**, incluidos 25 tests SEO y 8 PWA. Se ejecutó en
  secuencial y con memoria acotada por limitaciones del equipo; los intentos
  iniciales tuvieron timeouts del transporte Vite. No se omitieron aserciones.
- Build cliente, build SSR y prerender: correctos con el dominio de producción.
  Home generada: 33.402 bytes, un H1, canonical correcto, sin root vacío ni marcador.
- Apache real aislado + Chrome: **20 comprobaciones correctas**, desktop/móvil,
  hidratación y filtros, SW activo, robots texto/XML sitemap, privados, 404,
  puente API (sentinela de QA, no backend real) y www 301. Sin errores React.
- QA PWA existente: **19 comprobaciones**, cero errores de página; API/proveedor
  simulados, SW real. No se afirma entrega física de Push.
- La API pública consultada devolvió un catálogo vacío legítimo. Los artefactos
  incluyen cuatro páginas públicas; el detalle de producto se prueba con fixtures,
  sin publicar productos ficticios. Un fallo de API sí detiene el build.
- Sintaxis YAML/Bash del workflow y PHP del instalador correctas. No se ejecutó
  el workflow, instaló infraestructura en producción ni hizo commit/push/deploy.

## Comandos posteriores al deploy

```bash
curl -I https://upgradecolombia.com/robots.txt
curl -sS https://upgradecolombia.com/robots.txt
curl -I https://upgradecolombia.com/sitemap.xml
curl -sS https://upgradecolombia.com/sitemap.xml
curl -sS https://upgradecolombia.com/ | grep -Eo '<title>[^<]*|<meta[^>]+|<link[^>]+canonical[^>]*|<h1[^>]*>'
curl -sS https://upgradecolombia.com/ | grep -F '<!--seo-head-->' # no debe encontrarlo
curl -I 'https://www.upgradecolombia.com/tienda?utm_source=qa'
curl -I https://upgradecolombia.com/__seo-missing__
curl -I https://upgradecolombia.com/crm
curl -I -H 'Accept: application/json' https://upgradecolombia.com/api/auth/me
curl -I https://upgradecolombia.com/sw.js
```

Esperado: robots 200 texto; sitemap 200 XML; Home con metadata/H1 y canonical
`https://upgradecolombia.com/`; www 301 al equivalente sin www; inexistente 404;
CRM noindex; API sin sesión 401; SW 200 JavaScript. Verificar también `/tienda`,
ambas rutas legales y un slug real obtenido del sitemap. Si el catálogo público
está vacío, no inventar un slug para presentar un detalle inexistente como 200.
