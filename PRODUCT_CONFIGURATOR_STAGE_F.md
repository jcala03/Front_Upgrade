# Etapa F — Auditoría integral y preparación operativa

Fecha: 2026-10-29, America/Bogota. Repositorios: `upgrade79-web` y `backendupgrade`.

## 1. Resumen ejecutivo

**Veredicto: READY WITH CONDITIONS, exclusivamente para un futuro despliegue con el configurador deshabilitado. No autoriza despliegue ni activación comercial.**

No se demostró una regresión funcional que requiriera modificar código productivo. Se conservaron las Etapas B–E y se ampliaron dos áreas de cobertura: cambios administrativos después de crear una orden y recuperación de una orden realmente creada cuya respuesta se pierde en la red.

- Evidencia completa vigente: backend **759/759 PASS, 7878 aserciones**; frontend **152/152 PASS**; subconjunto backend configurador **36/36 PASS, 219 aserciones**, incluido en los 759.
- Nuevas pruebas F ejecutadas: **2/2 PASS, 57 aserciones**, con transacciones revertidas exclusivamente en `upgrade_test`.
- Nuevo navegador integrado con Laravel HTTP y MySQL reales: **10/10 controles PASS**, incluyendo pérdida deliberada de respuesta, envíos repetidos, recarga y recuperación idempotente.
- TypeScript, builds cliente/SSR, prerender, responsive e hidratación conservan evidencia verificable satisfactoria de E. No se repitieron suites extensas ni builds sin cambios productivos que lo justificaran.
- La compra configurable continúa bloqueada en producción **por código**, además de tener flags apagados, catálogo null e inscripciones vacías. Cambiar flags no permite activarla.
- Producción/Hostinger no se consultaron. Su esquema, datos, configuración y capacidad operativa actuales no están certificados por esta auditoría local.

La validación local está cerrada; los requisitos del apartado 11 son puertas obligatorias antes de desplegar. La activación requiere además una decisión e implementación autorizadas por separado: **no está lista para activarse en producción con el código actual**.

## 2. Alcance auditado y matriz de impacto

Se revisaron los informes B, C, D y E, estado/diffs de ambos repositorios, contratos, migración, registro de perfiles y servicios comerciales. No se restauró ni sobrescribió trabajo anterior.

| Área | Contrato/archivo principal | Resultado e impacto |
|---|---|---|
| Categorías y CRM | `ProductCategoryController`, `ProductVariantSpecValueService`, `VariantMemoryAttributes`, `ProductForm`, `ProductDynamicFields` | Campos nuevos opcionales por variante; preservación de definiciones y valores históricos. Sin módulo paralelo |
| Catálogo público | `PublicProductResource`, `PublicVehicleCompatibility` | `variants[].specs`, compatibilidades efectivas y metadatos aditivos; no publicar costos |
| Resolución | `src/domain/productConfigurator/*`, `useProductConfigurator` | Opciones observadas, misma fila vehículo/OEM, sin producto cartesiano ni variante arbitraria |
| Ficha | `ProductDetailPage`, `ProductConfigurator`, API pública | Selección inequívoca, catálogo completo, errores/reintentos y respuestas antiguas descartadas |
| Carrito | `cartLines`, `CartContext`, `CartPage`, storage | Identidad comercial conservada y discriminador contextual adicional; cantidades sumadas por SKU físico |
| Checkout | `StorePublicOrderRequest`, `CommercialItemResolver`, `ProductConfigurationValidator`, `CheckoutPage` | Validación del servidor antes de crear orden; contexto canónico e idempotencia existentes |
| Reserva e inventario | `OrderService`, `EcommerceFulfillmentBranchResolver`, `EcommerceStockReservationExpiryService` | Revalidación antes de primera reserva; una referencia física y stock por sede; liberación única |
| Órdenes y CRM | `OrderItem`, `PublicOrderItemResource`, `ConfigurationSummary`, `OrderDetail` | Snapshot JSON histórico nullable y presentación coherente en consulta pública/administrativa |
| Pagos | Servicios Wompi existentes | Sin cambios F ni integración paralela; reintentos sobre la misma orden |
| SSR/SEO | Renderizador y build existentes | Sin cambios F; SSR/hidratación y canonical conservados |
| PWA/SW | Trabajo pendiente independiente | Sin cambios F; no se incorpora ni se revierte como parte del configurador |

## 3. Evidencias utilizadas y límites

