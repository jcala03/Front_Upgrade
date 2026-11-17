# GA4, branding y centro legal — entrega local

Fecha: 16 de noviembre de 2026. Base frontend: `origin/main` **4d0dadd607a320eff73786a5422a45ee1233e8a1**. Backend requerido sin cambios: **35600ea3e51d1dda809c513fc6fd614d5e34c088**.

Se respetó el orden de trabajo: Analytics, branding y revisión legal. El autoalojamiento de Oswald se incorporó tras su autorización expresa al descubrir la conexión tipográfica previa. No se publicaron cambios ni se cambiaron los repositorios originales. Los worktrees preliminares y su contenido pendiente se conservaron.

| Fase | Estado | Archivos principales | Pruebas | Bloqueos | Lista para publicar |
|---|---|---|---|---|---|
| GA4/consentimiento | Integrado, apagado por defecto | `src/privacy/`, Layout/Footer, Shop/Featured/ProductDetail, CartContext, Checkout y confirmaciones, `.env.example` | 9 pruebas nuevas; Chrome: consentimientos, recarga, SPA, retirada y 5 anchos | ID legítimo, revisión de propiedad e información adecuada de privacidad | No activar todavía |
| Branding/PWA | Preparado para revisión visual | Header/Footer, Login/CrmLayout, generador existente y 4 iconos | 4 pruebas nuevas; 3 vistas × 7 anchos; PNG/círculo seguro; build | Safari/iOS físico y aprobación visual | Técnicamente preparado; sin deploy autorizado |
| Centro legal | Seis borradores integrados en revisión local | 6 Markdown, LegalCenterPage/CSS, App, SEO, prerender, Footer y config | 4 pruebas nuevas; 7 vistas × 7 anchos; App SSR/hidratación; axe WCAG | Identificación, vigencia, cookies reales y aprobación jurídica/comercial; sitemap Laravel para futura ampliación | No publicar borradores |
| Oswald local autorizado | Misma fuente, mismos pesos | `index.html`, `public/fonts/oswald/`, licencia y test | 1 prueba nueva; fuentes locales en navegador, sin solicitudes a Google | Revisión conjunta | Preparado sin activarlo en producción |

## Pruebas finales

- **275/275 PASS**, Node 22: 257 del baseline + 9 consentimiento/Analytics + 4 branding + 4 legales + 1 fuente. No se eliminaron pruebas.
- TypeScript `tsc -b`, build cliente, build SSR y prerender: **PASS**. Las cinco páginas productivas actuales se conservan. Los borradores no aparecen en los bundles productivos con el guard cerrado.
- Chrome con fixture de consentimiento: no Analytics antes de aceptar, una etiqueta, publicidad denegada, navegación, recarga y retirada sin perder carrito/sesión. Google interceptado, ningún envío real.
- Chrome con App real y SSR para la revisión legal: **49 combinaciones** de vista/ancho, sin errores de ejecución/hidratación, sin overflow; encabezados y anclas válidos; diálogo funcional; ninguna solicitud a Fonts/Analytics. Se utiliza Oswald local.
- La regresión Apache espera ahora la petición real del filtro antes de verificarla: el listado tiene un debounce existente de 220 ms y el efecto de metadatos no acredita que esa petición haya terminado. No se cambió el filtro ni su expectativa comercial.
- Regresión del build mediante Apache aislado: **PASS**, rutas públicas/privadas, contrato del filtro, desktop/móvil, hidratación y Service Worker real activo, con `errors: []`. El puente API era un fixture: no acredita un pago ni una consulta comercial real.
- Axe WCAG 2 A/AA y 2.1 AA sobre el centro de privacidad: **sin infracciones**. Se añadieron subrayados a enlaces de texto.
- Branding: **21 combinaciones** de vista/ancho; capturas antes/después. No se inició sesión real ni se utilizaron clientes reales.
- PHP del generador de iconos: sintaxis válida. `git diff --cached --check`: verificación de archivos incluidos, sin stage de dist ni artefactos.
- Se conserva el aviso previo de chunks grandes: no se ha intentado resolver en esta tarea.
- Safari/iOS real, DebugView/Realtime con propiedad legítima y validación de cookies autenticadas: **pendientes**, no simulados como pruebas reales.

## Analytics y activación

No se detectó un Measurement ID verificado en los archivos públicos inspeccionados ni se recibió uno durante la implementación. El identificador sintético está limitado a tests interceptados y no entra al build.

