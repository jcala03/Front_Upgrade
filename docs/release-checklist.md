# Release checklist — Upgrade La 79

FINAL-PRODUCT-01E · 2026-10-01. Lista para **ejecutar en una fase posterior autorizada**, no constancia de deployment realizado. Estado y gates R01–R24 en [validación final](final-validation.md). No poner valores secretos en este archivo, consola compartida, Git o frontend.

### Antes de deploy

- [x] R01–R08: baseline y validaciones locales aprobadas según informe, sin ampliar su cobertura.
- [ ] R09: revisar diff completo en ambos repos oficiales, incluidos archivos nuevos; obtener autorización del checkpoint. No mezclar clones stale/historia anterior.
- [ ] Repetir `git diff --check`, audits y tests si cambia código/dependencias tras este informe. Suite backend sólo en DB aislada **upgrade_test**; nunca producción ni upgrade_ux_qa del navegador.
- [ ] Definir versión candidata, trazabilidad entre commits/source/locks/build y procedimiento de rollback; no hacer un commit implícito de secretos, evidence, .env privadas o harness.
- [ ] Resolver política dist vigente: parcialmente tracked + ignorado. Si release depende de Git, incluir **explícitamente** assets/renderer nuevos del build productivo; si pipeline genera paquete completo, comprobar su contenido. Un staging ordinario no recoge los 121 nuevos generados actuales.
- [ ] No subir el build QA actual: contiene API loopback. Reconstruir con API productiva confirmada y conservar index/assets/renderer de la misma versión.
- [ ] Asignar operador responsable y ventanas de validación de proveedores; no inventar comprobaciones o cuentas reales.

### Backend

- [ ] R12: confirmar PHP compatible con composer (^8.3), extensiones y servidor PHP administrado; apuntar document root a `public/`, no al repo. Verificar `/up` según routing existente.
- [ ] Preparar entorno productivo fuera de Git: `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL` HTTPS real, frontend/orígenes correctos. Confirmar manejo seguro de APP_KEY; no rotar la clave de una instalación existente sin plan para datos cifrados.
- [ ] Instalar desde composer.lock: `composer install --no-dev --prefer-dist --optimize-autoloader`; ejecutar `composer check-platform-reqs`. No usar composer update como paso de deploy.
- [ ] Validar variables en config/services.php (Wompi/Envia/DHL), DB/mail/session/queue y BusinessContext. Defaults sandbox/log/localhost no son configuración productiva.
- [ ] Generar caché sólo después de confirmar valores productivos: `php artisan config:cache`; revisar que no arrastre config QA y reiniciar procesos según gestor.
- [ ] R17: comprobar `FRONTEND_URL`, CORS con credenciales, Sanctum/stateful domains/cookies HTTPS y autenticación real. Probar positivo y negativo, no permitir wildcard como sustituto de configuración.
- [ ] Revisar reverse proxy/trusted proxies según infraestructura y bootstrap/app.php vigente: actualmente no hay una configuración explícita de trusted proxies. Validar esquema/host/IP antes de aprobar detrás del proxy; no asumir resuelto sólo por HTTPS externo.
- [ ] Revisar rate limits y callbacks bajo IP/proxy reales sin desactivarlos ni relajar autorizaciones para pasar un smoke.

### Frontend / SEO Node server

- [ ] R10: hosting con **Node persistente** confirmado; Vite locked exige ^20.19.0 o >=22.12.0, local probado 24.11.1. Comprobar versión compatible soportada en servidor.
- [ ] Confirmar supervisor PM2/systemd/equivalente, reinicio automático, logs privados, puertos y reverse proxy. No se instala/configura gestor en esta fase.
- [ ] R16: definir PUBLIC_SITE_URL `https://upgradecolombia.com` y VITE_API_BASE_URL público real. Revisar .env.production heredada (URL API histórica no confirmada), sin secretos frontend. APP_URL/backend debe generar medios HTTPS accesibles.
- [ ] Instalar dependencies locked con `npm ci` para el build, no actualizar paquetes.
- [ ] Ejecutar build con ambas variables aprobadas. Ejemplo **sólo después de asignar API real confirmada**:

  ```bash
  PUBLIC_SITE_URL=https://upgradecolombia.com VITE_API_BASE_URL="$RELEASE_PUBLIC_API_URL" npm run build
  ```

  RELEASE_PUBLIC_API_URL es un dato de despliegue público, no variable del producto ni dominio inventado; verificar que no esté vacía/loopback antes de ejecutar. El build genera cliente y `dist/seo/entry-server.js`.

