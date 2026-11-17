# Release autorizado — GA4 preparado, branding original y centro legal cerrado

Base: `4d0dadd607a320eff73786a5422a45ee1233e8a1`, último `origin/main` consultado antes de preparar el release. Backend requerido inalterado: `35600ea3e51d1dda809c513fc6fd614d5e34c088`.

## Alcance

- Publicar la implementación existente de GA4 con ID `G-RXJ570E5BE`, **sin activar recopilación**. Todas las compuertas en `.env.production` están explícitamente en `false`, incluido el control de privacidad. No aparece un banner o botón que prometa activar Analytics mientras está bloqueado.
- Publicar logo original en footer/login, dimensiones del sidebar CRM, iconos 180/192/512/maskable y la misma fuente Oswald local con licencia.
- Conservar seis documentos legales y su integración de desarrollo/SSR, **sin publicación de los borradores**. `LEGAL_RELEASE_READY=false`, identidad/revisión sin aprobar; las políticas históricas se mantienen. Sin rutas nuevas en el sitemap, sin enlace de revisión productivo y sin textos ni identificación incompleta en los bundles productivos.
- No se modifica backend, dependencias, workflow, pin backend, Splash, manifest, Service Worker ni configuración del configurador. Los únicos cambios en componentes de checkout/carrito son los hooks de observación analítica previamente implementados; no cambian cálculos, solicitudes comerciales ni pagos.

## Trazabilidad

Los cinco commits originales se incorporaron con `cherry-pick -x` en un worktree de release aislado, sin cambiar los worktrees previos:

| Original | Commit de release | Contenido |
|---|---|---|
| f4e3f820eacb0ffb22d85c66ed2cafb22388c86e | 38ef66b3a242585022025e7ba7d221e8beb06246 | Consentimiento y GA4 |
| 8ac0683107e5a45d1003d0aef343962d858a3aaf | 14763deaaa734b50308e86f018d5ac587d7bcc01 | Logo e iconos |
| 7257597d605dd681db5748df995569aad0f9eed4 | 61877082fe16bb50aae216ac270237ff57d80f5f | Oswald local |
| 107b5856ce3c8ac64ecc6b272b36065b0c4755be | f1b94b6a75d4585ae1ba7aa573e51beb96ce90a5 | Revisión legal protegida |
| 0a8d870a6399944525a6259798e6b0b8647802d7 | 252497421a96ed589d52c8903728f6884a102a5a | Fuentes en dev/preview/SSR |

El commit final añade el ID público, los gates explícitos, la regresión productiva y las pruebas de navegador existentes actualizadas con ID real e interceptación de Google. No incorpora los cambios generados de `dist`, scripts DEMO ni credenciales. Los informes anteriores describen etapas históricas; esta nota fija el alcance de la publicación autorizada.

## Verificaciones previas al push

- `npm ci`: PASS; audit 0 vulnerabilidades.
- Node 22, suite secuencial: **278/278 PASS**.
- `npm test`, como CI y con Node 22: **278/278 PASS**.
- TypeScript (`tsc -b`), builds cliente y SSR, prerender de cinco páginas: PASS. La primera ejecución con Node 24 se detuvo al fallar una lectura del catálogo; la repetición con Node 22 completó el build sin omitir controles.
- Consentimiento Chrome: PASS, ID correcto, aceptación/rechazo/retirada, SPA, seis eventos comerciales, purchase sin pago rechazado, cinco anchos. Todas las solicitudes Google interceptadas.
- Branding Chrome: **21 combinaciones PASS**, siete anchos entre 1440 y 360 px; componentes reales con sesión sintética local, no autenticación productiva.
- Build productivo en navegador: **49 combinaciones PASS** (inicio, tienda, login, carrito, checkout y dos políticas existentes × siete anchos); sin overflow ni errores. Carrito persistido con una referencia pública consultada por GET y acceso al formulario de checkout: PASS. Estado únicamente local del navegador; cero órdenes/pagos/movimientos y cero solicitudes de escritura.
- Cero solicitudes Google y cero controles analíticos engañosos en esas vistas productivas.
- Borradores públicos y revisión local en modo producción: 404. Cinco páginas prerenderizadas; sin borradores ni identificación pendiente en JavaScript cliente/SSR.
- Fuentes en dev, preview y SSR: **36 GET/HEAD PASS**, MIME y bytes originales; revisión legal solo disponible en desarrollo.
- Generador de iconos PHP: sintaxis PASS. PNG, proporciones y área segura: cubiertos por la suite.
- `git diff --check` de fuentes/staged: PASS. Artefactos dist generados excluidos del commit.
- SHA-256 SW intacto: `43338314702133f01e4df46edf0e9640229a0da55f593d0773104e6bcbfa3482`.

Logs locales `/tmp/upgrade79-ga4-release-{tests,tests-ci,build-node22,consent,branding,fonts,navigation}.log`. Capturas en `/tmp/upgrade79-ga4-release-browser` y `/tmp/upgrade79-ga4-release-branding`. Estos artefactos no se publican.

## Publicación y recuperación

Actualizar `main` únicamente mediante push fast-forward del SHA final revisado. El workflow existente ejecuta tests, build, verificación de pin backend/receipt/preflight, respaldo privado del frontend anterior y publicación de assets antes del HTML. No ejecuta migraciones. Conservar sus controles; ante cualquier fallo detenerse e inspeccionar la fase alcanzada antes de reintentar.

El workflow conserva un respaldo privado `upgrade79-deploy-rollbacks/frontend-<sha>-*/frontend-code.tar.gz` y su checksum. Una recuperación debe validar ese archivo y restaurar únicamente el código frontend, sin tocar storage, backend, pagos ni base de datos. No se necesita revertir parches de dependencias anteriores: este release no cambia el lockfile.

Comprobar después: resultado de Actions con SHA exacto, hashes de assets servidos, logo/iconos/fuentes, manifest/SW sin cambios, API protegida 401, páginas públicas 200, borradores 404, políticas anteriores intactas y ausencia de Analytics/controles opcionales.

## Pendientes que esta publicación no autoriza

Activar recopilación exige aprobación posterior de información de privacidad y ajustes de la propiedad GA4. DebugView/Realtime reales e iOS físico siguen pendientes. El centro legal requiere identificación, vigencia y políticas operativas confirmadas. Se conserva el aviso conocido de chunks >500 kB, fuera de alcance. No se realizaron operaciones comerciales ni pruebas de escritura productiva.
