# PDFs comerciales del CRM — implementación local

Fecha: 30 de octubre de 2026.

## Estado y alcance

Implementado en los detalles existentes de Cotizaciones y Órdenes/Ventas, tanto administrativos como propios del rol Usuario:

- Descargar PDF autenticado y regenerable.
- Preparar WhatsApp con el número revisable del cliente, mensaje y descarga. El empleado adjunta manualmente el PDF; no hay envío automático ni integración con WhatsApp Business API.
- Revisar destinatario y preparar un correo con PDF adjunto mediante Laravel Mail.
- En local y testing se fuerza el transporte array, incluso si se configura SMTP o se activa accidentalmente la bandera. No se enviaron correos reales.

No se modificaron Wompi, checkout, inventario, estados comerciales, PWA ni Service Worker. No se ejecutaron migraciones, commit, push, despliegues ni acciones en Hostinger. Los cambios pendientes ajenos de ambos repositorios se conservaron.

## Dependencias y seguridad

Único paquete existente actualizado: symfony/mime v7.4.13 → v7.4.22, conforme a la autorización. Composer Audit termina sin advisories ni paquetes abandonados. La prueba de seguridad rechaza nombres de parámetros MIME con CRLF, espacios, punto y coma o dos puntos y conserva la serialización normal de adjuntos.

Para implementar PDF se añadió dompdf/dompdf v3.1.6 con cuatro dependencias nuevas: dompdf/php-font-lib 1.0.2, dompdf/php-svg-lib 1.0.2, masterminds/html5 2.12.0 y sabberworm/php-css-parser v9.5.0. Ningún otro paquete existente cambió de versión; no hubo eliminaciones.

No se incorporó un módulo comercial paralelo ni un sistema de almacenamiento permanente de PDFs.

## Uso en el CRM

1. Abrir una cotización o una orden/venta mediante su botón de detalle.
2. Pulsar Descargar PDF para una descarga estándar del navegador.
3. Para WhatsApp, pulsar Enviar por WhatsApp, revisar el número y descargar el documento. Después se habilita Abrir WhatsApp. Adjuntar el archivo descargado desde el chat y decidir manualmente cuándo enviarlo.
4. Para correo, pulsar Enviar por correo, revisar/corregir el destinatario y confirmar Enviar correo de prueba. La interfaz informa explícitamente que no se realizó ningún envío real.

En Cotizaciones propias, la acción previa se llama ahora Marcar como enviada: conserva su lógica existente y no se confunde con enviar un correo.

### Tipos de documento

| Registro persistido | Título y archivo |
| --- | --- |
| Cotización | Cotización; COT-000125.pdf |
| Orden pendiente | Orden pendiente; ORDEN-000411.pdf |
| Orden confirmada/completada, con estado de pago paid y abonos completed que cubren un total positivo | Comprobante de venta pagada; VENTA-000411.pdf |
| Cancelación, pago parcial, reembolso o estados inconsistentes | ORDEN-000411.pdf con título/advertencia correspondiente; nunca acredita una venta pagada |

El número de archivo se basa en el ID único del registro. El documento muestra también la referencia comercial original quotation_number/order_number. No cambia la numeración existente. Un mismo registro puede pasar legítimamente de ORDEN a VENTA al cumplirse las condiciones de pago.

Ningún comprobante se presenta como factura electrónica DIAN. Las cotizaciones no acreditan pago ni reserva de inventario. Solo los pagos completed cuentan como abonos.

## Datos históricos y privacidad

Se proyectan explícitamente los snapshots guardados: cliente, vehículo, productos/servicios, variantes, SKU, especificaciones, cantidades, precios, descuentos, cargos y totales. No se recalculan precios ni se sustituyen líneas por el catálogo actual.

El contexto OEM/RAM/almacenamiento se toma de configuration_context cuando existe y de variant_specs históricos cuando corresponde. Las cotizaciones no tienen un campo estructurado configuration_context. Si una línea histórica solo conserva memoria y no OEM, el PDF lo indica; no se deduce del nombre ni del catálogo vigente. Incorporar nuevos snapshots a las cotizaciones requeriría un alcance posterior y no se implementó.

