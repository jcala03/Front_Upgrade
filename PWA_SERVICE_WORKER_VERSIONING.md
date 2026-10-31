# Service Worker: versión estable y recuperación del diagnóstico

## Hallazgo y límites de la evidencia

El reporte del teléfono demuestra que `/sw.js` devolvía un cuerpo viejo sin los
handlers diagnósticos, mientras una query devolvía el nuevo. El registro usaba
siempre la URL fija; `updateViaCache: "none"` evita el HTTP cache del navegador,
pero no puede corregir un CDN/origen que devuelve bytes obsoletos como respuesta.
No es un request al backend: el lector usa un `MessageChannel` hacia el SW activo.

En la comprobación desde este entorno, tanto la URL fija como `?v=<hash>`
devolvieron 200, 9937 bytes, SHA-256
`43338314702133f01e4df46edf0e9640229a0da55f593d0773104e6bcbfa3482`,
`Cache-Control: no-cache`, `server: hcdn` y `x-hcdn-cache-status: MISS`.
Esto no reproduce el nodo/copia del teléfono ni identifica por sí solo la capa
responsable. No se ha purgado caché ni cambiado configuración remota.

## Versión automática

`scripts/pwa-version.mjs` calcula el SHA-256 completo de `public/sw.js`.
Vite lo inserta en `__PWA_SW_VERSION__` al construir cliente y SSR. El cliente
registra `/sw.js?v=<sha256>` con `scope: "/"` y `updateViaCache: "none"`.

- La misma fuente SW produce exactamente la misma URL en cada carga/build.
- Cambiar cualquier byte del SW cambia automáticamente la URL; no depende de
  `Date.now()`, de una versión de package que alguien olvide incrementar ni de Git.
- Un cambio solo del frontend que no modifica el SW reutiliza su misma versión:
  no hace falta reinstalar un worker idéntico por cada despliegue.
- Vite copia el SW sin transformarlo desde `public/` a `dist/`; el build SSR no
  vuelve a copiarlo. No hay generación circular de hashes ni mutación del SW.
- El fallback `development` solo sirve en dev/tests SSR aislados sin configuración
  Vite. El build real siempre define el hash de 64 caracteres.

Comprobar la versión sin reconstruir ni cambiar archivos:

```bash
node scripts/pwa-version.mjs
sha256sum public/sw.js dist/sw.js
cmp public/sw.js dist/sw.js
```

## Ciclo de actualización y datos

Registrar otra scriptURL con el mismo scope actualiza el registro existente;
no se llama a `unregister()`, `unsubscribe()` ni se borran cookies, IndexedDB,
subscripciones o registros diagnósticos. Un worker nuevo puede quedar `waiting`.
El aviso **Actualizar aplicación** sigue requiriendo consentimiento:
`SKIP_WAITING` → `controllerchange` → recarga. También se observa un worker que
ya está `installing` cuando se resuelve `register()`, no solo futuros `updatefound`.

`getRegistration("/")` continúa siendo válido: busca por alcance, no por la query
de la scriptURL. Se mantienen owner binding, Push, badge, offline y rutas.

## Errores diagnósticos locales

El panel muestra el hash esperado y errores con códigos seguros:

| Código | Significado |
| --- | --- |
| `unsupported` | El navegador no ofrece Service Workers. |
| `no_worker` | No hay worker activo en el scope raíz. |
| `registration_error` | Falló la consulta local del registro. |
| `worker_outdated` | La URL activa no corresponde al hash esperado; revisar/aceptar la actualización PWA. |
| `timeout` | No llegó respuesta en 2500 ms; NO demuestra por sí solo ausencia de handler. |
| `rejected` | El worker contestó `{ok:false}`: falló el almacenamiento diagnóstico. |
| `invalid_response` | Respuesta incompatible con el protocolo. |
| `channel_error` | Fallo al crear, enviar o recibir el MessageChannel. |

No se muestran excepciones originales, URLs con credenciales, cookies, tokens,
payloads o datos personales. GET/CLEAR siguen hablando solo con el worker activo;
no se consulta un `waiting` como si ya estuviera entregando Push.

## Política de caché recomendada (NO aplicada remotamente)

`no-cache` es una política estándar correcta: permite almacenar, pero obliga a
validar antes de reutilizar. Ya aparece en el servidor SSR y en las reglas
generadas del proyecto. Dado el incidente con una copia obsoleta de JavaScript,
recomiendo para **solo `/sw.js`, con o sin query**, la defensa adicional:

`Cache-Control: no-cache, no-store, must-revalidate`

`no-store` evita nuevas copias HTTP; `must-revalidate` no sustituye un bypass del
CDN ni invalida objetos previamente almacenados. Esta política no desinstala el
worker persistido por el navegador ni elimina el shell offline de Cache Storage.
No aplicar estas restricciones a todos los assets hasheados.

Bloque propuesto para el `.htaccess` raíz existente, **después** de sus políticas
generales de headers y del bloque administrado SEO. No reemplazar el archivo ni
las reglas `/api`, `/sanctum` o los ajustes propios de Hostinger:

```apache
<IfModule mod_headers.c>
  <Files "sw.js">
    Header unset Cache-Control
    Header always set Cache-Control "no-cache, no-store, must-revalidate"
    Header unset Expires
    Header always unset Expires
    Header unset Service-Worker-Allowed
    Header always set Service-Worker-Allowed "/"
  </Files>
</IfModule>
<IfModule mod_expires.c>
  <Files "sw.js">
    ExpiresActive Off
  </Files>
</IfModule>
<IfModule LiteSpeed>
  CacheDisable public /sw.js
  CacheDisable private /sw.js
</IfModule>
```

