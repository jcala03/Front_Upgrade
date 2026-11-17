# Centro legal — revisión local, no publicación

Se reutilizaron los seis Markdown y el componente del worktree `legal-privacy-center`, conservándolo intacto. No se creó un sistema de políticas paralelo.

## Estado y rutas

En desarrollo: `/__legal-review/legal-y-privacidad` y los seis documentos bajo `/__legal-review/`. Cada página tiene título y descripción propios, índice, enlaces entre documentos, contacto y acceso a preferencias. Las revisiones llevan `noindex, nofollow`, sin canonical.

En producción: `LEGAL_RELEASE_READY=false`, revisión, auditoría de cookies y procedimiento de reclamaciones no aprobados. Se mantienen exactamente las rutas de políticas actuales. Los nuevos documentos sin aprobar no se exponen; el build elimina la importación de sus textos y sus rutas públicas continúan devolviendo 404. No basta un parámetro de URL ni una preferencia del navegador para activarlos.

El SSR reconoce el mismo contrato de rutas que React. El prerender incorpora rutas legales aprobadas únicamente cuando la compuerta completa permita publicarlas, sin duplicar las dos rutas históricas. Con la compuerta cerrada el build mantiene sus cinco páginas actuales.

## Identidad y decisiones pendientes

- Nombre público confirmado por el propietario: **Juan Cano Jimenez**. Se identifica como persona natural titular del establecimiento **Light Tunning Store**, no como representante de una sociedad.
- Número previamente confirmado: **1143149923**. El usuario no confirmó de forma concluyente si corresponde a NIT o a otra identificación. Se señala en los borradores como tipo pendiente, sin inventar dígito de verificación. El guard requiere confirmación documental del tipo/número antes de publicar.
- Dirección y teléfono públicos reutilizados: carrera 44 #79-04, Barranquilla; +57 302 388 7034. Correo oficial existente: jcano@upgradecolombia.com.
- Vigencia de las políticas: pendiente de aprobación, no se convirtió la fecha de conversación en vigencia jurídica automática.
- Pendientes de aprobación del negocio: procedimiento real y trazable para peticiones/reclamaciones, atención de garantías y devoluciones, modalidades/plazos/costos efectivos de entrega, proveedores y circulación internacional de datos cuando corresponda.
- Pendiente contrastar las cookies efectivas de sesión en un acceso autenticado autorizado. No se declaran nombres o duraciones privados a partir de defaults de Laravel.
- Se detectó la carga previa de Oswald desde Google Fonts. El propietario autorizó expresamente autoalojar la misma fuente con su licencia, sin cambio de apariencia; se implementa esa preparación local antes de publicar. No se confunde tipografía con cookies analíticas.
- Los documentos son borradores de revisión, no un dictamen jurídico ni aprobación para publicarlos. Se conservan las garantías legales sin inventar programas comerciales voluntarios.

## Ajustes respecto del borrador anterior

La medición `purchase` ya tiene fuente de estado pagado e ID estable en la API existente; se actualizó el borrador de cookies y se incorporó el registro opcional local de deduplicación. Las órdenes con servicios no se miden todavía. Los términos describen habilitación por referencia del configurador, sin afirmar un bloqueo universal que ya no represente a todos los productos.

Se corrigió el parser previo: una cabecera seguida inmediatamente de un párrafo ya no absorbe el párrafo dentro del título/índice. Se conservan los textos. Los enlaces dentro de párrafos quedan subrayados para no depender solo del color.

No se modificaron formularios, pagos, stock, compatibilidades ni comunicaciones comerciales.

## Dependencia para futura publicación completa

La inspección de solo lectura de `backendupgrade/app/Services/PublicCatalogPage.php`, método `sitemap`, confirma que el sitemap efectivo de Hostinger es Laravel y actualmente incluye Inicio, Tienda y Política de Datos, además de productos. Antes de activar las nuevas políticas indexables debe coordinarse su lista con las rutas aprobadas del build. No se modificó backend ni se publicaron URLs legales todavía inexistentes. Esta es una dependencia de activación pendiente, no un fallo del sitemap productivo actual.

## Referencias primarias de contraste

Los borradores se contrastaron el 16 de noviembre de 2026, sin sustituir la revisión jurídica:

- [Ley 1581 de 2012, arts. 14–15](https://www.cancilleria.gov.co/sites/default/files/Normograma/docs/ley_1581_2012.htm): trámite de consultas y reclamos de datos.
- [Ley 1480 de 2011](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306): información y protección al consumidor.
- [Ley 2439 de 2024](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=257116): actualizaciones de comercio electrónico y reembolsos.
- [Sentencia C-192/26](https://www.corteconstitucional.gov.co/relatoria/2026/c-192-26.htm): alcance del término de reembolso por retracto.
- [SIC: políticas de tratamiento](https://sedeelectronica.sic.gov.co/publicaciones/boletin-juridico/concepto/politicas-de-tratamiento-de-datos-personales): finalidad informativa y requisitos de las políticas.

## Validaciones

Pruebas focales legales: 4/4 PASS; consentimiento y SEO focales combinados: 20/20 PASS. Suite completa combinada final: 275/275 PASS en Node 22, sin eliminar pruebas ni escribir en bases de datos.

Build cliente, TypeScript, SSR y prerender: PASS. Se comprobó que las frases de los borradores no aparecen en los assets de producción ni en el renderer compilado con el guard cerrado. Se conserva el aviso previo de chunks grandes; no se ha trabajado en él.

La prueba de navegador pasó 7 vistas × 7 anchos (1440,1280,1024,768,430,390,360): SSR e hidratación del App real, enlaces, encabezados, índices, preferencias, ausencia de overflow, errores de consola y solicitudes a Google. Axe WCAG 2 A/AA y 2.1 AA pasó sobre el centro de privacidad. Las llamadas API reales estuvieron bloqueadas sin bloquear los módulos fuente `/src/api/`. Capturas de las siete vistas en 1440 y 390 px: `/tmp/upgrade79-legal-captures/`. Safari/iOS físico y publicación del sitemap ampliado siguen pendientes.

No se hicieron push, deploy, cambios de Hostinger, escrituras SQL ni envíos reales a Google.
