# Etapa C — Resolvedor de configuraciones comerciales

Implementación local, sin activación de productos ni integración visual. No cambia endpoints, base de datos comercial, CRM comercial, carrito, checkout, Wompi, reservas, SEO ni PWA/Service Worker. Las fixtures son sintéticas: no certifican referencias físicas ni crean existencias comerciales. Las regresiones de stock utilizan únicamente fixtures aisladas en `upgrade_test`.

## Inspección y contratos conservados

- `src/types/product.ts`: los tipos históricos `Product`/`ProductVariant` aún mezclan campos públicos y administrativos en TypeScript, aunque los recursos HTTP públicos no exponen costos. Esta etapa introduce contratos estructurales públicos **estrechos**, sin una migración global de tipos.
- Backend `PublicProductResource` / `PublicProductVariantResource`: entregan `specs`, `spec_values[].field`, categoría/campos, filas vehiculares, precio y stock público agregado. Las relaciones públicas cargan metadatos de generación y OEM.
- Backend `ProductController::publicRelations` / `PublicVehicleCompatibility`: solo devuelven variantes activas/visibles; una query vehicular puede limitar `variants[]`. Un GET sin filtros devuelve todas las variantes **públicas**, no las administrativas/ocultas.
- `Product::hasVariants` también depende de esa relación cargada: un subconjunto filtrado vacío con `has_variants: false` no demuestra que el producto sea simple. El resolvedor exige cobertura completa antes de permitir ese fallback; una categoría OEM sin variantes públicas queda no disponible.
- Backend `ProductVariant::resolvedCompatibilityType`: tipo propio o tipo del producto. Con tipo null, el filtrado sin OEM permite también filas generales del producto; una fila general no tiene OEM y nunca acredita uno.
- Backend `PublicVehicleCompatibility::row`: todos los IDs/año se comparan en la misma fila. Si existe algún override de año, los límites null quedan abiertos; si no existe ninguno, se usa el rango natural de la generación. El resolvedor conserva esa semántica. No interpreta los años del pivot generación/OEM como si fueran overrides de la referencia: el filtro público actual no los aplica.
- `shopFilters.ts`: se reutiliza `parseShopFilters` para recuperar IDs/año desde la URL; conserva su validación y dependencia de padres.
- `ProductDetailPage.tsx` y `seo/entry-server.tsx`: permanecen intactos. Actualmente usan el catálogo/selección antiguos; no se cambia su primer render ni la hidratación.

No existía un matcher vehicular frontend reutilizable: `productPresentation.ts` forma etiquetas, no valida combinaciones. El nuevo `compatibility.ts` concentra el matching para candidatos y opciones; no introduce otro matcher en PHP ni reemplaza los filtros vigentes.

## Arquitectura y archivos

| Archivo | Responsabilidad |
| --- | --- |
| `src/domain/productConfigurator/types.ts` | Contratos públicos, perfiles explícitos, estados, opciones, candidatos y disponibilidad |
| `src/domain/productConfigurator/compatibility.ts` | Tipo/herencia efectiva, integridad de fila, IDs y rangos de años |
| `src/domain/productConfigurator/resolver.ts` | Opciones registradas, resolución inequívoca y diagnóstico |
| `src/domain/productConfigurator/selection.ts` | Adaptador de query y reconciliación de dependencias |
| `src/domain/productConfigurator/catalog.ts` | Procedencia/completitud y ciclo de carga con rechazo de respuestas obsoletas |
| `src/api/productConfigurator.ts` | Lectura pública completa compatible con el endpoint existente |
| `src/utils/memoryGb.ts` | Validador GB compartido de Etapa B, extraído sin cambiar reglas |
| `src/modules/admin/inventory/product-form/variantTechnicalReadiness.ts` | Importa/reexporta el mismo validador compartido; comportamiento CRM intacto |
| `tests/product-configurator.test.mjs` | Casos sintéticos unitarios y del adaptador HTTP |

Las funciones de dominio no usan DOM, storage, cookies, timers, React ni estado global. El adaptador HTTP queda separado. El núcleo se puede ejecutar en servidor y cliente con la misma entrada; no hay conexiones nuevas desde SSR porque todavía no está integrado.

