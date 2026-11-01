# Productos públicos dinámicos — corrección local

## Causa y solución

`scripts/prerender.mjs` generaba un bloque Apache con rutas exactas para los productos
del build, sitemap estático y un 404 final. Un producto posterior existía en Laravel,
pero Apache no dejaba llegar su URL a la aplicación.

Ahora TODAS las fichas `/tienda/:slug` y `/sitemap.xml` pasan al puente existente
`laravel-api.php` antes de los snapshots y del control de archivos estáticos. Se conserva
el bootstrap del puente; el instalador amplía únicamente su guard URI reconocido para
admitir fichas y sitemap además de API/Sanctum. No se instala Node en Hostinger. Inicio, tienda, legales y páginas
privadas conservan su mecanismo existente. API, Sanctum, imágenes, SW y assets no cambian.

Laravel incorpora `PublicCatalogController`, `PublicCatalogPage`, dos vistas y
`config/public_catalog.php`. Reutiliza los métodos/recursos públicos de ProductController:
misma visibilidad, precios, variantes, stock y filtros OEM, sin datos administrativos.

- Producto activo y publicado: 200 con HTML, H1, precio público, canonical, OG,
  Twitter y JSON-LD. Los slugs nuevos no dependen del build.
- Snapshot existente: solo se reutiliza tras consultar Laravel y comprobar que su
  payload público coincide exactamente con los datos actuales. Cambios de precio,
  imágenes, stock o visibilidad no quedan escondidos por un snapshot antiguo.
- Oculto, inactivo o inexistente: 404 real, sin Product/canonical ni datos del producto.
- Fallo de consulta o template ausente: 503 recuperable, nunca un 200 vacío.
- Sitemap: consulta actual, agotados incluidos, sin ocultos/inactivos ni lastmod inventado.
  Se mantiene la política SEO de excluir productos históricos sin imágenes: su ficha
  sigue siendo legible (200/noindex), no se confunde con un producto inexistente.

PHP usa el template del mismo build React. El HTML PHP nuevo se marca con
`renderMode: client`: React monta su ficha interactiva con el payload público recibido,
sin hidratar un árbol PHP como si fuese SSR React. Los snapshots React conservan
su hidratación habitual. No cambian carrito, checkout, inventario, Wompi ni permisos.

## Publicación posterior (NO ejecutada)

Publicar backend y frontend coordinadamente, backend primero. El commit backend
aprobado para esta preparación es `b807c6b63edede28f7b88ea6dfa6f4c0a489b21e`;
`.github/required-backend-sha` contiene ese SHA exacto. El frontend exige tanto HEAD
remoto coincidente como su marca de despliegue completado antes de publicar.
Los commits anteriores ya están en GitHub (backend e7d256d, frontend 9e69f31).
Según la verificación comunicada por el operador, Hostinger está en 88/88 migraciones;
esta corrección no incorpora migraciones adicionales ni debe ejecutarlas.

El nuevo config usa por defecto `base_path('../../upgradecolombia.com/public_html')`,
que corresponde al layout Hostinger ya identificado. Si la instalación cambia de ruta,
`PUBLIC_CATALOG_FRONTEND_PATH` permite indicar privadamente la ruta absoluta correcta.
Debe existir y ser legible `seo/template.html` del build frontend. El flujo habitual
reconstruye config/view cache e instala el bloque desde `seo/apache.conf` con el
instalador existente (respalda y conserva el resto del .htaccess).

No migraciones, claves nuevas, cron, regeneración por producto ni dependencias nuevas.
No copiar artefactos de QA a producción. El build de validación y capturas están en
`/tmp/upgrade79-dynamic-http`, fuera del dist existente del usuario.

Comprobaciones de solo lectura DESPUÉS de un futuro deploy autorizado:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://upgradecolombia.com/tienda/camara-360-cinammon
curl -sS https://upgradecolombia.com/tienda/camara-360-cinammon | rg '<title>|canonical|og:|application/ld\+json|<h1'
curl -sS https://upgradecolombia.com/sitemap.xml | rg 'camara-360-cinammon'
curl -sS -o /dev/null -w '%{http_code}\n' https://upgradecolombia.com/tienda/qa-slug-inexistente-404
curl -sS -o /dev/null -w '%{http_code}\n' https://upgradecolombia.com/api/products/camara-360-cinammon
```

Esperado: 200, SEO de cámara en HTML, URL en XML, 404 y 200 respectivamente.

## Validación local

- Pruebas específicas PHP: `DB_USERNAME=root DB_PASSWORD= php vendor/bin/phpunit --filter PublicCatalogRuntimeTest`
  solo con MySQL XAMPP local y guardas efectivas `testing / upgrade_test`.
  Usa DatabaseTransactions, no RefreshDatabase ni migraciones.
- Frontend: `npm test`, `npx tsc -b`.
- Build cliente/SSR: modo producción y API/canónico `https://upgradecolombia.com`.
  Prerender contra catálogo QA aislado; no contra datos comerciales.
