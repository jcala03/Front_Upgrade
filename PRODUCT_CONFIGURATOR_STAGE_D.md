# Etapa D — Ficha pública con configurador visual, solo vista previa

Implementado en la ficha real `ProductDetailPage`, sin reemplazarla. No es un segundo catálogo ni un modelo comercial paralelo. **No se habilitan compras configurables en esta etapa.** El registro real queda vacío y la vista previa desactivada por defecto. No se crean productos, inventario ni migraciones.

## Archivos de esta etapa

Frontend:

- `src/pages/ProductDetail/ProductDetailPage.tsx`: integra configurador/resolución con galería, referencia, precio y stock existentes; mantiene la compra tradicional y bloquea la configurable. Corrige navegación a otro producto cuando el mismo componente recibe datos iniciales nuevos.
- `src/pages/ProductDetail/ProductDetailPage.css`: estilos del panel, reutilizando fondo, bordes, acento azul y foco de la ficha. Grid y controles sin mínimos que desborden.
- `src/pages/ProductDetail/ProductConfigurator.tsx`: pasos accesibles, ayuda OEM, resumen, referencia adicional, estados y reintento.
- `src/pages/ProductDetail/useProductConfigurator.ts`: lectura completa, procedencia, selección, reconciliación, abortos, descarte de respuestas antiguas y protección ante metadatos perdidos.
- `src/types/product.ts`: contrato público `ProductConfiguration`, opcional y aditivo en productos históricos.
- `src/api/productConfigurator.ts`: conserva el GET público sin filtros y añade precisión al tipo de retorno para reutilizar la variante completa en presentación. No cambia URL ni semántica.
- `tests/fixtures/configurator-products.mjs`: referencias e imágenes sintéticas, sin registros en base comercial.
- `tests/product-configurator-view.test.mjs`: contenido SSR, perfiles, protección, estados y regresión tradicional.
- `scripts/verify-product-configurator.mjs`: navegador Chromium, hidratación y recorridos responsive de la página real.
- Este informe.

Backend, `backendupgrade`:

- `config/product_configurator.php`: registro versionado explícito, vacío por defecto; vista previa false.
- `app/Services/ProductConfiguratorRegistry.php`: autoridad del registro y de sus metadatos públicos.
- `app/Http/Resources/PublicProductResource.php`: añade exclusivamente `configuration` al listado y detalle públicos.
- `tests/Feature/ProductConfiguratorRegistrationTest.php`: registro, versiones, defaults, privacidad y prohibición de habilitar la vista previa en producción.

Los cambios previos de Etapas B/C y PWA se preservan. No se modifican App, rutas, carrito, checkout, pagos, reservas, reconciliación, webhooks, SW, migraciones ni `.env`.

## Activación explícita y versionada

Registro backend por **slug público canónico explícitamente aprobado**, no detección por nombre, categoría, marca, SKU o ID de una base local. La clave identifica un recurso público concreto, no una familia de productos. No se registra el demo BMW ID 8 ni otro producto real.

Ejemplo de estructura, NO aplicado a ningún producto:

```php
'products' => [
    'slug-publico-previamente-aprobado' => [
        'profile_id' => 'vehicle-oem-memory-v1',
        'profile_version' => 1,
    ],
],
```

Un producto no inscrito devuelve `configuration: null`. El contrato inscrito es aditivo:

```json
{
  "schema_version": 1,
  "required": true,
  "profile_id": "vehicle-oem-memory-v1",
  "profile_version": 1,
  "ui_enabled": false,
  "purchase_enabled": false
}
```

La versión del perfil se comprueba en backend y frontend. Un registro inválido o desconocido sigue marcado `required`, pero no activa el selector ni la compra tradicional como fallback.

`ui_enabled` solo puede ser true si la inscripción es válida, `preview_enabled === true` y el entorno backend es `local` o `testing`. En producción es false aunque se altere esa bandera. `purchase_enabled` se devuelve siempre false; no existe un interruptor de compra configurable en Etapa D. No se modificó la configuración real para inscribir productos o activar previews.

**Límite de identidad:** el CRM puede regenerar el slug cuando cambia el nombre del producto. Este registro no es todavía una identidad inmutable. Antes de inscripciones comerciales reales hay que decidir una clave estable o una política coordinada de conservación/actualización del slug; no se modifican reglas compartidas del CRM para resolverlo a escondidas. En la entrega actual no hay productos comerciales inscritos, por lo que esta limitación no altera sus compras.

## Flujo y datos reales