Informes: `VARIANT_MEMORY_STAGE_B.md`, `PRODUCT_CONFIGURATOR_STAGE_C.md`, `PRODUCT_CONFIGURATOR_STAGE_D.md`, `PRODUCT_CONFIGURATOR_STAGE_E.md`. Se contrastaron con código y logs existentes, no solamente con sus conclusiones.

| Evidencia | Ubicación local |
|---|---|
| Backend completo E | `/tmp/upgrade79-stage-e-backend-final.log` |
| Configurador backend E | `/tmp/upgrade79-stage-e-backend-specific.log` |
| Frontend completo E | `/tmp/upgrade79-stage-e-frontend-final.log` |
| TypeScript E | `/tmp/upgrade79-stage-e-typescript-final.log` |
| Builds cliente/SSR E | `/tmp/upgrade79-stage-e-build-client-final.log`, `/tmp/upgrade79-stage-e-build-ssr-final.log` |
| Prerender E | `/tmp/upgrade79-stage-e-prerender-final.log`; artefactos `/tmp/upgrade79-stage-e-final.ar4xgI/client` |
| Responsive/SSR con API sintética | `/tmp/upgrade79-configurator-view.IAHGbZ/report.json` |
| Navegador real E, 9 controles | `/tmp/upgrade79-configurator-real-LVb1e2/report.json` |
| Backend adicional F | `/tmp/upgrade79-stage-f-backend-audit-final.log` |
| Pint F | `/tmp/upgrade79-stage-f-pint.log` |
| Navegador real F, 10 controles | `/tmp/upgrade79-configurator-real-pJ0eOA/report.json` |
| Capturas reales F inspeccionadas | `/tmp/upgrade79-configurator-real-pJ0eOA/confirmation-real.png`, `crm-order-real.png` |

Los logs y artefactos `/tmp` son evidencia local temporal: archivar el conjunto necesario, con acceso restringido, antes de limpiar temporales. No publicar sesiones ni tokens incluidos en trazas de pruebas.

Distinción de infraestructura:

- **Real:** aplicación React completa, SSR real en el servidor QA, login CRM, endpoints Laravel por HTTP, MySQL `upgrade_test`, creación/consulta de órdenes, persistencia, stock, reservas y reintentos.
- **Fallo de red inducido:** `--audit-network` deja que Laravel confirme realmente la creación y descarta después una respuesta. No fabrica cuerpo ni éxito de API. Se retiene esa respuesta para enviar cinco eventos adicionales al formulario y comprobar su bloqueo.
- **Simulado:** resultado del proveedor de pago mediante control CLI limitado a las fixtures; parámetros de firma de prueba; mails/colas fake; navegación al proveedor bloqueada. No certifica un cobro, callback real ni conciliación con Wompi de producción.
- **Responsive anterior:** componentes reales con API sintética, no persistencia SQL. Complementa, no sustituye, la prueba HTTP/MySQL real.
- **No certificado:** Android físico, entrega Push, ciclo de actualización de PWA en producción, condiciones reales del hosting, concurrencia masiva entre procesos ni fallo físico de MySQL. El navegador QA bloquea Service Workers para aislar el catálogo de pruebas; no se afirma una prueba con SW activo.

## 4. Resultados de pruebas

| Validación | Resultado | Ejecución/evidencia |
|---|---|---|
| Backend completo | 759/759 PASS, 7878 aserciones | E, log íntegro verificado, 243015 ms |
| Backend configurador | 36/36 PASS, 219 aserciones | E; subconjunto, no sumar a los 759 |
| Nuevos casos F | 2/2 PASS, 57 aserciones | Repetidos después de Pint, 2166 ms |
| Frontend completo | 152/152 PASS, 0 fail/skip | E, log verificado; fuentes de aplicación y tests sin cambios F |
| Resolvedor | 33 casos PASS | Incluidos en frontend completo |
| Carrito/contexto/storage | 7 casos PASS | Incluidos en frontend completo |
| Navegador integrado F | 10/10 controles PASS | Laravel/MySQL reales, órdenes de prueba 414/415 |
| TypeScript | PASS | Evidencia E vigente |
| Build cliente | PASS, 14.27 s | E, fuera del `dist` del usuario |
| Build SSR | PASS, 1.57 s | E, mismo conjunto de fuentes productivas |
| Prerender | PASS, 4 páginas | E, API sintética vacía aislada; canonical `https://upgradecolombia.com` |
| SSR/hidratación | PASS | E responsive + F aplicación completa, sin errores inesperados |
| Responsive | PASS en 1440/1280/1024/768/430/390/360 | Evidencia E: ficha, carrito y checkout sin overflow global |
| Pint | PASS | `vendor/bin/pint --test --dirty`, F |
| Sintaxis runner | PASS | `node --check scripts/verify-product-configurator-real.mjs` |
| Composer | PASS | `composer validate --no-check-publish`; sin actualizar dependencias |
| Diff backend | PASS | `git diff --check` |
| Diff frontend | Aviso preexistente | Solo whitespace `dist/index.html:10`, no modificado en F |