- `scripts/verify-static-seo.mjs`: Apache real aislado verifica que fichas antiguas,
  nuevas, inexistentes y sitemap llegan al puente; no simula sus respuestas SEO.
- `scripts/verify-dynamic-catalog.mjs`: HTTP real Laravel/MySQL y Chrome. Compara un
  producto incluido en el build y otro creado después, 404 oculto/inexistente,
  actualización de sitemap/precio, siete anchos y navegación carrito → checkout.
  Las lecturas API del bundle productivo se redirigen al backend QA, nunca a producción.
- El router de fixtures `backendupgrade/tests/fixtures/public-catalog-router.php`
  solo acepta CLI-server, loopback y upgrade_test verificado. Revierte las fixtures
  en CADA petición; rechaza escrituras HTTP y evita correo/proveedores externos.

El conjunto ampliado de regresión cubre configurador, órdenes/pagos, documentos,
comisiones y permisos. Una primera ejecución tuvo una prueba de rate limit de correo
intermitente bajo carga; pasó aislada y en la repetición del conjunto. No se cambió
esa prueba ni el módulo de correo.

Resultados finales: 55/55 backend (672 aserciones), incluyendo 9/9 específicas
(96 aserciones); 43/43 unitarias backend (80 aserciones); 181/181 frontend;
TypeScript y Pint PASS. Build cliente/SSR y prerender de 35 páginas PASS.
Apache aislado: 51 comprobaciones PASS. Chrome: 1440, 1280, 1024, 768, 430, 390,
360 px sin overflow ni errores de Hooks/hidratación. Cero escrituras HTTP de compra.
SQL posterior: cero productos/sedes persistidos por las fixtures del router.
SW fuente y build coinciden: 43338314702133f01e4df46edf0e9640229a0da55f593d0773104e6bcbfa3482.

No se modificaron Hostinger, producción, bases comerciales, .env privados ni el SW.
La implementación inicial y su preparación no ejecutaron push/deploy. Posteriormente,
el operador publicó backend y frontend; el último quedó parcialmente instalado antes
del fallo descrito a continuación. La corrección del guard sigue SOLO en local.

## Corrección del guard confirmada después del deploy

El operador confirmó que el puente existente contiene este rechazo previo a Laravel:
`if (!preg_match('#^/(api|sanctum)(/|$)#', $uri)) { http_response_code(404); exit; }`.
Las reglas Apache llegaban al PHP, pero ese guard devolvía 404 vacío para las rutas nuevas.
El fallo de Actions fue en sitemap.xml; robots.txt respondía 200. La publicación ya
había copiado assets, HTML y reglas: no era una transacción revertida automáticamente.

Se verificó por HTTP que el backend b807c6b publicado sirve la ficha (200, HTML/SEO),
sitemap (200 XML) y slug inexistente (404) desde su dominio directo. No hace falta otro
release backend ni migraciones: `.github/required-backend-sha` permanece en b807c6b.

La corrección pendiente afecta SOLO al frontend:

- `scripts/install-seo-routing.php`: reconoce el guard mediante tokens PHP (no comentarios),
  valida sintaxis y sustituye solo el literal regex. Conserva el resto del puente y su
  modo de archivo; respaldo 600 y temporal fuera de public_html, reemplazo atómico.
  Si hay un guard desconocido/ambiguo, falla sin modificar archivos. Es idempotente,
  incluso si las reglas SEO ya fueron instaladas por la ejecución parcialmente fallida.
- `.github/workflows/deploy.yml`: check-only con el instalador candidato ANTES de copiar
  archivos. Conserva push automático, bloqueo, verificaciones HTTP y respaldos. Explicita
  en el log las URLs robots/sitemap comprobadas. No convierte 404 en 200.
- `tests/seo-bridge.test.mjs`: reproduce el puente estricto mediante un PHP HTTP aislado,
  prueba ampliación limitada, 404 real de aplicación, consultas OEM, backup/idempotencia,
  publicación parcial, check-only y rechazo seguro de guards desconocidos.
- `tests/seo-prerender.test.mjs`: usa el guard real confirmado, no un placeholder permisivo.

Para publicar DESPUÉS de autorización, desde upgrade79-web:

```bash
git add scripts/install-seo-routing.php .github/workflows/deploy.yml \
  tests/seo-bridge.test.mjs tests/seo-prerender.test.mjs DYNAMIC_PRODUCT_ROUTES.md
git diff --cached --check
git commit -m "fix: extend Hostinger bridge guard for dynamic product SEO"
git push origin main
```

No se ejecutaron esos comandos durante esta corrección. No repetir deploy backend ni
restaurar automáticamente el frontend anterior. Conservar los respaldos ya existentes.
Tras Actions PASS, comprobar los HTTP de cámara, inexistente y sitemap indicados arriba.