Los datos de contacto del negocio y el nombre de sede se obtienen de las relaciones/configuración existentes; el pie aclara que el contacto del negocio está vigente al generar el documento. No se inventan NIT, dirección ni datos ausentes.

Se excluyen costos, comisiones, notas internas de cliente/vehículo, documento de identidad, VIN y tokens privados. Las observaciones generales de la cotización se incluyen como observaciones comerciales. Los valores del usuario se escapan en Blade.

### Acceso y endpoints

Prefijos existentes:

- /api/admin/quotations/{id}
- /api/admin/orders/{id}
- /api/my/quotations/{id}
- /api/my/sales/{id}

Cada prefijo añade GET /document, GET /pdf y POST /email. No se crean enlaces públicos.

La lectura requiere quotations.view u orders.view, o sus equivalentes _own. Los endpoints propios restringen por user → employee → sales_employee_id; un documento de otro empleado devuelve 404. Una cuenta inactiva recibe 403.

El envío requiere además quotations.update en administración, quotations.send_own en cotizaciones propias, orders.create en órdenes administrativas u orders.create_own en ventas propias. No existe quotations.send administrativo y no se creó ese permiso. El frontend utiliza las mismas cadenas.

Se mantienen CSRF/Sanctum y respuestas privadas no-store, noindex y nosniff. El email solo admite el destinatario revisado; no permite rutas de adjuntos, remitente, CC/BCC ni contenido comercial suministrado por el cliente.

Los nuevos límites tienen contadores independientes: lectura/descarga 30 por minuto y correo 5 por minuto, por usuario. Descargar no consume el cupo de correo.

## Archivos implementados

### backendupgrade

Modificados:

- composer.json: dependencia PDF.
- composer.lock: parche MIME y dependencias nuevas de PDF.
- routes/api.php: doce rutas autenticadas.
- .env.example: preparación documentada y desactivada del correo.

Nuevos:

- app/Http/Controllers/Api/CommercialDocumentController.php.
- app/Services/CommercialDocumentData.php.
- app/Services/CommercialDocumentPdf.php.
- app/Mail/CommercialDocumentMail.php.
- config/commercial_documents.php.
- resources/views/documents/commercial.blade.php.
- resources/views/emails/documents/commercial.blade.php.
- resources/branding/upgrade79-logo.png: copia del logo autorizado existente.
- tests/Feature/CommercialDocumentsTest.php.
- tests/Unit/MimePatchSecurityTest.php.
- tests/Browser/documents-support.php.
- tests/Browser/documents-router.php.
- tests/Browser/documents-fixtures.php.

### upgrade79-web

Modificados:

- src/api/http.ts: Accept opcional en apiDownload; mantiene por defecto el contrato XLSX.
- src/modules/admin/quotations/QuotationDetail.tsx.
- src/modules/admin/orders/OrderDetail.tsx.
- src/modules/crm/my-commerce/MyQuotationsPage.tsx.
- src/modules/crm/my-commerce/MySalesPage.tsx.

Nuevos:

- src/api/commercialDocuments.ts.
- src/components/CommercialDocumentActions.tsx.
- src/components/CommercialDocumentActions.css.
- tests/commercial-documents.test.mjs.
- scripts/verify-commercial-documents.mjs.
- Este informe.

## Descargas y limpieza en Ubuntu/Chrome

La aplicación no crea ni modifica carpetas personales ni controla la ubicación final de una descarga.

1. En Archivos de Ubuntu, abrir la ubicación deseada, por ejemplo Descargas.
2. Usar Ctrl+Shift+N para crear Upgrade79-PDFs.
3. En Chrome abrir Configuración → Descargas, o chrome://settings/downloads.
4. En Ubicación → Cambiar, seleccionar Upgrade79-PDFs. Como alternativa, activar Preguntar dónde se guardará cada archivo antes de descargarlo.
5. Descargar desde el CRM y comprobar la carpeta.

La ubicación afecta las descargas del perfil de Chrome, no solo las del CRM. Chrome puede añadir (1), (2), etc. si ya existe un nombre.