No se presenta un supuesto «761/761 suite completa»: la suite completa verificada es la de 759 y se ejecutaron aparte los dos casos adicionales F. No se volvió a ejecutar `RefreshDatabase`/`migrate:fresh`, para preservar las órdenes de evidencia existentes. La adición F usa `DatabaseTransactions` y deja cero productos `stage-f-*` persistidos.

Comandos nuevos relevantes:

```bash
# Desde backendupgrade; exclusivamente XAMPP local upgrade_test.
APP_ENV=testing DB_URL='' DB_CONNECTION=mysql DB_HOST=127.0.0.1 \
DB_DATABASE=upgrade_test DB_USERNAME=root DB_PASSWORD='' \
TEST_DB_CONNECTION=mysql TEST_DB_DATABASE=upgrade_test WEBPUSH_QUEUE_CONNECTION=database \
php artisan test --compact --filter=ProductConfiguratorStageFAuditTest
vendor/bin/pint --test --dirty

# Desde upgrade79-web; Playwright ya disponible en la infraestructura local de QA.
PLAYWRIGHT_MODULE=/tmp/upgrade79-push-qa.AWDNIp/node_modules/playwright/index.mjs \
node scripts/verify-product-configurator-real.mjs --audit-network
```

El runner crea únicamente fixtures propias en `upgrade_test`, exige entorno/conexión efectiva correctos y deja sus datos para auditoría. No migró ninguna base. Sus procesos en 8196/5196 quedaron cerrados.

## 5. Defectos, correcciones y archivos de esta etapa

**No se identificó un defecto productivo reproducible que exigiera parchear el configurador.** La brecha de validación era no contar con evidencia específica de pérdida de respuesta después del commit ni de expiración con cantidades distintas del mismo SKU/OEM.

Cambios F exclusivamente:

1. Backend: nuevo `tests/Feature/ProductConfiguratorStageFAuditTest.php`. Dos pruebas transaccionales con API administrativa/pública real del framework: nombre/slug, galería, especificaciones por variante, despublicación, snapshot inmutable, primera reserva, stock dividido entre sedes, cantidades 2+1 y expiración/liberación idempotente.
2. Frontend: ampliación del runner QA existente `scripts/verify-product-configurator-real.mjs`, opción `--audit-network`. Conserva el recorrido estándar y añade pérdida de respuesta, envíos repetidos y recuperación tras recarga.
3. Este informe `PRODUCT_CONFIGURATOR_STAGE_F.md`.

Pint solo ajustó imports/tipos del nuevo test. No se editaron lógica comercial, endpoints, migraciones, Wompi, `.env`, PWA ni SW en F.

## 6. Hallazgos y riesgos pendientes

| Nivel | Hallazgo | Condición/mitigación |
|---|---|---|
| **BLOCKER para activación, no para despliegue apagado** | `ProductConfiguratorRegistry::registration` exige `local/testing`; producción está deliberadamente bloqueada | Activación futura necesita autorización y cambio puntual de política con pruebas. Nunca poner `APP_ENV=local` en producción para evadirlo |
| **IMPORTANT antes de desplegar** | Entorno y esquema reales de Hostinger no inspeccionados, por restricción expresa | Verificación autorizada de versiones, conexión, migraciones, rutas, storage y configuración antes de ejecutar el plan |
| **IMPORTANT antes de desplegar** | Worktrees incluyen archivos nuevos sin seguimiento y cambios PWA/dist ajenos al alcance | Preparar manifiesto/release revisado de B–E; no copiar indiscriminadamente el worktree ni omitir servicios nuevos por usar solo `git diff` |
| **IMPORTANT antes de desplegar** | Backend/modelo/resource nuevos escriben/leen snapshot; frontend y backend deben ser compatibles | Migración nullable y backend compatibles antes de publicar el cliente; no ofrecer compra con esquema viejo |
| **IMPORTANT antes de activar** | Categoría local nueva no reproduce todas las definiciones históricas de producción; catálogo físico no certificado | Revisar categoría/productos reales, añadir solo campos faltantes, preservar generales, verificar cada SKU/kit/OEM y sede; no trasladar IDs locales |
| **IMPORTANT antes de activar** | Flujo navegador usa recogida y resultado de pago simulado; no valida proveedor, hosting ni logística reales | QA autorizado en entorno controlado equivalente, sin cobros reales; inspección operacional de reservas/colas y flujos de envío que se vayan a ofrecer |
| **MINOR** | `dist/index.html:10` conserva whitespace previo y hay artefactos dist sucios | No usar esos artefactos como paquete final; generar release limpio revisado. No se corrige fuera del alcance |
| **MINOR** | Warning conocido de chunks >500 kB | Pendiente deliberado, sin cambios en esta etapa |
| **POLISH** | Ayuda OEM podría ampliarse con material técnico verificado | Opcional; no inventar sistemas compatibles por año ni imágenes no certificadas |

