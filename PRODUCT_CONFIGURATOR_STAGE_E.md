# Etapa E — Integración comercial y cierre de validación local

Fecha de revisión: 2026-10-29 (America/Bogota).

Implementación existente recuperada, sin reimplementación ni reversión. Este informe distingue el código de Etapa E de los cambios anteriores B/C/D/PWA presentes en el worktree. La activación comercial en producción **no está autorizada ni habilitada**.

**Estado definitivo: Etapa E cerrada técnica y operativamente en local.** Backend completo 759/759 PASS, frontend completo 152/152 PASS y QA integral posterior **9/9 controles PASS contra Laravel HTTP real en upgrade_test**, según apartado 10. La migración de `upgrade` fue autorizada expresamente y aplicada sin cambios en filas comerciales. Ninguna activación comercial fue autorizada; producción sigue bloqueada. **No se inició Etapa F.**

## Mapa de validación confirmado ANTES de modificar el flujo

| Responsabilidad actual | Código / contrato | Cambio mínimo previsto |
|---|---|---|
| DTO público | `POST /api/orders`, `StorePublicOrderRequest` | Contexto opcional tipado; obligatorio solo para inscritos |
| Idempotencia y recuperación | `PublicCheckoutService::create`: fingerprint recursivo del DTO, token derivado, replay de la misma Order | Conservar mecanismo; el contexto participa del fingerprint |
| Producto/variante activos y visibles, pertenencia, variante principal histórica | `CommercialItemResolver::resolveCatalogSelection` | Validación adicional pública, sin cambiar defaults CRM/tradicionales |
| Precio/costo servidor y agrupación | `CommercialItemResolver::resolveProductItem`, `ProductPricingService::calculate` | Separar identidad contextual sin cambiar referencia física ni precios |
| Creación transaccional e instantáneas | `OrderService::create`, `OrderItem` | Guardar snapshot backend y prevalidar surtido configurable antes de insertar |
| Capacidad de surtido de una sede | `EcommerceFulfillmentBranchResolver::requirements/candidates/revalidateUnderLock` | Reutilizar suma por inventory_item_id, nunca multiplicar stock por OEM |
| Reserva/descuento definitivo | `EcommercePaymentService` → confirmación `OrderService::commitStock`, stock bloqueado por sede | Sin cambios a pagos; conserva reserva única y revalidación existente |
| Consultas públicas | `GET /api/checkout/orders/{token}`, `PublicOrderItemResource` | JSON histórico comercial permitido, sin costos |
| CRM | `OrderController::adminShow/adminIndex`, modelos con permisos existentes | Exponer/mostrar solo snapshot ya guardado |
| Reintentos | `wompiCheckout.ts`, `checkoutStorage.ts`, servicios de pagos existentes | No reenvían items; conservan la orden y su snapshot |

Inspección SQL inicial de solo lectura: conexión efectiva `upgrade`. `products.id` es PK bigint inmutable; no hay UUID. Slug único pero mutable. `order_items` tenía FK nullable para producto/variante y JSON `variant_specs` exclusivamente técnico, sin contexto vehicular. Se eligió JSON nullable `configuration_context`, sin backfill ni nuevos índices/FK. **En esa inspección inicial solo se autorizaba migrar upgrade_test. La posterior autorización/aplicación en upgrade local consta en el apartado 10.**

## Contratos y límites de implementación

Registro vacío por defecto, por ID explícito dentro de identidad exacta de entorno/conexión/host/puerto/base. Una inscripción con ámbito incorrecto queda bloqueada, no habilita compra por coincidencia de IDs. No cambian URLs ni se infieren perfiles por categoría. UI/compra solo local/testing, con flags separados; producción bloqueada incluso si se alteran flags.

DTO de línea conserva product_id + product_variant_id + quantity y añade configuration_context con schema_version, profile_id/profile_version, IDs canónicos de marca/modelo/generación/OEM, año opcional y memoria numérica GB. El servidor genera etiquetas e identidad de variante históricas; nunca acepta nombres, SKU, precios o stock del cliente.

El contexto distingue líneas del mismo SKU; el inventario sigue agregado por referencia física y sede. Carritos antiguos siguen siendo legibles; la ausencia de contexto en un inscrito se rechaza, nunca se sustituye su variante.

