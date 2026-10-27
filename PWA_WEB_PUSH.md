# Upgrade La 79 — PWA y Web Push

## Preparación de producción (revisión 2026-10-27)

El procedimiento actual de despliegue, VAPID, migraciones y worker está en
`backendupgrade/WEB_PUSH_PRODUCTION.md` del repositorio backend. Hay dos
workflows independientes: el frontend construye/copia `dist` y comprueba el SW;
el backend instala dependencias, migra, regenera cachés y señala `queue:restart`.
Ninguno configura secretos, inicia un worker permanente o instala el scheduler.
Los nuevos archivos Push deben incluirse en el próximo commit de cada repositorio;
varios siguen sin seguimiento hasta que el propietario ejecute `git add`.

Esta revisión distingue disponibilidad no consultada de servicio deshabilitado
en Mi perfil y refresca su estado cuando el SW termina de registrarse. No genera
claves reales, configura `.env`, activa Push ni ejecuta despliegues. Los resultados
que siguen pertenecen a la implementación inicial; los resultados de la revisión
se informan por separado.

Implementación local en `upgrade79-web` y el repositorio hermano `backendupgrade`. Sin commit, push ni despliegue. Se conservaron los cambios legales, comerciales y de compatibilidad que ya existían en ambos worktrees. No se modificó `.env.production` ni se añadieron claves reales.

## Arquitectura encontrada

Frontend React 19, Vite instalado 7.3.6, rutas controladas por `src/App.tsx`, SSR público con `public-seo-plugin.mjs` y `seo-server.mjs`, y CRM renderizado en cliente. Autenticación Sanctum mediante cookies/CSRF y usuario serializado en `sessionStorage`. La campana consulta `/api/admin/notifications` y su contador de no leídas, con refresco periódico y eventos locales al marcar lecturas.

Backend Laravel 13: `CrmNotification` y `CrmNotificationService`, con deduplicación existente por usuario/clave. No se utiliza un canal de Laravel Notifications para estas alertas. Los servicios de inventario, órdenes ecommerce, pagos, conciliación, cotizaciones y operación personal ya generan las notificaciones internas. Existían tablas y configuración de colas; el entorno local usa `QUEUE_CONNECTION=sync`, sin jobs de Web Push previos.

No existían manifest ni Service Worker. Se añade un transporte sobre la misma notificación interna, no una segunda bandeja ni otro sistema de eventos de negocio.

## PWA, instalación y actualizaciones

- Manifest público `/manifest.webmanifest`: identificador `/`, inicio `/crm`, alcance `/`, `standalone`, español, colores de marca e iconos PNG reales de 192/512 px, maskable de 512 y Apple Touch de 180.
- Los iconos se derivan del logo existente. Se regeneran con `php scripts/generate-pwa-icons.php` (requiere PHP GD).
- `/crm` ya resuelve Inicio para Usuario y Dashboard para Admin. Sin sesión se conserva el flujo de login actual.
- El registro de `/sw.js` ocurre solo en el build de producción y en contexto seguro. No se instala un SW automáticamente durante `npm run dev`.
- Dev, preview y servidor SSR reconocen los archivos PWA como estáticos: no se transforman en páginas SEO ni en respuestas 404. El servidor SSR entrega el SW como JavaScript con revalidación y alcance raíz.
- El nuevo worker espera; en CRM aparece “Actualizar aplicación”. Se avisa que hay que guardar cambios antes de aceptar y recargar. No se fuerza una recarga en mitad de un formulario.
- La aplicación continúa siendo React/Vite; no hay empaquetado nativo.

