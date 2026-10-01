# SEO de Upgrade La 79

FINAL-PRODUCT-01B · Validación local: 1 de octubre de 2026. Dominio confirmado por el propietario: **https://upgradecolombia.com**, todavía sin despliegue. Esta documentación no certifica indexación ni rendimiento productivos.

## Qué páginas indexamos

| Ruta | Clasificación | Sitemap | Canonical | Criterio |
| --- | --- | --- | --- | --- |
| `/` | INDEX | Sí | Dominio + `/` | Home y contenido público real |
| `/tienda` | INDEX | Sí | Dominio + `/tienda` | Catálogo público, por defecto con stock |
| `/tienda/:slug` | CONDITIONAL | Sí, si elegible | Dominio + slug existente | Producto activo, visible y con imagen pública |
| Categorías públicas independientes | N/A | No | N/A | No existe una ruta de categoría pública; sólo filtros de Tienda |
| Home/Tienda/producto con tracking | INDEX si la página es válida | Sólo URL limpia | Sin parámetros | UTM y tracking no crean contenido nuevo |
| Tienda con parámetros distintos de tracking | NOINDEX, FOLLOW | No | `/tienda` | Evitar URLs auxiliares/duplicadas |

No se crean páginas vacías para categorías, marcas o vehículos. Los agotados publicados conservan su página y pueden indexarse. Los slugs existentes no se modifican.

## Qué páginas no indexamos

| Ruta | Clasificación | Tratamiento inicial |
| --- | --- | --- |
| `/crm`, `/crm/*`, `/admin`, `/admin/*` | PRIVATE / NOINDEX | Shell sin datos de usuario; meta y `X-Robots-Tag: noindex, nofollow` |
| `/login` | NOINDEX | Shell privado |
| `/carrito`, `/checkout` | PRIVATE / NOINDEX | Sin carrito, cliente ni dirección en HTML inicial |
| `/checkout/payment/return`, `/orden-confirmada` | PRIVATE / NOINDEX | Sin orden, tokens, transacciones ni resultado de pago serializados |
| Producto oculto/inactivo/inexistente | NOINDEX | HTTP 404, sin Product JSON-LD |
| Ruta pública inexistente, segmentos extra o slug mal codificado | NOINDEX | HTTP 404; no muestra Home |
| API pública inaccesible | NOINDEX temporal | HTTP 503 y `Retry-After: 60`; no inventa catálogo vacío |

Las páginas privadas no tienen canonical, `og:url`, imágenes de pedidos ni JSON-LD comercial. Su Open Graph/Twitter usa texto genérico, nunca valores de la URL. No se serializa bootstrap en rutas privadas o respuestas de error. Los permisos, sesiones y autorizaciones siguen en la aplicación/API existentes; noindex **no es un control de acceso**.

## Titles

- Home: `UP GRADE 79 | Personalización automotriz en Barranquilla`.
- Shop: `Tienda de artículos automotrices | UP GRADE 79`.
- Producto: nombre público real + ` | UP GRADE 79`.
- Categoría independiente: N/A; no se inventa una landing ni jerarquía.
- Privadas: título genérico en respuesta inicial; el CRM conserva sus títulos funcionales al cargar.

Se entrega un único `<title>` inicial. La actualización cliente utiliza la misma lógica, sin duplicar tags.

## Meta descriptions

Home describe tecnología, diseño y transformación automotriz en Barranquilla. Tienda describe filtros reales, COP y disponibilidad en la red.

Producto utiliza la descripción pública, normalizada a texto; si falta, combina exclusivamente nombre, categoría, marca real y compatibilidad universal cuando el dato existe. La meta se limita a 170 caracteres. No agrega garantías, descuentos, años, marcas, instalación o atributos no registrados.

## Canonical

Una sola configuración: `PUBLIC_SITE_URL`, leída por `scripts/public-seo-plugin.mjs` y compilada como constante para cliente/servidor. Valor por defecto confirmado: `https://upgradecolombia.com`. `.env.example` muestra esa configuración y la variable de API ya existente.