- [ ] Paquete incluye `dist/index.html`, todos los assets referenciados, renderer, `scripts/seo-server.mjs`, package.json/lock y dependencies runtime. Si se construye fuera del servidor, verificar plataforma y artifact completo.
- [ ] Iniciar `npm start` con HOST/PORT del proxy/supervisor. Los defaults son loopback:4173. PUBLIC_SITE_URL/VITE_API_BASE_URL en runtime deben coincidir con build; el servidor rechaza discrepancias.
- [ ] No servir frontend sólo como SPA estática ni aplicar fallback indiscriminado de rutas a index.html. No exponer renderer, scripts o archivos de repo por el proxy.
- [ ] Si mismo dominio, enrutar `/api/*`, `/sanctum/*`, `/storage/*` a Laravel/media y resto al servidor SEO; si API otro origen, comprobar CORS/sesión/media allí. Confirmar cada ruta, no asumir reglas de proxy existentes.
- [ ] Verificar warning bundle >500 kB y rendimiento productivo; no bloquear únicamente por warning ni inventar score Lighthouse.

### Base de datos

- [ ] R13: confirmar DB productiva autorizada y credenciales de mínimo privilegio mediante gestión segura. No conectar por accidente a upgrade/upgrade_test/upgrade_ux_qa locales.
- [ ] Obtener `SELECT DATABASE()` **desde la conexión efectiva de Laravel**, comparar con el nombre productivo autorizado y parar si no coincide. Hacer backup consistente/restaurable antes de cualquier DDL.
- [ ] `php artisan migrate:status`: inventariar pendientes en esa instalación. Camino fresh/backfill/rollback aprobado en upgrade_test no implica datos productivos reparados.
- [ ] Preflight product_images: consultar publicados con main_image NULL/vacío y verificar que rutas legacy apuntan a fotografías legítimas disponibles. Reparar según negocio antes de migrar; la migración rechaza inconsistencia, no oculta ni fabrica placeholders.
- [ ] Para validar consulta sin secretos en conexión efectiva:

  ```sql
  SELECT DATABASE();
  SELECT id FROM products
  WHERE is_visible = 1 AND (main_image IS NULL OR TRIM(main_image) = '');
  ```

- [ ] Sólo con guard/backup/preflight y autorización satisfechos: `php artisan migrate --force`. **Nunca migrate:fresh / reset en producción.** No UXOperationalQaSeeder ni seeders QA/demo en release.
- [ ] Confirmar backfill: main_image legacy conservado, una fila principal por publicado y sort_order; revisar no duplicación y variantes. No atribuir el mínimo de una imagen a la clave única SQL.
- [ ] Validar aislamiento de sedes, datos históricos, totales y conteos esperados sin exportar datos de cliente en evidencia pública.

### Storage

- [ ] R14: public disk persistente y respaldado; permisos de escritura mínimos para Laravel, storage/bootstrap/cache escribibles sin permisos universales.
- [ ] `php artisan storage:link` si falta el enlace público autorizado; no sustituir enlaces/directorios existentes ciegamente.
- [ ] Confirmar APP_URL/media HTTPS reales, URLs de recursos /storage, lectura de todas las imágenes migradas y nuevas subidas. Si hay origen/CDN distinto, configurar según contrato actual, no inventar variable frontend de media.
- [ ] Subida valida JPG/PNG/WebP y máximo 5 MiB **por archivo**; coordinar upload_max_filesize, post_max_size y límites del proxy para galerías completas. No confundir límite de archivo con límite total del request.
- [ ] Comprobar temporal/rechazo limpia sólo uploads propios; conservar paths legacy/compartidos/variantes según servicio. No publicar storage privado/secretos ni permitir ejecutar uploads.

### Scheduler

- [ ] R15: cron/servicio que ejecute `php artisan schedule:run` cada minuto desde el directorio backend correcto con entorno productivo y permisos previstos. Usar ruta de despliegue real, no paths de workstation de QA.
- [ ] `php artisan schedule:list`: comprobar `crm:notify-expiring-quotations` diario 08:00 America/Bogota y `ecommerce:expire-stock-reservations` cada minuto con withoutOverlapping, según routes/console.php.
- [ ] Validar ejecución/locks y expiraciones con procedimiento controlado. No ejecutar expiración manual sobre producción sin revisar efectos.
- [ ] Revisar QUEUE_CONNECTION y jobs reales si corresponde, supervisor/reintentos/failed jobs. Este checklist no afirma que todos los correos o acciones se envían por queue ni introduce nuevas tareas.

### Wompi

- [ ] R18: confirmar cuenta/ambiente real, monedas e importes; configurar variables WOMPI_* por secret manager (public_key público; private/integrity/events secretos nunca en frontend).
- [ ] Registrar URLs HTTPS correctas de redirect y webhook que existen en el contrato actual. Comprobar reachability/firma, no crear endpoint alternativo para simplificar la prueba.
- [ ] Probar cobro autorizado de forma controlada en fase real: pending/approved/declined/error/reintento sobre misma Order, firma/replay/idempotencia y conciliación. Guardar evidencia privada minimizada, no tokens en docs/metadata.
- [ ] Verificar Payment financiero ≠ Order operativo; reglas actuales de reserva/stock/comisión preservadas. Revisión administrativa no es refund y no permite mutación financiera arbitraria.

