# Configurador: vehículo interno, sin selector visual

## Alcance

Simplificación local de la ficha pública configurable. Se retira exclusivamente la selección visual de vehículo/año, manteniendo el resolvedor comercial y el contexto de compatibilidad. No se reimplementaron las etapas B–F ni se modificaron Wompi, PWA, Service Worker o contratos backend.

## Comportamiento implementado

1. **Sistema original:** botones de OEM registrados para el vehículo resuelto.
2. **RAM y almacenamiento:** pares reales; los que no corresponden al OEM aparecen deshabilitados. No se crean combinaciones cartesianas.
3. **Configuración seleccionada:** vehículo como texto informativo, OEM, memoria, referencia/SKU, precio y stock de la variante. El stock agregado se presenta con «surtido por confirmar», no como garantía de disponibilidad por sede.

No hay desplegable de vehículo ni campo de año dentro del configurador. Cuando varias referencias comerciales comparten los mismos atributos, se conserva el diferenciador explícito existente: nunca se escoge un SKU arbitrariamente.

### Resolución segura del vehículo

`productVehicleSelection()` consulta las opciones del resolvedor existente usando exclusivamente una respuesta vigente con cobertura `complete_public`. Deduplica filas por la tupla marca/modelo/generación: varias filas OEM o rangos de años no representan vehículos distintos.

- Una única tupla verificable permite completar los IDs internos desde esas filas.
- Un contexto explícito válido de los filtros se conserva, incluido el año si se proporcionó.
- Con varios vehículos, OEM/memoria/SKU no se utilizan para adivinar uno. Sin contexto vehicular suficiente se bloquean las opciones y la compra, con un enlace a los filtros de la tienda o consulta al taller.
- Un contexto ajeno al producto no se sustituye silenciosamente por otro.
- No se infiere unicidad desde respuestas filtradas, antiguas, en carga o con metadatos incompletos que podrían ocultar otra compatibilidad.
- No se fabrica un año. Si un perfil lo exige y no hay uno explícito, se requiere verificación externa al panel; en el perfil actual es opcional y se transmite `null`.

La resolución comercial sigue en `resolveConfiguration()`. La construcción del `purchaseContext` exige además un vehículo resuelto, una variante válida y una fila real que coincida en vehículo y OEM. Los IDs y los atributos se transmiten con el contrato existente; no cambian carrito, checkout ni órdenes.

## Archivos de esta intervención

| Archivo | Cambio |
| --- | --- |
| `src/domain/productConfigurator/selection.ts` | Inferencia segura y reutilizable de contexto vehicular. |
| `src/pages/ProductDetail/useProductConfigurator.ts` | Integración en el estado derivado y protección del contexto de compra; sin alterar el orden de Hooks. |
| `src/pages/ProductDetail/ProductConfigurator.tsx` | Retirada de controles vehículo/año, pasos 1–3 y resumen de precio/disponibilidad. |
| `src/pages/ProductDetail/ProductDetailPage.css` | Estilos locales del resumen y enlace de verificación. |
| `tests/product-configurator.test.mjs` | Ocho regresiones de inferencia, ambigüedad, contexto explícito, metadatos y año. |
| `tests/product-configurator-view.test.mjs` | SSR sin controles retirados, resumen y estados de verificación segura. |
| `scripts/verify-product-configurator.mjs` | Navegación sin selector, casos único/múltiple/inválido y regresiones aisladas. |
| `scripts/verify-configurator-buttons-local.mjs` | QA de la ficha BMW F30 real local, sin escrituras. |
| `scripts/verify-product-configurator-real.mjs` | Selección sin control vehicular y corrección de una carrera del propio harness al leer un body de login tras navegar. Se mantienen comprobaciones de sesión real y CRM. |
| `PRODUCT_CONFIGURATOR_VEHICLE_CONTEXT_UX.md` | Este informe. |

Los cambios pendientes preexistentes de ambos repositorios se preservaron. No se modificó ningún archivo backend en esta intervención.

## Validación

| Validación | Resultado |
| --- | --- |
| Suite frontend completa `npm test` | **163/163 PASS**, 0 fallos, 0 omitidas. |
| TypeScript `npx tsc -b` | **PASS**. |
| Sintaxis de los tres runners QA | **PASS**. |
| Build cliente | **PASS**, 18,42 s; salida temporal fuera de `dist`. |
| Build SSR | **PASS**, 3,94 s; salida temporal fuera de `dist`. |
| Prerender | **PASS**, 10 páginas, API exclusivamente local y dominio canónico conservado. |
| Ficha QA BMW F30 local, API real | **PASS** en 1440, 1280, 1024, 768, 430, 390 y 360 px. |
| Harness SSR/hidratación y regresión UI | **PASS**: siete anchos de ficha y siete de carrito/checkout; vehículo único inferido, múltiples/inválido bloqueados. |
| Integración navegador/Laravel/MySQL `upgrade_test` | **10/10 PASS**, API real, sin respuestas de negocio simuladas. |

### Ficha QA real local

Ficha: <http://127.0.0.1:5173/tienda/qa-local-pantalla-bmw-f30-multi-oem> (producto 6).

