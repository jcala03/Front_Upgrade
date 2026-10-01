# Validación Final — Upgrade La 79

FINAL-PRODUCT-01E · 2026-10-01 · America/Bogota. **PASS — FINAL CROSS-VALIDATION COMPLETE**, exclusivamente local. Preparado para revisión Git / release checkpoint, no para publicar este build QA directamente.

## Estado funcional

Se reutilizó el cierre de [01A](functional-walkthrough.md) y su [inventario](screen-inventory.md), sin reiniciar el walkthrough, reconstruir harness ni ejecutar nuevamente sus operaciones comerciales. Esta fase cruza evidencia reciente, UI/copy actual, contratos y pruebas; añade smoke HTTP inicial, validación de migraciones en test y validaciones completas de herramientas.

| Medida del baseline acordado | Resultado |
|---|---|
| Pantallas canónicas ACTIVE | 41 |
| Contextos pantalla/perfil | 43 |
| VISITED / INTERACTED / escenarios primarios | 43/43 cada uno |
| Flujos conectados | 8/8 PASS |
| Permisos positivos y negativos dirigidos | PASS |
| P0 / P1 / P2 / P3 abiertos en ese alcance funcional | 0 / 0 / 0 / 0 |

No significa cobertura exhaustiva de todos los estados, endpoints o combinaciones responsive, certificación WCAG, pentest ni prueba de proveedores reales. Los PARTIAL iniciales de functional-walkthrough se conservan como **historial explícitamente sustituido por su cierre**, no como pendientes actuales. Sus referencias a fases siguientes eran futuras en ese checkpoint; este documento reúne su estado final.

### Alcance de cambios de esta fase

- Ninguna funcionalidad, endpoint, CSS, dependencia, permiso o regla de negocio modificada.
- Dos fixtures de `BranchCorePhaseOneTest` usaban 2026-10-01 14:00–15:00 UTC como futuro; al ejecutar después de ese horario dejaron de ser futuros. Se corrigieron a mañana 14:00–15:00 mediante `now()`, sin cambiar assertions ni servicio. Suite focalizada 32/32 y suite completa posterior aprobadas.
- Aclaraciones pequeñas en user-manual, admin-quick-guide y training-guide: bloqueo del cambio de sede por compromisos activos futuros; el manual distingue el marcador administrativo de conciliación de los estados financieros.
- Se generaron estos dos documentos y se reconstruyó dist para smoke local con API QA explícita. No se implementaron nuevas mejoras UX/SEO ni se reescribieron manuales.
- Sin staging, commit, push, despliegue, reseeding ni cambios al harness. La fixture temporal de migración se eliminó al devolver **sólo upgrade_test** a esquema limpio; no se borró evidencia QA.

### Working tree acumulado, no sólo cambios de 01E

Se ejecutaron `git status --short --untracked-files=all`, `git diff --stat` y `git diff --check` en ambos repos oficiales. HEAD backend `ba261e026e6e0647ce2c26a919dd04df306d8090`; frontend `14f469752b7b5f62a3195718b6554acd7e882b9d`, conservados. Índices sin staging.

B = backendupgrade; F = upgrade79-web. La notación `{a,b}` enumera los archivos respectivos; no representa archivos adicionales.