No se detectó un BLOCKER funcional nuevo en el alcance local probado. El veredicto condicionado no convierte las verificaciones de hosting pendientes en verificaciones aprobadas.

## 7. Regresiones en CRM y ecommerce

### CRM

- B prueba creación/edición/recuperación de múltiples variantes con RAM/almacenamiento independientes y coexistencia de campos generales. `VariantMemoryAttributesTest` incluye 13 métodos; valores omitidos se conservan, null/vacío limpia solo el atributo indicado; no se copia memoria general ni se parsea el nombre.
- `ProductCategoryController` preserva definiciones en actualización parcial y protege cambios/eliminaciones con valores guardados. La lista exterior `variants[]` conserva su contrato existente: no se presenta como PATCH independiente de una variante.
- Nuevo caso F crea mediante `/api/admin/products` un producto con galería y dos variantes; edita nombre/slug por API administrativa; URL vieja devuelve 404, nueva devuelve configuración válida por el mismo ID. Conserva SKU, precio e imagen específica de la variante.
- Reordena galería y principal; cambiar una variante a RAM 16 no sobrescribe los 8/256 de la segunda. La orden ya creada conserva sus datos originales; el pago inicial rechaza la nueva incompatibilidad con 409, sin reservar ni crear pago. Restaurar datos permite reservar, sin reescribir la orden.
- Despublicar produce 404 público y 422 de compra; republicar con galería válida recupera el flujo. `ProductGalleryTest` existente cubre validación de archivos, pertenencia, principal único y protección de última imagen publicada.
- Navegador real F inicia sesión con administrador fixture, abre la orden en CRM y verifica los dos contextos contra SQL. Se inspeccionaron las capturas de CRM y confirmación.
- Límite explícito: la edición completa del formulario CRM en navegador usa la evidencia visual aislada de B; F ejecutó las operaciones administrativas contra API/MySQL, no un nuevo guardado visual completo de ese formulario con backend real.

### Ecommerce y seguridad

| Caso solicitado | Evidencia y resultado |
|---|---|
| Tienda/filtros/entrada directa | Pruebas existentes de catálogo y navegador E: entrada filtrada recupera catálogo completo; no inventa alternativas |
| Vehículo/OEM/memoria, precio/SKU/imagen | Resolvedor C y navegador D/E, mismas filas efectivas y combinaciones existentes |
| Contexto omitido/manipulado, precio inyectado | `ProductConfigurationCheckoutTest`: 422 antes de orden, ítems y movimientos |
| Variante ajena/ausente, perfil/versiones inválidos | Mismo conjunto, fail closed, sin elegir principal silenciosamente |
| OEM incompatible, filas cruzadas, año inválido | Casos `bad_oem`, `cross_row`, `bad_year`, rechazo backend |
| Memoria distinta/metadatos inválidos | Casos `bad_ram`, `bad_storage`, `metadata`, `catalog_changed` |
| Producto/variante inactivo/oculto, OEM inactivo | Casos negativos de API; navegador F prueba catálogo despublicado realmente |
| Agotado/stock insuficiente | Casos `stock_zero`, `stock_short`; navegador F 422 real sin orden ni reserva |
| Cambio de nombre/slug | Registro por PK estable; nuevo test F con endpoints reales |
| Precio cambia durante checkout | Runner real cambia 1.200.000 → 1.250.000 antes de crear: orden total 2.500.000 calculado en servidor |
| Cambio de stock/compatibilidad antes de reservar | Revalidación F y casos E: no inicia pago ni mueve stock incompatible |
| Duplicados/reintentos | Replay misma key/DTO conserva orden; otro OEM con la key produce conflicto |
| Clics/envíos repetidos | F fuerza cinco submits mientras se retiene la respuesta real; una sola orden |
| Error de red y recarga | F pierde respuesta de orden ya confirmada en SQL y recupera ID/key/payload idénticos tras recarga |
| Respuestas antiguas/navegación entre productos | Navegador E y hook: clave de solicitud, abort y descarte de respuesta del producto anterior |
| Carrito persistido/recuperación | Recarga real conserva dos líneas OEM del mismo SKU; referencias inválidas no se sustituyen silenciosamente |
| Productos simples/tradicionales | Navegador real F termina compra simulada hasta orden/confirmación, dos líneas con contexto null |