El origen debe ser HTTPS, sin credenciales, rutas, query ni fragmentos; sólo QA loopback admite HTTP. Nunca se calcula desde Host, headers del proxy o tokens. No incluir UTMs, búsquedas, IDs de orden ni parámetros de pago.

`npm start` rechaza un dominio/API de entorno distinto al build: reconstruir antes de cambiar el destino. SSR y cliente deben usar el mismo catálogo. El URL local donde corre QA no reemplaza el canonical productivo confirmado.

## robots.txt

`/robots.txt` es una respuesta dinámica del servidor SEO:

```text
User-agent: *
Allow: /
Disallow: /api/
Sitemap: https://upgradecolombia.com/sitemap.xml
```

El Sitemap cambia con `PUBLIC_SITE_URL`. Se permite leer las páginas privadas para que el crawler pueda observar su noindex inicial; no se usa Disallow como sustituto de noindex. La protección de datos sigue siendo autenticación/autorización. Si la API vive en otro origen, sus reglas de crawling deben configurarse también allí.

## sitemap.xml

`/sitemap.xml` consulta exclusivamente `/api/products?in_stock=0` de la API pública en cada petición, sin cookies, Authorization ni parámetros del visitante. Incluye Home, Tienda y productos activos/visibles con imagen pública, incluidos agotados. Excluye privadas, filtros, productos ocultos/inactivos y rutas inventadas.

No hay lista manual por producto, snapshot fijo ni regeneración por cada publicación. Cambiar/publicar un producto se refleja en peticiones nuevas. Las pruebas verifican ese comportamiento con cambios de respuesta pública controlados. La API actual no expone un lastmod fiable: se omite, no se inventa.

En QA real: 8 URLs = Home + Tienda + 6 productos publicados; las 6 filas ocultas no aparecen. Error upstream: 503, nunca un sitemap aparentemente válido pero incompleto. No hay cache de HTML/sitemap que mantenga publicaciones antiguas en esta implementación.

## Productos

El renderer consulta `/api/products/:slug`, conserva slugs y aplica visibilidad pública. El contenido inicial incluye nombre, precio, disponibilidad de red, imagen, descripción y, cuando existen, SKU, categoría, marca, especificaciones y compatibilidad vehicular. Las opciones de versiones muestran sus nombres, precios y disponibilidad reales.

El cliente recibe solamente el recurso público y luego lo refresca con la API existente. Selección de variante, carrito y checkout conservan sus reglas; el HTML SEO no autoriza ventas, reserva inventario ni confirma pagos. Un 404 de la API no se confunde en metadata con un error temporal de red/servidor.

## Structured data

JSON-LD se entrega en el HTML inicial, con JSON escapado para impedir cierre/inyección de `<script>`.

| Tipo | Contenido real |
| --- | --- |
| Organization | Nombre, dominio, logo público, teléfono e Instagram ya configurados en `src/data/brand.ts` |
| WebSite | Nombre, URL e idioma `es-CO` |
| BreadcrumbList | Inicio → Tienda → Producto; sin categoría ficticia entre pasos |
| Product | Nombre, descripción, URL, galería, SKU y marca sólo si existen |
| Offer | Precio público numérico, COP, URL canónica e InStock/OutOfStock según stock público |

En versiones se emite una Offer por versión activa/visible, con su propio precio y stock; no se reemplaza por el precio o stock administrativo del padre. No se crean URLs individuales de variante ni ProductGroup con atributos inventados. La selección sigue en la misma URL del producto.

No se incluyen reviews, aggregateRating, GTIN, manufacturer, descuentos, shippingDetails, garantías ni priceValidUntil sin datos reales. No se atribuye la marca del vehículo al fabricante del producto.

SearchAction **no incluido**: la búsqueda actual funciona en estado de interfaz y no ofrece una URL persistente que represente esa búsqueda. Declarar un target inexistente sería engañoso. Si se incorpora búsqueda por URL, actualizar primero SSR/cliente y después el schema.