La reversión segura consiste primero en deshabilitar compras manteniendo inscripciones y snapshots. No retirar inscripciones para eludir requisitos; no borrar JSON de órdenes ni ejecutar down destructivo con snapshots. Pagos, firmas, webhooks, PWA/SW y datos comerciales quedan fuera de cambios.

## 1. Estado de recuperación

El log anterior `/tmp/upgrade79-stage-e-backend-full.log` estaba completo: **758/759 PASS**, 7858 assertions. El único fallo era `OrderSalesPhaseOneTest::test_public_order_response_contains_only_public_order_and_item_snapshots`: su lista exacta de campos permitidos no incluía el nuevo JSON público `configuration_context`. Se actualizó exclusivamente esa expectativa, añadiendo además una aserción de valor null para productos tradicionales. Se conservaron todas las comprobaciones que prohíben costos, márgenes, inventario interno y relaciones administrativas. No se alteró código productivo durante la reanudación.

`git status` y los diffs de ambos repositorios se revisaron sin restaurar archivos. Backend y cambios fuente frontend pasan `git diff --check`. La comprobación frontend completa informa un whitespace **preexistente** en `dist/index.html:10`; se conserva por pertenecer al trabajo previo. Los builds se generan fuera del `dist` del usuario.

La suite completa repetida pasó **759/759, 7878 assertions**, después del ajuste puntual del test. No se encontraron modificaciones productivas incompletas que requirieran reimplementación.

## 2. Archivos de Etapa E por repositorio

Backend (`backendupgrade`):

| Archivo | Responsabilidad |
|---|---|
| `config/product_configurator.php` | Ámbito explícito de catálogo, IDs estables, perfil versionado, flags apagados |
| `app/Services/ProductConfiguratorRegistry.php` | Inscripción por PK y ámbito; fail closed; compra local/testing solo con migración presente |
| `app/Services/ProductConfigurationValidator.php` | Contexto autoritativo, snapshot seguro, preflight de surtido y revalidación inicial |
| `app/Services/PublicVehicleCompatibility.php` | Expone el predicado existente de una misma fila para reutilizarlo sin cambiar reglas |
| `app/Services/CommercialItemResolver.php` | Validación pública antes del precio/agrupación y separación por contexto |
| `app/Services/OrderService.php` | Preflight antes de crear Order; revalidación antes de primera reserva |
| `app/Http/Requests/StorePublicOrderRequest.php` | DTO aditivo y whitelist de campos de contexto |
| `app/Models/OrderItem.php` | Fillable/cast del JSON |
| `app/Http/Resources/PublicOrderItemResource.php` | Snapshot público comercial; null en líneas tradicionales |
| `database/migrations/2026_10_28_000001_add_configuration_context_to_order_items.php` | JSON nullable aditivo; down protegido contra pérdida de historia |
| `tests/Feature/ProductConfigurationCheckoutTest.php` | 31 casos de compra/configuración/persistencia/reservas/reintento/rollback |
| `tests/Feature/ProductConfiguratorRegistrationTest.php` | 5 pruebas del registro estable/versionado/protegido |
| `tests/Feature/OrderSalesPhaseOneTest.php` | Expectativa del contrato público actualizada, privacidad conservada |

Frontend (`upgrade79-web`):