No hay un nuevo endpoint administrativo público, permisos nuevos ni exposición de costos. El servidor sigue siendo autoridad aunque se manipule el cliente.

## 8. Integridad de inventario, órdenes y pagos

**Stock físico:** la referencia multi-OEM de F es la variante 145/SKU fixture compartido, un solo `inventory_item`, no dos inventarios por CIC/NBT. Orden 414 guarda dos líneas de cantidad 1; stock 4 → 2, dos movimientos de salida; reintentos no cambian el saldo ni agregan descuentos.

**Surtido por sede:** nuevo test transaccional requiere 3 unidades (CIC 2 + NBT 1). Existencias 2+2 en dos sedes no habilitan una orden que exige surtido desde una sola sede. Con 5 en la sede elegida y 2 en la otra, reserva 3: 5 → 2; la otra sede queda en 2.

**Expiración:** al vencer esa reserva impaga, el servicio libera 3 unidades mediante dos movimientos de reversión; retorna a 5. Segunda ejecución queda skipped y no vuelve a sumar. Snapshot intacto. Las pruebas existentes de expiración/reconciliación, incluidas en los 759, cubren aprobación tardía, revisión financiera, trabajadores repetidos y órdenes no elegibles.

**Órdenes reales de QA F:**

- 414: `confirmed/paid`, total 2.500.000, variante compartida y snapshots CIC/NBT 8/128, precio servidor 1.250.000 por unidad. Intentos de pago fixture DECLINED → APPROVED simulados únicamente por CLI de pruebas. Replay y nuevo intento mantienen la misma orden.
- 415: `pending/unpaid`, producto simple 200.000 + variante tradicional 300.000, ambos contextos null, sin pago real.
- La respuesta perdida fue la creación real de 414: la recuperación devuelve 200 con el mismo ID, no una segunda orden. Se observaron 35 respuestas API de navegador (27×200, 3×201, 5×422 esperadas) y, adicionalmente, una respuesta 201 del backend descartada antes de llegar al navegador. Cero errores JS inesperados; error de red/422 inducidos se registran separadamente.
- La reconciliación del carrito consume exactamente las dos unidades compradas y conserva una unidad contextual agregada después y un producto simple posterior; recargar confirmación no vuelve a consumir.

**Datos previos preservados:** órdenes E 410/411 mantienen estados, líneas y hash SHA-256 de su serialización ORM con ítems antes/después de F:

`e6e9e6b9b0805574fcd4c33c0394c5c616e90e8bee0e79a10363ad2f4e203cf0`.

Los parámetros de pago y estados simulados no constituyen prueba de cobro real. No se alteraron firmas, callbacks, webhooks ni conciliación Wompi. Dos navegaciones hacia el proveedor se bloquearon; cero peticiones externas permitidas.

## 9. Seguridad de perfiles, SSR y PWA

- Inscripción explícita por `products.id`, no por slug/categoría/marca/nombre. Ámbito exacto de entorno, driver, host, puerto y base. No trasladar IDs entre catálogos.
- Perfil soportado `vehicle-oem-memory-v1`, versión 1. Perfil desconocido, deshabilitado o ámbito incorrecto conserva `required: true` pero no habilita UI/compra; no cae al selector tradicional para eludir validación.
- Defaults efectivos: `catalog: null`, `products: []`, `preview_enabled: false`, `purchase_enabled: false`. El perfil conocido habilitado en el diccionario no inscribe ningún producto.
- La compra exige además columna de snapshot existente. `ProductConfiguratorRegistrationTest` prueba producción bloqueada incluso con flags true.
- SSR no escoge una variante arbitraria ni habilita compra incompleta. Selección interactiva y recuperación de catálogo completo se hacen después sin cambiar orden de Hooks. Errores de red y recarga probados sin warnings de hidratación/Hooks inesperados.
- Siete anchos ya aprobados sin overflow horizontal. Controles etiquetados, fieldsets, ayuda OEM, foco/teclado y estados de error/agotado/incompleto conservados; no se realizó una certificación externa WCAG.
- `public/sw.js` antes/después conserva SHA-256:
  `43338314702133f01e4df46edf0e9640229a0da55f593d0773104e6bcbfa3482`.
