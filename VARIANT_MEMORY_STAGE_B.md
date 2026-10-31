# Etapa B: atributos técnicos por variante

No activa el configurador público. No modifica carrito, checkout, órdenes, reservas ni pagos.

## Preparación de catálogo local

La categoría debe existir con slug `pantallas-android`. Puede crearse en el módulo **Categorías** con el nombre **Pantallas Android**. El comando no crea categorías ni modifica otras categorías.

Desde `backendupgrade`:

```bash
php artisan products:prepare-variant-memory-fields
php artisan products:prepare-variant-memory-fields --apply
```

El primer comando solo inspecciona. El segundo agrega únicamente `ram_gb` y `almacenamiento_gb`, numéricos, de variante, opcionales y con unidad GB. Es idempotente y se niega a sobrescribir definiciones incompatibles. Solo admite entornos local/testing con conexión MySQL loopback y base efectiva `upgrade` o `upgrade_test`.

Los campos generales existentes `ram` y `almacenamiento` conservan sus IDs, scope y valores. No se copian al producto ni a las variantes. No se interpretan nombres como «8/128».

## Uso en el CRM

1. Seleccionar Pantallas Android en Crear/Editar producto.
2. Agregar o abrir una variante.
3. En **Detalles de esta variante**, escribir RAM (GB) y Almacenamiento (GB), sin texto de unidades: por ejemplo, `8` y `128`.
4. Mantener SKU, precios y compatibilidad en sus controles existentes. Para OEM propio, desmarcar la herencia general y seleccionar el vehículo y su sistema registrado.
5. El aviso de preparación informa si faltan datos. No certifica compatibilidad física y no impide guardar una variante histórica con valores opcionales vacíos. Los valores informados deben ser enteros positivos representables por el campo SQL.

## Semántica de actualizaciones

- `variants[].specs`: omitir una clave conserva su valor. Enviar `null` o cadena vacía limpia solo esa clave opcional. `specs: {}` no borra todas las especificaciones. Esto no convierte la lista exterior `variants[]` en un PATCH: esa lista mantiene su contrato existente.
- Categorías: una lista de campos enviada por un cliente API se combina por ID de forma predeterminada. `replace_fields: true` solicita reemplazo explícito; el editor CRM envía esa marca porque trabaja con la lista completa.
- Se rechaza omitir/eliminar un campo con valores históricos durante reemplazo. También se rechaza cambiar su tipo o scope. Puede desactivarse sin borrar los valores.
- Las actualizaciones de categorías son transaccionales. Un rechazo no deja un renombre o una modificación parcial.
- Las especificaciones siguen llegando mediante `specs` en los recursos existentes; no se añaden costos al contrato público.

## Validación reutilizable

Backend: `VariantTechnicalReadiness::assess($variant, $requiresOem = null)`.
Frontend: `assessVariantTechnicalReadiness(...)`.

Ambas distinguen preparación estructural y certificación física. El backend reutiliza el validador de compatibilidades registrado cuando OEM es obligatorio. La evaluación no reserva stock, no habilita compras y no asigna compatibilidades nuevas.

## Reversión

No hay migraciones ni tablas nuevas. Al revertir la interfaz pueden conservarse las definiciones opcionales y los valores almacenados: no es necesario eliminarlos. No se debe restaurar una sincronización destructiva para borrar atributos por omisión. El trabajo PWA queda separado.

## Validación de la entrega inicial

- Backend completo: 721 tests PASS, 7565 assertions, únicamente `upgrade_test`.
- Frontend completo: 105 tests PASS.
- Pint: PASS.
- TypeScript y compilaciones cliente/SSR: PASS. Artefactos en `/tmp/upgrade79-stage-b-build.ATwjJl/client`, sin sobrescribir el `dist` modificado previamente por el usuario.
- Prerender: cuatro páginas generadas contra `http://127.0.0.1:8000`.
- Playwright: ProductForm real con fixtures en memoria, sin guardar, a 1440/768/390/360 px; campos usables, sin overflow horizontal y sin errores de página.
- La suite backend inicial detectó un test de Push dependiente del entorno: `WEBPUSH_QUEUE_CONNECTION=sync` frente a la expectativa `database`. Se reprodujo aislado y pasó fijando `WEBPUSH_QUEUE_CONNECTION=database` solo para el proceso de tests. La suite completa se repitió con ese ajuste y pasó; no se modificó `.env` ni código Push.
- Permanecen avisos de HMR/dep-scan durante tests y chunks mayores de 500 kB en build; no se cambiaron esos módulos.

Tras autorización expresa del usuario, el 28 de octubre de 2026 (America/Bogota) se creó únicamente en la base local `upgrade` la categoría activa Pantallas Android (ID 6, slug `pantallas-android`) y sus campos opcionales por variante RAM (`ram_gb`, ID 12) y Almacenamiento (`almacenamiento_gb`, ID 13), numéricos y con unidad GB. Se verificó la conexión efectiva local antes de escribir y se ejecutó la preparación de forma transaccional. Repetir la preparación no alteró ni duplicó los campos. La categoría Radio y su campo histórico permanecieron intactos; productos, variantes y movimientos de inventario conservaron sus conteos en cero. No se modificó producción ni se activó el configurador público o la exigencia OEM.

## Continuación: validación funcional

### Contraste con el catálogo previamente auditado