Android/Chrome: instalar desde el menú del navegador o el botón de instalación cuando el navegador emita `beforeinstallprompt`. En iPhone/iPad se muestra ayuda solo cuando corresponde: Compartir → Agregar a pantalla de inicio → abrir el icono → activar notificaciones. Web Push en iOS/iPadOS se diseña para Home Screen Web Apps desde 16.4 y exige una acción directa del usuario. [Documentación de WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## Perfil y seguridad del dispositivo

En `/crm/profile`, “Notificaciones del dispositivo” muestra activadas, desactivadas, permiso bloqueado, soporte ausente o ayuda de instalación iPhone. Nunca llama `Notification.requestPermission()` al montar: únicamente al pulsar Activar. Una suscripción activa se comprueba también contra su estado en backend, no solo contra el permiso del navegador.

Cada endpoint tiene su propia fila y propietario. Se permiten múltiples dispositivos. Un endpoint ajeno no se reasigna: responde 409; eliminar una suscripción ajena responde 404. No se acepta `user_id` del cliente.

API bajo `auth:sanctum`, cuenta activa, permiso `notifications.view`, CSRF existente en escrituras y límite de solicitudes:

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/api/push/config` | Habilitación y solo la clave VAPID pública |
| GET | `/api/push/subscriptions` | IDs, hashes y estados del propio usuario; no endpoints ni claves |
| POST | `/api/push/subscriptions` | Registro/reactivación idempotente de un dispositivo propio |
| DELETE | `/api/push/subscriptions/{id}` | Desactivación del dispositivo propio |

Se valida HTTPS, proveedor permitido, puerto, credenciales ausentes, tamaño, formato/longitud de claves y expiración. Se rechazan endpoints privados/arbitrarios para evitar SSRF, y el transporte no sigue redirecciones. Los proveedores admitidos están centralizados en `PushEndpoint.php`; ampliar esa lista requiere revisar el proveedor real.

El SW conserva en IndexedDB únicamente el ID del propietario del dispositivo, no tokens ni información comercial. Compara ese ID con el destinatario de cada Push. Al reabrir una pestaña, se verifica la sesión real antes de vincular el dispositivo: no se confía exclusivamente en un `sessionStorage` antiguo de otra pestaña. Cerrar sesión desactiva únicamente este endpoint, intenta cancelar su suscripción, limpia la vinculación y el badge, y conserva los otros dispositivos del usuario.

## Persistencia y migración

Nueva migración backend: `database/migrations/2026_10_24_000001_create_push_subscriptions_table.php`.

Tabla `push_subscriptions`: usuario, hash SHA-256 único del endpoint, endpoint, `p256dh`, `auth`, estado activo, expiración, último envío y timestamps. Endpoint y claves de suscripción se cifran en reposo con Laravel (`APP_KEY`); las respuestas no los serializan.

La migración se aplicó únicamente en la base local `upgrade`, comprobando `APP_ENV=local`, host `127.0.0.1` y base efectiva antes de ejecutarla. Los recuentos de usuarios, ventas, pagos y suma de cantidades de inventario quedaron iguales. Las pruebas se ejecutan exclusivamente en `upgrade_test`, con guard adicional de conexión/base efectiva.

## Envío: la misma bandeja y los mismos destinatarios

Flujo: nueva fila `CrmNotification` → commit confirmado → filtro de tipos importantes → job por dispositivo activo del usuario destinatario → cifrado Web Push/VAPID con `minishlink/web-push` 10.1.0. Una transacción revertida no genera jobs; recuperar una notificación con su dedupe key existente no vuelve a encolarla.

| Evento existente habilitado para Push | Destinatarios actuales que se conservan |
| --- | --- |
| `stock_low`, `stock_out` | Usuarios activos con `inventory.view` |
| `order_ecommerce_pending` | Usuarios activos con `orders.view` |
| `payment_received` | Usuarios activos con `payments.view`, incluido pago Wompi cuando el flujo existente lo registra |
| `payment_reconciliation_required` | Usuarios activos con `payments.reconcile` |
| `quotation_expiring`, `quotation_converted` | Usuarios activos con `quotations.view` |
| `task_assigned`, `task_reassigned`, `task_cancelled` | Destinatario personal que ya resuelve `TaskService` mediante el empleado asociado |
| `appointment_assigned`, `appointment_rescheduled`, `appointment_reassigned`, `appointment_cancelled` | Destinatario personal que ya resuelve `AppointmentService` |

La regla de inventario existente distribuye por permiso global `inventory.view`, con la sede de la alerta en sus datos. No se inventó una nueva distribución por sede ni se amplió a quienes solo tienen `inventory.view_own`. Push nunca crea destinatarios: usa `crm_notifications.user_id`. Usuario conserva sus avisos operativos personales; no obtiene acceso a alertas administrativas por activar un dispositivo. El job vuelve a comprobar cuenta, propiedad y permisos antes de enviar.

No existían eventos internos independientes de “venta CRM creada” ni “cotización creada”; no se añadieron para este trabajo. La conversión de cotización y el pedido ecommerce sí tienen alertas existentes. No se incluyen inicialmente cambios rutinarios de metas, comisiones ni todas las reprogramaciones de tareas. La lista inicial está en `config/webpush.php`; no se añadieron preferencias individuales complejas.

Solo se envían notificaciones no leídas y recientes (últimas 24 h). Cada job tiene hasta tres intentos y esperas de 60/300 s para fallos; errores no exponen endpoint/claves. El envío no ocurre dentro de la operación comercial. Una clave de entrega en caché evita repetir envíos ya confirmados durante dos días y el tag `crm-{id}` evita notificaciones visuales duplicadas innecesarias. Esto no promete entrega exactamente una vez ni entrega garantizada por el proveedor/OS.

Ante HTTP 404/410 del proveedor o expiración local, se desactiva la suscripción. No se afectan los otros dispositivos. El perfil permite activarla nuevamente. Errores de transporte, 429 y 5xx son reintentables; problemas VAPID quedan como jobs fallidos para revisión, no como fallos de una venta.

## Clic, contador y offline

Las rutas se toman de módulos existentes: inventario `/crm/inventory`, órdenes/pagos `/crm/orders`, cotizaciones `/crm/quotations`; avisos personales o referencias sin destino autorizado van a `/crm/notifications`. Son listados reales: no se inventaron detalles como `/crm/me/sales/1054`. El SW impide URLs externas y prefiere enfocar/navegar una ventana CRM existente. Un cambio de propietario obliga a volver al login.

El clic no marca automáticamente la notificación como leída; se mantiene el flujo de lectura del CRM. El badge toma el mismo contador existente de no leídas, se actualiza con lecturas/refrescos y con el payload Push. Si Badging API no existe o falla, no bloquea la aplicación. La visualización real del badge depende de la plataforma.

No hay offline-first, Background Sync ni cola de ventas/pagos. No se cachean HTML privado, APIs, cookies ni respuestas financieras. Solo `/offline.html` y dos iconos se precargan. Las operaciones siguen siendo de red y fallan según su manejo actual si no hay conexión. CRM muestra un aviso offline; navegar sin red abre una pantalla clara para reintentar. Al cambiar el shell offline o sus iconos, incrementar la versión `CACHE` del SW para renovar esa precarga. [Ciclo de vida y actualización del Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).

## Variables y preparación para un despliegue futuro — no ejecutado

Documentadas solo en `.env.example` del backend:

```dotenv
WEBPUSH_ENABLED=false
WEBPUSH_VAPID_PUBLIC_KEY=
WEBPUSH_VAPID_PRIVATE_KEY=
WEBPUSH_VAPID_SUBJECT=
WEBPUSH_QUEUE_CONNECTION=database
WEBPUSH_QUEUE=web-push
```

No se añadieron variables secretas en frontend. Obtiene la clave pública desde la API autenticada. Localmente Push sigue deshabilitado y sin claves reales.

Para habilitarlo más adelante, con autorización de despliegue:

1. Instalar dependencias desde `composer.lock`; migrar la nueva tabla. Conservar `APP_KEY`, pues cifra suscripciones.
2. Generar una pareja VAPID con `Minishlink\WebPush\VAPID::createVapidKeys()` en un entorno seguro. Guardar los valores solo como secretos de backend, con un subject real `mailto:` o HTTPS. No regenerar claves en cada build; una rotación requiere revisar las suscripciones.
3. Configurar `WEBPUSH_ENABLED=true` y una cola persistente, no `sync`. Ejecutar un worker supervisado que consuma `web-push`, por ejemplo `php artisan queue:work database --queue=web-push --tries=3 --timeout=45`. El `retry_after` debe superar el timeout del job. Reiniciar workers al cambiar código/configuración. Revisar jobs fallidos y avisos de encolado.
4. Servir frontend y API por HTTPS válido, con dominios de Sanctum, CORS y cookies correctos. Un HTTP con IP de LAN no sustituye HTTPS para probar teléfonos. Mantener `VITE_API_BASE_URL` y el origen canónico coherentes con la infraestructura existente; este trabajo no cambia esos valores de producción.
5. Servir manifest/SW/iconos/offline desde la raíz sin redirigirlos a SSR/login; mantener MIME correctos, `/sw.js` sin caché inmutable y alcance `/`. Mantener respuestas privadas `no-store`.
6. Confirmar salida HTTPS hacia los servicios Push admitidos. PHP requiere OpenSSL/cURL/mbstring; GMP o BCMath es recomendable para rendimiento, no obligatorio.
7. Verificar scheduler existente para `crm:notify-expiring-quotations`; esta implementación no añade otra tarea que duplique el evento.
8. Instalar en Android e iPhone físicos; activar, cerrar CRM, provocar un evento autorizado, tocar la notificación, leerla y comprobar badge; probar dos cuentas y varios dispositivos. No se envió ningún Push real a servicios de usuarios durante esta implementación.

Para validar el build local se usó `npm run build` y el servidor SSR en un puerto local separado. El acceso real a API desde un puerto de preview requiere que CORS/Sanctum incluyan ese origen; el smoke de navegador intercepta API deliberadamente y los endpoints reales se prueban por separado en Laravel.

## Pruebas y límites de la evidencia

- Suite completa Laravel: **704 tests y 7.384 aserciones, todos pasan**, incluidos los 12 nuevos de Push y los existentes de permisos, cotizaciones, ventas, inventario, pagos y notificaciones. Base efectiva `upgrade_test`, comprobada también con `SELECT DATABASE()`.
- Suite específica `CrmWebPushTest|CrmNotificationsPhaseOneTest`: **19 tests y 155 aserciones, todos pasan**, incluidos payloads malformados y las notificaciones internas existentes.
- Cubre login real de una cuenta de prueba (no mock de autenticación), suscribir/desactivar/reactivar, múltiples dispositivos, propiedad, rechazo de SSRF/payloads, commit/rollback/dedupe, destinatarios, cambios de permisos, envío, expiración/404/410, contador, rutas y logout por dispositivo. El cifrado `aes128gcm` y los headers VAPID se ejecutan realmente contra un proveedor HTTP simulado; no salen a Internet.
- Frontend: **46 tests, todos pasan**, incluidos 8 nuevos sobre manifest/iconos, soporte/permisos, registro/actualización, SW, caché, ownership, clic y badge. `npm run build`: cliente y SSR correctos; permanece el aviso de chunk >500 kB.
- `scripts/verify-pwa-browser.mjs`: **15 comprobaciones correctas y cero errores de página**, con Chrome headless y perfil temporal, servidor SSR real, registro real del SW, cero errores de instalabilidad, responsive 1440/768/390, opt-in/desactivación, estado bloqueado/sin soporte, llamada a `showNotification` incluso sin pestañas CRM, navegación, actualización voluntaria y caída real de la conexión al servidor para offline. API/suscripciones del navegador y eventos/clics Push son sintéticos. El sistema operativo de un entorno headless puede no conservar una notificación visible ni permitir enfocar una ventana desde un clic sintético; no se presenta como prueba física de entrega/foco.
- Android/iPhone son emulados para revisar interfaz/ayuda. No se comprobó una instalación física ni recepción APNS/FCM/Mozilla en un teléfono cerrado, ni un badge visible en su launcher. Queda pendiente la prueba final con HTTPS, claves y dispositivos reales.

Comandos de backend usados con el guard de base:

```bash
APP_ENV=testing DB_CONNECTION=mysql DB_DATABASE=upgrade_test \
TEST_DB_CONNECTION=mysql TEST_DB_DATABASE=upgrade_test DB_URL= php artisan test
```

El nuevo test usa truncación aislada con commits reales para verificar after-commit y limpiar sus fixtures. La primera variante con rollback de migraciones encontró un problema histórico ajeno a Push: el `down()` de tareas intenta retirar un índice requerido por una FK. Esa migración no se alteró; no se usa ese rollback para ejecutar los tests nuevos.

`composer audit` reporta un aviso **preexistente** en `symfony/http-foundation` (CVE-2026-108082). No se amplió esta tarea a actualizar el framework: el lock conserva las versiones anteriores y solo incorpora cuatro paquetes nuevos requeridos por Web Push. Conviene resolver el aviso antes de un despliegue futuro. [Aviso oficial de Symfony](https://symfony.com/cve-2026-108082).

## Archivos de esta implementación

Frontend, nuevos:

```text
PWA_WEB_PUSH.md
public/manifest.webmanifest
public/offline.html
public/sw.js
public/icons/pwa-192.png
public/icons/pwa-512.png
public/icons/pwa-maskable-512.png
public/icons/apple-touch-icon.png
scripts/generate-pwa-icons.php
scripts/verify-pwa-browser.mjs
src/api/push.ts
src/pwa/device.ts
src/pwa/register.ts
src/pwa/DeviceNotifications.tsx
src/pwa/PwaStatus.tsx
src/pwa/pwa.css
tests/pwa.test.mjs
```

Frontend, modificados: `index.html`, `src/main.tsx`, `src/api/auth.ts`, `src/modules/admin/settings/ProfilePage.tsx`, `src/modules/crm/layout/CrmLayout.tsx`, `scripts/public-seo-plugin.mjs`, `scripts/seo-server.mjs`. Se regeneró `dist` al ejecutar el build; sus diferencias previas ya existían en el worktree.

Backend, nuevos:

```text
app/Contracts/WebPushTransport.php
app/Http/Controllers/Api/PushSubscriptionController.php
app/Jobs/SendCrmWebPush.php
app/Models/PushSubscription.php
app/Services/CrmWebPush.php
app/Services/VapidWebPushTransport.php
app/Support/PushEndpoint.php
config/webpush.php
database/migrations/2026_10_24_000001_create_push_subscriptions_table.php
tests/Feature/CrmWebPushTest.php
```

Backend, modificados: `.env.example`, `composer.json`, `composer.lock`, `routes/api.php`, `app/Providers/AppServiceProvider.php`, `app/Http/Controllers/Api/AuthController.php`. No se cambió `User.php` para esta tarea ni se ampliaron permisos comerciales/administrativos.