## Entrada

`resolveConfiguration({ profile, snapshot, expectedRequestKey, selection })`.

- `profile: ConfiguratorProfile | null`: contrato explícito opt-in. `null` no activa nada. `MEMORY_OEM_PROFILE` es una definición exportada, **no** una inscripción automática de categorías/productos. No hay condiciones por nombre, marca, slug o IDs locales.
- Perfil: ID de versión, modo `vehicle_oem` / `vehicle` / `universal`, claves de RAM/almacenamiento, unidad GB y opción de exigir año. El perfil inicial usa `ram_gb` y `almacenamiento_gb`. Un perfil no-OEM no puede eludir una categoría que exija OEM.
- `snapshot`: estado `idle/loading/ready/error`, `requestKey`, slug, producto público y cobertura `unknown/filtered/complete_public`.
- `selection`: IDs numéricos de marca/modelo/generación/OEM, año opcional, memoria y `variant_id` opcional para desambiguación explícita. `selectionFromShopQuery` adapta los filtros existentes; no supone que un año identifique el OEM.

`ConfiguratorProduct` y `ConfiguratorVariant` aceptan la estructura de los recursos públicos actuales, no requieren costos ni stock administrativo. Los datos de memoria deben estar en `variant.specs`, con metadatos numéricos activos, scope de variante y unidad GB en categoría o `spec_values[].field`. No se interpretan el nombre, atributos libres ni especificaciones generales como memoria estructurada.

## Salida

`Resolution` incluye estado, motivos con código/variante/campo, opciones dependientes, candidatos, variante resuelta, diferenciadores, cobertura y `canSelectForPurchase`.

| Estado | Significado |
| --- | --- |
| `not_applicable` | Sin perfil explícito o producto simple; mantener el flujo histórico |
| `incomplete` | Faltan selecciones obligatorias, sin seleccionar una variante por defecto |
| `nonexistent` | No existe esa combinación en el conjunto público completo conocido |
| `out_of_stock` | Existe una referencia inequívoca, pero su stock público es cero |
| `unavailable` | Producto o referencia suministrada inactiva/no visible |
| `insufficient_data` | Carga/error, catálogo parcial/obsoleto, datos técnicos/metadatos faltantes, identidad inconsistente o stock/precio desconocido |
| `ambiguous` | Varias referencias comerciales coinciden; exige selección comercial adicional |
| `valid` | Una referencia activa/visible y con stock público conocido; validación de surtido aún pendiente |

Solo `valid` devuelve `variant` y `canSelectForPurchase: true`. Esto no autoriza una compra ni sustituye reglas del servidor. Para los demás estados, `candidates` conserva las referencias conocidas y sus motivos/disponibilidad. Una respuesta parcial nunca permite afirmar unicidad o inexistencia.

### Opciones reales e identidad

- Vehículos: tuplas registradas marca/modelo/generación con intervalos por fila; `year_range_known` distingue un intervalo desconocido de uno abierto. No se expanden compatibilidades genéricas a generaciones inventadas.
- OEM: filas del vehículo/año seleccionado, sin cruzar generaciones. OEM null no es wildcard. OEM explícitamente inactivo no se ofrece; metadatos de actividad ausentes impiden certificarlo.
- Memoria: pares RAM/almacenamiento observados en variantes que cumplen ese contexto; no se cruzan valores independientes.
- Opciones agotadas se conservan. Cada opción indica `variant_ids` y `available_variant_ids`, **no una suma de stock**. Una misma referencia multi-OEM/multi-vehículo conserva una sola identidad, precio, SKU y cantidad.
- Candidatos: allowlist de `product_id`, `variant_id`, nombre, SKU, precio, imagen, RAM, almacenamiento y disponibilidad. No se propagan objetos administrativos ni costos accidentales.

### Ambigüedad y datos deficientes

No se prefiere la primera, principal, más barata ni la única con stock entre varias referencias coincidentes. `differentiators` devuelve las alternativas con ID/nombre/SKU/precio/imagen. La interfaz futura debe pedir selección explícita y usar `variant_id`; si esas etiquetas fueran insuficientes, debe mostrar detalles públicos adicionales de la variante original por ID o corregir su identificación comercial en CRM, no inventar diferencias.