Eventos conectados: page_view, view_item_list, select_item, view_item, add_to_cart, remove_from_cart, begin_checkout y purchase. Precios y cantidades del flujo existente; COP; producto/variante exactos. No nombres, correos, teléfonos, direcciones, términos de búsqueda, tokens ni actividad de CRM.

`purchase` depende del endpoint real de consulta de orden: estado `paid`, orden no cancelada, moneda y cantidades válidas; nunca de la URL o de una visita. Transaction ID estable `upgrade79-order-{id}` y deduplicación. No se generó ningún pago. Las órdenes mixtas con servicios quedan pendientes de un desglose analítico completo y no se miden como compra parcial.

Se mantienen vacíos/apagados los valores de ejemplo `VITE_GA4_MEASUREMENT_ID`, `VITE_GA4_ENABLED`, `VITE_GA4_SETTINGS_REVIEWED`, `VITE_ANALYTICS_INFORMATION_REVIEWED`, `VITE_PRIVACY_CONTROLS_ENABLED` y `VITE_GA4_LOCAL_DEBUG`; no se modificó `.env.production`. Rechazar o retirar consentimiento bloquea eventos aunque se hubiera descargado la biblioteca; no puede deshacer solicitudes ya enviadas.

Los pasos de DebugView y Realtime están en `GA4_CONSENT_RESULTADOS.md`. Antes de activar debe aprobarse la información enlazada: la política pública histórica no cubre por sí sola toda la nueva medición.

## Identidad y centro legal

Titular público confirmado: **Juan Cano Jimenez**, persona natural titular del establecimiento **Light Tunning Store**. Número previamente proporcionado: **1143149923**, con tipo aún no confirmado. No se inventó NIT, dígito de verificación, sociedad, representante ni registro. La vigencia jurídica no se dedujo automáticamente de la fecha de conversación.

Vistas de revisión: `/__legal-review/legal-y-privacidad` y los seis slugs de políticas bajo ese prefijo. Solo desarrollo, noindex, sin canonical. Las dos páginas publicadas se mantienen y los nuevos slugs públicos no aprobados continúan con 404 real.

Documentos: Política de Datos, Cookies, Términos y Condiciones, Envíos y Entregas, Cambios/Devoluciones/Garantías y Centro de Privacidad. Se corrigió el parser previo para separar encabezados de párrafos sin cambiar su contenido jurídico. No se implementó un formulario ficticio de radicación.

El backend se inspeccionó únicamente para confirmar el contrato público de órdenes y el sitemap. La ampliación futura del sitemap efectivo requiere coordinar `PublicCatalogPage::sitemap` con las rutas legales finalmente aprobadas; no se cambió el backend ni se anunciaron URLs todavía inexistentes.

## Commits locales y separación

1. `f4e3f820eacb0ffb22d85c66ed2cafb22388c86e` — consentimiento y Analytics.
2. `8ac0683107e5a45d1003d0aef343962d858a3aaf` — logo original e iconos.
3. `7257597d605dd681db5748df995569aad0f9eed4` — misma fuente Oswald autoalojada, autorización posterior.
4. `feat(legal): integrate gated natural-person policy review` — integración local de borradores e informe; consultar HEAD para su SHA.

La rama final contiene los anteriores en orden. No se modificó main del checkout original ni se ejecutó push. No se deben trasladar indiscriminadamente los cambios pendientes del repositorio original a este release.

## Seguridad, publicación y siguientes pasos

Sin escrituras SQL, migraciones, registros ficticios, correos, órdenes ni pagos reales. Wompi, reservas, inventario, reglas comerciales, configuración del configurador, manifest y Service Worker: intactos. SHA-256 de `public/sw.js`: `43338314702133f01e4df46edf0e9640229a0da55f593d0773104e6bcbfa3482`.

1. Revisar capturas, logo y los seis documentos localmente.
2. Confirmar tipo/número de identificación y aprobar vigencia, atención de derechos/PQR y políticas operativas reales.
3. Confirmar ID GA4 y ajustes de propiedad. Probar DebugView con datos aislados, nunca un cobro real.
4. Coordinar ampliación del sitemap Laravel solo cuando las páginas estén aprobadas; si requiere nuevo backend, publicarlo primero y actualizar después el pin frontend con autorización.
5. Aprobar cambios y configuración de activación mediante revisión separada. Publicar no está autorizado en esta tarea. Mientras tanto los gates siguen cerrados.

Una publicación futura del código con los gates actuales no activaría Analytics ni sustituiría las políticas: solo dejaría el software preparado. No debe anunciarse como lanzamiento funcional de GA4/centro legal sin resolver las aprobaciones.
