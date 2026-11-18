# Datos para envío por producto y variante

Release del 18 de noviembre de 2026. Cambio exclusivamente frontend sobre `e1aed39ee4901bf1511c3f788fba8c102a7951bd`.

## Uso en el CRM

1. Abrir el editor existente de productos, con los permisos habituales de Catálogo/Inventario.
2. En **Precio → Datos para envío**, completar el paquete listo para despachar:
   - **Peso embalado (g)**: gramos enteros, incluido el embalaje.
   - **Largo (cm)**, **Ancho (cm)** y **Alto (cm)**: centímetros, con hasta un decimal.
3. Registrar los valores reales de cada referencia. El formulario no introduce un peso ni dimensiones predeterminados.
4. En una variante con el mismo embalaje, conservar **Usar peso y medidas generales del producto**.
5. Si su embalaje es distinto, desmarcar la opción y completar sus medidas. Cada campo vacío seguirá heredando únicamente ese dato general, conforme al comportamiento existente de Laravel.
6. Pulsar **Guardar producto** y volver a editar para consultar los datos persistidos.

Los datos incompletos no impiden otras ediciones del catálogo histórico. Se indica qué falta para cotizar; el backend mantiene el rechazo de cotizaciones sin datos logísticos obligatorios. Medidas completas no garantizan cobertura ni tarifa.

## Contrato existente reutilizado

- No hay cambios de backend, tablas ni migraciones.
- Los endpoints administrativos existentes reciben `weight_grams`, `length_mm`, `width_mm` y `height_mm`, tanto generales como por variante.
- La interfaz usa cm; la API usa mm enteros. Ejemplo: `12.3 cm → 123 mm`. Una precisión mayor no se redondea silenciosamente.
- Los campos vacíos se envían como cadenas vacías para la conversión a `null` de Laravel. En variantes, `null` significa heredar el dato general, sin copiarlo ni duplicarlo.
- Los overrides parciales históricos se conservan. Marcar herencia limpia explícitamente los overrides al guardar; alternarla sin guardar conserva el borrador propio.
- No se modifica `requires_shipping`: se respeta su valor existente, incluidos productos no sujetos a envío físico.
- `ShippingQuoteService` ya utiliza `ShippingPackageBuilder` y `LogisticsSnapshotResolver`. Estos resuelven los datos propios de cada variante y su herencia antes de llamar al proveedor.
- No se cambian cálculos de precios, existencias, compatibilidades, carrito, checkout, Wompi ni Service Worker.

## Recuperación y alcance

El directorio temporal anterior desapareció sin un commit del cambio. El parche y sus pruebas se recuperaron desde las acciones registradas en la sesión previa; no se rediseñó el formulario ni se añadieron funciones comerciales.

La recuperación se realizó en un worktree nuevo y aislado. Los repositorios originales y sus cambios pendientes se preservaron. Se mantuvo el pin del backend publicado `35600ea3e51d1dda809c513fc6fd614d5e34c088`. El commit backend posterior `d67a6e2` falló en validación y no llegó a desplegarse; no se reintenta ni se mezcla con este release.

## Validación del release

- Dependencias instaladas con `npm ci`; sin cambios de versiones ni lockfile.
- Suite frontend: **291/291 PASS**, incluidas 13 pruebas de embalaje.
- Chromium con el formulario real y respuestas interceptadas: **29 escenarios PASS**. Creación/edición, Backspace, Ctrl+A, decimales, inválidos, herencia, overrides, duplicación, error 422 y recuperación.
- Responsive sin overflow en **1440, 1024, 768, 430, 390 y 360 px**.
- Contrato Laravel: **14 comprobaciones PASS** usando sus reglas de validación, modelos y generador de paquetes reales, en memoria, sin PDO y con toda ejecución SQL prohibida. Incluye producto simple, overrides parciales, herencia y rechazo previo al proveedor cuando falta peso.
- TypeScript, build cliente, SSR y prerender: **PASS**. Cinco páginas públicas prerenderizadas mediante lecturas GET del catálogo.
- `git diff --check`: **PASS**. No se incluyen artefactos generados de `dist`, credenciales, configuración privada ni herramientas DEMO.
- Aviso no bloqueante del build: chunk mayor a 500 kB; no se amplía este release para optimizarlo.

No se afirma una escritura HTTP/SQL real sobre productos: los guardados del navegador se interceptaron y las pruebas Laravel no utilizan bases existentes. No se enviaron cotizaciones reales durante estas pruebas.

## Publicación y verificación

Se publica mediante el workflow existente del frontend en `main`, con sus tests, preflight remoto, comprobación del backend/pin/receipt, respaldo automático de código, integridad del paquete y controles HTTP. No se modifica el workflow ni se ejecutan migraciones.

Después de publicar:

1. Verificar SUCCESS del workflow correspondiente al SHA del release.
2. Comparar los assets públicos con el paquete compilado y confirmar que incluyen los controles de envío.
3. En una sesión administrativa autorizada, abrir un producto sin guardar y localizar **Datos para envío** y la casilla de herencia de sus variantes.
4. La persistencia real en producción se comprobará únicamente durante una edición comercial autorizada, no generando datos de prueba.

Si falla la publicación, detener la secuencia. Usar el respaldo de código creado por el workflow tras verificar su integridad y el estado del frontend; no cambiar bases, imágenes almacenadas ni el backend para recuperar este cambio visual. No repetir pushes ni relajar el pin/preflight para forzar el resultado.

## Envia.com: comprobaciones pendientes

- Esta sesión no dispone de identidad SSH aceptada por Hostinger; el SSH manual del propietario sigue siendo válido. No se identifica esto como caída del servidor.
- La configuración real reportada previamente (orígenes, URLs productivas, token privado y caché) no equivale a una cotización aceptada y debe revalidarse mediante lectura antes de la consulta comercial.
- No se asignaron automáticamente medidas a productos reales ni a las variantes 64/65. Deben comprobarse sus datos efectivos actuales.
- Hace falta confirmar un destino real autorizado y completo y el origen de la sede de surtido. Cali conserva sus datos y sus pendientes: nunca se cambia de sede para eludirlos.
- Solo con esos datos y una credencial productiva válida puede consultarse una tarifa sin crear pedidos, guías ni cargos. Hasta recibir una tarifa válida, **Envia.com no se declara operativo de extremo a extremo**.
- Validación visual en Safari/iPhone físico pendiente; las pruebas móviles se realizaron con Chromium.