- Archivos PWA/versionado SHA-256 ya sucios en el worktree son un cambio previo independiente. No fueron editados ni revertidos por F; su aprobación/despliegue requiere revisión propia.

## 10. Bases y migraciones

Inspección final de solo lectura verificó `APP_ENV=local`, mysql, host `127.0.0.1`, base efectiva `upgrade`, servidor XAMPP `/opt/lampp`. Las once tablas comerciales inspeccionadas siguen en cero filas: orders, order_items, order_addresses, order_charges, order_status_histories, payments, products, product_variants, inventory_items, inventory_stocks e inventory_movements. La categoría local 6 conserva únicamente los dos campos nuevos 12/13, opcionales, activos, numéricos, scope variant y unidad GB. No se volvió a crear ni modificar.

No hay migraciones pendientes ni nombres duplicados en la base local frente a los archivos actuales. La migración autorizada anteriormente sigue registrada como ID 88, batch 25:

`database/migrations/2026_10_28_000001_add_configuration_context_to_order_items.php`.

Agrega exclusivamente JSON nullable `order_items.configuration_context`, sin backfill ni escrituras sobre órdenes. MariaDB lo expone como LONGTEXT, alias de JSON; nullable YES. El campo existente `variant_specs` sigue separado. Modelo fillable/cast y resource público/admin conservan correctamente null/snapshot.

`down()` se niega a quitar la columna si existe cualquier contexto no null, para proteger la historia. **No ejecutar rollback de esta columna en una base con órdenes configuradas.**

Las pruebas nuevas se ejecutaron sobre `testing/upgrade_test` con comprobación de conexión real y sin migraciones. No se ejecutaron migraciones adicionales en `upgrade` ni en ninguna otra base durante F. El estado de migraciones de producción es desconocido, no se infiere del local.

## 11. Preparación de un futuro despliegue

### Manifiesto de código que debe revisarse e incluirse

No desplegar solo los archivos marcados M: hay servicios, tipos y componentes nuevos sin seguimiento. Las rutas siguientes son relativas a cada repositorio e incluyen cambios B–E necesarios, **no cambios productivos nuevos F**.

Backend:

```text
app/Http/Controllers/Api/ProductCategoryController.php
app/Http/Requests/StorePublicOrderRequest.php
app/Http/Resources/PublicOrderItemResource.php
app/Http/Resources/PublicProductResource.php
app/Models/OrderItem.php
app/Services/CommercialItemResolver.php
app/Services/OrderService.php
app/Services/ProductVariantSpecValueService.php
app/Services/PublicVehicleCompatibility.php
app/Services/ProductConfigurationValidator.php
app/Services/ProductConfiguratorRegistry.php
app/Services/VariantMemoryAttributes.php
app/Services/VariantTechnicalReadiness.php
app/Console/Commands/PrepareVariantMemoryFields.php
config/product_configurator.php
database/migrations/2026_10_28_000001_add_configuration_context_to_order_items.php
```

Frontend:

```text
src/api/orders.ts
src/api/productCategories.ts
src/api/productConfigurator.ts
src/context/CartContext.tsx
src/domain/cartLines.ts
src/domain/productConfigurator/{types,compatibility,resolver,catalog,selection}.ts
src/types/{product,productConfiguration,cart,order}.ts
src/utils/{checkoutStorage,memoryGb}.ts
src/components/ConfigurationSummary.{tsx,css}
src/modules/admin/inventory/product-form/ProductDynamicFields.tsx
src/modules/admin/inventory/product-form/ProductForm.tsx
src/modules/admin/inventory/product-form/productFormUtils.ts
src/modules/admin/inventory/product-form/variantTechnicalReadiness.ts
src/modules/admin/orders/OrderDetail.tsx
src/pages/ProductDetail/ProductDetailPage.{tsx,css}
src/pages/ProductDetail/ProductConfigurator.tsx
src/pages/ProductDetail/useProductConfigurator.ts
src/pages/Cart/CartPage.tsx
src/pages/Checkout/CheckoutPage.tsx
src/pages/Checkout/CheckoutOrderSummary.tsx
src/pages/OrderConfirmation/OrderConfirmationPage.tsx
```

Conservar en el paquete de revisión los tests de memoria/configuración/checkout/registro, `OrderSalesPhaseOneTest` actualizado, el nuevo test F, `tests/Browser/configurator-*.php`, runners QA y los informes B–F. Los controles CLI/HTTP de prueba **no deben servirse como endpoints de producción**; no incorporarlos a rutas/providers públicos. No trasladar fixtures, sesiones, logs, claves de prueba ni datos `upgrade_test` al hosting.