1. La ficha recibe del backend su inscripción; no deduce elegibilidad a partir de RAM ni categoría.
2. Para inscritos con preview habilitada monta el panel y usa `getCompleteConfiguratorCatalog`, sin query vehicular. La respuesta inicial/SSR filtrada no se toma como conjunto completo.
3. Paso 1: selección explícita de marca/modelo/generación; año opcional. Etiquetas de metadatos públicos de las filas reales. No se adivina OEM por año.
4. Paso 2: únicamente OEM devueltos por el resolvedor para ese vehículo/año. Ayuda textual sin imágenes o diagnósticos técnicos inventados.
5. Paso 3: pares RAM/almacenamiento registrados para el vehículo/OEM. Agotados se pueden consultar, pero no comprar.
6. Si hay varias referencias equivalentes, aparece un selector comercial adicional con nombre/SKU/ID. No se elige la primera ni la principal.
7. El resumen y los componentes existentes de precio, SKU, fotografía/galería y stock se actualizan con la variante comercial resuelta. Una variante agotada inequívoca también permite consultar sus datos reales.

No se reconstruyen atributos a partir de nombres ni especificaciones generales. No se cruzan filas o generaciones ni se suman existencias por OEM. El stock mostrado conserva la indicación de surtido pendiente.

Cambiar OEM/vehículo/memoria usa `reconcileSelection`. Se mantiene la memoria válida y se limpian dependencias incompatibles, con aviso visible. La referencia anterior no sobrevive silenciosamente. Al seleccionar una referencia ambigua, siguen disponibles los otros diferenciadores para poder cambiarla.

## Carga, errores y navegación

- Cada lectura completa usa una clave creciente por instancia y AbortController. La respuesta solo se acepta contra el estado más reciente, slug e ID de producto correctos.
- El contexto vehicular válido de Tienda se conserva mediante su parser existente. Las selecciones de OEM no provocan llamadas filtradas que recorten el conjunto completo.
- El mismo componente puede pasar a otro producto con nuevos datos iniciales sin conservar el anterior ni quedarse indefinidamente en skeleton. Las peticiones previas se cancelan y descartan aunque su respuesta llegue tarde.
- Una vez conocida la inscripción, perder `configuration` en una respuesta no vuelve al selector tradicional: se muestra un fallo de verificación y se mantiene la compra bloqueada.
- Se diferencian incompleto, inexistente, agotado, no disponible, datos insuficientes, ambiguo y válido; además, carga, error de conexión (reintentable), error del contrato y producto retirado (404).
- El resource público puede omitir por completo variantes ocultas/inactivas. La interfaz no inventa su estado administrativo si ese dato no está presente.

## SSR, accesibilidad y diseño

Todos los Hooks son incondicionales y anteriores a los returns de la ficha. El primer render servidor/cliente tiene las mismas selecciones de query y estado de carga; la lectura interactiva ocurre en efectos posteriores a hidratación. `useId` enlaza labels, selectores y estado con IDs deterministas. No se altera SEO, canonical ni enlaces de regreso a Tienda.

Se reutilizan layout y galería existentes. El panel usa fieldset/legend, labels, selects nativos, ayuda `details/summary` operable con teclado, mensajes live, foco visible y controles con área mínima de 44 px. Se evita min-content en fieldsets/selects y no se añade overflow horizontal al contenedor principal.

No se cambió la paleta global ni se crearon imágenes comerciales. Las capturas QA contienen gráficos SVG sintéticos entregados por el interceptor de pruebas, no fotografías publicadas.

## Protección de compra y límite de Etapa E

Para inscritos, los controles de cantidad y agregar al carrito están deshabilitados, y `handleAdd` también rechaza la operación. Incluso un payload del cliente con `purchase_enabled: true` no habilita ese flujo. Una inscripción sin datos suficientes, sin perfil compatible o con preview deshabilitada nunca muestra el selector tradicional como alternativa.

Los productos no inscritos siguen usando el mismo carrito y la identidad `product_id + product_variant_id`; no se modifica su lógica, cantidades, precios ni persistencia. Las pruebas agregan únicamente fixtures al storage de un contexto Chromium desechable; no crean órdenes ni pagos.

**Esto NO es validación de checkout en servidor.** Se respetó la prohibición de modificar esa lógica: no se añadieron guards a POST de órdenes ni se implementó la comprobación vehicular/OEM del carrito. Un cliente HTTP no confiable no se protege mediante botones deshabilitados. Por eso no hay inscripciones comerciales reales y la vista previa está imposible de habilitar en producción en esta etapa. No debe afirmarse que un POST directo ya exige el contexto nuevo.

Antes de permitir compras configurables, Etapa E deberá:

1. Resolver identidad persistente de inscripción y reglas de rollback frente a slugs/nombres modificados.
2. Revalidar producto/variante activos y visibles, selección vehicular/OEM en una misma fila y selección comercial inequívoca.
3. Conservar y validar contexto sin cambiar la identidad de línea existente.
4. Recalcular precio/stock/surtido en servidor y preservar idempotencia, reservas y pagos actuales.
5. Rechazar omisión/manipulación del contexto, clientes viejos y carritos persistidos incompatibles.
6. Autorizar después una activación pública gradual y una política de reversión compatible con clientes antiguos.