Referencias oficiales: [Product snippets de Google](https://developers.google.com/search/docs/appearance/structured-data/product-snippet), [SEO para JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics). Las pruebas locales de estructura no sustituyen Rich Results Test ni garantizan rich results.

## Open Graph

Title, description, type, site_name, locale y URL limpia iniciales. Home/Shop usan el logo real del sitio; Producto usa la principal proporcionada por la API. Una miniatura seleccionada no redefine la principal del producto para previews.

En QA las imágenes de productos apuntan a la API local y no pueden validarse con un crawler externo. Antes de desplegar, configurar API/medios HTTPS públicos y comprobar que los URLs devueltos por la API sean accesibles sin sesión. No sustituirlos por imágenes o dominios ficticios.

## Twitter/X

Title, description e imagen/alt en HTML inicial. Home/Shop usan `summary`, adecuado al logo cuadrado real de 150 × 150; Producto usa `summary_large_image`. No se inventa una cuenta Twitter. Calidad/tamaño de fotos comerciales y previews deben verificarse con el catálogo y dominio reales después de desplegar.

## Imágenes

- Principal: `image_url` del recurso público, no la primera posición de la galería. Eager, prioridad alta, decoding async y caja con aspect-ratio/object-fit contain; no se inventan dimensiones naturales de productos.
- Galería: miniaturas con alt descriptivo, lazy/async; JSON-LD contiene URLs únicas con principal primero. Caso QA: principal en sort_order=1 validada frente a miniatura sort_order=0.
- Cards: nombres reales como alt y cajas ya existentes con aspect-ratio; primeras cards de Shop eager, restantes lazy. Marcas secundarias ahora lazy.
- Logo del header: dimensiones naturales 150 × 150 y decoding async.
- Porsche: PNG original conservado; derivado WebP lossless utilizado en Home, de 1.571.451 a 1.302.608 bytes (17,1% menos). Comparación RGBA decodificada: alfa idéntico, cero diferencias en colores de píxeles visibles; el encoder descarta RGB de píxeles totalmente transparentes. No se redibuja ni cambia la marca.

Pendientes de optimización visual evaluada: hero MP4 4,48 MB, Atelier MP4 10,59 MB y logo HQ 2,16 MB. Se conserva calidad; no se promete que `preload=metadata` impida descargar un video autoplay. El logo HQ no se solicita por el splash cuando la Home llega con bootstrap SSR.

## SPA / prerender strategy

Arquitectura elegida: React + Vite existentes, con rendering público dinámico en servidor Node nativo. Sin Next.js, nueva librería SEO, dependencia pesada o cambio de backend.

`src/seo/entry-server.tsx` usa `renderToString` de los **mismos componentes** Home/Shop/Product/Layout. `index.html` es un template; el renderer inserta metadata y contenido antes de responder. No usa detección de bot: humanos, crawlers y previews reciben el mismo HTML. Las privadas permanecen SPA y sólo reciben un shell genérico.

Cliente: se mantiene `createRoot`; no se afirma que exista hydrateRoot. Reemplaza el árbol inicial y añade interacción usando los datos públicos iniciales; después refresca con la API. El carrito del servidor siempre es vacío y nunca serializa almacenamiento de una sesión.

Sin JS se pueden leer y navegar Home → Tienda → Producto. El fallback noscript hace visibles textos/cards animados y muestra contacto directo; oculta el agendador interactivo, evitando un submit nativo de datos personales. Filtrar, usar galería interactiva, carrito, CRM y pagos requieren JS, como antes.

Dev: middleware Vite renderiza respuestas iniciales. Preview: usa el renderer compilado. Runtime de despliegue: `npm start` ejecuta `scripts/seo-server.mjs`; soporta GET/HEAD, gzip, assets con cache por hash y rangos de video. No publica `/dist/seo` como archivos estáticos ni sirve código/configuración del repositorio.

**Requiere hosting con proceso Node o una adaptación equivalente aprobada. Subir sólo dist a un hosting SPA estático no implementa esta estrategia SEO.** No se sabe todavía qué hosting productivo se usará; no se desplegó nada en esta fase.

Build: `npm run build` genera cliente y `dist/seo/entry-server.js`. Definir `PUBLIC_SITE_URL` y `VITE_API_BASE_URL` real antes de construir; no desplegar el build/dataset QA. El runtime usa dependencias de producción del proyecto. Node probado localmente: 24.11.1.

Tras construir, iniciar `npm start`; HOST por defecto loopback y PORT por defecto 4173, configurables para el reverse proxy. Debe resolver HTTPS y enrutar al backend Laravel `/api/*`, `/sanctum/*` y `/storage/*` cuando se usa el mismo dominio. Si la API usa otro origen, configurar CORS/sesión/medios en ese origen. No cambiar esas reglas automáticamente desde este frontend.

No aplicar un fallback indiscriminado de cualquier ruta a index.html. Desplegar el template, assets y renderer de la misma versión. `dist` está históricamente parcialmente versionado y también ignorado: el build local es coherente, pero los hashes nuevos y renderer ignorados no entrarán solos en un futuro commit. Preferir un artefacto reproducible generado por el pipeline; no asumir que git status vacío representa el paquete desplegable.

Referencia técnica: [SSR de Vite](https://vite.dev/guide/ssr.html). Se utiliza su build SSR y loaders locales, no una migración de framework.

## Cómo añadir una nueva página pública

1. Confirmar que es contenido verdaderamente público y definir su intención, URL estable y datos permitidos.
2. Añadir ruta/componentes a cliente y renderer; definir clasificación en `createSeo` y canonical limpio.
3. Si indexable, incluirla en sitemap por una fuente mantenible, no un listado duplicado/manual de entidades.
4. Añadir pruebas: HTML inicial sin JS, H1, metadata, HTTP correcto, datos reales y exclusión de privadas.
5. Validar navegación real, mobile y regresiones antes de publicar. Nunca declarar PASS por cambiar document.title únicamente.

## Cómo agregar un nuevo tipo de contenido SEO

Definir antes contrato público y disponibilidad de datos. Añadir schema soportado sólo con información verificable; omitir campos ausentes. Compartir modelo entre servidor y cliente, escapar JSON/HTML y probar que no se filtren datos privados. No añadir ratings o SearchAction sin implementar su fuente/flujo real.

## Cómo comprobar SEO después de desplegar

Con dominio/API reales, inspeccionar la respuesta HTTP **sin ejecutar JS**: title, description, canonical, robots/header, OG, Twitter, JSON-LD, H1 y contenido del producto. Comprobar por separado DOM con JS y navegación real. Probar un producto nuevo, actualizado, agotado y oculto, además de error temporal de API y URL inexistente.

Herramientas externas y previews todavía **PENDING EXTERNAL**. No se registraron cuentas ni se enviaron sitemaps.

- [ ] Dominio HTTPS funcionando.
- [ ] Hosting Node/equivalente confirmado y reverse proxy configurado.
- [ ] Build con dominio/API reales; no QA ni medios loopback.
- [ ] Canonical usa dominio productivo.
- [ ] robots.txt accesible.
- [ ] sitemap.xml accesible y actualizado.
- [ ] Sitemap enviado a Google Search Console.
- [ ] Sitemap enviado a Bing Webmaster Tools.
- [ ] Rich Results Test Product.
- [ ] URL Inspection Home.
- [ ] URL Inspection Shop.
- [ ] URL Inspection Product.
- [ ] PageSpeed Insights y medición con fuentes/red productivas.
- [ ] Open Graph preview.
- [ ] Twitter/X preview.
- [ ] 404 real, no fallback Home.
- [ ] Noindex inicial + header en CRM/Admin.
- [ ] Private routes fuera del sitemap.
- [ ] API, autenticación y medios HTTPS mantienen contratos/aislamiento existentes.

### Evidencia y validación local

HTML sin JS: Home, Shop y productos PASS; categorías independientes N/A. Se comprobaron 22 casos HTTP finales, incluidos oculto, inexistente, ruta extra, slug inválido, tracking, parámetros auxiliares y siete familias privadas. HEAD devuelve cuerpo vacío y POST al frontend devuelve 405. Sitemap real: 8 URLs. No se encontraron tokens, costos, credenciales ni datos de cliente en esas respuestas.

Chrome real sin JS: 16 combinaciones Home/Shop/producto simple/galería × 360/390/430/768, sin overflow. Navegación no-JS Home → Shop → Producto, cards/contacto visibles y precio real, también comprobada en build final.

Smoke con JS: navegación, búsqueda, categoría, filtro stock, variante/precio, agregar y vaciar carrito, entrada a checkout, shipping/pickup y contacto sin submit; login QA, dashboard, catálogo publicado, inventario, abrir formulario y Escape/focus return. No se prepararon órdenes, cobraron pagos, publicaron productos ni modificaron existencias. El contexto financiero completo de 01A se conserva, no se repite.

Se detectó fricción UX preexistente a 768 px: header fijo tapa el enlace «Volver al carrito» en checkout (bottom header 209 px; enlace ~137–155 px). Quitar los atributos nuevos del logo no cambia la geometría: no es regresión de dimensiones SEO. El enlace de carrito del header permite volver. Registrar ajuste de header/espaciado para una fase UX separada, no rediseñarlo aquí.

Evidencia incremental privada del harness existente: `qa-harness/evidence-01a`, entradas SEO 287–311 y PNG no-JS. La entrada 310 verifica error 503 cliente controlado, noindex temporal, recuperación y galería en los cuatro anchos; la 311 verifica otra vez el HTML/HTTP del hash final. No se copian sesiones, tokens ni archivos del harness al producto.

Frontend: typecheck/build PASS; 16 tests PASS (12 SEO y 4 presentación de pagos existentes); npm audit full y omit=dev, 0 vulnerabilidades; git diff --check PASS. No nuevas dependencias ni cambio de lockfile.

Backend: sin cambios de esta fase; dirty baseline preservada. composer validate --strict, audit --locked y Pint --test PASS, 0 advisories/abandoned; diff check PASS. La suite completa conservada de 01A fue 672 tests / 5852 assertions PASS; no se declara como reejecución de esta fase. SQL/fixture confirmó `upgrade_ux_qa`; no seed, migración ni escritura de inventario.

Bundle público final: 511,35 kB / 165,39 kB gzip frente a 994,26 / 278,61 kB previos (−48,6% bruto, −40,6% gzip). CSS inicial 75,32 / 14,97 kB gzip. CRM/Admin y rutas transaccionales se cargan bajo demanda, sin cambiar permisos. Permanece warning >500 kB; no se oculta ni se convierte automáticamente en blocker. Se comprobaron 143 assets y 437 referencias locales sin faltantes.

Muestra local representativa a 390 px, Chrome headless, loopback, sin throttling y fuentes externas bloqueadas: LCP Shop ~700 ms, Producto ~904 ms; Home no reportó candidato en dos ventanas de observación, por lo que no se publica un valor. CLS observado 0 en las ventanas cortas. Event Timing de teclado en búsqueda: 16–24 ms; **no es un INP de campo ni un score Lighthouse**. Medición productiva pendiente; esos números no garantizan rendimiento real. El bundle sólo requiere el entry público durante esas navegaciones, no páginas administrativas.

Resultado local: **PASS — PUBLIC SEO FOUNDATION COMPLETE**. Deployment/indexación/previews externos pendientes; no implica que el dominio ya esté desplegado. NO commit, NO push, sin cambios de roles/reglas/stock/proveedores. FINAL-PRODUCT-01C no iniciado.
