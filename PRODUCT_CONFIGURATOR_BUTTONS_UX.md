# Configurador público con botones — validación local

Fecha: 2026-10-29 (America/Bogota). Cambio aditivo de presentación; no reimplementa las Etapas B–F.

## Resultado y causa exacta

Implementado en [la ficha QA local](http://127.0.0.1:5173/tienda/qa-local-pantalla-bmw-f30-multi-oem): botones para OEM, pares RAM/almacenamiento y referencias comerciales ambiguas. Vehículo/año conservan sus controles existentes. Los productos simples y los tradicionales no inscritos mantienen su experiencia anterior.

El desplegable aparecía por tres hechos comprobados:

1. El producto de la base `upgrade`, ID **6**, no estaba inscrito: `ProductConfiguratorRegistry::registration()` devolvía null. `ProductDetailPage` deriva `configuration.required`; si es false y hay variantes, renderiza el selector tradicional.
2. El registro tenía catálogo null, entradas vacías y vista previa false. Los atributos del producto sí estaban completos: variantes 3/4/5, memoria estructurada, metadatos numéricos GB y filas vehiculares/OEM correspondientes.
3. El proceso HTTP de desarrollo en `127.0.0.1:8000` heredaba **APP_ENV=production**, observado en `/proc` del proceso servidor. La configuración de disco/CLI decía local y la base efectiva era XAMPP `upgrade`. Con esa variable heredada, el bloqueo de producción impedía correctamente habilitar la UI, aun después de preparar el opt-in local.

Además, `ProductConfigurator.tsx` también utilizaba selects para OEM/memoria/referencia: no bastaba con inscribir el producto para obtener botones.

Se reinició únicamente el servidor local con `APP_ENV=local php artisan serve --host=127.0.0.1 --port=8000 --no-reload`. No se editó `.env`, no se cambió el bloqueo de producción ni se conectó a Hostinger.

## Configuración explícita y seguridad

`config/product_configurator.php` habilita **solo preview** para el ID 6 bajo todas estas condiciones: APP_ENV local, mysql, host 127.0.0.1, puerto 3306, base upgrade, sin DB_URL que sustituya la conexión. El ámbito del registro contiene esos mismos valores exactos. No se usa slug, nombre ni categoría para decidir la inscripción.

- Respuesta HTTP real del ID 6: `required: true`, perfil `vehicle-oem-memory-v1` versión 1, `ui_enabled: true`, **`purchase_enabled: false`**.
- IDs locales 7–11: configuración null; no se activó la categoría ni el catálogo entero.
- Otros entornos/conexiones, incluido testing por defecto: registro vacío y flags apagados. Los tests pueden inscribir sus propias fixtures mediante el mecanismo existente.
- El guard de `ProductConfiguratorRegistry` sigue bloqueando producción, incluso con flags encendidos. No se alteraron validadores, recursos de órdenes, inventario/reservas, idempotencia ni Wompi.
- No se habilitó compra configurable local: la solicitud autoriza vista previa. El botón de compra continúa bloqueado incluso tras resolver una combinación válida. Los tests aislados de compra siguen comprobando el contexto cuando se habilita expresamente dentro de sus fixtures.

## Diseño y conexión al resolvedor

`ConfigurationOptions` es presentación reutilizable: botones nativos `type=button`, grupo etiquetado, `aria-pressed`, marca de selección, foco visible y soporte Tab/Enter/Espacio. Usa los tonos oscuros y acento existentes de la ficha; los estilos están aislados en `.product-configurator*`, sin nuevo tema global.

La selección llama al mismo `model.select()` → `reconcileSelection()` → `resolveConfiguration()` de Etapa C. No se modificaron esos archivos del dominio ni se creó otro resolvedor.

El hook consulta adicionalmente al resolvedor por los pares reales del vehículo/año, sin restringir OEM, para poder mostrar alternativas registradas bajo otro sistema como **deshabilitadas**. La elegibilidad sigue viniendo de la resolución del OEM actual. No se cruzan RAM y almacenamiento para fabricar combinaciones, ni se crean compatibilidades entre generaciones.

Ejemplo real QA:

| Selección | Variante / SKU | Precio QA COP | Stock agregado |
|---|---|---:|---:|
| CIC o NBT · 4/64 | 3 · `QA-L29-F30-MULTI-464` | 640.000 | 5: Barranquilla 4 + Bogotá 1 |
| CIC · 8/128 | 4 · `QA-L29-F30-MULTI-CIC-8128` | 828.000 | 3 |
| NBT · 8/256 | 5 · `QA-L29-F30-MULTI-NBT-8256` | 1.056.000 | 2 |

CIC → 8/256 y NBT → 8/128 se muestran deshabilitadas, porque esos pares existen para el vehículo pero no para ese OEM. Al cambiar de sistema se conserva 4/64, que sigue siendo válida para el mismo SKU, y se invalida una memoria que ya no corresponde. Precio, SKU, imagen y stock continúan derivando de `selectedVariant` en la ficha existente.

Una referencia agotada puede consultarse con su etiqueta «Agotada» y estado del resolvedor; su compra no se habilita. No se elimina la posibilidad previa de inspeccionar su precio/SKU. La ambigüedad muestra botones de referencias con nombre/SKU y exige selección explícita, sin elegir primera, barata o principal.

## Archivos de esta tarea

Frontend:

- `src/pages/ProductDetail/ConfigurationOptions.tsx` — nuevo componente de opciones.
- `src/pages/ProductDetail/ProductConfigurator.tsx` — OEM/memoria/referencia mediante botones.
- `src/pages/ProductDetail/useProductConfigurator.ts` — opciones de memoria del vehículo obtenidas del resolvedor existente.
- `src/pages/ProductDetail/ProductDetailPage.css` — estados, grid adaptable, foco/hover discretos; respeta movimiento reducido existente.
- `tests/product-configurator-view.test.mjs` — dos regresiones nuevas de botones/estados, pruebas anteriores conservadas.
- `scripts/verify-product-configurator.mjs` — runner de componentes adaptado a botones; mantiene carrito/checkout, filtros, errores y respuestas antiguas.
- `scripts/verify-product-configurator-real.mjs` — runner HTTP/MySQL adaptado a botones.
- `scripts/verify-configurator-buttons-local.mjs` — nuevo recorrido de solo lectura sobre la aplicación local y el producto real ID 6.

Backend, únicamente configuración y su prueba:

- `config/product_configurator.php` — inscripción local por ID y ámbito exacto, solo preview.
- `tests/Unit/ProductConfiguratorLocalPreviewTest.php` — nueve casos sin base de datos: local permitido y otros entornos/catálogos bloqueados.

No se editó `ProductDetailPage.tsx` en esta tarea: su selección, actualización comercial y separación de modo tradicional/configurable se reutilizan. Los diffs anteriores B–F/PWA permanecen intactos.

## Pruebas y evidencias

| Validación ejecutada | Resultado |
|---|---|
| Frontend completo `npm test` | **154/154 PASS**, cero fail/skip |
| TypeScript `npx tsc -b` | PASS |
| Backend: configuración local + casos transaccionales F | **11/11 PASS, 93 aserciones** |
| Subconjunto nuevo de configuración, sin BD | **9/9 PASS, 36 aserciones**; incluido en los 11 |
| Pint `--test --dirty` | PASS |
| Ficha real ID 6 en navegador, sin mocks ni escrituras | **7/7 anchos PASS**: 1440, 1280, 1024, 768, 430, 390 y 360 |
| Navegador de componentes con catálogo sintético | PASS: agotada, inexistente/deshabilitada, ambigüedad con botones, otro fabricante, cambio de vehículo, carga/reintento, respuestas antiguas, SSR/hidratación y carrito/checkout |
| Navegador integral con Laravel HTTP y MySQL reales en upgrade_test | **10/10 controles PASS**, órdenes fixture 421/422, dos OEM del mismo SKU, stock compartido, contexto SQL/CRM, reintentos, pérdida de respuesta/recarga y reconciliación única |
| Build cliente | PASS, 18.94 s |
| Build SSR | PASS, 1.15 s |
| Prerender con API local real | **10 páginas PASS**, canonical `https://upgradecolombia.com` |

La prueba de ficha real verifica botones presentes, pares incompatibles deshabilitados, SKU/precio/stock exactos, cambios consecutivos CIC/NBT, memoria conservada/invalida según corresponda, teclado, compra bloqueada y entrada filtrada que recupera alternativas sin filtros. También abre un producto tradicional y uno simple reales. Cero escrituras, excepciones JS, warnings/errors de consola o solicitudes remotas no permitidas en su resultado final.

Las variantes agotadas y ambiguas se validaron con fixtures sintéticas del runner, **sin alterar stock ni agregar variantes a los productos registrados en upgrade**. La actualización de imagen específica se valida con esas fixtures; la ficha QA real reutiliza sus láminas generales existentes.

En la prueba de compra, los endpoints y SQL son reales; la aprobación/rechazo del proveedor se simula mediante infraestructura CLI aislada y se bloquea la navegación al proveedor. No hubo pagos reales ni cambios a Wompi.

Se corrigieron únicamente dos detalles del propio QA: leer `response.text()` tras la navegación bloqueada al proveedor podía perder el cuerpo aun con 201 correcto; ahora se comprueba su status sin esa lectura innecesaria. Para el producto simple, el recorrido espera el botón habilitado tras hidratación en lugar de comprobarlo antes de terminar el montaje. Ninguna corrección fue sobre lógica comercial.

El build se generó fuera del `dist` del usuario, en `/tmp/upgrade79-configurator-buttons-build-nAEt3x/client`, con `VITE_API_BASE_URL=http://127.0.0.1:8000` explícito para que el prerender no consultara producción. La primera comprobación del destino rechazó el valor de `.env.production` **antes de hacer peticiones**, y se reconstruyó para QA local. Estos artefactos no son un paquete autorizado para producción. Se enlazaron las dependencias locales para ejecutar el SSR temporal; no se instalaron paquetes nuevos.

Logs y resultados locales:

- `/tmp/upgrade79-configurator-buttons-frontend.log`, `...-typescript.log`, `...-backend.log`, `...-pint-final.log`.
- `/tmp/upgrade79-configurator-buttons-build-client.log`, `...-build-ssr.log`, `...-prerender.log`.
- `/tmp/upgrade79-configurator-view.2GzDb3/report.json` — catálogo/respuestas de orden sintéticos.
- `/tmp/upgrade79-configurator-real-CdM1d7/report.json` — HTTP/MySQL reales; datos exclusivos de upgrade_test.
- [Reporte de ficha local](docs/qa/configurator-buttons-20261029/report.json) — aplicación existente en 5173/8000, sin mocks y sin compras.

Capturas reales:

- [Botones escritorio](docs/qa/configurator-buttons-20261029/real-buttons-1440.png).
- [Botones móvil](docs/qa/configurator-buttons-20261029/real-buttons-390.png).
- [Ficha completa escritorio](docs/qa/configurator-buttons-20261029/real-product-1440.png).
- [Ficha completa móvil](docs/qa/configurator-buttons-20261029/real-product-390.png).

Las capturas en `docs/` son locales y esa carpeta tiene una exclusión Git preexistente; no se cambió la exclusión ni se añadieron archivos al índice.

## Integridad y límites finales

Verificación SQL de solo lectura tras las pruebas: `upgrade` conserva seis productos, ocho variantes, doce posiciones de stock, doce movimientos y 31 unidades; **cero órdenes y pagos**. No se migró ni actualizó ningún registro comercial. Los tests con escrituras usaron exclusivamente fixtures propias en `upgrade_test` sin limpiar bases ni alterar las órdenes anteriores de QA.

El Service Worker de fuente y del build temporal mantienen SHA-256:

`43338314702133f01e4df46edf0e9640229a0da55f593d0773104e6bcbfa3482`.

No se modificó PWA, Wompi, permisos, reservas, contratos de checkout, `order_items` ni el resolvedor. El warning conocido de chunks >500 kB permanece fuera del alcance. La suite frontend todavía emite avisos preexistentes de HMR/dep-scan en su infraestructura, con 154 pruebas PASS; el navegador de la ficha real final no reportó errores de consola/hidratación/Hooks.

No hubo commit, push, deploy, acceso a Hostinger ni activación en producción. Queda habilitada únicamente la vista previa local del producto QA revisado; las compras configurables siguen bloqueadas.