- Cero controles vehículo/año; botones accesibles mediante teclado y foco visible.
- Precio, SKU y stock coinciden con la respuesta real de Laravel.
- Cambiar CIC/NBT conserva el mismo SKU físico para 4/64 y su stock compartido.
- Cambiar a CIC invalida 8/256; no queda una selección incompatible comprable.
- Sin overflow global en los siete anchos y controles de al menos 44 px.
- Entrada desde filtros conserva contexto y recupera alternativas desde el catálogo completo.
- Producto simple y producto con variantes tradicionales conservan su interfaz anterior.
- Cero errores de página, warnings de consola o escrituras API en este runner.
- La ficha continúa en vista previa: `purchase_enabled=false`. No se habilitaron compras configurables en `upgrade` ni en producción.

### SSR y regresión aislada

El harness renderiza e hidrata los componentes reales en StrictMode con fixtures sintéticos. Pasaron cambios de OEM, otra marca vehicular, agotados, ambigüedad comercial, registro deshabilitado/no soportado, errores de conexión y reintento, respuesta antigua y productos tradicionales. Se comprobaron selección única interna, bloqueo multi-vehículo directo y bloqueo de contexto extranjero.

Carrito y checkout conservaron dos líneas de un mismo SKU con OEM distintos, límites de stock compartido, recuperación ante 422, payload e idempotency key estables y reconciliación única. **Las respuestas de orden de este harness son simuladas**; no prueban persistencia SQL. No hubo errores de hidratación ni de Hooks. Los HTTP 503/422 esperados corresponden a pruebas de error explícitas.

### Integración real aislada

Runner: `scripts/verify-product-configurator-real.mjs --audit-network`. Cada respuesta API debe demostrar mediante cabecera que procede de `upgrade_test`. Se reutilizó la infraestructura de fixtures aislados existente, sin migraciones ni limpieza de bases.

**10/10 controles PASS:**

1. Catálogo real, dos OEM para el mismo SKU y persistencia del carrito tras recargar.
2. Compatibilidad retirada: 422 real, sin orden ni reserva.
3. Variante oculta: 422 real, sin orden ni reserva.
4. Stock agotado: 422 real, sin orden ni reserva.
5. Pérdida de una respuesta de orden ya comprometida, submits repetidos, recarga y recuperación idempotente de la misma orden.
6. Contexto persistido en SQL, precio del servidor, conflicto ante manipulación y rechazo de contexto omitido.
7. Primera reserva, rechazo simulado mediante CLI de prueba y reintento sobre la misma orden, sin duplicar descuento de stock.
8. Estado pagado simulado exclusivamente por control CLI aislado: reconciliación una sola vez y conservación de artículos posteriores.
9. Login real de administrador de prueba y detalle CRM con ambos OEM y el mismo contexto persistido en SQL.
10. Producto simple y variante tradicional: ficha, carrito, checkout, orden y confirmación sin contexto OEM.

Órdenes de esta ejecución: **424** (configurable) y **425** (simple/tradicional), únicamente en `upgrade_test`. La orden configurable contiene dos líneas de variante **163** con marca **100**, modelo **100**, generación **103**, OEM **133/134** y **`year=null`**. Se verificó contra el manifiesto de esa ejecución que los tres IDs vehiculares son exactamente los del catálogo, no placeholders. Hay **una** referencia física de inventario; stock inicial 4, final 2, dos movimientos de venta para las dos líneas. El contexto SQL coincide con la respuesta pública y con CRM y permanece intacto durante reintentos.

La navegación al proveedor de pago fue bloqueada. No se procesaron pagos reales ni se cambiaron integraciones de pago. No hubo errores inesperados ni de hidratación/Hooks. Las respuestas 422/409 y el fallo de transporte intencional pertenecen a las regresiones negativas. No se presenta la simulación del estado pagado como una prueba de comunicación real con la pasarela.

## Integridad y límites

- `public/sw.js` y su copia del build mantienen SHA-256 `43338314702133f01e4df46edf0e9640229a0da55f593d0773104e6bcbfa3482`.
- Sin modificaciones de PWA, Service Worker, configuración de Wompi, endpoints, permisos o validaciones backend.
- Lectura protegida de `upgrade` local, repetida después del QA: 6 productos, 8 variantes, 11 referencias de inventario, 12 filas de stock, 31 unidades, 12 movimientos, 0 órdenes y 0 pagos. No se hicieron escrituras en esa base.
- No se ejecutaron migraciones, compras/pagos reales, commit, push ni deploy.
- Los primeros intentos de QA concurrente sufrieron timeouts con RAM/swap agotadas. Los resultados finales corresponden a ejecuciones secuenciales; no se modificó la aplicación para ocultar esos timeouts.
- El warning conocido de chunks >500 kB sigue pendiente, fuera de este alcance.
- El whitespace preexistente de `dist/index.html` no se corrigió ni se regeneró `dist`.
- Los servicios normales quedan disponibles en `127.0.0.1:5173` y `127.0.0.1:8000`; los servidores temporales de QA se cerraron. La API normal se volvió a comprobar: producto 6 en vista previa, compras deshabilitadas y stock 5/3/2 intacto.

## Evidencia local

Las capturas y reportes finales se conservan en `docs/qa/configurator-vehicle-internal/`:

- `real-buttons-1440.png`: panel compacto en la ficha QA real.
- `real-product-1440.png` / `real-product-390.png`: ficha completa, escritorio/móvil.
- `local-catalog-report.json`: siete anchos contra catálogo local real, sin escrituras.
- `ssr-ui-report.json`: escenarios de UI/SSR con fixtures y respuestas de orden simuladas.
- `real-backend-report.json`: diez controles de integración y snapshots SQL con backend real en `upgrade_test`.

El informe anterior `PRODUCT_CONFIGURATOR_BUTTONS_UX.md` se mantiene como evidencia histórica de la interfaz previa.