| Archivo | Responsabilidad |
|---|---|
| `src/types/productConfiguration.ts` | DTO, contexto de presentación, clave canónica y resumen |
| `src/types/product.ts` | purchase_enabled boolean aditivo |
| `src/types/order.ts` | Contexto en payload y snapshots de órdenes públicas/CRM |
| `src/types/cart.ts` | Reutiliza el tipo único del carrito |
| `src/domain/cartLines.ts` | Identidad comercial/contextual, stock físico agregado y consumo exacto |
| `src/context/CartContext.tsx` | Integra funciones puras y persiste/restaura contexto |
| `src/utils/checkoutStorage.ts` | Snapshot contextual para reconciliación de cantidades |
| `src/api/orders.ts` | Prioriza mensaje de validación de artículos del backend |
| `src/pages/ProductDetail/useProductConfigurator.ts` | Deriva contexto solo de resolución válida y catálogo completo autorizado |
| `src/pages/ProductDetail/ProductConfigurator.tsx` | Instrucción de compra según autorización |
| `src/pages/ProductDetail/ProductDetailPage.tsx` | Entrega variante/contexto al carrito y cuenta stock compartido |
| `src/components/ConfigurationSummary.tsx` | Resumen reutilizado en todo el recorrido |
| `src/components/ConfigurationSummary.css` | Texto adaptable, sin ancho mínimo ni nuevo sistema visual |
| `src/pages/Cart/CartPage.tsx` | Líneas separadas, cantidades/remoción por contexto y aviso para contexto faltante |
| `src/pages/Checkout/CheckoutPage.tsx` | Envía únicamente DTO canónico y muestra selección |
| `src/pages/Checkout/CheckoutOrderSummary.tsx` | Resumen proveniente de la orden del servidor |
| `src/pages/OrderConfirmation/OrderConfirmationPage.tsx` | Muestra snapshot histórico |
| `src/modules/admin/orders/OrderDetail.tsx` | Muestra snapshot junto a la línea existente del CRM |
| `tests/configuration-checkout.test.mjs` | 7 pruebas de carrito/stock/contexto/storage/resumen |
| `tests/product-configurator-view.test.mjs` | Conserva bloqueo SSR hasta tener selección y lectura completa |
| `scripts/verify-product-configurator.mjs` | Navegador sobre componentes reales con API sintética, sin escrituras externas |
| `PRODUCT_CONFIGURATOR_STAGE_E.md` | Inspección previa, contratos, resultados y operación segura |

No se atribuyen a E ni se revierten los cambios anteriores de categorías, atributos por variante, resolvedor, SEO, `dist`, Vite o PWA que ya estaban presentes. No se editaron Wompi, webhooks, firmas, reconciliación de pagos, Service Worker, configuración del hosting ni `.env`.

## 3. Arquitectura definitiva de validación

1. `StorePublicOrderRequest` admite el contexto solo como objeto con claves permitidas. Rechaza precio/cargos/descuentos enviados por cliente, como antes.
2. `CommercialItemResolver` sigue resolviendo producto/variante activos y visibles, pertenencia y precio vigente mediante `ProductPricingService`. **Solo en compras públicas** llama a `ProductConfigurationValidator::snapshot` antes de agrupar y antes de insertar la orden.
3. Inscritos exigen contexto, perfil/versiones exactos y `product_variant_id` explícito, aunque exista variante principal. Un perfil desconocido/deshabilitado, entorno/base incorrectos o compra apagada rechazan la solicitud, sin fallback tradicional.
4. Vehículo completo y OEM se evalúan en **una misma fila** de compatibilidad de la variante, mediante el predicado SQL ya usado por el catálogo. Se verifican además catálogos activos y relaciones marca → modelo → generación, y marca del OEM. La compatibilidad general sin OEM no certifica una compra OEM.
5. Año opcional: respeta rangos override de esa fila o el rango natural de generación según reglas existentes. No se inventa OEM por año. Se conserva la semántica previa de extremos abiertos en overrides parciales.
6. RAM/almacenamiento salen de `specValues.field`: campo numérico, activo, scope variant, unidad GB, categoría correcta y valor entero positivo válido. Coinciden exactamente con los números solicitados; no se interpreta nombre ni se copia especificación general.
7. El preflight público de `OrderService` intersecta sedes activas que pueden surtir la orden completa y suma cantidades por SKU físico entre contextos. Rechaza antes de insertar la Order. No reserva ni crea movimientos.
8. Antes de **la primera** reserva, `commitStock` revalida el contexto contra catálogo actual. Después se conserva el bloqueo/revalidación de stock por sede y los movimientos existentes. Una reserva ya comprometida no vuelve a validar ni reescribir el snapshot en cada intento de pago.

Las variantes tradicionales y los productos simples no inscritos no reciben requisitos OEM. El resolvedor administrativo y la posibilidad histórica de usar variante principal fuera del configurador no se reemplazaron.

## 4. Registro estable y contrato