Una variante activa con memoria ausente y compatibilidad potencialmente coincidente bloquea la afirmación de unicidad de otra, salvo desambiguación explícita. IDs duplicados idénticos se deduplican; representaciones contradictorias de un ID fallan de forma segura.

### Disponibilidad

`availability = { stock, state, source: 'public_aggregate', provisional: true, requiresFulfillmentValidation: true }`.

El stock es el de la variante, nunca el total del producto. Cero significa agotado; ausente/inválido, desconocido. No se calculan reservas, movimientos, entregas ni capacidad por sede. Cantidad final, precios, surtido e inventario siguen siendo responsabilidad de las validaciones existentes del backend; Etapa E deberá conectar el contexto sin sustituirlas.

## Cambios de selección

`reconcileSelection({ profile, snapshot, expectedRequestKey, previous, patch })` devuelve selección nueva, campos limpiados y resolución.

- Cambiar vehículo/OEM/año/memoria invalida un ID comercial anterior: no lo arrastra silenciosamente.
- Un ID nuevo enviado explícitamente en el mismo patch se valida como elección nueva. Un refresh sin cambios de selección mantiene el ID comercial agotado o ausente y rechaza la compra; no lo sustituye por otro SKU.
- Descarta modelo/generación/OEM que ya no correspondan al nuevo contexto.
- Mantiene el par de memoria si sigue existiendo. Si el par deja de existir pero RAM sigue siendo válida, mantiene RAM y limpia almacenamiento. No escoge otra memoria automáticamente.
- Con catálogo parcial, loading, stale o datos técnicos insuficientes no elimina memoria basándose en alternativas incompletas; la compra sigue bloqueada.
- Con perfil null no reinterpreta ni limpia la selección tradicional.

## Lectura completa, SSR y carreras

`getCompleteConfiguratorCatalog(slug, requestKey, signal)` reutiliza `getProductBySlug(slug, signal)` **sin tercer argumento de query**. No cambia el significado del endpoint ni la lectura filtrada existente. No usa endpoints administrativos ni añade headers de autenticación; conserva el transporte público vigente, incluyendo su prefijo de proxy dev y comportamiento de cookies de same-origin del navegador.

El caller asigna una clave única por petición, llama `beginCatalogLoad`, y entrega la respuesta a `acceptCatalogResponse` contra el estado **más reciente**, no contra un loading antiguo capturado antes del await. Una clave o slug antiguos se ignoran; `rejectCatalogResponse` tampoco reemplaza una petición nueva. Se preserva la cobertura de entrada: entregar por error una respuesta marcada filtered no la promueve a complete.

Un bootstrap SSR obtenido con filtros debe entrar como `filtered` (o `unknown` si no hay procedencia demostrable). La lectura completa se realiza por separado; no borra selección ni query de origen. Recalcular con la selección **actual**, no una capturada antes del await. Una respuesta pública completa puede omitir referencias ocultas/inactivas: si su ID no está, solo se sabe que no coincide en el catálogo público; no se afirma cuál es su estado administrativo.

## Lo que necesitará Etapa D

1. Definir un registro/metadato explícito producto → perfil y flag de activación gradual. Esta etapa no persiste ni activa esa inscripción. No basarlo en BMW, nombres, categoría 6 o detección automática de campos.
2. Mantener el selector tradicional cuando no haya perfil. Un perfil con datos deficientes debe mostrar diagnóstico y bloquear esa configuración, no habilitar un fallback que eluda restricciones OEM.
3. Separar el producto SSR/filtrado del snapshot completo, con request keys únicas y AbortController. No alterar el árbol inicial durante hidratación; cargar alternativas después o proporcionar datos SSR idénticos al cliente.
4. Conectar los pasos a `options` y `reconcileSelection`, traducir códigos de diagnóstico y avisar qué campos se invalidaron.
5. Mostrar etiquetas vehiculares desde los metadatos públicos de la misma fila o catálogos existentes; conservar el año y sistema seleccionados.
6. En ambigüedad, agregar selector comercial explícito. Actualizar precio/SKU/imagen/cantidad desde `variant_id`, sin sumar stock por OEM.
7. Reutilizar el estado de compra actual y respetar stock provisional. La persistencia del contexto vehicular y validación adicional de carrito/checkout siguen reservadas a Etapa E.
8. Añadir entonces pruebas visuales/responsive, interacción real, SSR/hidratación y navegación. Esta etapa no declara una interfaz responsive nueva porque no la implementa.