No se implementa ninguno de esos cambios de carrito/checkout en esta entrega.

## Pruebas y reproducción

```bash
npm test
npx tsc -b
PLAYWRIGHT_MODULE=/ruta/a/playwright/index.mjs node scripts/verify-product-configurator.mjs
```

El recorrido monta e hidrata el **ProductDetailPage real y CartProvider real** con SSR y API sintéticos; no simula un configurador alternativo. El servidor de QA se limita a loopback y se cierra al terminar. No llama a producción; bloquea requests externos y cualquier escritura HTTP. La navegación entre productos reutiliza la misma instancia para probar carreras.

Se comprueban las siete resoluciones 1440/1280/1024/768/430/390/360: sin overflow global, campos/botones dentro del viewport y ≥44 px, vehículo/OEM/memoria, precio/SKU/imagen, ayuda por teclado y foco visible. También entrada filtrada, selección directa, multi-OEM, agotado, ambigüedad, datos incompletos, autoridad perdida, perfiles desconocidos/deshabilitados, conexión fallida/reintento, respuestas obsoletas y carrito tradicional/simples.

El 503 provocado es una respuesta controlada para comprobar recuperación, no un fallo de producción; se registra aparte del conjunto de errores JS/hidratación. Las pruebas PHP se ejecutan exclusivamente con la base aislada `upgrade_test`, guardada por `Tests/TestCase.php`; nunca sobre el catálogo comercial `upgrade`.

Resultados finales:

- Frontend completo: **145/145 PASS**, incluidas las 33 pruebas del resolvedor, 6 nuevas de ficha/estados SSR y las regresiones existentes. Log: `/tmp/upgrade79-stage-d-frontend-tests.log`.
- Backend completo: **728/728 PASS, 7696 assertions**, exclusivamente `upgrade_test`. Incluye las 5 pruebas nuevas del registro. Variables de proceso: APP_ENV testing, DB_DATABASE/TEST_DB_DATABASE upgrade_test, MySQL loopback, WEBPUSH_QUEUE_CONNECTION database; sin editar `.env`.
- Chromium: siete resoluciones **PASS**, sin overflow, errores de hidratación ni errores JS inesperados; selección, referencias, imágenes/precios/SKU, errores/reintento y respuestas obsoletas **PASS**. Ayuda y foco probados con teclado. Registro/compra protegidos **PASS**. Carrito tradicional y producto simple **PASS** con fixtures y sin POSTs.
- Reporte final: `/tmp/upgrade79-configurator-view.5pT4Fl/report.json`; capturas desktop/móvil en el mismo directorio. El único error HTTP registrado es el 503 intencional de la prueba de recuperación, separado de errores JS/hidratación. Cero escrituras HTTP y cero requests externos.
- TypeScript y Pint `--test --dirty`: **PASS**.
- Build cliente y SSR: **PASS**, fuera del dist del usuario, en `/tmp/upgrade79-stage-d-validation.y4WSfr/client`.
- Prerender: **4 páginas PASS**, dominio canónico `https://upgradecolombia.com`, API únicamente `http://127.0.0.1:8000`.
- SHA-256 `public/sw.js` idéntico al build: `43338314702133f01e4df46edf0e9640229a0da55f593d0773104e6bcbfa3482`.
- Relectura `upgrade`: registro vacío, preview false, categoría 6 y campos 12/13 intactos; productos, variantes, inventory_items, inventory_stocks e inventory_movements siguen en cero. No se modificaron estos datos durante la etapa.
- Se conservan los avisos conocidos de chunks >500 kB y de HMR/dep-scan de otras pruebas. No se amplió el alcance para corregirlos.

**Etapa D finalizada en modo vista previa local.** No hay bloqueo para revisar la integración visual. La activación comercial permanece expresamente bloqueada por la ausencia de validación de contexto de Etapa E y por la decisión pendiente sobre identidad estable de la inscripción.

## Desactivación y rollback local

Mantener `preview_enabled: false` oculta la interacción pero conserva el requisito y el bloqueo para inscritos. No retirar una inscripción comercial para habilitar silenciosamente el selector tradicional. En esta entrega el registro real sigue vacío, por lo que no hay datos comerciales que deshacer. Revertir solo estos archivos debe conservar todos los cambios anteriores de B/C/PWA. Sin migraciones ni eliminación de datos.

No hubo commit, push, deploy, cambios de hosting ni modificaciones de producción, PWA, Wompi, reservas o checkout.