No hay UUID en el modelo efectivo auditado. Se reutiliza `products.id`, sin nuevas columnas de identidad ni cambios en las URLs por slug. `ProductConfiguratorRegistry::catalogIdentity` compara exactamente entorno, driver, host, puerto y base de la conexión. No se copian IDs entre bases. Una inscripción con ámbito inválido permanece requerida pero bloqueada.

Defaults definitivos: `products: []`, `catalog: null`, `preview_enabled: false`, `purchase_enabled: false`. Aun con flags true, producción no puede activar UI ni compra con esta implementación. El backend exige también que exista la columna de snapshot antes de publicar purchase_enabled.

Ejemplo de **forma del DTO**, no inscripción ni datos comerciales aplicados:

```ts
type Line = {
  product_id: number;
  product_variant_id: number;
  quantity: number;
  configuration_context: {
    schema_version: 1;
    profile_id: "vehicle-oem-memory-v1";
    profile_version: 1;
    vehicle_brand_id: number;
    vehicle_model_id: number;
    vehicle_version_id: number;
    vehicle_multimedia_system_id: number;
    year: number | null;
    ram_gb: number;
    almacenamiento_gb: number;
  };
};
```

Se reutilizan `POST /api/orders`, consulta por token, entrega y pagos existentes. No se crean endpoints de checkout ni se duplican producto/variante dentro del DTO de contexto. Precio/stock/etiquetas/SKU no son autoridad del cliente.

## 5. Persistencia y privacidad

`order_items.configuration_context` contiene un JSON nullable generado por backend: DTO canónico más nombres de marca/modelo/generación/OEM, y `variant_id`, `variant_sku`, `variant_name` históricos. Esa identidad de variante queda en el snapshot aunque su FK se vuelva null tras una eliminación posterior. Los precios siguen en las columnas de orden existentes.

No se mezcla el contexto con `variant_specs`. No hay backfill ni reconstrucción de órdenes previas. Una línea tradicional devuelve contexto null. El resource público usa la misma whitelist anterior, ampliada solamente por el snapshot comercial; no expone costos/márgenes/comisiones. CRM conserva su autenticación/permisos existentes y no se agregó endpoint para modificar el contexto histórico.

La prueba real cambia después el nombre del catálogo y comprueba que la consulta pública y el CRM devuelvan exactamente el snapshot persistido, sin recalcular etiquetas desde el catálogo mutable.

## 6. Carrito, checkout, reintentos e idempotencia

- Identidad comercial: product_id + product_variant_id. Identidad contextual adicional: serialización canónica del DTO (no etiquetas de presentación).
- Una referencia compatible con dos OEM conserva **un SKU y un inventory_item**, pero dos líneas de selección. Mismo contexto se agrupa; distinto vehículo/OEM/año/memoria no se mezcla.
- Incrementos, decrementos y remoción operan sobre la clave contextual. El límite comprable cuenta la suma de cantidades del SKU entre todos los contextos, no duplica existencias por OEM.
- El storage restaura el contexto sin sustituir variantes. Los inscritos sin contexto no se convierten en productos tradicionales: se informa y el servidor rechaza. Las referencias retiradas o datos obsoletos fallan explícitamente en checkout.
- `purchaseConfiguration` elimina etiquetas y campos extra antes del POST. El backend vuelve a verificar todos los IDs/atributos independientemente del resolvedor UX.
- El fingerprint existente de creación incluye el contexto porque ya cubría recursivamente el DTO completo. Replay idéntico recupera la misma Order; cambiar OEM con la misma key produce IDEMPOTENCY_CONFLICT.
- `upgrade79_last_order` y `upgrade79_active_checkout` siguen separados. El snapshot de cantidades compradas incorpora la clave contextual y el marcador por token impide consumirlo dos veces. Las cantidades duplicadas no se restan repetidamente de varias líneas.
- `wompiCheckout.ts` y los endpoints de reintento no reenvían artículos: mantienen la Order, variante y contexto guardados. Se preservan las keys de resultados inciertos, polling/timeouts, PaymentReturn y firmas/webhooks. No se modificó esa integración.
- Prueba real: primera reserva bloqueada por variante retirada; se restaura en upgrade_test; primer intento, replay y nuevo intento tras DECLINED conservan una sola Order y un solo descuento de inventario. Prueba multi-OEM: dos unidades del mismo SKU consumen dos unidades físicas, no dos stocks independientes; confirmar de nuevo no vuelve a descontar.

