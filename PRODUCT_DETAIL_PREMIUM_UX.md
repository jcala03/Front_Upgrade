# Ficha pública y configurador — rediseño UX/UI local

## Resultado

Se rediseñó la ficha pública real, tomando como referencia el producto QA local `qa-local-pantalla-bmw-f30-multi-oem`. La intervención es de presentación: no se cambiaron el resolvedor, los Hooks de configuración, las reglas comerciales, los IDs, los precios calculados, las cantidades, el carrito, checkout, inventario ni backend.

### Galería

- Imagen principal con `object-fit: contain`, centrada y sin recortes; fondo oscuro y marco discreto.
- Miniaturas debajo, también sin recorte, con selección visible y disposición que se reorganiza sin scroll horizontal global.
- Galería fija dentro de su columna al desplazarse en escritorio; comportamiento normal apilado en móvil.
- Las mismas imágenes principales, de galería y de variante: no se sustituyeron ni modificaron archivos o registros de imágenes.
- Aviso QA compacto y explícito. Los avisos incorporados en las láminas originales se mantienen íntegros; no se editaron para simular fotografías comerciales.

### Jerarquía y compra

Categoría → nombre → compatibilidad resumida → sistema OEM → memoria → bloque comercial único.

El bloque reúne configuración elegida, precio, SKU secundario, disponibilidad, cantidad y compra. Se retiraron las copias que antes aparecían en cabecera y dentro del panel. En configurables no se presenta el SKU del producto padre como si fuera el SKU de una variante todavía no resuelta.

Los controles OEM/memoria consumen exactamente las opciones y callbacks existentes. Se conserva el diferenciador comercial adicional para configuraciones ambiguas, sin seleccionar arbitrariamente una referencia. No reaparece la selección visual de vehículo/año. Las opciones incompatibles siguen deshabilitadas y los mensajes de carga, error, reintento y datos incompletos siguen disponibles.

La ficha QA mantiene `purchase_enabled=false`: se puede revisar la configuración, no comprarla. La disponibilidad configurable conserva «surtido por confirmar».

### Información secundaria

Descripción, Especificaciones, Compatibilidad y Antes de comprar se presentan mediante desplegables nativos accesibles, fuera de la columna comercial. “Ver detalle” abre el apartado de compatibilidad.

RAM y almacenamiento utilizan etiquetas comerciales y unidades GB, sin claves `ram_gb`/`almacenamiento_gb` en el texto comercial. Se usan los metadatos existentes para las demás etiquetas/unidades y se mantiene la precedencia visual de las especificaciones de variante. No se modifican los datos originales.

El resumen vehicular se genera desde las filas y nombres registrados. No inventa años, no fusiona rangos independientes y no muestra un vehículo arbitrario si existen varios. Su función es exclusivamente informativa; no participa en la validación de compra ni reemplaza el resolvedor.

## Archivos de esta intervención

| Archivo | Responsabilidad |
| --- | --- |
| `src/pages/ProductDetail/ProductDetailPage.tsx` | Jerarquía, galería, bloque comercial único y secciones secundarias. Los handlers y protecciones de compra preexistentes se conservaron. |
| `src/pages/ProductDetail/ProductDetailPage.css` | Presentación oscura, acentos Upgrade, galería contenida, botones y responsive local a la ficha. |
| `src/pages/ProductDetail/ProductConfigurator.tsx` | Panel de selección simplificado y resumen comercial separado, sin duplicar datos. |
| `src/pages/ProductDetail/productPresentation.ts` | Resumen vehicular y etiquetas/unidades de presentación; avisos QA explícitos. |
| `tests/product-configurator-view.test.mjs` | Regresión adaptada a la eliminación de la duplicación comercial. |
| `tests/product-detail-presentation.test.mjs` | Siete pruebas nuevas de presentación, rangos, metadatos, SSR y ausencia de duplicación. |
| `scripts/verify-product-detail-premium-local.mjs` | QA real local de solo lectura y capturas antes/después. |
| `PRODUCT_DETAIL_PREMIUM_UX.md` | Este informe. |

Las capturas/reportes están en `docs/qa/product-detail-premium/`. Los demás cambios pendientes en ambos repositorios pertenecen a tareas anteriores y se preservaron.