| Clasificación | Archivos acumulados | Cantidad |
|---|---|---|
| BACKEND PRODUCT | B/app/Http/Controllers/Api/ProductController.php; B/app/Http/Resources/{AdminProductResource,PublicProductResource,PublicOrderResource,ProductImageResource}.php; B/app/Models/{Order,Product,ProductImage}.php; B/app/Services/ProductImageService.php; B/database/seeders/UXOperationalQaSeeder.php | 10: 7 modificados, 3 nuevos |
| MIGRATION | B/database/migrations/2026_10_01_000001_create_product_images_table.php | 1 nuevo |
| TEST | B/tests/Feature/{BranchCorePhaseOneTest,EcommerceShippingFoundationPhaseOneTest,ProductArchitecturePhaseOneTest,ProductCommissionConfigurationPhaseFourTest,ProductGalleryTest,PublicPaymentAttemptPresentationTest}.php | 6: 4 modificados, 2 nuevos |
| FRONTEND PRODUCT | F/src/App.tsx; F/src/api/products.ts; F/src/components/layout/{Header/Header,Footer/Footer,Layout}.tsx; F/src/components/sections/FeaturedProducts/FeaturedProducts.tsx; F/src/context/CartContext.tsx; F/src/modules/crm/layout/CrmLayout.tsx; F/src/types/{branch,order,product}.ts | 11 modificados |
| FRONTEND PRODUCT | F/src/modules/admin/appointments/AdminAppointmentsPage.{tsx,css}; F/src/modules/admin/branches/AdminBranchesPage.tsx; F/src/modules/admin/inventory/AdminInventoryPage.{tsx,css}; F/src/modules/admin/inventory/product-form/{ProductForm.tsx,ProductForm.css,productFormTypes.ts,productFormUtils.ts,ProductImagesEditor.tsx}; F/src/modules/admin/orders/ServicePicker.tsx; F/src/modules/admin/products/AdminProductsPage.tsx; F/src/modules/admin/quotations/{AdminQuotationsPage.css,QuotationForm.tsx}; F/src/modules/admin/references/AdminReferencesPage.tsx | 15: 14 modificados, 1 nuevo |
| FRONTEND PRODUCT | F/src/pages/{OrderConfirmation/OrderConfirmationPage.tsx,PaymentReturn/PaymentReturnPage.tsx,ProductDetail/ProductDetailPage.tsx,ProductDetail/ProductDetailPage.css,Shop/ShopPage.tsx}; F/src/utils/paymentPresentation.ts | 6: 5 modificados, 1 nuevo |
| SEO | F/{index.html,package.json,tsconfig.app.json,vite.config.ts}; F/src/vite-env.d.ts; F/scripts/{public-seo-plugin.d.mts,public-seo-plugin.mjs,seo-server.mjs}; F/src/assets/brands/porsche-lossless.webp; F/src/pages/PublicNotFound.tsx; F/src/seo/{client.ts,entry-server.tsx,model.ts} | 13: 5 modificados, 8 nuevos |
| TEST | F/tests/{paymentPresentation.test.mjs,seo-render.test.mjs,seo.test.mjs} | 3 nuevos |
| DOCUMENTATION | F/docs/{screen-inventory,functional-walkthrough,seo,user-manual,roles-permissions,admin-quick-guide,collaborator-quick-guide,customer-guide,training-guide,training-script,training-checklist,training-scenarios,final-validation,release-checklist}.md | 14 nuevos respecto de HEAD |
| LOCAL CONFIG | F/.env.example, ejemplo público sin secretos | 1 nuevo |
| GENERATED DIST | F/dist/index.html; las 17 eliminaciones de hashes obsoletos enumeradas abajo | 18: 1 modificado, 17 eliminados |
| QA/TEMPORARY | Ningún archivo de esta clase agregado al working tree publicable; harness y evidencia originales externos preservados | 0 |

Total B: **17 archivos** (11 modificados, 6 nuevos). Total F: **81 archivos** (36 modificados, 28 nuevos, 17 eliminados). Frontend product suma 32; SEO 13; tests 3; docs 14; config 1; dist 18. Los nuevos assets ignorados de dist se contabilizan aparte, no desaparecen del análisis porque no salgan en status.

Eliminaciones generadas dentro de F/dist/assets: `TaskSummary-DHyI_tbf.js`, `filter-Bbi7zeOH.js`, `index-1_pi_xAx.js`, `index-BA31pJ52.css`, `index-BAI4o0oe.js`, `index-BQ5DpmTP.js`, `index-BYxWIMyd.js`, `index-Bh699F8T.js`, `index-BnCf37Ee.js`, `index-C7zF7Ae0.js`, `index-COddu3h5.js`, `index-CQhikGtY.js`, `index-DFSBXzEU.js`, `index-N5dcD0x7.js`, `index-u2hUDAMO.js`, `porsche-hrRpfelH.png`, `sliders-horizontal-CLhv0zBo.js`. Son hashes previos reemplazados por build, no borrado de fuente ni de evidencia QA.

## Estado backend

| Validación ejecutada en 01E | Resultado |
|---|---|
| composer validate --strict | PASS |
| composer audit --locked | PASS, 0 advisories |
| php artisan test, suite completa final | PASS, 672 tests / 5852 assertions / 0 failures; 134026 ms |
| vendor/bin/pint --test, posterior al ajuste de fixtures | PASS |
| git diff --check | PASS |