## 7. Validación reproducible y evidencias

La conexión efectiva se verificó antes de repetir la suite: `APP_ENV=testing`, MySQL y `SELECT DATABASE() = upgrade_test`; el guard de `Tests/TestCase.php` vuelve a comprobarlo antes de RefreshDatabase. La columna y la entrada de migración ya existían en **upgrade_test**. Durante esa validación inicial no se ejecutó migrate contra upgrade/producción; la posterior migración local autorizada se documenta en el apartado 10.

Comando backend completo:

```bash
APP_ENV=testing DB_URL='' DB_HOST=127.0.0.1 DB_DATABASE=upgrade_test \
DB_USERNAME=root DB_PASSWORD='' TEST_DB_CONNECTION=mysql TEST_DB_DATABASE=upgrade_test \
WEBPUSH_QUEUE_CONNECTION=database php artisan test --compact
```

Las credenciales anteriores son de la conexión local aislada de pruebas; no se cargaron ni usaron credenciales o transacciones reales de Wompi. Los tests de pago usan strings fixture y `Http::preventStrayRequests`/`Http::assertNothingSent`.

Resultados ya confirmados:

- Backend completo final: **759/759 PASS, 7878 assertions**, duración 243015 ms, exclusivamente upgrade_test. `/tmp/upgrade79-stage-e-backend-final.log`. Incluye regresiones de pagos, stock, órdenes tradicionales, permisos y los casos nuevos del configurador.
- Pruebas específicas Laravel `ProductConfigurationCheckoutTest` + `ProductConfiguratorRegistrationTest`: **36/36 PASS, 219 assertions**. Incluyen 25 rechazos manipulados/incompatibles, persistencia JSON real, precio servidor, recursos público/CRM, Toyota además de BMW/CIC/NBT, año opcional, registro renombrado, ámbito distinto, inventario compartido, confirmación idempotente y protección de rollback.
- Frontend completo repetido tras reanudar: **152/152 PASS, cero fallos/skips**. Incluye 33 pruebas de resolvedor, 7 de carrito/storage/contexto y regresiones SEO/PWA/checkout existentes. `/tmp/upgrade79-stage-e-frontend-final.log`.
- TypeScript `npx tsc -b`: **PASS**. `/tmp/upgrade79-stage-e-typescript-final.log`.
- Pint `vendor/bin/pint --test --dirty`: **PASS**.
- Navegador sobre ProductDetailPage/CartProvider/CartPage/CheckoutPage/OrderConfirmation reales: **PASS** en la repetición final. API y respuestas de orden sintéticas, **no prueba de persistencia MySQL**. Conserva pruebas de SSR/hidratación, entrada filtrada, respuesta obsoleta descartada, ambigüedad, producto agotado, error de conexión, 422/reintento y reconciliación una sola vez. Cero errores JS/hidratación inesperados. 503 y 422 intencionales registrados por separado. Cero escrituras a servidor externo; los dos POST de orden fueron interceptados.
- Responsive ficha, carrito y checkout: **1440, 1280, 1024, 768, 430, 390 y 360 PASS**, document.scrollWidth <= clientWidth; campos/botones dentro del viewport. Confirmación y resumen posterior a crear orden comprobados a 360 px. Reporte repetido: `/tmp/upgrade79-configurator-view.IAHGbZ/report.json` y `/tmp/upgrade79-stage-e-browser-final.log`.
- Build cliente + SSR de la implementación anterior recuperado y comprobado: **PASS**, `/tmp/upgrade79-stage-e-validation.e1Ikbr/client`. Prerender real previo con API local de solo lectura: **4 páginas PASS**, routes.json presente, canonical https://upgradecolombia.com. No se reescribió el dist del usuario.
- Build cliente fresco final: **PASS**, 14.27 s; SSR fresco final: **PASS**, 1.57 s. `/tmp/upgrade79-stage-e-final.ar4xgI/client`; logs `/tmp/upgrade79-stage-e-build-client-final.log` y `/tmp/upgrade79-stage-e-build-ssr-final.log`.
- Prerender fresco final: **4 páginas PASS**, con servidor API sintético aislado de catálogo vacío, sin acceso a la base comercial durante esta repetición. `/tmp/upgrade79-stage-e-prerender-final.log` y `client/seo/routes.json` del build fresco. La ficha con producto configurado/selecciones se valida adicionalmente en los tests SSR y navegador con fixtures; no se declara probado un producto comercial publicado.
- SW fuente y build conservan SHA-256 exacto: `43338314702133f01e4df46edf0e9640229a0da55f593d0773104e6bcbfa3482`. No se modificó SW/PWA. La prueba de navegador aísla Service Workers para no interferir con instalaciones existentes; no simula recepción Push ni acredita una prueba física de PWA en Android.

