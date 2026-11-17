# GA4 y consentimiento — preparación local, 16 de noviembre de 2026

Base: origin/main `4d0dadd607a320eff73786a5422a45ee1233e8a1`, worktree `/tmp/upgrade79-ga4`.
Se reutilizaron los componentes del worktree legal existente, sin modificarlo ni tocar los repositorios originales.

## Activación pendiente

Actualización para el release autorizado: el propietario confirmó `G-RXJ570E5BE`, configurado en `.env.production` mediante `VITE_GA4_MEASUREMENT_ID`. No se cambió la propiedad de Google ni se enviaron visitas reales. El ID `G-TESTONLY01` continúa limitado a fixtures unitarios.

La configuración productiva mantiene explícitamente apagados `VITE_PRIVACY_CONTROLS_ENABLED`, `VITE_GA4_ENABLED`, `VITE_GA4_SETTINGS_REVIEWED`, `VITE_ANALYTICS_INFORMATION_REVIEWED` y `VITE_GA4_LOCAL_DEBUG`. No se muestran controles que prometan activar un servicio bloqueado. `.env.example` mantiene el ID vacío como plantilla.

Antes de activar: confirmar la propiedad y su ID, revisar la información de privacidad enlazada, revisar la configuración de GA4 (sin medición mejorada automática de formularios/URLs, sin datos proporcionados por usuarios ni señales publicitarias) y aprobar el despliegue conjunto. El centro legal completo sigue bloqueado por revisión del titular y las políticas.

## Funcionamiento

- Consent Mode v2 **básico**: no se inyecta Google hasta una elección analítica válida y todas las aprobaciones de configuración. Publicidad permanece denegada.
- Rechazar, configurar, aceptar y retirar mediante «Configurar cookies». Preferencia versionada, válida 180 días, con gestión de almacenamiento inaccesible.
- SSR y primer render del cliente muestran el mismo árbol; el banner aparece después de hidratar.
- Rutas analíticas excluyen CRM/login; omiten consultas, fragmentos, tokens y slugs. No se incluyen nombres de clientes ni datos de contacto.
- Eventos: page_view, view_item_list, select_item, view_item, add_to_cart, remove_from_cart, begin_checkout, purchase. Referencia exacta producto/variante, cantidades y precios del flujo existente, COP.
- Los cambios del carrito se miden después de aplicarse; una operación rechazada o la reconciliación automática de líneas pagadas no se considera compra/eliminación manual.
- `purchase` utiliza únicamente una respuesta fresca del endpoint público de la orden con estado `paid`, no la URL de retorno, el almacenamiento ni una visita. ID estable `upgrade79-order-{id}`; deduplicación en memoria, almacenamiento local (últimos 500 identificadores, eliminados al retirar consentimiento) y transaction_id de GA4. No se generan órdenes ni pagos.
- Las órdenes mixtas con servicios no se miden como purchase en esta fase para no publicar un desglose incompleto. Las compras sin consentimiento no se recuperan retroactivamente.
- Retirar consentimiento impide nuevos eventos, elimina la etiqueta DOM y las cookies GA propias. No puede deshacer solicitudes ya enviadas ni descargar código ya ejecutado.
- No se cambiaron cálculos, solicitudes comerciales, pagos, reservas, inventario, backend ni Service Worker.

## Verificación reproducible

1. `npm ci --no-audit --no-fund`.
2. Node 22: `node --test tests/*.test.mjs` (misma versión mayor que CI).
3. `npx tsc --noEmit` y `npm run build` (cliente, SSR y prerender).
4. `PLAYWRIGHT_MODULE=/ruta/playwright/index.mjs node tests/verify-privacy-browser.mjs`: Chrome local; Google interceptado, sin datos comerciales. Rechazo, aceptación, una etiqueta, navegación, recarga, retirada, hidratación y 1440/768/430/390/360 px.
5. Para probar una propiedad autorizada posteriormente: usar localmente ID verificado, `VITE_GA4_LOCAL_DEBUG=true` y aprobaciones revisadas; aceptar analíticas, abrir DebugView y comprobar los eventos, COP, ID de variante y transaction_id. Usar únicamente fixtures aislados para órdenes. En producción usar Realtime sin activar debug global, tras autorización de publicación.
6. Rechazar/retirar y comprobar en Network que no se originan nuevos eventos; verificar que carrito y sesión permanecen intactos. Repetir en Safari/iOS real antes de activar en producción (no disponible aquí).

No se hicieron push, despliegues, escrituras SQL ni envíos reales a Google.

## Resultados registrados

- Suite completa Node 22: 265/265 PASS antes de añadir el último caso de configuración inválida; prueba focal final: 9 casos.
- Chrome con Google interceptado: PASS; cinco anchos, sin errores de hidratación.
- `npm run build`: PASS cliente + SSR + prerender de 5 páginas. La primera ejecución sin acceso de red se detuvo de forma segura al no poder leer el catálogo; la repetición autorizada de lectura completó el prerender.
- `git diff --check` de los archivos fuente: PASS. Los artefactos generados de dist no forman parte del commit.
- SHA-256 Service Worker sin cambios: `43338314702133f01e4df46edf0e9640229a0da55f593d0773104e6bcbfa3482`.