Primer intento: 670/672 aprobados, dos fallos por las fechas vencidas descritas arriba (no ocultados). Tras ajustar únicamente los fixtures: BranchCore 32 tests / 156 assertions / 0 failures; nueva suite **completa** 672/5852 aprobada. No se rebajaron expectativas ni se omitieron tests.

Pruebas con `APP_ENV=testing`, `DB_CONNECTION=mysql`, `DB_DATABASE=upgrade_test`, `TEST_DB_CONNECTION=mysql`, `TEST_DB_DATABASE=upgrade_test`, `MAIL_MAILER=array`. Se verificó `SELECT DATABASE() = upgrade_test`; protección de TestCase y contexto explícito revisados. Runtime local de navegador/SEO usa **upgrade_ux_qa**, nunca upgrade_test.

### Migraciones

Exclusivamente en upgrade_test, con guard de ambiente y `SELECT DATABASE()` **antes** de DDL:

1. `migrate:fresh` aprobado: instalación completa, incluida product_images.
2. Última migración verificada por nombre antes de `migrate:rollback --step=1`: galería retirada; products.main_image conservado.
3. Fixture legacy publicada con main_image no vacío: `migrate` aprobado; una imagen principal con ruta original. Segunda llamada al backfill no duplica.
4. Rollback posterior conserva la ruta legacy. El código down sólo elimina la tabla, no archivos de storage; no se crearon archivos físicos para esta prueba.
5. `migrate:fresh` final limpia únicamente la fixture test y deja **59 tablas** migradas.

`ProductGalleryTest` dentro de la suite completa verifica preflight: publicado sin main_image válido provoca rechazo sin ocultar/borrar el producto ni inventar imágenes; valida además backfill, principal única, orden y variantes. Para datos productivos existentes: reparar legítimamente antes de migrar; no saltarse preflight. `upgrade` no migrado/seeded y conserva 53 tablas; el conteo no es un checksum de sus datos. upgrade_ux_qa no recibió DDL/DML en esta fase.

Requisito de runtime según composer: PHP ^8.3, Laravel ^13.8 y extensiones locked; PHP local 8.3.6 con PDO MySQL. Confirmar plataforma real, no extrapolar disponibilidad local.

## Estado frontend