Revisar que ninguna otra regla LiteSpeed vuelva a habilitar la caché para esa
ruta. Si hCDN impone caché de JS, solicitar/exigir exclusión de `/sw.js` incluyendo
sus queries y respeto de los headers de origen. La query `v` debe formar parte
de la clave si existe una caché intermedia; el caso reportado demuestra que una
query ya cambia la respuesta, no que todas las reglas estén auditadas.

Una vez autorizado el despliegue, purgar la copia vieja de `/sw.js` y las entradas
HTML que puedan referenciar JS anterior desde hPanel si aún se sirven obsoletas.
La nueva URL evita depender de esa copia, pero clientes que sigan recibiendo HTML/JS
viejos todavía no ejecutarán el nuevo registro. No borrar datos del navegador.
Recoger `x-hcdn-request-id`, `x-hcdn-cache-status`, hora y URL del fallo si persiste.

Referencias oficiales: [registro por scope](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register),
[updateViaCache](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updateViaCache),
[LiteSpeed](https://docs.litespeedtech.com/lscache/noplugin/settings/),
[caché hCDN](https://www.hostinger.com/support/how-hostinger-cdn-caching-works/).

## Qué publicar (cuando se autorice)

Construir y publicar el **mismo `dist/` completo**: bundles nuevos, HTML/prerender,
`sw.js`, manifest, offline e iconos. Subir solo `sw.js` no actualiza el registro
embebido en el JavaScript. Mantener el procedimiento existente que preserva el
`.htaccess` y `laravel-api.php` del hosting; el bloque recomendado anterior es una
acción separada a revisar/aprobar. No requiere backend, migraciones, VAPID ni `.env`.
Publicar assets antes que los HTML que los referencian o usar un cambio atómico.

## Verificación posterior, sin desregistrar ni borrar datos

Desde la carpeta con el build que se publicó:

```bash
pwa_sw_version=$(sha256sum dist/sw.js | awk '{print $1}')
curl --fail --silent --show-error -D - -o /dev/null "https://upgradecolombia.com/sw.js?v=${pwa_sw_version}"
curl --fail --silent --show-error "https://upgradecolombia.com/sw.js?v=${pwa_sw_version}" | sha256sum
curl --fail --silent --show-error "https://upgradecolombia.com/sw.js?v=${pwa_sw_version}" | grep -E 'PUSH_DIAGNOSTICS_GET|PUSH_DIAGNOSTICS_CLEAR|PUSH_DIAGNOSTIC_CLIENT_OPEN'
```

El hash debe coincidir con `dist/sw.js`; comprobar HTTP 200 y JavaScript, no HTML,
sin `immutable` ni un `max-age` positivo para el SW. No añadir un `cb` aleatorio
al registro para hacer pasar la comprobación.

1. Abrir CRM con el frontend nuevo y guardar los formularios pendientes.
2. Si aparece **Actualizar aplicación**, aceptarla y esperar la recarga. No
   desregistrar el worker ni borrar almacenamiento/subscripciones.
3. Verificar scope raíz, `updateViaCache: "none"`, URL activa con el hash esperado
   y ausencia de otra actualización pendiente. En consola, sin secretos:

   ```js
   const registration = await navigator.serviceWorker.getRegistration('/');
   console.table({ scope: registration?.scope, active: registration?.active?.scriptURL,
     waiting: registration?.waiting?.scriptURL, updateViaCache: registration?.updateViaCache });
   ```

4. En Mi perfil → Diagnóstico Push, pulsar Actualizar. Debe responder sin timeout;
   GET devuelve `{ok:true,records:[...]}` o una lista vacía. La apertura registra
   `client_open`; Limpiar borra exclusivamente ese historial técnico y CLEAR
   devuelve `{ok:true,records:[]}`. CLIENT_OPEN con MessageChannel devuelve `{ok:true}`.
5. Recargar otra vez: misma URL y sin nueva instalación si el SW no cambió.
6. Retomar la prueba Android con la PWA cerrada. Este cambio corrige la selección
   de versión, no demuestra ni corrige por sí mismo la latencia de FCM/Android.

## Validación local segura

`npm test`, `npm run build`, y `scripts/verify-pwa-browser.mjs` contra un servidor
local del build. El QA usa un perfil aislado y API/proveedor simulados. Reproduce
un `/sw.js` obsoleto permanente sin handlers diagnósticos, migra al hash sin
unregister, verifica waiting/consentimiento, mismo registro, owner y cookie
conservados, GET/CLEAR/CLIENT_OPEN, estabilidad tras reload y actualización posterior.

Resultado local de esta revisión: `npm test` **100/100 PASS** (27 pruebas PWA/
diagnóstico/versionado), build cliente + SSR + prerender **PASS** y QA Chrome
**24 comprobaciones**, sin errores de página. Se comprobó además que `dist/sw.js`
conserva el hash de origen y que el bundle cliente contiene ese mismo hash.
Persisten avisos no bloqueantes del harness Vite (puerto HMR/dep-scan al cerrar)
y del chunk mayor de 500 kB; no se cambiaron esos módulos ni el chunking.
