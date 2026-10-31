# Diagnóstico HTTP 500 del CRM local

Fecha: 30/10/2026.

## Resultado

Resuelto levantando el backend Laravel habitual en http://127.0.0.1:8000. El usuario confirmó que, después de recargar, el listado de cotizaciones del CRM local vuelve a cargar correctamente.

No fue necesario modificar código de aplicación, esquema, dependencias, permisos ni configuración. Los PDFs, WhatsApp manual y correo de prueba conservan su funcionamiento.

## Causa raíz confirmada de ambos errores

| Solicitud real | Causa |
| --- | --- |
| GET /api/admin/notifications/unread-count | Vite no podía conectar con el backend local detenido en :8000; el proxy devolvía 500 antes de llegar a Laravel |
| GET /api/admin/quotations?page=1&per_page=20 | La misma indisponibilidad del backend, no un fallo independiente de cotizaciones |

Evidencias obtenidas antes de cambiar nada:

1. El frontend escuchaba en 127.0.0.1:5173, pero no existía ningún listener en :8000 ni proceso del servidor Laravel.
2. La conexión directa a http://127.0.0.1:8000/api/health fallaba con curl exit 7, conexión rechazada.
3. Ambas solicitudes mediante :5173 devolvían HTTP 500, Content-Type text/plain y cuerpo vacío. No eran respuestas JSON de excepciones Laravel.
4. El destino efectivo del proxy de desarrollo era http://127.0.0.1:8000.
5. storage/logs/laravel.log no recibió ninguna entrada al reproducir esos 500. Antes de la intervención su última modificación era 04:52:18 -0500, mientras la reproducción fue aproximadamente a las 13:28 -0500.
6. Al levantar únicamente Laravel, health devolvió 200 y ambas rutas protegidas pasaron inmediatamente de 500 a 401 sin sesión. Después se comprobaron respuestas autenticadas 200 sobre upgrade_test y el usuario confirmó el listado en su CRM habitual.

Por tanto, el fallo era compartido en el transporte frontend → backend. Las peticiones fallidas no alcanzaban los controladores ni consultaban MySQL.

### Archivos y líneas implicados, sin modificar

- vite.config.ts:15: destino del proxy; :38 y :39: delegación de /api y /sanctum.
- scripts/public-seo-plugin.mjs:28: obtiene el destino local configurado.
- node_modules/vite/dist/node/chunks/config.js:22004: el manejador de error del proxy devuelve 500 text/plain y finaliza la respuesta sin cuerpo.
- backendupgrade/app/Http/Controllers/Api/CrmNotificationController.php:37: unreadCount; consulta filtrada por usuario y read_at.
- backendupgrade/app/Http/Controllers/Api/QuotationController.php:19: index; validación, materialización de vencimientos y paginación.

No existe una excepción Laravel actual asociada a esos dos 500 que deba corregirse en un controlador. El error de conexión ocurre antes. No se modificó el manejador de Vite para ocultarlo.

El log sí contiene errores históricos de pruebas, entre ellos un fallo anterior de un modelo anónimo de test al resolver employee y fallos de correo simulados deliberadamente. Sus marcas testing, fechas y stacks de tests no corresponden a los 500 actuales. La regresión actual de esos tests pasó. La prueba intencional de fallo de correo puede volver a dejar un warning testing; no representa un envío real fallido.

## Comprobaciones locales

Verificadas mediante lectura, con transacción SQL READ ONLY al inspeccionar upgrade:

- APP_ENV=local.
- Conexión efectiva: MySQL/MariaDB en 127.0.0.1:3306, base upgrade.
- XAMPP: @@basedir=/opt/lampp; MariaDB 10.4.32.
- Las tablas crm_notifications y quotations existen.
- crm_notifications incluye user_id, read_at y created_at.
- quotations incluye id, status, branch_id, sales_employee_id y valid_until.
- El administrador local activo tiene notifications.view, quotations.view, quotations.update, orders.view y orders.create.
- El driver de sesión local es file.
- Versiones instaladas: symfony/mime v7.4.22 y dompdf/dompdf v3.1.6.
- Composer Audit: sin advisories ni paquetes abandonados.

No se ejecutaron migraciones, ALTER TABLE, actualizaciones de paquetes, limpieza de cachés ni cambios de .env. No se realizaron escrituras automatizadas sobre upgrade.

Los endpoints de conteo/listado no generan PDFs ni llaman al transporte de correo. Su funcionamiento autenticado y los documentos se verificaron con las dependencias actuales; no se encontró regresión de Mime o Dompdf.

## Corrección aplicada

Se inició el servidor habitual desde backendupgrade:

    php artisan serve --host=127.0.0.1 --port=8000

Se dejó activo junto al frontend existente en :5173. No fue necesario reiniciar Vite.

Los servidores temporales de QA en :5198/:8198 se cerraron al terminar. No reemplazan al backend habitual de :8000. Para usar el CRM posteriormente deben mantenerse activos tanto Laravel como Vite; si Laravel se detiene de nuevo, el proxy volverá a rechazar las peticiones.

## Peticiones repetidas

No se encontró un bucle de reintentos anormal:

- CrmLayout.tsx:411 programa el conteo cada 60 segundos, solo con documento visible; también puede actualizarlo ante visibilidad o eventos de notificaciones.
- La limpieza del efecto cancela el intervalo y los listeners.
- AdminQuotationsPage.tsx:12 carga ante cambios de filtros/página mediante un callback estable; no reintenta recursivamente por un 500.
- src/main.tsx:15 conserva React StrictMode. En desarrollo puede duplicar las peticiones iniciales de montaje; no equivale a un bucle infinito.
- En navegador, durante 64 segundos sin clicks ni navegación, se observaron exactamente 1 consulta de no leídas y 0 recargas del listado de cotizaciones.

No se desactivó StrictMode ni se cambiaron efectos, timers, validaciones o manejo de excepciones.

## Validación automatizada

Todas las escrituras se limitaron a upgrade_test, con entorno testing, conexión loopback y verificación de SELECT DATABASE() y XAMPP antes de crear fixtures. Las pruebas feature usan DatabaseTransactions. No se vaciaron bases ni se borraron fixtures previos.

| Prueba | Resultado |
| --- | --- |
| Regresión específica de endpoints | 1/1 PASS, 26 aserciones |
| CommercialDocumentsTest + MimePatchSecurityTest | 19/19 PASS, 198 aserciones; incluye la prueba específica anterior |
| Suite frontend completa | 175/175 PASS |
| Pint del test PHP modificado | PASS |
| Sintaxis del runner de navegador | PASS |
| git diff --check del alcance | PASS; se excluyó dist en frontend por cambios previos ajenos |
| Composer Audit | Sin vulnerabilidades ni paquetes abandonados |
| Service Worker SHA-256 | Sin cambios |

La regresión backend es seleccionada, no una nueva ejecución de toda la suite backend. No se ejecutaron pruebas con RefreshDatabase que pudieran borrar datos de pruebas anteriores.

### Endpoints y autorización

Con sesión autenticada del administrador de QA:

- GET /api/admin/notifications/unread-count: 200 y conteo numérico.
- GET /api/admin/quotations?page=1&per_page=20: 200, per_page=20 y cotización de prueba presente.
- Listado de órdenes: 200.

Con Usuario:

- Conteo personal: 200, sin mezclar notificaciones de otro usuario.
- Cotizaciones y ventas propias: 200.
- Listado administrativo de cotizaciones y PDF administrativo de ventas: 403.

Sin sesión: 401. Con cuenta inactiva: 403. No se relajaron permisos.

### Navegador real

CRM React + Laravel real, sin mocks de API y con base upgrade_test:

- 6 escenarios: Administrador y Usuario × cotización, orden pendiente y venta pagada de prueba.
- 71 respuestas API; todas verificadas con la marca de base upgrade_test.
- Listado de cotizaciones visible y detalle abierto mediante el botón real.
- Descarga y regeneración de PDF: PASS.
- WhatsApp manual: teléfono/mensaje revisables y enlace habilitado tras descargar; no se abrió el chat ni se envió ningún mensaje.
- Laravel Mail con PDF adjunto mediante array: PASS, sin correos reales.
- Listados, detalles y documentos de ventas pendientes/pagadas: PASS.
- Anchos 1440, 1280, 1024, 768, 430, 390 y 360: PASS.
- Errores de consola y respuestas 5xx: ninguno.
- Observación de sondeo de 64 segundos: PASS.
- Estados e ítems de las operaciones QA, filas de existencias y movimientos: sin cambios por las acciones de documentos.

Las fixtures de navegador son sintéticas, no compras ni pagos reales. No se ejecutaron operaciones de Wompi, checkout ni movimientos de inventario.

La confirmación del usuario sobre :5173 validó además el listado en el CRM habitual conectado a upgrade, sin usar sus credenciales en scripts de pruebas.

## Archivos cambiados en esta tarea

Ningún archivo productivo corregido: la solución fue operativa.

Solo se amplió la validación:

- backendupgrade/tests/Feature/CommercialDocumentsTest.php: regresión de conteo, listado, ventas y autorización.
- upgrade79-web/scripts/verify-commercial-documents.mjs: comprobaciones explícitas de los endpoints, observación del sondeo y rechazo de respuestas 5xx.
- Este informe.

Evidencias locales, sin cambios de reglas de Git:

- [Reporte de navegador](docs/qa/http500/browser-report.json).
- [Cotizaciones administrativas](docs/qa/http500/cotizaciones-admin.png).
- [Documentos de Usuario en móvil](docs/qa/http500/cotizaciones-usuario-mobile.png).

Registros de ejecución:

- /tmp/upgrade79-http500-endpoints.log.
- /tmp/upgrade79-http500-backend-regression.log.
- /tmp/upgrade79-http500-frontend-regression.log.
- /tmp/upgrade79-http500-browser.log.
- /tmp/upgrade79-documents-browser-SLFAAK/report.json.
- /tmp/upgrade79-http500-pint.log.
- /tmp/upgrade79-http500-audit.json.

SHA-256 de public/sw.js:

    43338314702133f01e4df46edf0e9640229a0da55f593d0773104e6bcbfa3482

Sin commit, push, deploy, acceso a Hostinger/producción ni cambios en Wompi, checkout, inventario o PWA.