Los archivos PWA, `vite.config.ts`, `src/vite-env.d.ts`, tests PWA y `dist` tienen cambios previos independientes: revisar su selección aparte. No extraer/revertir fragmentos a ciegas. Generar cliente/SSR/prerender coherentes desde la revisión aprobada; no reutilizar el `dist` sucio del workspace.

### Puertas previas y configuración requerida

1. Autorización separada, inventario de release y respaldo verificable de base, archivos subidos y release anterior. Confirmar procedimiento de restauración sin pisar órdenes/pagos creados después del respaldo.
2. En revisión futura autorizada, comprobar PHP compatible con `^8.3`, extensiones exigidas por lockfile, Composer, conexión efectiva y versión MySQL/MariaDB, permisos de storage y esquema real. Local usa PHP 8.3.6 y `laravel/framework` resuelto v13.30.0, restricción `^13.8`; no se deduce que Hostinger tenga esos requisitos.
3. Usar dependencias del lockfile, no `composer update`. Verificar requisitos de plataforma. No ejecutar `composer setup`: su script genera clave y migra globalmente. No regenerar APP_KEY ni reemplazar `.env`.
4. `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL` y `FRONTEND_URL` del sitio real HTTPS; conexión DB de producción verificada privadamente. `PUBLIC_SITE_URL=https://upgradecolombia.com`, `VITE_API_BASE_URL` correcto e idéntico en build cliente/SSR. No dejar fallback localhost. El servidor SEO rechaza discrepancias entre variables runtime y valores compilados.
5. Verificar configuración existente de `SANCTUM_STATEFUL_DOMAINS`, cookies `SESSION_DOMAIN`/`SESSION_SECURE_COOKIE`/SameSite, CORS, `/api`, `/sanctum`, proxy y acceso a imágenes. El configurador no requiere nuevos secretos ni variables VAPID.
6. Conservar configuración Wompi y logística existente; comprobar su presencia/entorno sin mostrar valores sensibles. Verificar scheduler de expiración y procesos existentes de cola/reservas: F no los inspeccionó en hosting ni los modificó. No asumir que un test de scheduler prueba que cron corre en producción.
7. El registro no consume variables `CONFIGURATOR_*` de `.env`: los flags están en `config/product_configurator.php`. Mantener false/false/null/[] y revisar caché de configuración después del release; no añadir una supuesta variable que el código no lee.
8. Revisar migraciones ya aplicadas y columnas equivalentes antes de ejecutar nada. Local no demuestra el estado de producción. No correr todas las migraciones pendientes indiscriminadamente: revisar cada dependencia/desfase y detenerse si aparecen cambios no autorizados.

### Orden seguro propuesto, no ejecutado

1. Backups y preflight; preparar backend compatible con configurador apagado. Impedir que código nuevo escriba `configuration_context` antes de que exista la columna.
2. Tras autorización específica sobre el destino verificado, aplicar únicamente la migración nullable revisada, antes de exponer el nuevo código de órdenes; coordinar ventana breve/activación atómica según infraestructura. Comando propuesto, **no ejecutado en F ni autorizado para hosting**:

   ```bash
   php artisan migrate --path=database/migrations/2026_10_28_000001_add_configuration_context_to_order_items.php --pretend
   # Solo después del preflight, backup y autorización del destino:
   php artisan migrate --path=database/migrations/2026_10_28_000001_add_configuration_context_to_order_items.php --force
   ```

3. Publicar backend compatible, con registry vacío/apagado; reconstruir cachés según procedimiento existente, sin cambiar claves ni permisos.
4. Publicar de forma coherente cliente, SSR y prerender construidos del mismo release y catálogo/canonical. Conservar rutas de API/Sanctum/SPA y mecanismo de SW aprobado independientemente. No parchear `sw.js` ni invalidar su versionado manualmente para esta función.
5. Smoke tests con configurador apagado. Comparar errores/logs y comportamiento de productos tradicionales antes de considerar la inscripción de productos.

### Smoke tests futuros, no realizados contra producción

Verificar GET sin escritura: home/tienda/ficha tradicional, canonical/metadatos SSR, robots/sitemap, imágenes, carga de assets, ausencia de localhost y errores de hidratación. Rutas directas React Router, API y respuestas de autenticación deben mantener su contrato; un 401 de API privada sin sesión no es fallo del configurador. Revisar login/CRM con cuenta autorizada y sin alterar productos. No crear órdenes/pagos reales como smoke test sin nueva autorización.