Eliminar esta carpeta solo elimina las copias descargadas. No elimina cotizaciones, ventas, órdenes ni sus datos: se puede volver a abrir el detalle y regenerar el PDF. La prueba de navegador borró únicamente su propia copia temporal y volvió a descargarla correctamente.

El backend genera los bytes bajo demanda, no guarda PDFs comerciales permanentemente. Dompdf usa un directorio temporal privado aleatorio, permisos 0700 y limpieza en finally. El renderizado deshabilita red, PHP y JavaScript, restringe archivos locales y usa el logo embebido. El correo adjunta los bytes en memoria.

## Correo real: preparado, NO activado

Configuración nueva:

    COMMERCIAL_DOCUMENTS_REAL_MAIL_ENABLED=false
    COMMERCIAL_DOCUMENTS_MAILER=smtp
    COMMERCIAL_DOCUMENTS_FROM_ADDRESS=ventas@upgradecolombia.com
    COMMERCIAL_DOCUMENTS_FROM_NAME="Upgrade La 79"

Solo APP_ENV=production y la bandera explícita permiten usar el transporte configurado. En cualquier otro entorno se fuerza array. El valor por defecto false mantiene también producción en simulación hasta una activación futura autorizada.

Para habilitarlo posteriormente faltan:

1. Autorización expresa para conexión/prueba productiva.
2. Verificar que exista el buzón ventas@upgradecolombia.com y cuál es su proveedor real en hPanel.
3. Si corresponde a Hostinger Email, confirmar sus parámetros oficiales: MAIL_HOST=smtp.hostinger.com, MAIL_PORT=465 y MAIL_SCHEME=smtps. Usar el usuario completo del buzón.
4. Configurar MAIL_USERNAME y MAIL_PASSWORD únicamente en el entorno privado del servidor; nunca en código, este informe ni .env.example. Revisar que MAIL_URL no sobreescriba inadvertidamente la configuración.
5. Verificar TLS/conectividad SMTP y DNS del remitente, incluyendo SPF/DKIM y política DMARC.
6. Revisar límites del plan de correo y APP_DEBUG=false.
7. Tras la autorización, activar la bandera solo en producción y actualizar la caché de configuración mediante el procedimiento habitual. No hace falta cambiar el mailer global de otros flujos para habilitar este envío explícito.
8. Enviar a un destinatario autorizado, revisar adjunto y recepción/bandeja de spam. La aceptación por SMTP no es prueba de entrega final.

No se conectó el buzón, no se cambió el .env real y no se tocó Hostinger. El envío es síncrono; este alcance no añade workers ni Cron.

## Validación final

| Comprobación | Resultado |
| --- | --- |
| Composer Audit | Sin advisories ni paquetes abandonados |
| Composer Validate | PASS |
| MIME + documentos + regresión Stage F | 20/20 PASS, 230 aserciones |
| Documentos backend | 13 pruebas; acceso, snapshots, pagos, cargos, servicios, correo, límites, regeneración |
| Seguridad MIME | 5 casos |
| Regresión Stage F existente | 2 pruebas |
| Suite frontend completa | 175/175 PASS |
| TypeScript | PASS |
| Pint de archivos PHP del alcance | PASS |
| Build cliente | PASS |
| Build SSR | PASS |
| Prerender con backend real upgrade_test | PASS, 34 páginas; canónico https://upgradecolombia.com |
| Navegador CRM + Laravel real | 6 escenarios PASS, 66 respuestas API verificadas como upgrade_test, sin mocks |
| Responsive de acciones | 1440, 1280, 1024, 768, 430, 390, 360; sin overflow horizontal ni controles fuera del ancho |
| Console del flujo CRM | Sin errores |
| PDF largo | 36 líneas, 6 páginas A4; encabezados repetidos, numeración y totales/aviso legibles |
| Service Worker | SHA-256 sin cambios |

Se verificó APP_ENV=testing, conexión MySQL loopback, SELECT DATABASE()=upgrade_test y servidor XAMPP /opt/lampp antes de escribir fixtures. Las pruebas feature usan DatabaseTransactions. No se ejecutaron pruebas con RefreshDatabase que pudieran borrar los fixtures anteriores de upgrade_test. Estos son resultados de la regresión seleccionada, no una nueva ejecución de toda la suite backend.