Todas las ejecuciones finales anteriores finalizaron correctamente. No quedan suites ni builds en curso necesarios para cerrar esta entrega. Las evidencias bajo `/tmp` son artefactos temporales locales, no archivos publicados ni parte de un commit.

## 8. Migración y operación segura

Preparada: **`database/migrations/2026_10_28_000001_add_configuration_context_to_order_items.php`**.

- Añade una sola columna JSON nullable; órdenes históricas siguen null.
- No modifica productos, variantes, existencias, precios ni órdenes existentes.
- Inicialmente probada/aplicada solo en upgrade_test, con persistencia y guard de down verificados; aplicada después en upgrade local con autorización, según apartado 10.
- Estado inicial de la entrega técnica: pendiente de autorización para upgrade/producción. **Actualización posterior: autorizada y aplicada únicamente en upgrade local; producción sigue sin autorización ni ejecución.** Véase apartado 10.
- Sin columna, un inscrito no puede publicar compra habilitada. Productos tradicionales no intentan insertar el campo cuando no hay contexto, lo que conserva el uso previo mientras se autoriza la migración.

Desactivación/rollback seguro: apagar purchase_enabled manteniendo inscripciones y snapshots; se puede desactivar UI después. Conservar el validador de backend para impedir bypass tradicional y conservar la columna mientras haya historia/pedidos configurados. No retirar inscripciones ni revertir todo el backend para volver a permitir compras sin contexto. El down se niega si encuentra snapshots. No ejecutar down en bases comerciales como procedimiento de reversión.

## 9. Riesgos, límites y siguiente etapa

1. La Etapa E local no autoriza activación pública. Producción permanece bloqueada por código además de flags; habilitarla requiere una etapa explícita revisada, migración autorizada y registro específico del catálogo de destino.
2. Datos técnicos y compatibilidades deben estar verificados por el negocio; el software valida consistencia registrada, no certifica compatibilidad física. No se inscribió ni publicó el demo BMW ID 8 ni se crearon productos/inventario comerciales.
3. Stock de ficha/carrito es provisional. El preflight reduce errores, pero el stock puede cambiar después: la reserva final existente bajo locks sigue siendo la autoridad. No se prometen cantidades agregadas que una sede no pueda surtir.
4. La conexión exacta del registro falla cerrada si cambia host/puerto/base/entorno; hay que revisar explícitamente la inscripción en una migración de entorno, no copiar IDs a ciegas.
5. Las pruebas de navegación iniciales usaban respuestas simuladas. El QA posterior del apartado 10 cubre navegación contra Laravel HTTP real y persistencia/reservas/idempotencia en upgrade_test. Solo el resultado externo del pago sigue simulado por infraestructura CLI controlada. No hubo llamada al proveedor ni compra en producción. El catálogo comercial local sigue sin usarse para fixtures.
6. El aviso conocido de chunks >500 kB queda pendiente deliberadamente. No se modificaron SEO, PWA, permisos ni módulos fuera del alcance para corregirlo.
7. Antes de la siguiente etapa: revisar este informe y el cierre operativo posterior; seleccionar un producto real aprobado con metadatos completos, imágenes y stock real para una futura activación autorizada; revisar política de activación/rollback de producción. No activar registros o crear inventario automáticamente. La migración local ya está autorizada/aplicada, sin habilitar compras.

No hubo commit, push, deploy, cambios de Hostinger, pagos reales ni borrado/reversión del trabajo anterior.

## 10. Cierre operativo autorizado: migración local y QA HTTP integral

### Migración aplicada únicamente en upgrade local