## Riesgos, límites y rollback

- No se certifica compatibilidad física: solo coherencia de datos públicos registrados.
- Se necesita un catálogo completo público y metadatos GB para resolver; datos históricos incompletos no se rellenan automáticamente.
- Los overrides de año abiertos se comportan igual que Laravel; no se convierten en límites de generación supuestos. Si el negocio quiere restringirlos, requiere otra decisión sobre datos/reglas compartidas, fuera de esta etapa.
- La consulta completa expone alternativas ya públicas, no referencias administrativas. Ocultas no pueden diagnosticarse como tales si el servidor las omitió.
- La UI futura debe conservar el aviso de datos parciales y no dar por definitivas disponibilidad o compra.
- Desactivación: no importar el resolvedor o pasar perfil null. No hay migraciones, catálogo ni datos que revertir. Al retirar estos módulos, conservar el validador compartido o devolver su implementación sin cambios a Etapa B.
- No se modificó PWA/SW (incluida su versión SHA-256), pagos, hosting ni producción; tampoco se modificó la categoría local 6.

## Validación

Pruebas del módulo: `node --test tests/product-configurator.test.mjs`. Suite completa: `npm test`. TypeScript: `npx tsc -b`.

Se cubren BMW/CIC/NBT como fixtures, otros fabricantes/generaciones, herencia, universales, años naturales/overrides, múltiples OEM/vehículos por ID, combinaciones inexistentes, agotadas/ocultas/inactivas, unidades/scope, datos faltantes, ambigüedad, cambios consecutivos, filtros de entrada, cobertura parcial, peticiones fuera de orden, abortos/errores y pureza con objetos congelados sin DOM/storage. Las pruebas de HTTP interceptan fetch; no llaman a producción.

Resultados finales:

- Resolvedor/adaptador: **33/33 PASS**, ejecutados en Node con módulos Vite y sin navegador/storage, con objetos congelados y fetch simulado.
- Frontend completo: **139/139 PASS**, incluida la regresión de Etapa B, SSR/hidratación, Hooks y pruebas PWA existentes. Log en `/tmp/upgrade79-stage-c-frontend-tests.log`.
- Backend relacionado: **48/48 PASS, 338 assertions** (`VariantMemoryAttributesTest`, `OemVariantCompatibilityTest`, `ProductArchitecturePhaseOneTest`, `PublicProductNetworkStockTest`). Base efectiva verificada `upgrade_test`, entorno testing, MySQL en 127.0.0.1. No se repitió la suite PHP completa porque no hay cambios de código backend en esta etapa.
- TypeScript: PASS. Pint `--test --dirty`: PASS.
- Build cliente y SSR: PASS en `/tmp/upgrade79-stage-c-validation.VfFtSj/client`, sin sobrescribir el `dist` modificado previamente por el usuario.
- Prerender: **4 páginas PASS**, dominio canónico `https://upgradecolombia.com`, API exclusivamente `http://127.0.0.1:8000`.
- `public/sw.js` y copia del build: SHA-256 idéntico `43338314702133f01e4df46edf0e9640229a0da55f593d0773104e6bcbfa3482`.
- Relectura local `upgrade`: categoría 6, slug `pantallas-android`, campos 12/13 con scope variant, number, GB y opcionales; dos categorías en total; productos, variantes, inventory_items, inventory_stocks e inventory_movements continúan en cero. Sin escrituras en esta base durante Etapa C.
- Advertencias conocidas de chunks >500 kB y de HMR/dep-scan en otras pruebas no se modificaron.

**Etapa C implementada y validada.** Sin bloqueos para el núcleo puro. La definición/persistencia del registro opt-in producto → perfil y la integración visual permanecen pendientes para Etapa D. No se realizó commit, push, deploy ni acceso/modificación de producción o Hostinger.