Se compara con la evidencia ya registrada en [la guía BMW F30, paso 8](docs/guias/bmw-f30/GUIA.md#paso-8--entender-la-limitación-de-ram-y-almacenamiento); no se consulta ni modifica producción durante esta validación. Los IDs no se trasladan entre entornos.

| Campo | Contrato de producción previamente auditado | Base local `upgrade`, categoría 6 |
| --- | --- | --- |
| `ram` | Numérico, producto, opcional | No existe en esta categoría nueva |
| `almacenamiento` | Texto, producto, obligatorio | No existe en esta categoría nueva |
| `ram_gb` | No existía en la auditoría previa | Numérico, variante, opcional, GB, ID 12 |
| `almacenamiento_gb` | No existía en la auditoría previa | Numérico, variante, opcional, GB, ID 13 |

Esta diferencia es intencional: no se recrearon definiciones históricas inexistentes en la categoría local ni se movió el campo `ram` de Radio (ID 11). En un catálogo con campos históricos, la preparación agrega las dos definiciones nuevas conservando las anteriores. La prueba de navegador combina campos generales históricos y nuevos por variante para comprobar su coexistencia; la categoría local no se modifica para producir ese escenario.

### Comprobaciones sobre el formulario y la API

- `scripts/verify-variant-memory.mjs` monta el **ProductForm real** y su cliente API en StrictMode, con catálogos/productos exclusivamente en memoria. Bloquea solicitudes externas, intercepta escrituras y no registra Service Workers. No es una prueba de login ni un guardado comercial en `upgrade`.
- Tres variantes: CIC con 4/64, NBT con 8/256 y una histórica sin memoria estructurada. Son fixtures de software, no referencias certificadas. Los nombres libres y los valores generales no rellenan los campos de memoria de la variante histórica.
- Editar dos variantes, enviar el FormData real, remontar con la respuesta y recuperar los valores; limpiar RAM en una sin cambiar la otra; rechazar cero antes de enviar. El payload conserva SKU, precio, costos y la tupla vehicular/OEM.
- Alta de primera y segunda variante: se detectó y corrigió que **+ Agregar variante** solo actuaba con la lista vacía. Ahora agrega un borrador vacío en cada clic; no duplica atributos ni datos comerciales.
- A 1440/1280/1024/768/430/390/360 px: controles accesibles, sin overflow horizontal y sin errores de consola en el recorrido.
- `VariantMemoryAttributesTest` ejecuta por separado persistencia real y endpoints Laravel en `upgrade_test`: crear, actualizar, recuperar, omitir y limpiar; aislamiento entre IDs; listado administrativo y `/api/products` + `/api/products/{slug}`; metadatos de los campos, privacidad de costos, precios/SKU/OEM intactos y cero inventario en estas fixtures. Las pruebas se revierten mediante RefreshDatabase.

Para repetir el navegador sin instalar dependencias del proyecto, indicar una instalación disponible de Playwright:

```bash
PLAYWRIGHT_MODULE=/ruta/a/playwright/index.mjs node scripts/verify-variant-memory.mjs
```

La base de pruebas se verificó explícitamente con `SELECT DATABASE() = upgrade_test`, MySQL loopback y entorno `testing`. El guard de `Tests/TestCase.php` vuelve a comprobar la base efectiva antes de RefreshDatabase. Los tests backend se ejecutan con estas variables de proceso, sin editar `.env`:

```bash
APP_ENV=testing DB_URL='' DB_HOST=127.0.0.1 DB_DATABASE=upgrade_test \
DB_USERNAME=root DB_PASSWORD='' TEST_DB_CONNECTION=mysql TEST_DB_DATABASE=upgrade_test \
WEBPUSH_QUEUE_CONNECTION=database php artisan test --compact
```

### Preparación para Etapa C (sin implementarla)

Consumir `variants[].id`, `specs.ram_gb`, `specs.almacenamiento_gb` y las filas de compatibilidad efectiva existentes. Mantener la coincidencia vehículo/OEM en una misma fila y conservar más de un candidato cuando exista ambigüedad: nunca elegir una referencia arbitrariamente. Los campos generales históricos no son un fallback por variante. La evaluación de preparación estructural no es una activación comercial ni certificación física.

La Etapa C, el configurador público, el carrito/checkout y cualquier activación en producción siguen fuera de esta entrega. No hay migraciones ni escrituras en el catálogo comercial local durante esta continuación.

### Resultado final de la continuación

- Atributos backend: 13/13 PASS, 153 assertions.
- Backend completo: 723/723 PASS, 7660 assertions, en `upgrade_test`.
- Frontend completo, repetido después de corregir Agregar variante: 106/106 PASS.
- Navegador: siete anchos PASS, además de alta de segunda variante vacía; cero errores de consola y cero escrituras en base de datos. Capturas y caché aislados en `/tmp/upgrade79-variant-memory-qa.TfqdVg`.
- TypeScript, Pint, build cliente, build SSR y prerender de cuatro páginas contra API local: PASS. Build fuera del `dist` del usuario: `/tmp/upgrade79-stage-b-validation.6VW0XX/client`.
- Relectura de `upgrade`: categoría 6 y campos 12/13 intactos, dos categorías en total, Radio intacta y todos los conteos de productos, variantes, especificaciones e inventario en cero.
- Sin cambios funcionales adicionales en backend. En esta continuación se modificaron únicamente `ProductForm.tsx`, `tests/variant-memory.test.mjs`, `scripts/verify-variant-memory.mjs`, `tests/Feature/VariantMemoryAttributesTest.php` (backend) y este documento. Se conservaron todos los cambios previos, incluidos los pendientes de PWA.

Etapa B validada localmente y terminada dentro de este alcance. La comparación de producción se apoya en la auditoría anterior, no en una revalidación del servidor actual. No se afirma un recorrido de login + guardado comercial de extremo a extremo: las comprobaciones del formulario y de persistencia se aíslan deliberadamente. El warning conocido de chunks >500 kB y los avisos de HMR/dep-scan de otras pruebas permanecen fuera de alcance.