El navegador probó Administrador y Usuario × cotización/orden pendiente/venta pagada: descarga, eliminación de su copia temporal y regeneración, destinatario corregido, adjunto mediante Mail array y enlace manual de WhatsApp bloqueado hasta descargar. Un Usuario no pudo descargar el endpoint administrativo. No se abrió WhatsApp ni se enviaron mensajes. Solo se permitieron las fuentes externas que ya utiliza la interfaz.

Las escrituras del navegador fueron exclusivamente fixtures identificadas de upgrade_test, no productos ni inventario. La última ejecución usó cotización 133 y órdenes 450/451. Sus estados e ítems permanecieron iguales antes/después; existencias y movimientos también. Los intentos previos de QA dejaron fixtures adicionales solo en upgrade_test; no se limpiaron bases.

El backend normal en :8000 no estaba activo durante el prerender final. Se arrancó temporalmente el backend aislado en :8198 con upgrade_test y se utilizó una opción de renderizado local, sin consultar producción. Las salidas de build están en /tmp y no sobreescribieron el dist pendiente del usuario. El warning de chunks mayores de 500 kB sigue pendiente deliberadamente.

SHA-256 de public/sw.js y de la copia del build:

    43338314702133f01e4df46edf0e9640229a0da55f593d0773104e6bcbfa3482

Registros reproducibles de esta ejecución:

- /tmp/upgrade79-documents-audit-final.json.
- /tmp/upgrade79-documents-composer-validate.log.
- /tmp/upgrade79-documents-backend-final.log.
- /tmp/upgrade79-documents-frontend-final.log.
- /tmp/upgrade79-documents-typescript.log.
- /tmp/upgrade79-documents-pint-final.log.
- /tmp/upgrade79-documents-client-build.log.
- /tmp/upgrade79-documents-ssr-build.log.
- /tmp/upgrade79-documents-prerender.log.
- /tmp/upgrade79-documents-browser-AWtUmv/report.json.

El runner de navegador está guardado en scripts/verify-commercial-documents.mjs y rechaza entornos/bases distintos de testing + upgrade_test + XAMPP local. Crea únicamente fixtures de prueba sin pasarela ni stock. Requiere Playwright/Chrome disponibles y puertos locales 5198/8198 libres.

## Evidencia local

Documentos QA sintéticos, no comprobantes de operaciones reales:

- [Cotización](docs/qa/commercial-documents/COT-000133.pdf).
- [Orden pendiente](docs/qa/commercial-documents/ORDEN-000450.pdf).
- [Venta pagada de prueba](docs/qa/commercial-documents/VENTA-000451.pdf).
- [Prueba de paginación](docs/qa/commercial-documents/cotizacion-larga-qa.pdf).
- [CRM administrador, escritorio](docs/qa/commercial-documents/admin-desktop.png).
- [CRM Usuario, móvil](docs/qa/commercial-documents/user-mobile.png).
- [Resultados del navegador](docs/qa/commercial-documents/browser-report.json).

Estas evidencias están en una carpeta docs ya ignorada localmente por el repositorio; no se cambiaron las reglas de Git ni se añadieron archivos al índice. Los temporales de /tmp pueden desaparecer al reiniciar.

## Límites y siguiente paso

El flujo local está implementado y validado. Quedan deliberadamente pendientes la conexión SMTP productiva, un envío real autorizado y el adjunto manual desde WhatsApp. No se certifica entrega externa de correo ni de WhatsApp. Los campos históricos inexistentes no pueden recuperarse por regenerar un PDF.

No se añadieron mejoras fuera de este alcance.

Referencias consultadas: [advisory oficial de Symfony](https://symfony.com/blog/cve-2026-45070-email-header-injection-via-non-token-characters-in-mime-parameter-names), [configuración oficial de Hostinger Email](https://www.hostinger.com/support/1575756-how-to-get-email-account-configuration-details-for-hostinger-email/) y [descargas en Chrome](https://support.google.com/chrome/answer/95759?hl=es).