Ejemplos de inspección tras un futuro deploy autorizado:

```bash
curl -sS -D - https://upgradecolombia.com/ -o /tmp/upgrade79-postdeploy-home.html
curl -fsS https://upgradecolombia.com/robots.txt
curl -fsS https://upgradecolombia.com/sitemap.xml
curl -sS -I https://upgradecolombia.com/sw.js
```

Para ficha/API usar slugs y URL API reales verificados en ese entorno, no IDs de fixtures. El estado esperado en este primer release es **ningún producto inscrito y ninguna compra configurable habilitada**.

## 12. Activación gradual y rollback

### Activación futura, todavía no autorizada

1. Mantener primero el despliegue apagado y confirmar productos tradicionales/CRM/órdenes históricas. No publicar demo BMW ID 8 ni productos de QA.
2. Autorizar aparte el cambio que permita producción de forma explícita y conservando fail closed. Añadir pruebas para ese permiso sin quitar aislamiento de catálogo ni validación backend. No desactivar controles para hacer funcionar una demostración.
3. Auditar categoría real: preservar `ram` general numérico y `almacenamiento` general texto/obligatorio documentados anteriormente; añadir solamente `ram_gb` y `almacenamiento_gb` por variante si faltan y sus definiciones son compatibles. Nunca cambiar el scope de campos históricos ni copiar sus valores. El comando de preparación actual solo acepta local/testing: **no es una instrucción para ejecutarlo en hosting**. Preparación del catálogo real requiere procedimiento aditivo específicamente revisado/autorizado.
4. Elegir un producto comercial real revisado: SKUs físicos, kits diferenciados, imágenes, precios, memoria estructurada, filas de compatibilidad verificadas y stock real por sede. No generar inventario ni combinaciones OEM para completar el ejemplo.
5. Inscribir su ID real únicamente bajo identidad exacta del catálogo destino y perfil/versiones soportados. No copiar ID 6/8/533 ni host/base de local. Inscripción no depende de slug, y renombrar no obliga a reinscribir.
6. Validar preview seguro antes de compra; con producto inscrito y compra apagada el backend debe rechazar compra también desde selector alternativo. Comunicar/gestionar ese bloqueo para no interrumpir ventas accidentalmente.
7. Ejecutar QA equivalente controlado con datos aislados y proveedor de prueba antes de autorizar compra de un primer producto. Observar incompatibilidades, 422/409, reservas, reintentos y consultas CRM. Ampliar productos solo tras revisión individual y aprobación.

### Rollback seguro

- Deshabilitar compra manteniendo inscripciones y validadores; **no vaciar el registro de un producto ya protegido para convertirlo en tradicional y eludir contexto**.
- Conservar columna y snapshots; no ejecutar down si existen contextos. No borrar productos, órdenes, pagos, reservas ni movimientos para «volver al estado anterior».
- Mantener backend compatible que valide contexto y atienda órdenes ya creadas. No volver sin análisis a código anterior que ignore restricciones/snapshots o cambie reservas; los reintentos deben seguir sobre la orden original.
- Revertir cliente/SSR como un conjunto compatible; un cliente antiguo puede no permitir comprar un inscrito, pero no debe abrir una vía sin validación. Reconstruir cachés de forma coherente.
- Si el backend compatible no puede mantenerse, detener nuevas compras del producto afectado y revisar órdenes/reservas/pagos pendientes antes de cualquier reversión adicional. No tocar Wompi ni reactivar órdenes canceladas automáticamente.
- Restauración de datos desde backup sería una operación independiente y autorizada, con conciliación de escrituras posteriores; no es el rollback normal de este cambio aditivo.

## 13. Recomendación final

**READY WITH CONDITIONS.** La arquitectura y el flujo local auditados son consistentes: variantes/contextos inequívocos, precio y compatibilidad autoritativos, stock compartido por sede, snapshot histórico, reservas y recuperación idempotentes, productos tradicionales conservados. Los nuevos escenarios de F pasan sin parchear lógica que ya funcionaba.

Antes del despliegue deben resolverse/documentarse los IMPORTANT de entorno, empaquetado, orden de migración y verificación operacional. El primer release solo debe preparar soporte con configurador apagado. **Activar compras configurables en producción continúa bloqueado y requiere autorización/trabajo separado.**

No hubo commit, push, deploy, conexión a Hostinger, pagos reales, migraciones adicionales ni cambios comerciales en `upgrade`. No se modificó PWA/Service Worker. Se entrega el informe y se detiene para revisión; no se inicia otra etapa funcional.