Con autorización expresa del usuario se volvió a comprobar, en el mismo proceso que ejecutó Artisan:

- APP_ENV local; conexión mysql; host configurado y efectivo 127.0.0.1:3306; SELECT DATABASE() = upgrade.
- @@basedir = /opt/lampp, XAMPP local; no conexión a hosting/producción.
- Columna ausente y migración no registrada antes de ejecutar.
- Comando limitado: `php artisan migrate --database=mysql --path=database/migrations/2026_10_28_000001_add_configuration_context_to_order_items.php --no-interaction`.

Resultado: **DONE en 24.56 ms**, entrada de migración ID **88**, batch **25**. Columna nullable confirmada; MariaDB representa JSON como LONGTEXT con validación JSON, no como un segundo modelo de especificaciones.

Se compararon cantidad y SHA-256 del contenido previo de once tablas: orders, order_items, order_addresses, order_charges, order_status_histories, payments, products, product_variants, inventory_items, inventory_stocks e inventory_movements. Todas las huellas antes/después fueron idénticas. **Había cero órdenes y cero líneas previas**, por lo que no se afirma una comprobación sobre órdenes históricas reales inexistentes; la compatibilidad histórica ya está cubierta por pruebas de upgrade_test. No se crearon ni alteraron productos/inventario comerciales.

El registro de productos sigue vacío, preview_enabled/purchase_enabled siguen false y catalog sigue null en la configuración normal. La autorización de migración no habilitó compras configurables.

### Infraestructura nueva, exclusivamente de pruebas

- Backend: `tests/Browser/configurator-support.php`, `configurator-router.php`, `configurator-fixtures.php`.
- Frontend: `scripts/verify-product-configurator-real.mjs`.
- No se editó código productivo de ecommerce, auth, Wompi, PWA ni SW para este QA.

El router solo se ejecuta mediante PHP CLI-server en loopback. El bootstrap verifica APP_ENV testing, DB configurada/efectiva upgrade_test, host 127.0.0.1 y XAMPP; falla antes de escribir si no coincide. Las fixtures están identificadas por prefijo/manifest específico de cada ejecución. No hay rutas HTTP nuevas de control, ni providers o rutas de producción que carguen estos archivos.

La instancia Laravel HTTP real se limita a 127.0.0.1:8196; App completo, SSR existente y proxy local de frontend en 127.0.0.1:5196. El proxy privado reproduce el Referer/sesión ya usado por vite.config.ts. Las respuestas API incluyen un marcador de test para comprobar la base de destino. No se interceptan respuestas de catálogo, checkout, órdenes, autenticación o CRM.

Los únicos estados externos simulados son DECLINED/APPROVED mediante comando CLI restringido a la orden/usuario/producto de esa ejecución y a upgrade_test. Los parámetros de firma son strings de prueba; correo/colas/HTTP externos están bloqueados. La navegación del formulario hacia checkout.wompi.co se intercepta antes de salir del navegador; no se llama a la pasarela ni se procesa un pago real. No se modifica la integración ni sus webhooks.

### Resultados finales: 9/9 controles PASS, sin mocks de API

Ejecución final: `/tmp/upgrade79-configurator-real-LVb1e2/report.json`. Log: `/tmp/upgrade79-stage-e-real-browser-final.log`. Capturas inspeccionadas: `confirmation-real.png` y `crm-order-real.png` en ese directorio. Se observaron **32 respuestas API reales**: 23 con 200, 4 con 201 y 5 con 422 esperados. Todas acreditaron destino upgrade_test. Cero errores JS/hidratación inesperados y cero peticiones externas realizadas; se bloquearon las dos navegaciones esperadas a la pasarela.