## Pruebas

| Validación | Resultado |
| --- | --- |
| Suite frontend completa, `node --test --test-concurrency=1 tests/*.test.mjs` | **170/170 PASS**, 0 fallos, 0 omitidas; 25,58 s. Ejecución en serie para reducir uso de RAM. |
| TypeScript, `npx tsc -b` | **PASS**. |
| QA navegador contra producto 6 y API Laravel local, sin mocks ni escrituras | **PASS** en 1440, 1280, 1024, 768, 430, 390 y 360 px. |
| Producto tradicional 7 y simple 9, API real | **PASS**, cada uno en los mismos siete anchos. |
| Harness SSR + hidratación de componentes reales con fixtures sintéticos | **PASS**, siete anchos de ficha y siete de carrito/checkout; sin errores de hidratación/Hooks. |
| Build cliente | **PASS**, 6,83 s. |
| Build SSR | **PASS**, 1,35 s. |
| Prerender | **PASS**, 10 páginas, con API exclusivamente local. Ficha compilada SSR comprobada: precio único, aviso QA y compra bloqueada. |

### Qué se verificó en la ficha real

- Cero overflow global, imagen cargada con `contain`, miniaturas que cambian a las URLs reales correctas y vuelta a la principal.
- Botones con área mínima 44 × 44 px, selección y foco por teclado.
- CIC y NBT, memorias reales, precio/SKU/stock correctos y una sola aparición de esos datos en la columna comercial.
- Mismo SKU multi-OEM conservado al cambiar OEM; una memoria incompatible no queda seleccionada.
- Especificaciones abiertas con RAM/Almacenamiento y GB, sin claves internas; enlace de compatibilidad operativo.
- Compra configurable protegida, productos tradicionales con su selector previo y compra habilitada conforme a sus reglas.
- Cero errores de página, warnings/errores de consola, peticiones de escritura o peticiones a producción.

### Qué se verificó con fixtures

Varias marcas, vehículo interno único, múltiples vehículos sin selección arbitraria, contexto inválido, referencias ambiguas que requieren diferenciador, agotados, registro deshabilitado/no soportado, metadatos incompletos, respuesta antigua y recuperación tras error de carga.

La regresión de carrito/checkout conserva dos líneas con OEM distintos sobre el mismo SKU, límite de stock compartido, recuperación 422, payload/idempotency key y reconciliación única. **Las respuestas de orden de este harness son simuladas**: no se presenta este test como persistencia SQL ni comunicación real con una pasarela. En esta tarea UX no se crearon órdenes, pagos ni inventario y no fue necesario volver a ejecutar fixtures que escriben en bases de datos.

## Capturas antes/después

Capturadas en la misma ficha QA, seleccionando CIC · 8 GB / 128 GB, precio local $828.000. No son mockups.

| Tamaño | Antes | Después |
| --- | --- | --- |
| Escritorio, 1440 px | [Ficha completa](docs/qa/product-detail-premium/before/product-1440.png) | [Ficha completa](docs/qa/product-detail-premium/after/product-1440.png) |
| Móvil, 390 px | [Ficha completa](docs/qa/product-detail-premium/before/product-390.png) | [Ficha completa](docs/qa/product-detail-premium/after/product-390.png) |

También se incluyen capturas del primer viewport y reportes JSON de ambas fases. El aviso QA y las láminas sintéticas originales no fueron ocultados ni sustituidos.

## Seguridad y límites

- Sin cambios backend, Wompi, checkout, inventario, autenticación, header, footer o navegación global.
- Sin cambios PWA/Service Worker. SHA-256 de `public/sw.js` y de su copia en el build: `43338314702133f01e4df46edf0e9640229a0da55f593d0773104e6bcbfa3482`.
- Builds aislados en `/tmp`, sin regenerar ni sobrescribir el `dist` con cambios previos del usuario.
- Dominio canónico conservado; toda consulta de catálogo de QA/prerender apunta a `127.0.0.1`.
- El warning preexistente de chunks >500 kB sigue fuera de alcance.
- No se procesaron compras/pagos reales ni se activaron compras configurables. Sin commit, push ni deploy.