### Envia

- [ ] R19: cuenta, token y base URLs reales ENVIA_*; validar remitente/origen de sedes, direcciones, unidades, cobertura y tarifas.
- [ ] Cotización autorizada real y vigencia; aplicar tarifa y comprobar total backend. No crear envío/label real sólo para un smoke de cálculo, salvo autorización específica.

### DHL

- [ ] R20: cuenta/acceso/base URL y variables DHL_MYDHL_* reales, gestionadas fuera de Git.
- [ ] Validar unidades, datos de cotización y cargos/reglas internacionales existentes con una prueba real autorizada; no prometer landed cost garantizado sólo por fixtures locales.

### Email

- [ ] R21: MAIL_* de transporte real, remitente autorizado y destinatarios correctos; defaults mail log/loopback no entregan correo productivo.
- [ ] Verificar SPF/DKIM/DMARC según servicio y entrega real de mensaje autorizado sin datos sensibles en evidencia pública.
- [ ] Confirmar qué acciones notifican realmente: Marcar como enviada una cotización es estado, no prueba de correo/WhatsApp entregado.

### DNS / HTTPS

- [ ] R11: DNS de upgradecolombia.com y de API/media si aplica; certificados válidos, renovación y redirects a origen canónico HTTPS.
- [ ] Confirmar host elegido, no duplicar versiones indexables con y sin www. No introducir cambios de canonical vía headers de usuario/proxy.
- [ ] Comprobar HTTPS de frontend/API/media, cookies y ausencia de mixed content; acceso no autenticado a CRM no revela datos.
- [ ] R22: validar número/link WhatsApp oficial con el negocio; no enviar mensajes de prueba sin autorización. Documentar contacto real antes de lanzamiento.

### Smoke después de deploy

- [ ] R24: HTTP health frontend/backend y assets correctos; 404 real pública, rutas fuente/.env/renderer no servidas, sin errores de arranque.
- [ ] Recorrido por navegación Home → Shop → producto publicado → carrito → checkout; shipping/pickup y resumen con datos autorizados. No ejecutar pagos/stock/pedidos reales duplicados ni crear usuarios sólo para demostrar el menú.
- [ ] Login Admin/colaborador autorizado y usuario limitado: menu correcto, guard admin, own rows, sede no forzable; auth anónimo rechazada por API privada.
- [ ] Confirmar copia vigente de manual/roles/guías/capacitación corresponde a versión desplegada. No marcar competencias entrenadas sólo porque exista el material.
- [ ] Registrar fecha/versión/resultado y evidencia minimizada; bugs de operación/conversión/seguridad detienen lanzamiento y disparan plan de contingencia.

### SEO post-deploy

- [ ] Inspeccionar respuesta HTTP inicial **sin JS**: Home, Shop, producto real, 404 y privada. Title/description/canonical/robots/OG/JSON-LD correctos, Product sólo público.
- [ ] Cart/checkout/payment return/confirmation/CRM/Admin/login noindex inicial y X-Robots-Tag; sin tokens/query privados ni bootstrap sensible.
- [ ] `/sitemap.xml` y `/robots.txt` con dominio real, productos elegibles y sin privadas/tokens. No usar robots como autorización.
- [ ] Producto publicado nuevo/actualizado/agotado/oculto y error temporal API: comprobar renderer y SPA sobre el mismo catálogo, sin exponer ocultos ni servir metadata stale engañosa.
- [ ] Registrar Search Console/Bing y sitemap, inspeccionar URLs/indexación y Rich Results; obtener mediciones reales PageSpeed/Core Web Vitals y previews sociales. No garantizar ranking/rich results ni convertir métricas loopback en score productivo.

### Backup / rollback

- [ ] R23: backup DB + storage + configuración segura + artefacto anterior coherente; responsable, ubicación protegida, retención y restauración ensayada.
- [ ] Definir ventana de rollback, compatibilidad de código/schema y protección de operaciones financieras producidas después del deploy. No borrar/restaurar datos nuevos indiscriminadamente.
- [ ] Para product_images: down elimina tabla y conserva main_image/archivos legacy, **pero descarta filas de galería, ordering y metadatos**. Tener backup antes de rollback; no prometer reversión sin pérdida sólo porque conserva la foto principal.
- [ ] No ejecutar migrate:rollback ciegamente por lote. Revisar exactamente migraciones afectadas y soporte del código anterior; sólo intervención autorizada.
- [ ] Restaurar únicamente objetivos verificados; repetir smoke, auth/stock/pagos/SEO y scheduler tras rollback. Conservar trazabilidad y evidencia, no resetear historia Git.

**Criterio de salida:** gates pendientes resueltos y evidencia real autorizada. El PASS local de 01E permite checkpoint, no equivale a launch aprobado ni despliegue efectuado.