| Control | Resultado y evidencia |
|---|---|
| 1. Catálogo/configurador/carrito y recarga | PASS. App completo y SSR existente, GET de producto real; CIC/NBT del mismo SKU se guardan como dos líneas y sobreviven refresh del carrito |
| 2. Compatibilidad real cambiada | PASS. Se altera solo la fila fixture CIC; POST real devuelve 422, cero órdenes/movimientos para ese run; se restaura la fila fixture |
| 3. Catálogo real cambiado | PASS. Variante fixture oculta después de seleccionar; POST real devuelve 422, sin escritura de orden ni reserva |
| 4. Stock real cambiado | PASS. Stock fixture pasa temporalmente a cero; POST real devuelve 422, sin orden/reserva; restaurado exclusivamente en upgrade_test |
| 5. Checkout/orden/snapshot/precio | PASS. Orden **410**, `UG79-20261029-IF1DHL`, dos líneas del mismo variant_id **139**. Precio actualizado en servidor a **1.250.000 COP/unidad**, total **2.500.000 COP**, aunque el carrito conservaba el precio anterior. Snapshot SQL idéntico al recurso; omitir contexto rechazado; replay recupera la misma orden; cambiar OEM con la misma key devuelve IDEMPOTENCY_CONFLICT |
| 6. Reserva/replay/reintento | PASS. Una existencia física, stock **4 → 2**; dos movimientos de una unidad (uno por línea). Primer intento real en endpoint existente, DECLINED controlado por CLI, replay 200 con misma key y nuevo intento 201 desde PaymentReturn. Una sola orden y dos intentos fixture, sin otro descuento ni alteración del snapshot |
| 7. Confirmación/reconciliación única | PASS. APPROVED aplicado por CLI solamente a la orden fixture 410. La página consulta su estado real persistido. Se restan solo las dos unidades compradas: sobreviven una unidad añadida después de crear la orden y un producto simple no comprado. Recargar confirmación no vuelve a restarlos |
| 8. CRM real | PASS. Login real de administrador fixture, sesión autenticada persistente 200, módulo real `/crm/orders`, detalle real de orden 410. Ambas líneas muestran CIC/NBT y 8/128; respuesta administrativa idéntica al snapshot SQL |
| 9. Productos tradicionales | PASS. Fichas reales de producto simple y variante tradicional → carrito → formulario visual checkout → orden **411**, `UG79-20261029-ATL1JD` → confirmación. Total **500.000 COP**, dos líneas, configuration_context null, sin requisito OEM ni pago/reserva |

El SKU compartido mantiene **un único inventory_item**, stock final **2** y exactamente **dos movimientos de venta** después de todos los reintentos. Los IDs anteriores corresponden únicamente a la ejecución final en upgrade_test, no a registros comerciales.

Los estados de pago en los intentos fixture 253/254 (DECLINED/APPROVED) son simulaciones locales, no evidencias de cobro o webhook del proveedor. No se probaron pagos reales, servicios externos de envío ni producción; esas exclusiones son deliberadas y no bloquean el cierre local solicitado.

Pint `--test --dirty`, sintaxis de los tres PHP de Browser, `node --check` del runner y diff checks de backend/código fuente frontend: **PASS**. El whitespace preexistente de dist/index.html se mantiene intacto. SW conserva SHA-256 `43338314702133f01e4df46edf0e9640229a0da55f593d0773104e6bcbfa3482` antes/después. Los resultados completos anteriores 759/759, 152/152, 36/36 y builds/SSR/prerender siguen verificables; no se repitieron por añadir únicamente infraestructura de QA.

Verificación final de upgrade local: órdenes 0, líneas 0, productos 0, variantes 0 e inventory_stocks 0; registro vacío y flags apagados. La única modificación allí fue la migración autorizada y su registro. Las fixtures finales y las de intentos previos del arnés se conservan identificadas en **upgrade_test** para auditoría; no se eliminaron datos ni se dejan servidores QA ejecutándose.

**No hay bloqueos técnicos pendientes para cerrar Etapa E en el alcance local solicitado.** La migración/activación en producción sigue requiriendo otra autorización y revisión; no fue realizada. No se inició Etapa F, no hubo commit/push/deploy ni cambios de hosting, Wompi, webhooks, PWA o SW.

Para reproducir únicamente el QA aislado:

```bash
PLAYWRIGHT_MODULE=/ruta/a/playwright/index.mjs node scripts/verify-product-configurator-real.mjs
```

Requiere upgrade_test ya migrada, XAMPP local, Chromium y puertos loopback 5196/8196 libres. Crea únicamente fixtures nuevas de prueba con namespace propio, sin truncar ni resetear la base. No se debe ejecutar en paralelo con una suite RefreshDatabase sobre la misma base.