| Validación | Resultado |
|---|---|
| npm audit --omit=dev | 0 vulnerabilidades |
| npm audit | 0 vulnerabilidades |
| npx tsc -b | PASS |
| npm run build | PASS, cliente + SSR |
| node --test tests/*.test.mjs | PASS, 16 tests / 0 failures: 12 SEO y 4 presentación de pagos |
| git diff --check | PASS |

Warning conservado: chunk principal **511.35 kB / 165.38 kB gzip**, no blocker por sí solo. No upgrades ni lockfile nuevos en esta fase.

Build final usado por smoke: `PUBLIC_SITE_URL=https://upgradecolombia.com VITE_API_BASE_URL=http://127.0.0.1:8023 npm run build`. Es **artefacto QA, no release productivo**. No se modificaron archivos env: la .env.production frontend ya tracked contiene sólo VITE_API_BASE_URL público, actualmente con un origen API histórico distinto; confirmar el destino real y sobreescribirlo explícitamente al construir producción. Nunca consultar esa API para QA ni subir el bundle QA.

### Dist / política Git vigente

145 archivos generados presentes; **450 referencias locales verificadas, cero faltantes**, renderer `dist/seo/entry-server.js` presente. El build limpia/reemplaza hashes obsoletos. Dist está parcialmente tracked y simultáneamente ignorado: **121 archivos nuevos generados ignorados**, incluido el renderer, no entrarían por staging ordinario.

En el checkpoint futuro debe decidirse explícitamente: artefacto completo reproducible desde source + locks en pipeline, o inclusión deliberada de los nuevos assets/renderer generados si se mantiene publicación desde Git. En esa segunda opción **sí necesitan inclusión explícita**. No se hizo staging ni se cambió deployment; subir sólo los cambios tracked deja un paquete incompleto. Nunca mezclar index, assets y renderer de versiones distintas. Reconstruir primero con las URLs productivas aprobadas.

## Estado ecommerce

Home → Tienda → Producto → Carrito → Checkout → entrega → pago → confirmación: 8/8 flujos conectados del baseline, incluyendo recorridos CRM, no se afirman ocho compras nuevas. Shipping y pickup usan contratos actuales de preparación, dirección/tarifa o sede elegible. Total autorizado por backend; dirección editada obliga a guardar/recalcular/aplicar. Carrito y orden no son intercambiables.

Retorno PENDING mantiene incertidumbre; DECLINED muestra rechazo explícito; error de refresh conserva el rechazo; retry utiliza la misma Order sin duplicación; APPROVED/paid no equivale a completed operativo. Evidencia reciente 204–209/238 y pruebas de presentación actuales. Sin pago, envío, email ni WhatsApp real en 01E.

## Estado CRM

Catálogo, Marcas y vehículos, inventario, clientes/vehículos, ventas, cotizaciones, pagos/conciliaciones, citas/calendario, equipo y controles coinciden con procedimientos existentes. Se cruzaron nombres, ruta, acción, campos, rol y resultado; se reutiliza evidencia 01A y no se presentan lecturas de código como un nuevo walkthrough.

| Muestra crítica | Ruta / acción visible y campos clave | Perfil / resultado y evidencia |
|---|---|---|
| Crear producto | /crm/inventory → Crear producto → Guardar producto; nombre, categoría, precio, imágenes, variantes si aplica | Admin autorizado; ficha ≠ stock. ProductForm / manual §7; evidencia 200–201/246/267. PASS |
| Imágenes | Mismo formulario → Agregar imágenes / Hacer principal / orden / quitar → Guardar producto | Admin; ≥1/principal única si publicado, edición sin reupload. ProductImagesEditor / ProductGalleryTest / 248/267. PASS |
| Asignar inventario | /crm/inventory → Ajustar existencias o Guardar y asignar inventario; artículo/variante, sede, cantidad, motivo | Admin; entrada independiente, no reemplazo global. InventoryService / manual §10 / 232. PASS |
| Transferir | /crm/inventory/transfers → Nueva transferencia → Solicitar transferencia → Despachar → Confirmar recepción; origen/destino/artículo/cantidad | Admin; descuento origen y recepción destino separados. InventoryTransferService / manual §12 / flujos y 111. PASS |
| Cliente / vehículo | /crm/customers → Nuevo cliente; detalle → Agregar vehículo → Guardar vehículo; identidad/contacto, placa/modelo | Admin; historial y navegación a venta/cotización sin repetir relación. Formularios / manual §13–14 / 219–221. PASS |
| Cotización | /crm/quotations → Nueva cotización → Crear cotización; sede, cliente/vehículo, líneas, vigencia → Marcar como enviada | Admin; propuesta, no reserva ni entrega de email garantizada. QuotationForm / manual §15 / 240–245. PASS |
| Convertir | Detalle de cotización → Convertir en venta → Confirmar | Admin / propio autorizado; misma relación comercial, stock actual de sede, conversión única. OrderService / manual §15–16 / flujos comerciales. PASS |
| Registrar pago | /crm/orders, detalle → Registrar pago; método, monto, referencia/notas | Admin con permiso; abono financiero no completa automáticamente operación. OrderDetail / manual §17 / 223–224 y pruebas. PASS |
| Crear cita | /crm/appointments → Nueva cita → Crear cita; contacto/cliente, servicio, empleado, sede/contexto, fecha/hora | Admin; disponibilidad y siguiente estado. AdminAppointmentsPage / manual §20 / 252–253. PASS |
| Horario / ausencia | /crm/schedules y /crm/leaves → Guardar intervalo / Guardar ausencia; empleado, día o periodo, horas/motivo | Admin; agenda consistente. Formularios / manual §23–24 / 211–216. PASS |
| Marcas y vehículos | /crm/references, Catálogo → Marcas y vehículos; CRUD marca/modelo/generación/OEM | Admin con products.view y permisos de escritura; acceso limitado rechazado. CrmLayout / manual §8 / 182/185–208/285–286. PASS |
| Conciliación | /crm/payment-reconciliations → Ver caso → Iniciar revisión / Registrar decisión; evidencia, decisión, motivo | Admin autorizado; historial sin mutación financiera arbitraria. PaymentReconciliationPage / servicio / manual §18 / 255–256. PASS |
| Venta / cotización propia | /crm/me/sales y /crm/me/quotations; Crear venta pendiente / Crear cotización; cliente/vehículo/líneas, sede no forzable | Usuario vinculado con capabilities; venta directa propia comienza pendiente, consulta sólo propia. MyCommercialForm / My controllers / manual §32 / pruebas own y negativos. PASS |
| Checkout | /carrito → Continuar compra → /checkout → Preparar orden; contacto, shipping/pickup, dirección/tarifa o sede, resumen/pago | Público invitado; backend autoriza total y pago habilitado según entrega. CheckoutPrepare / Delivery / Quote panels / manual §36 / shipping/pickup 01A. PASS |

Las rutas de esta tabla son referencias para verificar documentación, no se usan para aprobar descubrimiento manual nuevo. Citas/tareas activas futuras deben resolverse por acciones legítimas antes de trasladar empleado de sede; no cancelar/completar falsamente para eludir la validación.

## Roles

[Roles y permisos](roles-permissions.md) coincide con App/PrivatePage, capabilities y guards/policies/controladores backend, más negativos recientes dirigidos.

- Admin: módulos administrativos según permisos; Marcas y vehículos usa products.view para entrada y permisos de catálogo para mutaciones.
- Colaborador: rol Usuario vinculado a empleado; capabilities comerciales propias, scope por empleado y sede asignada. Request prohíbe branch_id y otros campos de asignación ajena; controles de propiedad no permiten consultar ventas/cotizaciones de otro empleado (404 en scope).
- Usuario limitado: mismo rol Usuario, sin capacidades concedidas; no se amplía por enlaces directos, menú ni training. Negativos recientes 187/286 y pruebas de autorización complementan revisión.
- Público: sin CRM; smoke anónimo /api/admin/products, /api/admin/settings, /api/admin/product-brands, /api/my/sales, /api/my/quotations y /api/auth/me devolvió **401** con Accept JSON.
- No se inventa Super Admin independiente ni portal/login de comprador. Login forma parte de las ocho pantallas públicas del inventario como acceso interno, no servicio autenticado del cliente.

La matriz de menús personales no sustituye a autorización de servidor ni pretende negar todos los posibles aliases técnicos al Admin. No se reconstruyó una matriz exhaustiva de endpoints.

## Inventario

| Invariante | Evidencia cruzada actual | Resultado |
|---|---|---|
| PRODUCT ≠ STOCK | Product/ProductImageService, InventoryService; manual §3/7/10 | PASS |
| InventoryStock pertenece a Branch | InventoryStock + posiciones y locks por branch en InventoryService | PASS |
| Sin fallback automático entre sedes | OrderService / InventoryService y pruebas multibranch | PASS |
| Disponibilidad pública usa stock en red vigente | Recursos públicos / PublicProductNetworkStockTest; manual §3/36 | PASS |
| Venta valida sede asignada | OrderService, CommercialEmployeeContext y pruebas | PASS |
| Quotation ≠ Order | Servicios de cotización/conversión y manual §15–16 | PASS |
| Payment financiero ≠ Order operativo | Payment/Order, pruebas y manual §16–18 | PASS |
| Backend autoridad de totales | OrderTotalService / resolución de líneas / pruebas | PASS |
| Wompi respeta reglas stock/comisiones | WompiPaymentTransitionService y suite webhook/reservas | PASS |
| Decisión conciliación no muta dinero arbitrariamente | ReconciliationResolutionService; registro inmutable y manual §18 | PASS |
| Publicado requiere imágenes | ProductImageService validación transaccional / ProductGalleryTest | PASS |
| Publicado ≥1 y exactamente una principal | Servicio para mínimo; clave única SQL para impedir dos principales; tests | PASS |
| Galería múltiple y ordering | Recursos, editor, sort_order y pruebas de reordenar/principal | PASS |
| Imagen variante preservada | Variante separada, tests legacy/paths compartidos; manual §7 | PASS |

No atribuir a la constraint SQL el mínimo de una imagen: esa garantía la aplica el contrato transaccional de publicación. Marcador administrativo de revisión puede actualizarse al resolver conciliación, no estados financieros ni importes.

Lectura final de upgrade_ux_qa: 12 productos, 6 publicados, 11 posiciones de stock; publicados sin imágenes **0**, publicados con cantidad de principales distinta de uno **0**. Datos sintéticos. No se modifica stock para esta validación.

## Pagos

Separaciones financieras/operativas, idempotencia de pedido/intento, validación de firma y reconciliación preservadas; suite completa incluida. No se repite doble submit comercial real para obtener evidencia ya aprobada.

Resolver revisión puede limpiar/actualizar `reconciliation_required_at` / razón administrativa del pago asociado según el resultado; **no** registra pago, cambia importe/moneda/status financiero, devuelve fondos, modifica stock/comisión ni completa una orden. Corrección documental explícita, no cambio de servicio. Marcar devolución requerida no ejecuta refund. Providers reales: pendientes externos.

## SEO

La estrategia aprobada en [SEO](seo.md) se conserva: React + Vite + renderer público dinámico Node. Dominio canónico confirmado **https://upgradecolombia.com**, aún no desplegado. Smoke de HTML inicial por HTTP directo, sin DOM hidratado ni JavaScript, contra Node local y catálogo QA:

| Caso | HTTP | Metadata y contenido inicial |
|---|---|---|
| Home / | 200 | Un title, description, canonical HTTPS, index/follow, OG; JSON-LD Organization + WebSite |
| Shop /tienda | 200 | Canonical de tienda, index/follow, OG; BreadcrumbList |
| Producto publicado /tienda/qa-ux-producto-simple | 200 | Título/datos reales públicos, canonical propio, index/follow, OG; BreadcrumbList + Product |
| /no-existe-validacion-final | 404 | Title de no encontrado, noindex/nofollow; sin canonical ni Product |
| /crm/settings con query centinela | 200 shell | noindex/nofollow en meta y X-Robots-Tag; sin canonical, OG URL, bootstrap público ni centinela |

Se amplió sólo el smoke de privacidad a /carrito, /checkout, /checkout/payment/return, /orden-confirmada, /login y /admin/settings: mismo noindex inicial, sin canonical/Product ni tokens de query reflejados. Once respuestas representativas en total aprobadas, no auditoría SEO nueva.

Sitemap: 200, **8 URLs** (Home, Shop, seis productos elegibles), dominio correcto, sin privadas ni query/tokens. Robots: 200, sitemap del dominio correcto y sin secretos; permitir lectura de noindex no concede acceso CRM. Product JSON-LD sin costo/comisión/email/credenciales/estado privado. /dist/seo/entry-server.js, /.env y /scripts/seo-server.mjs no servidos: **404**.

Build/start existentes: `npm run build` / `npm start`. PUBLIC_SITE_URL y VITE_API_BASE_URL se fijan **antes de build**; runtime rechaza discrepancias. HOST/PORT configurables para reverse proxy. No hay variable de media frontend separada que inventar: validar URLs de recursos /storage generadas por Laravel, APP_URL y publicación del storage real. Node probado 24.11.1; Vite locked requiere ^20.19.0 o >=22.12.0. Hosting persistente Node: **PENDING DEPLOYMENT PREREQUISITE**, no bug local.

## Manuales

[Manual](user-manual.md), [roles](roles-permissions.md) y guías [Admin](admin-quick-guide.md), [colaborador](collaborator-quick-guide.md), [cliente](customer-guide.md): PASS en alcance cruzado. 42 capítulos y 56 procedimientos existentes, no rehechos ni todos ejecutados otra vez; 14 muestras críticas aprobadas arriba.

Terminología visible **Marcas y vehículos**; Referencias sólo como nombre técnico/histórico/fuente. Vigencia configurable, no regla fija de 15 días. Galería/principal/publicación, DECLINED, stock por sede vs red y ausencia de portal comprador coherentes. Servicios/categorías activos y disponibilidad de empleados no se omiten del procedimiento.

Validación automática de **176 enlaces Markdown internos en los 14 documentos: cero errores** de documentos/anchors, sin links absolutos locales publicables. Los paths externos en prosa de la evidencia histórica son trazabilidad conservada, no URLs de producto ni nuevos links de filesystem. Antes de estos dos docs, 161 enlaces internos en 12 documentos aprobados; comprobación final incluye también los nuevos.

## Capacitación

[Guía](training-guide.md), [guion](training-script.md), [checklist](training-checklist.md) y [escenarios](training-scenarios.md) coinciden con manual/roles/acciones UI. Material existente: **17 lecciones** (C0, nueve Admin, cuatro colaborador, tres públicas), 22 bloques cronometrados; Admin 90 min / colaborador 30 min / público 20 min. Ocho escenarios principales y tres talleres; 130 filas de competencias.

Ejemplos son ficticios y entorno autorizado sin comunicaciones reales. No introduce permisos ni funcionalidades sólo en training. Duraciones son planificación, no garantía de completar todos los ejercicios. Competencias no practicadas quedan pendientes/No visto; curso redactado y cruzado **no** significa personas capacitadas o proveedores/pagos reales probados. El aviso de cambio de sede se incorporó a errores de A8, conservando su estructura.

## Seguridad

**ZERO NEW TRACKED SECRETS.** Scans de tracked/diffs/untracked publicables y build, sin imprimir valores secretos. Sin .env secreta, .env.local, .env.development.local, cookies, browser states, screenshots QA, credenciales privadas, logs, php.ini temporal, node_modules, vendor ni harness externo tracked/agregados. Los scripts y seeder QA guardados preexistentes son infraestructura legítima con guards, no un harness privado nuevo; passwords del seeder vienen del entorno.

Excepciones de nombre, no de seguridad: F/.env.development y F/.env.production ya tracked, sin cambios, contienen sólo URL pública VITE_API_BASE_URL (loopback de desarrollo y origen histórico de producción respectivamente); F/.env.example nuevo sólo configuración pública. B/.env.example es plantilla sin claves y B/storage/logs/.gitignore sólo conserva el directorio, no logs. Archivos env secretos locales permanecen ignorados. Valores sintéticos con forma de credenciales en tests históricos se distinguen de secretos reales, no se publican sus valores.

Cero hallazgos nuevos de claves privadas/keys live/passwords QA en asignaciones del build ni paths absolutos de workstation/postpurge en código productivo. Loopback en **este build QA** es intencional y documentado; prohibido desplegarlo. Samples privados del smoke no reflejan query tokens, datos de cliente ni secretos en HTML/metadata; sitemap/robots sólo públicos. No constituye pentest ni prueba global de ausencia de cualquier secreto por análisis formal.

## Testing

Validaciones completas repetidas según pedido: backend suite, Composer, Pint; frontend typecheck, build, audits y tests. Smoke HTML inicial/privacidad ejecutado realmente sobre los procesos locales iniciados para 01E. Migrations ejercitadas realmente en upgrade_test después de terminar la suite, sin DDL concurrente. Tests negativos de galería/preflight y permisos forman parte de la suite, no se sustituyeron por revisión de código.

UI/manual/roles/training contrastados con evidencia aprobada reciente y código actual; **no hay un nuevo crawl browser ni 56 mutaciones duplicadas**. No usar porcentajes como garantía de todos los casos posibles.

## Pendientes externos

| Item | Clasificación | Obligación antes de lanzamiento |
|---|---|---|
| Hosting y proceso Node persistente compatible; PHP/MySQL; reverse proxy | EXTERNAL / PENDING DEPLOYMENT PREREQUISITE | Confirmar servidor real, supervisión y reinicio |
| Dominio upgradecolombia.com, DNS y HTTPS | EXTERNAL | Configurar/verificar en entorno real; dominio comprado no implica deploy |
| API/frontend/media definitivos, CORS/Sanctum/proxy/env | EXTERNAL | Aprobar URLs, configurar y reconstruir; API histórica no confirmada |
| Wompi real + retorno/webhook | EXTERNAL | Credenciales seguras, firma, callback público y validación controlada |
| Envia real | EXTERNAL | Cuenta/token, remitente, sedes/tarifas y cobertura real |
| DHL real | EXTERNAL | Cuenta/acceso y configuración comercial de cotización/cargos |
| Email real | EXTERNAL | Transporte/remitente/destinatarios y entrega efectiva |
| WhatsApp oficial | EXTERNAL | Confirmar número y link con el negocio, sin envío aquí |
| Storage, scheduler, backup/restore/rollback y smoke real | EXTERNAL | Operación confirmada antes/tras deploy |
| Search Console/Bing, indexación, Rich Results, PageSpeed y previews | EXTERNAL / POST-DEPLOYMENT | Verificar dominio accesible; no prometer posiciones/resultados enriquecidos |

No se convierten estas dependencias en PARTIAL funcional del software local. Detalle operativo en [release checklist](release-checklist.md).

## Prerrequisitos de deployment

### Registro de gates verificables

El estado de release usa **24 gates explícitos**, no porcentaje de horas/avance comercial. Sólo se cuenta un gate cuando ya está verificado; escribir su checklist no lo completa.

| ID | Gate | Estado |
|---|---|---|
| R01 | Baseline funcional e invariantes cruzados | PASS |
| R02 | Backend suite / validate / Pint | PASS |
| R03 | Frontend tests / typecheck / build | PASS |
| R04 | Dependencias: tres audits sin vulnerabilidades/advisories | PASS |
| R05 | Migraciones fresh/backfill/preflight/rollback en test | PASS |
| R06 | Manual/roles/quick guides/training/links | PASS |
| R07 | HTML inicial, SEO y privacidad locales | PASS |
| R08 | Higiene y clasificación completa del working tree | PASS |
| R09 | Checkpoint Git y paquete completo reproducible de release | IMPORTANT / PENDING; no autorizado ejecutar aquí |
| R10 | Hosting Node, versión y gestión de proceso / proxy | EXTERNAL / PENDING |
| R11 | Dominio, DNS y HTTPS | EXTERNAL / PENDING |
| R12 | Laravel productivo / secretos / PHP | EXTERNAL / PENDING |
| R13 | MySQL real / preflight / migración y backup | EXTERNAL / PENDING |
| R14 | Storage / medios / permisos / uploads | EXTERNAL / PENDING |
| R15 | Scheduler y operación de jobs si corresponde | EXTERNAL / PENDING |
| R16 | URLs canónicas/API/frontend/media y build productivo | EXTERNAL / PENDING |
| R17 | CORS, Sanctum, sesión y proxies reales | EXTERNAL / PENDING |
| R18 | Wompi real / webhook / retorno | EXTERNAL / PENDING |
| R19 | Envia real | EXTERNAL / PENDING |
| R20 | DHL real | EXTERNAL / PENDING |
| R21 | Email real | EXTERNAL / PENDING |
| R22 | Contacto WhatsApp confirmado | EXTERNAL / PENDING |
| R23 | Backup restaurable y plan rollback probado | EXTERNAL / PENDING |
| R24 | Smoke real e inspección SEO post-deploy | EXTERNAL / PENDING |

8 PASS, 1 IMPORTANT pendiente de checkpoint, 15 EXTERNAL pendientes. Configurar producción o ejecutar proveedores requiere fase/autoridad posterior; no se realizaron esas acciones.

## Resultado final

| Dimensión y denominador de esta validación | Porcentaje |
|---|---|
| Software funcional: 43 escenarios primarios + 8 flujos del alcance | 100% |
| Backend: suite y gates técnicos locales requeridos aprobados | 100% |
| Frontend: build/typecheck/tests/audits requeridos aprobados | 100% |
| QA funcional: baseline 01A cerrado, no cobertura infinita | 100% |
| SEO local: rutas/metadata/render/privacidad requeridos aprobados | 100% |
| Manual de usuario: documentos y 14 muestras críticas coherentes | 100% |
| Capacitación: material completo/coherente, no ejecución de curso | 100% |
| Release readiness: 8/24 gates verificados | 33% |
| Proyecto entregable total: índice de ocho dimensiones con igual peso | 92% |

Índice total = (7 × 100 + 100 × 8/24) / 8 = 91.67%, redondeado a 92%; es una convención declarada de checklist, **no una estimación de esfuerzo restante**. Software local no baja por proveedores externos; readiness sí refleja lo no verificado en entorno real. 100% local tampoco significa cero deuda técnica universal.

### Pendientes clasificados

- **BLOCKER:** ninguno funcional nuevo dentro del alcance local; todas las condiciones locales de PASS satisfechas.
- **IMPORTANT:** checkpoint Git/paquete coherente. Los nuevos assets ignorados y renderer requieren inclusión explícita si se publica desde Git, o build reproducible completo; no publicar dist QA.
- **EXTERNAL:** R10–R24, incluida confirmación de URLs reales/hosting Node; no bugs locales ni proveedores certificados.
- **POLISH:** warning bundle >500 kB. Fricción UX preexistente documentada en SEO a 768 px: header tapa «Volver al carrito» en checkout; hay enlace de carrito alternativo en header, no nueva regresión SEO ni P0/P1 funcional. Queda fuera del alcance de rediseño; no se oculta ni se arregla en 01E.

**Ready for: COMMIT / RELEASE CHECKPOINT.** Esto habilita revisar/preparar el checkpoint futuro, no autoriza hacerlo ni desplegar. **PASS — FINAL CROSS-VALIDATION COMPLETE.** Producto local funcionalmente cerrado, documentado y capacitable en el alcance aprobado; lanzamiento real condicionado a gates externos y empaquetado.
