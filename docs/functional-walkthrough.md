# FINAL-PRODUCT-01A — Functional browser walkthrough

Resultado actual: **PASS — FUNCTIONAL WALKTHROUGH COMPLETE**, cerrado en FINAL-PRODUCT-01A-CLOSE y FINAL-PRODUCT-01A-CLOSE-RESUME. Las siete excepciones originales y las ramas QA pendientes se cerraron sin repetir la matriz completa. El resultado inicial de 01A fue PARTIAL; se conserva abajo como historial y se reemplaza por el cierre final al final de este documento. No certifica todas las variantes posibles, WCAG ni proveedores reales.

## Recovery / repositorios — historial de 01A

Se recuperó la ejecución anterior, se reutilizaron sus 26 archivos iniciales del harness y no se reejecutaron las creaciones/pagos comerciales que ya tenían evidencia suficiente. Los sondeos fallidos/incompletos sí se continuaron. Se conservaron 31 archivos originales de /tmp en `/home/jhonny/upgrade79-history-incident/qa-harness/recovered-first-run/`.

| Repositorio oficial | HEAD sanitized | Estado |
|---|---|---|
| `/home/jhonny/Escritorio/emprendimiento/Empresas/upgrade la 79/backendupgrade` | `ba261e026e6e0647ce2c26a919dd04df306d8090` | Sin cambios tracked de backend |
| `/home/jhonny/Escritorio/emprendimiento/Empresas/upgrade la 79/upgrade79-web` | `14f469752b7b5f62a3195718b6554acd7e882b9d` | Seis fuentes frontend + estos dos documentos, sin commit/push |

Los clones antiguos limpios se preservaron renombrados a `backendupgrade-prepurge-stale` y `upgrade79-web-prepurge-stale` junto a los oficiales. No volver a usarlos para trabajar, publicar ni mezclar historia antigua.

`/home/jhonny/upgrade79-history-incident/postpurge-verify/{backend-fresh,frontend-fresh}`: **NOT USED AS WORKING REPO** en la continuación. No había cambios tracked legítimos de producto que trasladar. No se copiaron repositorios enteros, entornos locales, dependencias, estado de navegador ni logs desde esos clones.

Se detuvo el Vite antiguo y se conservó su directorio generado residual fuera del producto (`stale-vite-generated-directory`). Se instalaron las dependencias locked en los clones oficiales sin modificar manifests/locks. Los entornos oficiales se prepararon por separado; APP_KEY nueva local, no reutilizada de producción.

## Entorno y método — historial de 01A

- Chrome real mediante el harness externo; frontend oficial `http://localhost:5174`, backend oficial `http://localhost:8011`.
- `SELECT DATABASE()` devolvió `upgrade_ux_qa`. No se reseedó al continuar ni se migraron/vaciaron `upgrade` o `upgrade_test`. Al cierre siguen presentes sus 53/58 tablas respectivamente; esto verifica existencia, no un checksum completo de sus datos.
- Datos sintéticos QA. Ninguna tarjeta real, envío comprado, mensaje WhatsApp enviado ni proveedor real llamado.
- Wompi y Envia se simularon **fuera** de los repos. El router tiene guardas APP_ENV local y DB exacta. HTTP saliente de los proveedores interceptado; checkout Wompi sustituido por página local de QA. El servicio financiero real recibe webhook local firmado y verifica transacción contra la respuesta privada simulada; no se cambiaron sus reglas.
- Los clics, formularios y confirmaciones nativas aportan la evidencia funcional. SQL y Network complementan hechos observados, no reemplazan un flujo UI.
- Sólo Referencias y recuperación de una sesión pública perdida usaron URL/estado manual como diagnóstico; no se aprueba con eso su descubrimiento.
- PENDING → DECLINED → nuevo intento → APPROVED se ensayó en una orden QA. Una modificación tentativa del retry fue retirada: evidencia 048/052 **no** certifica un fix vigente del frontend. El feedback del retorno rechazado sigue PARTIAL.
- Hubo errores de selectors (labels incluyen opciones/valores y aria-label sustituye texto visible), cierres de Chrome y parada del router QA con exit 143. Se conservaron sus registros y se repusieron sólo servicios de QA, sin reiniciar fase ni datos. 153/154 fueron fallos de infraestructura, no evidencia de permiso/producto.
- PASS = escenario descrito completo; PARTIAL = límite/fallo especificado; FAIL = acción defectuosa; BLOCKED = impedimento para completar; EXTERNAL = entrega/integración fuera del QA permitido. No transformar “200 + pantalla visible” en PASS de una mutación.

## Browser coverage

Cobertura final: 41 pantallas canónicas; 43 combinaciones pantalla/perfil. Visited43/43; Interacted43/43; escenarios primarios PASS43/43, PARTIAL0; flujos conectados8/8; contextos de rol43/43 más negativos dirigidos. Antes del cierre:36/43 y7/8. Responsive base43/43 conservado; público1440/1280/1024/768/430/390/360 y vistas críticas CRM en las seis anchuras. No matriz exhaustiva de permisos ni de todos los estados responsive. Detalle en [screen-inventory.md](screen-inventory.md).

El conteo de 163 registros incrementales incluye pruebas fallidas/diagnósticas: **no son 163 flujos PASS**.
Capturas preservadas: 72 iniciales + 207 incrementales/responsive = 279 PNG. Tres estados de navegador privados y ocho exportaciones Excel (descarga real; ZIP validado, no revisión exhaustiva de todas las celdas).

## Resultados funcionales observados — historial de 01A, antes del cierre

| Role | Module | Flow | Browser result | Notes |
|---|---|---|---|---|
| Public | Home | CTA tienda, hotspots siguiente/anterior, Contacto cruzado | PASS | CTA “Explorar artículos”; hotspots cambian 01/05→02/05. Disabled durante preparación no se declaró bug tras estabilizarse (112). Contacto retestado en 084. |
| Public | Contacto | Fecha → hora → nombre/teléfono/vehículo → WhatsApp | EXTERNAL | Validación/formulario/solicitud clickados. Navegación wa.me bloqueada por seguridad; no se envió mensaje ni se creó una cita CRM. |
| Public | Tienda | Buscar Capacitación y vehículo Porsche/Macan/Base/año | PASS | Producto nuevo disponible en red, filtros interactuados; selección por UI (004–014). |
| Public | Producto/cart | Variante obligatoria → agregar → 1→2→1 → subtotal | PASS | Sin variante no se puede agregar; precio $1.350.000, subtotal $2.700.000 para dos. Simple también recorrido. |
| Public | Checkout shipping | Contacto → dirección → cotizar → aplicar cargos → pagar → retorno → confirmación | PASS (simulated provider) | Orden 12 K8FMNJ, subtotal $1.350.000 + envío $15.000 = $1.365.000; pagada/confirmada. Phone remitente QA se completó por Settings UI tras 422; no se omitió validación. |
| Public | Checkout pickup | Contacto → BAQ → aplicar cero envío → pagar → confirmación | PASS (simulated provider) | Orden 14 HBTNGE $950.000; pagada/confirmada, carrito vacío después de confirmación. |
| Public | Payment return | Pending, rechazo, retry y aprobado | PARTIAL | Pending aconseja esperar; approved permite Ver mi orden. DECLINED sigue mostrando espera. El backend permite retry/reuse también en pending; no usar sólo can_retry_payment como diagnóstico de fallo. Sin fix vigente. |
| Public | Proveedores | Wompi/Envia reales, DHL internacional, WhatsApp | EXTERNAL | No probado ni cobrado. Los importes/plazos del envío son fixtures, no promesas comerciales. |
| Admin | Dashboard | General → Bogotá → comparar sedes | PASS | BOG cero ventas, comparación incluye sedes con estados; no necesita cinco módulos para ver métricas (131/134). |
| Admin | Customer/Vehicle | Crear cliente → detalle → vehículo → nueva cotización | PASS | Cliente 3 y vehículo 2 enlazados. Edición/eliminación de cliente/vehículo no completadas; no convertir esto en CRUD exhaustivo. |
| Admin | Quotation | Crear → editar → enviada → convertir | PASS | Cotización 4 COT-20260930-JON0DY → orden 11; conserva cliente, vehículo y $950.000. Confirmación nativa aceptada antes de declarar conversión. |
| Admin | Sales/payment | Venta convertida → completar → pago parcial → saldo | PASS | Orden 11 completed/paid, efectivo $400.000 + transferencia $550.000. Paid y completed no se confunden ni se fusionan. |
| Admin | Direct sale | Abrir Nueva venta, sede/vendedor/vehículo/items | PARTIAL | Formulario y responsive inspeccionados; submit de nueva venta directa Admin no completado. La venta directa **collaborator** sí se completó, no se atribuye al Admin. |
| Admin | Product/inventory | Crear → Guardar y asignar → BAQ 6 → BOG 4 → tienda | PASS | Producto 10 SKU QA-FINAL-PRODUCT-001. Asignaciones 201 reales. No repetir creación por error posterior de locator. Mínimos/salida manual/ajuste no recorridos exhaustivamente. |
| Admin | Transfer | Solicitar → despachar → tránsito → recibir | PASS | TRF-20260930-0001, 1 unidad BAQ→BOG. Stock inicial producto10 6/4→5/5; venta propia posterior BAQ→4. Historial y actores conservados. |
| Admin | Movements | Filtrar Entrada traslado / BOG | PASS | UI muestra +1, 4→5, transferencia y actor (157). No hay búsqueda por SKU/fechas en los controles observados; límite mostrado 150 registros. |
| Admin | Categories | Crear, buscar, editar, spec Material QA | PASS | Categoría QA nueva; baseline preservado. No eliminación/desactivación. |
| Admin | Publication | Producto publicado → Configurar → destacado → Guardar | FAIL / module PARTIAL | UI informa que no tiene imagen principal y bloquea guardar, aunque ya aparecía publicado por creación. No se fuerza publicación ni se cambia regla backend. |
| Admin | Services | Crear → buscar → editar | PASS | Servicio QA $10.000/60 min. Categorías de servicio y activar/desactivar no completados. |
| Admin | Employee/access | Crear user limitado → Employee BOG vinculado → detalle → horario/ausencia | PASS (primary scenario) | Empleado 2 accede a Home BOG; baseline Employee BAQ intacto. Edición/desactivación de empleado no completadas. |
| Admin | Schedules | Detalle empleado → intervalo semanal | PARTIAL | Lunes 08–17 con vigencia creado 201. Excepciones, edición y cierre no completados. |
| Admin | Leaves | Crear vacaciones futuras | PARTIAL | Empleado BOG, 12 octubre 10–11, creado 201. Editar/cancelar no completados. |
| Admin | Appointments | Crear confirmada → reprogramar → cancelar con motivo | PASS | Nueva cita 6 octubre 10–11 → 7 octubre 10–11, zona Colombia; backend UTC 15–16. Disponibilidad consultada. No-show/in_progress/completed no ejercidos. |
| Admin | Calendar | BOG → Agenda → siguiente semana | PASS | Mensaje explica que branch view incluye citas/tareas históricas, no horarios/ausencias globales del empleado (144). |
| Admin | Tasks/goals | Asignar tarea/meta → colaborador avanza/finaliza | PASS | Tarea 2 completada y meta 2 avance 2/2/completada. No alterar task/goal baseline UX-R2-E. |
| Admin | Reconciliation | Listar caso → iniciar → escalar → historia | PASS (escalation path) | Caso 3 generado por webhook missing mock (503 real del guard). Inicio 201 y decisión 201; sigue under_review/open, sin cambios financieros. No afirmar resolución/cierre ni corregir pago a mano. |
| Admin | Commissions | BOG vacío → BAQ Ganada → detalle | PASS | Snapshot histórico venta 15 y $35.000; ledger no editable (137). |
| Admin | Reports | Ocho familias → export → sede/rango inválido | PASS | Ventas, Productos, Pagos, Cartera, Inventario, Movimientos, Cotizaciones, Clientes: ocho GET/export 200 y ZIP Excel válidos. Sede 2 persiste al cambiar familia; fechas cambian a defaults. Rango invertido da error sin consultar. |
| Admin | Notifications | Marcar nueva como leída | PASS | Notificación 29/read 200, Leída y contador. No marcar masivamente baseline. |
| Admin | Branches | Crear → editar ciudad → desactivar | PASS (after fix) | Sede QA 3 desactivada; códigos/slugs BAQ/BOG no alterados. El alta anterior fallaba 422 por slug no representado en form. |
| Admin | Settings | Phone remitente y nuevo usuario QA | PARTIAL | General guardado 200, usuario limitado creado 201; tab Ventas/cotizaciones no validado/guardado exhaustivamente. |
| Admin | References | Marca nueva/editada, compatibilidad tabs | PARTIAL | Marca artículo 201 y edición 200; marca/modelo/generación/sistema vehicular leídos. Entrada manual diagnóstica por ausencia de enlaces visibles; sin CRUD vehicular. |
| Admin | Profile | Guardar datos sin cambio de rol | PASS | PATCH /api/auth/me 200 y “Perfil actualizado correctamente” (163). |
| Collaborator BAQ | Home/calendar/business | Prioridades → módulos propios, agenda/rango, agregado/refresh | PASS | No márgenes/COGS financieros globales. Horarios y citas propias visibles; filtros de fecha de business no ejercidos exhaustivamente. |
| Collaborator BAQ | Own quotation | Crear → editar → enviar → convertir | PASS | Cotización 5 WGURSZ → orden 13 FYZLZ1. Sede BAQ derivada de Employee, no selector editable. |
| Collaborator BAQ | Own sales/payment | Convertida y directa → confirmar → pagar → completar | PASS | Orden 13 $250.000 y directa 15 FYQEKH $950.000 completed/paid. Producto1 BAQ 8→7 en segunda venta. |
| Collaborator BAQ | Own commissions | Vacío → ledger Ganada → filtro | PASS | Venta 15 genera $35.000; visible en Home/ledger, filtro earned devuelve registro (124). |
| Collaborator BAQ | Own tasks/goals | Iniciar/completar tarea; meta personal CRUD/progreso/cierre | PASS | Personal goal3 creada 201, editada 200, 1/1, completada 200, filtro Personal/Completada. Baseline no tocado. |
| Collaborator BAQ | Notifications/profile | Leer y filtrar, guardar perfil | PASS | Lectura cambia contador; guardado compartido (077/095). |
| Limited BOG | Auth/profile/access | Login → Home BOG → cambiar password → relogin → deny Settings → logout | PASS | Pantalla Acceso denegado real en 390; no capacidades comerciales ni atajos comerciales (140). |
| Collaborator/limited | Security negatives | Forbidden admin, foreign ownership, forged scope | PASS (tested cases) | Detalle abajo; no sustituye matriz de todas las capacidades. |

## Flujos conectados exigidos — historial de 01A, pago cerrado después

| Flujo | Resultado | Final observable |
|---|---|---|
| Customer → Vehicle → Quotation → Sale → Payment | PASS | Cliente3/vehículo2/cotización4/orden11; saldo cero, payment paid y operativo completed. |
| Product → Stock BAQ → Stock BOG → Public availability | PASS | Producto10, asignaciones 6/4 y presencia pública; no aprobación del editor de publicación inconsistente. |
| Stock → Transfer → Dispatch → Transit → Receive | PASS | Transferencia1 recibida; salida BAQ/entrada BOG y actores visibles. |
| Quotation create → edit → convert | PASS | Admin4 y own5, sin reintroducir cliente/vehículo en la conversión. |
| Sale/order → payment → operational lifecycle | PASS | Admin orden11 y own13/15; completed y paid son estados distintos. Nueva venta directa Admin sigue sin submit. |
| Payment lifecycle / return / recovery | PARTIAL | Approved shipping/pickup confirmado; DECLINED no comunica fallo claramente y retry final no certificado. |
| Appointment → reschedule → status → cancel | PASS | Cita confirmada creada, reprogramada y cancelada con motivo. Otras transiciones no probadas. |
| Reconciliation → start → decision → history | PASS | Decisión de escalamiento trazada, caso abierto. No equivale a reconciliación resuelta ni altera ledger financiero. |

Snapshot SQL complementario al cierre: órdenes11/13/15 completed+paid; públicas12/14 confirmed+paid (no completed operativo); comisión1 employee1/BAQ earned 35000; producto10 BAQ4/BOG5, producto1 BAQ7/BOG5; BAQ/BOG activas, nueva sede QA3 inactiva. Orden16 IXMIFS se creó sólo para responsive/contacto; no tiene pago real ni flujo de compra completo y no se cuenta como compra aprobada. Dirección de ese ensayo no se guardó. No se borraron registros QA de evidencia.

## Roles y aislamiento

| Perfil / prueba desde browser autenticado | Resultado real |
|---|---|
| Collaborator BAQ → admin inventory/settings | 403 (051) |
| Collaborator BAQ → venta11 y cotización4 de otro dueño | 404; no registro ajeno expuesto (051) |
| Collaborator BAQ → my/sales?branch_id=2 | 422 branch_id prohibited (159) |
| Collaborator BAQ → my/quotations?branch_id=2 | 422 branch_id prohibited (159) |
| Collaborator BAQ → my/commissions?employee_id=2 | 422 employee_id prohibited (159) |
| Collaborator BAQ → admin/reports/sales | 403 (159) |
| Limited BOG → my/sales/my/quotations, admin settings/employees | 403 (089) |
| Limited BOG → my/tasks con employee_id BAQ | 200, colección propia vacía, no tarea BAQ (093) |
| Limited BOG → my/goals con employee_id BAQ | 422 parámetro prohibido (093) |
| Limited BOG → my/calendar con employee_id BAQ | 200, horario employee2 BOG, no citas BAQ (093) |
| Limited BOG → ruta UI /crm/settings | Acceso denegado visible (140) |
| Limited BOG password/profile | Relogin exitoso con contraseña nueva; conserva user y branch BOG; Salir vuelve a /login (140) |

Las consultas negativas de API fueron fetch con cookies de sesión **dentro del navegador real**, complementadas con rechazo UI. No se asignaron permisos Admin al colaborador ni se confiaron branch_id/employee_id del cliente.
No se detectó flujo independiente Super Admin, ni auth de cliente público. No se crearon roles ficticios para inflar cobertura.

## Responsive y accesibilidad

Detalles por vista/anchura y screenshots en screen-inventory. Pruebas completas de ancho de contacto/dirección checkout, dashboard comparación, transferencia y ledger own; fotos de formularios producto/quote/sale/appointment en las seis anchuras. Formularios quote/sale/appointment abiertos sin submit durante el ensayo responsive, no confundir con recorridos completados.

En 107: Tab ocho veces alterna sólo los botones del diálogo transferencia, Shift+Tab regresa, Escape cierra y devuelve foco a Ver detalle. En 141: Space expande/contrae “Recibe otra persona”; Tab llega a nombre/teléfono/país/departamento/ciudad/postal con outline solid; Shift+Tab retorna a Ciudad. En 152: Enter activa Volver al carrito. En contacto lleno se midieron cero inputs sin label en seis anchuras. No se certifican WCAG, lector de pantalla, contraste de todo el sistema ni focus trap de todos los modales por probar uno.

## Bugs registrados en 01A / estado actualizado en CLOSE

| ID | Severity | Module | Problem / reproducir | Fix | Result / evidence |
|---|---|---|---|---|---|
| FP01 | P1 | Sedes | Crear con código/nombre/ciudad devuelve 422 slug required; no había campo | Añadido slug obligatorio y payload tipado, patrón minúsculas/números/guiones; edición mantiene identificadores | FIXED: create201, edit200, deactivate200, 081–097 |
| FP02 | P2 | Public navigation | Contacto desde tienda iba a /tienda#contact, sección inexistente; corregir href aún no hacía scroll inicial React | Header/Footer apuntan Home + hash; Layout resuelve anchor después de render | FIXED: UI tienda→Contacto, /#contact target top≈0, scroll≈5070; 070–084 |
| FP03 | P2 | Transfer modal | Panel720 contiene artículo860; foco desplaza scroll horizontal y recorta título/datos | max-inline-size:100%; box-sizing:border-box sólo inventory-dialog | FIXED: 105/107 antes 860 vs718; 111 después scrollWidth=clientWidth en seis anchuras; transfer-fixed-{width}.png |
| FP04 | P1 | Payment return | DECLINED comunicaba espera | Proyección pública segura del último intento, feedback y retry misma Order | FIXED204–209; error de refresh conserva rechazo, una orden. La candidata048 retirada no se usa. |
| FP05 | P1 | References | Módulo sin enlace ni propósito explícito | ACTIVE demostrado; Catálogo→Marcas y vehículos con capabilities | FIXED182/185–208/285–286; no se aprobó descubrimiento por URL manual. |
| FP06 | P2 | Publication | Producto publicado sin imagen y editor posterior lo bloqueaba | Galería relacional y política coherente de imagen obligatoria publicada | FIXED201/246/248/267; cero publicados sin imagen, no placeholders ni ocultación automática. |
| FP07 | P3 | Movements copy | Namespace técnico en referencia | Transferencia/Orden/Pago +id legibles, sin enlace nuevo | FIXED276, seis anchos. |
| FP08 | P3 | Quote modal mobile | Cerrar estirado verticalmente360 | Alineación/tamaño locales | FIXED243,46px en seis anchos. |
| FP09 | P3 | Appointment mobile | Icono pisa placeholder360 | Padding local38px | FIXED252, seis anchos. |

P0: ninguno observado en este entorno/alcance; no afirmación de seguridad total.
FP01–FP09 corregidos y verificados. FP10–FP13 adicionales también cerrados; detalles en el apartado final. Sin prioridades funcionales abiertas dentro de este alcance.
El 422 de Envia por phone remitente era configuración incompleta del fixture QA: corregido **mediante UI Settings**, no código ni bypass. No se considera una caída comprobada en producción.
Chunk frontend >500kB se registra como warning de build, no se convierte sin medición en bug funcional.
El fallback de URL pública desconocida a Home fue observado previamente; queda para 01B/01E, sin modificación SEO.

## Clasificación histórica de archivos de 01A (sin valores secretos)

El contador histórico “28 editados” no trae una lista verificable. Inventario recuperado: **26 archivos raíz iniciales del harness + 3 env locales en clones de verificación**; no fingir que eso suma 28. Estado actual: **30 archivos raíz del harness + 5 env locales + 6 fuentes de producto + 2 documentos nuevos**. Dependencias, screenshots, browser state y build generado se clasifican aparte y no cuentan como cambios de código. `.env.env` no existe en los cuatro clones inspeccionados.

Prefijos exactos: B=`/home/jhonny/Escritorio/emprendimiento/Empresas/upgrade la 79/backendupgrade`, F=`/home/jhonny/Escritorio/emprendimiento/Empresas/upgrade la 79/upgrade79-web`, Q=`/home/jhonny/upgrade79-history-incident/qa-harness`, V=`/home/jhonny/upgrade79-history-incident/postpurge-verify`.
No hay secretos nuevos versionados: los env existentes son untracked/ignored. Harness/evidencia fuera de ambos repos de producto; directorio Q modo700 y estados navegador600. Backend env oficial600; env de verificación backend se restringió a600. URLs frontend no contienen claves.

### Producto y documentación

| Path (prefijo exacto arriba) | Class | Purpose | Tracked | Sensitive | Keep/Delete |
|---|---|---|---|---|---|
| F/src/components/layout/Header/Header.tsx | PRODUCT CHANGE | Anclas de navegación cruzada a Home | Yes | No | Keep, sin commit |
| F/src/components/layout/Footer/Footer.tsx | PRODUCT CHANGE | Anclas y logo Home | Yes | No | Keep, sin commit |
| F/src/components/layout/Layout.tsx | PRODUCT CHANGE | Resolver hash tras render React | Yes | No | Keep, sin commit |
| F/src/modules/admin/branches/AdminBranchesPage.tsx | PRODUCT CHANGE | Campo/payload slug al alta | Yes | No | Keep, sin commit |
| F/src/types/branch.ts | PRODUCT CHANGE | CreateBranchPayload exige slug | Yes | No | Keep, sin commit |
| F/src/modules/admin/inventory/AdminInventoryPage.css | PRODUCT CHANGE | Limitar contenido modal al panel | Yes | No | Keep, sin commit |
| F/docs/screen-inventory.md | DOCUMENTATION | Matriz de pantallas y límites | New untracked | No | Keep |
| F/docs/functional-walkthrough.md | DOCUMENTATION | Este informe/evidencia/clasificación | New untracked | No | Keep |
| F/src/pages/PaymentReturn/PaymentReturnPage.tsx | Sin PRODUCT CHANGE final | Tentativa retirada, sin diff | Yes, unchanged | No | Conservar original; no aprobar candidata por screenshot |

### Configuración local

| Path | Class | Purpose | Tracked / ignored | Sensitive | Keep/Delete |
|---|---|---|---|---|---|
| B/.env | LOCAL QA CONFIG | DB upgrade_ux_qa, URLs QA, APP_KEY local y configuración fixture | No / Yes | Sí: APP_KEY y posibles campos provider; no imprimir | Keep QA, 600; jamás commit/despliegue |
| F/.env.development.local | LOCAL QA CONFIG | Sólo URLs backend/frontend QA | No / Yes | No | Keep QA; no copiar a producción |
| V/backend-fresh/.env | LOCAL QA CONFIG | Config de verificación anterior, credenciales QA/APP_KEY | No / Yes | Sí, local/sintética | Keep recovery, 600; no reutilizar como env oficial |
| V/frontend-fresh/.env.local | LOCAL QA CONFIG | Sólo URLs QA del run anterior | No / Yes | No | Keep recovery; no trasladar |
| V/frontend-fresh/.env.development.local | LOCAL QA CONFIG | Sólo URLs QA del run anterior | No / Yes | No | Keep recovery; no trasladar |
| {B,F,V/backend-fresh,V/frontend-fresh}/.env.env | No archivo | Revisado explícitamente | Absent | N/A | Nada que borrar/copiar |

Los secretos provider en fixtures son sintéticos y sólo facilitan contratos de sandbox local; no se autenticó un proveedor real. Los env/config de clones stale pertenecen al material pre-rewrite preservado y no se trasladaron ni se publicaron.

### Cada archivo raíz del harness conservado

Todos los paths siguientes se expanden bajo Q. Tracked en repos producto: **No** en cada fila. “Sí QA” significa contiene credenciales sintéticas o claves de fixture, no permiso para publicarlas. No reejecutar los scripts mutantes originales como si fueran idempotentes: algunas creaciones comerciales no lo son.

| Path | Class | Purpose | Tracked | Sensitive | Keep/Delete |
|---|---|---|---|---|---|
| Q/commercial-flow.mjs | QA HARNESS | Login Admin y creación de cliente QA; conserva resultado comercial. | No | Sí QA | Keep fuera del producto; revisar antes de reutilizar |
| Q/crawl-public.mjs | QA HARNESS | Crawl público por anchura: DOM, overflow, foco, HTTP y capturas; no demuestra checkout lleno. | No | No credenciales embebidas; argumentos/estado pueden ser sensibles | Keep fuera del producto; revisar antes de reutilizar |
| Q/crawl-routes.mjs | QA HARNESS | Crawl autenticado de rutas por rol/anchura; no demuestra CRUD. | No | No credenciales embebidas; argumentos/estado pueden ser sensibles | Keep fuera del producto; revisar antes de reutilizar |
| Q/customer-detail-probe.mjs | QA HARNESS | Buscar cliente y abrir su detalle. | No | Sí QA | Keep fuera del producto; revisar antes de reutilizar |
| Q/explore-admin-action.mjs | QA HARNESS | Abrir acción indicada de un módulo y registrar formulario/controles; algunas acciones pueden mutar. | No | Sí QA | Keep fuera del producto; revisar antes de reutilizar |
| Q/explore-checkout.mjs | QA HARNESS | Producto → carrito → inicio de checkout y controles. | No | No credenciales embebidas; argumentos/estado pueden ser sensibles | Keep fuera del producto; revisar antes de reutilizar |
| Q/login-probe.mjs | QA HARNESS | Probar acceso CRM y respuesta de navegación; revisar argumentos antes de reutilizar. | No | No credenciales embebidas; argumentos/estado pueden ser sensibles | Keep fuera del producto; revisar antes de reutilizar |
| Q/order-lifecycle.mjs | QA HARNESS | Abrir venta y recorrer estados/pagos; muta datos QA. | No | Sí QA | Keep fuera del producto; revisar antes de reutilizar |
| Q/order-payments.mjs | QA HARNESS | Registrar pagos parciales/saldo de una venta QA. | No | Sí QA | Keep fuera del producto; revisar antes de reutilizar |
| Q/order-probe.mjs | QA HARNESS | Inspeccionar detalle de orden y acciones. | No | Sí QA | Keep fuera del producto; revisar antes de reutilizar |
| Q/payment-probe.mjs | QA HARNESS | Abrir formulario de registrar pago; inspección, no prueba de pago por existencia del formulario. | No | Sí QA | Keep fuera del producto; revisar antes de reutilizar |
| Q/pickup-flow.mjs | QA HARNESS | Cantidad, preparar orden, recogida y disponibilidad; muta orden QA. | No | No credenciales embebidas; argumentos/estado pueden ser sensibles | Keep fuera del producto; revisar antes de reutilizar |
| Q/probe.mjs | QA HARNESS | Sondeo inicial de página, DOM y captura. | No | No credenciales embebidas; argumentos/estado pueden ser sensibles | Keep fuera del producto; revisar antes de reutilizar |
| Q/product-create.mjs | QA HARNESS | Crear producto y abrir asignación de inventario. | No | Sí QA | Keep fuera del producto; revisar antes de reutilizar |
| Q/product-stock.mjs | QA HARNESS | Abrir ajuste de existencias y buscar producto; revisar submit antes de reejecutar. | No | Sí QA | Keep fuera del producto; revisar antes de reutilizar |
| Q/quotation-compose-probe.mjs | QA HARNESS | Cliente → nueva cotización; inspección de composición. | No | Sí QA | Keep fuera del producto; revisar antes de reutilizar |
| Q/quotation-convert-confirm.mjs | QA HARNESS | Confirmar conversión a venta; mutación QA. | No | Sí QA | Keep fuera del producto; revisar antes de reutilizar |
| Q/quotation-create.mjs | QA HARNESS | Crear cotización con vehículo/producto del cliente QA. | No | Sí QA | Keep fuera del producto; revisar antes de reutilizar |
| Q/quotation-edit-probe.mjs | QA HARNESS | Abrir edición de cotización y registrar controles. | No | Sí QA | Keep fuera del producto; revisar antes de reutilizar |
| Q/quotation-lifecycle.mjs | QA HARNESS | Editar, marcar enviada y solicitar conversión; revisar confirmación nativa. | No | Sí QA | Keep fuera del producto; revisar antes de reutilizar |
| Q/quotation-probe.mjs | QA HARNESS | Explorar cotización desde cliente. | No | Sí QA | Keep fuera del producto; revisar antes de reutilizar |
| Q/shipping-flow.mjs | QA HARNESS | Preparar orden shipping, guardar dirección e intentar cotizar. | No | No credenciales embebidas; argumentos/estado pueden ser sensibles | Keep fuera del producto; revisar antes de reutilizar |
| Q/vehicle-create.mjs | QA HARNESS | Crear vehículo desde detalle de cliente. | No | Sí QA | Keep fuera del producto; revisar antes de reutilizar |
| Q/vehicle-probe.mjs | QA HARNESS | Inspeccionar formulario de vehículo. | No | Sí QA | Keep fuera del producto; revisar antes de reutilizar |
| Q/package.json | QA HARNESS | Dependencias del harness externo (Playwright), no manifest del producto. | No | No credenciales embebidas; argumentos/estado pueden ser sensibles | Keep fuera del producto; revisar antes de reutilizar |
| Q/package-lock.json | QA HARNESS | Lock exclusivo del harness externo; no trasladar al frontend. | No | No credenciales embebidas; argumentos/estado pueden ser sensibles | Keep fuera del producto; revisar antes de reutilizar |
| Q/continue-browser.mjs | QA HARNESS | Continuación incremental de sesiones Chrome por rol; endpoint sólo loopback 8023, DOM/HTTP/capturas. Corregidos contador y manejo de JSON/cierre de página, sin crear un harness equivalente. | No | Sí QA | Keep fuera del producto; revisar antes de reutilizar |
| Q/provider-router.php | QA HARNESS | Router externo que arranca backend oficial y simula HTTP Wompi/Envia; guardas local + DB upgrade_ux_qa. Nunca desplegar. | No | Fixture QA, no real | Keep fuera del producto; revisar antes de reutilizar |
| Q/simulate-provider-event.php | QA HARNESS | Webhook firmado local sólo para órdenes de cliente QA FINAL, con verificación privada simulada; permite APPROVED/DECLINED o caso missing para conciliación. | No | Fixture QA, no real | Keep fuera del producto; revisar antes de reutilizar |
| Q/provider-status.txt | TEMPORARY | Estado de fixture del proveedor (APPROVED al cierre), sin credenciales. | No | Fixture QA, no real | Keep fuera del producto; revisar antes de reutilizar |

### Archivos generados / otros directorios

| Path | Class | Purpose | Tracked | Sensitive | Keep/Delete |
|---|---|---|---|---|---|
| Q/evidence-01a/{NNN-role-label.json,*.png} | QA HARNESS | DOM, HTTP y capturas; incluye fallos anotados, no todos PASS | No | Datos QA / algunos tokens públicos capability | Keep privado, no commit |
| Q/evidence-01a/state-{admin,collaborator,public}.json | TEMPORARY | Cookies/localStorage; no garantiza restaurar sessionStorage tras cierre | No | Sí: sesiones QA | Keep privado hasta revisión; no publicar; eventual eliminación explícita |
| Q/evidence-01a/provider-{events,requests}.jsonl | QA HARNESS | Webhooks mock/trazas provider sin credenciales provider reales | No | Metadatos y referencias QA | Keep privado |
| Q/evidence-01a/report-*.xlsx | QA HARNESS | Ocho archivos descargados reales | No | Sólo dataset sintético | Keep evidencia |
| Q/recovered-first-run/ | QA HARNESS | 31 JSON/JSONL iniciales copiados de /tmp | No | Datos QA / tokens capability posibles | Keep; originales de /tmp no borrados |
| I/final-product-screenshots/ | QA HARNESS | 72 capturas previas | No | Sólo datos sintéticos observados | Keep |
| Q/build-01a-inventory-fix/ | TEMPORARY | Build de validación fuera del producto | No | Config pública compilada, no publicar como release | Keep hasta revisión; eliminación posterior explícita |
| F/dist/ | TEMPORARY (build) | Primer build normal regeneró assets tracked | Sí en HEAD; sin diff final | Config pública | Sólo se restauraron nuestros artefactos generados a HEAD; sin cambio de release |
| B/vendor/, F/node_modules/, Q/node_modules/ | TEMPORARY | Dependencias locked/runtime local | Ignored / fuera del producto | No secretos añadidos por tarea | Keep runtime QA; locks producto intactos |
| B/storage/app/public/qa-ux/; B/public/storage | LOCAL QA CONFIG | Imágenes exclusivamente sintéticas y enlace storage | Ignored | No | Keep QA |
| I/stale-vite-generated-directory/ | TEMPORARY | Residuo Vite movido recuperablemente | Fuera de producto | No secretos observados | Keep recovery; no borrar sin revisión |
| ../backendupgrade-prepurge-stale; ../upgrade79-web-prepurge-stale | TEMPORARY / preserved stale repositories | Historia antigua aislada; no working repos | Repos antiguos, no changes de esta fase | Tratar historia como sensible | Keep preservados, nunca push/merge como repos actuales |

No se borraron clones, harness, evidencia ni datos materialmente recuperados. Nada se commiteó ni pusheó.

## Validaciones históricas de 01A — sustituidas por las finales de CLOSE

Frontend oficial:

| Command | Resultado |
|---|---|
| npm audit --omit=dev | PASS: 0 vulnerabilidades |
| npm audit | PASS: 0 vulnerabilidades |
| npx tsc -b | PASS, ejecución inicial y después del fix modal |
| npm run build | PASS inicial; sus artefactos tracked dist restaurados, no release |
| npm run build -- --outDir Q/build-01a-inventory-fix | PASS después del último fix; warning chunk>500kB y outDir externo no vaciado, no errores |
| git diff --check | PASS después de fuentes; reiterado con docs al finalizar |

Backend: código tracked **no modificado**, manifests/lock intactos, git diff --check limpio. No se repitieron tests/migraciones/seeding del backend ni se atribuye PASS nuevo a composer audit/test/pint no ejecutados en esta continuación. El runtime mock está fuera del repo y no cambia la configuración productiva.
Verificación final de diff: únicamente seis fuentes y dos documentos frontend. Sin cambios vigentes PaymentReturn, dist, package-lock, composer.lock o backend source.

## Cobertura pendiente original / condición para cierre total de 01A

El siguiente listado conserva las excepciones del checkpoint original; **no son pendientes actuales**. Sus resoluciones y límites actuales están en el cierre final:

1. FP04: feedback real DECLINED y recuperación retry con código final; necesita estado público seguro del intento, sin romper Payment vs Order ni idempotencia/reuse.
2. FP05: decidir y exponer entrada a Referencias; CRUD vehicular marca→modelo→generación→OEM no completado por navegador.
3. FP06: decisión de imagen/publicación; editor no tiene happy path para el producto creado QA.
4. Nueva venta directa **Admin**; variantes de edición/desactivación de Customer/Vehicle/Employee, mínimo/ajuste/salida de stock y transferencia cancelada, excepciones/edición de horarios, edición/cancelación de ausencia, categorías de servicio, reglas comerciales Settings no completadas. Los escenarios representativos aprobados no cubren esas ramas.
5. Conciliación: decisión de escalamiento sí; terminal resolved/ignored, conflictos concurrentes y todas las decisiones no recorridas. No resolver artificialmente un caso financiero inválido para subir cobertura.
6. Accesibilidad y responsive de estados de error/loading y todos los diálogos no exhaustivos. Lo medido está especificado; no certificación global.
7. Proveedores reales quedan EXTERNAL por instrucción; no bloquearse buscando credenciales reales ni llamarlos para completar QA local.

Lo anterior es un inventario explícito de cobertura, no prueba de que cada acción omitida esté rota. Para continuar, usar los IDs y pruebas pendientes; **no repetir** los siete flujos conectados satisfactorios ni reseedar/destruir evidencia.

## Remaining for FINAL-PRODUCT-01

01B — SEO. 01C — User Manual. 01D — Training Guide & Training Script. 01E — Final Cross-Validation.
No iniciados en esta ejecución. Este documento conserva datos para esas fases, no es un manual completo ni un nuevo UX master audit.

## FINAL-PRODUCT-01A-CLOSE / RESUME — baseline funcional final

Fecha de cierre: 2026-10-01, America/Bogota. Resultado: **PASS — FUNCTIONAL WALKTHROUGH COMPLETE**. Este apartado y la matriz actualizada de screen-inventory sustituyen los estados históricos PARTIAL/OPEN anteriores; no se borró su trazabilidad. RESUME sólo inspeccionó el working tree, verificó artefactos/validaciones y terminó estos dos documentos: no reimplementó pago/galería, no reconstruyó harness ni repitió browser QA.

### Previous Partial Cases

| Pantalla / flujo | Antes | Resolución final / evidencia |
|---|---|---|
| PublicPaymentReturn | PARTIAL | PASS: orden17 PENDING→DECLINED explícito→error de refresh conserva rechazo→retry misma Order→APPROVED; 204–209/238. |
| AdminOrders / venta directa | PARTIAL | PASS: cliente3/vehículo2 desde Customer→venta directa Admin18 con pago inicial15000 y stock BAQ→completar; 221–224. |
| AdminSchedules | PARTIAL | PASS: editar horario7/vigencia, crear/editar/eliminar excepción QA con confirmación; 211–215. |
| AdminLeaves | PARTIAL | PASS: editar ausencia1→cancelar→estado Cancelada persistido; 216. |
| AdminCatalogPublication | PARTIAL | PASS: create/edit/publication con galería; guardar publicación, ocultar/publicar producto10; 246/267, cero publicados sin imagen al cierre. |
| AdminSettings | PARTIAL | PASS: vigencia0 rechazada;15→21 guardado200/persistido tras navegación;15 restaurado por UI;239–241. Email existente sin modificar. |
| AdminReferences | PARTIAL | PASS: ACTIVE BUSINESS MODULE; entrada visible con capacidades; CRUD vehicular/OEM, búsqueda, relación y responsive;182/185–208/285–286. |

### Payment Return — PASS

- `payment_attempt_status` es una proyección pública whitelisted del último intento Wompi, sólo en el recurso de orden protegido por capability token. No expone respuesta privada del proveedor, eventos, claves ni datos internos de reconciliación.
- PENDING indica confirmación pendiente; agotar polling no infiere failure. DECLINED indica **Pago rechazado**, no espera; sólo ofrece retry si `can_retry_payment`. ERROR/UNKNOWN no afirma pago ni rechazo. APPROVED/paid muestra éxito, sin equipararlo a completed operativo. Reembolso/cancelación conservan su tratamiento propio.
- Orden17, importe15000: payment8 failed/DECLINED; error forzado de refresh conservó el rechazo y avisó del fallo; doble clic retry produjo **una** request de intento, payment9 completed/APPROVED sobre la **misma** Order y token; una orden para el email sintético de este ensayo. Al final Order17=confirmed/paid, no completed.
- Se conservaron timeout12s, una request concurrente, límite de polling, último estado conocido y lock de retry. Confirmación muestra número/total/estado y siguiente paso; carrito0 observado260. Browser204–209/238; tests backend2 y helper frontend4. Los proveedores son mocks locales, no cobros reales.

### Referencias — ACTIVE BUSINESS MODULE

Las ocho respuestas derivadas del sistema actual:

1. No existe una entidad comercial `Reference` ni una referencia/SKU adicional: el módulo compone **ProductBrand, VehicleBrand, VehicleModel, VehicleVersion y VehicleMultimediaSystem**, más el pivot generación↔OEM con rangos de años.
2. Guarda nombres de fabricantes, jerarquía marca/modelo/generación, años y sistemas OEM reutilizables. Products/Variants guardan los artículos/SKU y apuntan a esas listas; Categories define campos técnicos, no sustituye esas entidades.
3. Las pestañas del módulo crean/editan estas listas y las asociaciones OEM; se ejecutaron por navegador, no sólo por existencia del código.
4. Products consume marca comercial; Product/Variant compatibility consume marca/modelo/generación/OEM y año; CustomerVehicle y formularios de ventas/cotizaciones consumen el catálogo vehicular. Las ventas/cotizaciones conservan snapshots. Inventory administra artículos/variantes por Branch, no una entidad Reference aparte.
5. Lo necesita el usuario interno con capacidades de catálogo encargado de mantener las listas, normalmente Admin; no el comprador ni un colaborador sin esas capacidades.
6. Suprimir tablas/relaciones rompería selección/compatibilidad y datos vehiculares; ocultar su gestión dejaría listas compartidas sin un punto operativo de mantenimiento. No se borraron tablas para simplificar menú.
7. No duplica Productos, Variantes, Categorías ni inventario; sólo su nombre anterior hacía ambiguo el propósito.
8. Tiene utilidad operativa única y demostrada: cadena nueva marca→modelo→generación→OEM creada/editada/asociada y consumida por formularios actuales. No es LEGACY ni exclusivamente INTERNAL.

Navegación: Catálogo → **Marcas y vehículos**, misma ruta `/crm/references`, título documental acorde, sin ampliar el denominador41/43. `products.view` controla entrada; create/update/delete controlan acciones y backend. Collaborator no ve el enlace y recibe403 para productos/referencias,187/286; permiso de escritura negativo187. Buscar generación QA, relación OEM y seis anchuras comprobadas199; selección CustomerVehicle excluye marca QA inactiva220.

**Destructive semantics comprobadas, no inventadas:** marcas de artículo, marcas de vehículo, modelos y generaciones se desactivan. **Sistema multimedia se elimina** y su pivot se elimina por cascade, según el contrato existente. El sistema2 y asociación2 usados para QA fueron eliminados206; la generación2/modelo2/marca2 siguen inactivos, no se promete conservar esa asociación eliminada. El copy final distingue ambas acciones, advierte la eliminación definitiva/asociaciones y la cancelación de confirmación285 preservó sistema baseline1 y pivot1. No se cambió la regla backend para convertir una eliminación en archivo.

### Product Image Architecture / política funcional

Antes: `products.main_image` como única imagen padre; variante con su `main_image` propio. Ahora: relación Product→`product_images` con id/product_id/path/is_primary/sort_order/timestamps, FK cascade e índice de orden. Columna generada nullable `primary_product_id` unique impide dos principales para un producto en MySQL/MariaDB. El servicio transaccional, bajo lock del padre, garantiza exactamente una principal si hay imágenes y rechaza publicación sin ninguna; el índice por sí solo no es una constraint de mínimo de imágenes contra escrituras ORM/SQL ajenas al contrato.

Política confirmada, **no decisión pendiente**:

- Producto publicado: mínimo1 imagen y exactamente1 principal. Publicado sin imagen: FORBIDDEN. Un producto oculto/draft ya existente sí puede tener0 imágenes.
- Adicionales0..N; orden y principal independientes y persistentes. Cards/previews usan principal; Product Detail muestra galería y controles semánticos/alt. No librería pesada ni galería separada nueva por variante.
- Edit muestra imágenes persistidas: cambiar nombre/precio/descripción no exige reupload. Puede añadir, quitar adicional, cambiar principal y mover antes/después. Quitar principal promueve otra si queda alguna; quitar última publicada se explica y bloquea en UI y backend.
- Multipart `images[]` + lista `gallery` de IDs propios/upload_index + primary_image_index. Rechaza IDs ajenos, duplicados, mezcla id/upload_index, índices inválidos, archivos no referenciados y rutas arbitrarias nuevas. API pública incluye id/image_url/is_primary/sort_order, sin paths/claves de storage internos.
- Sólo nuevos uploads JPEG/PNG/WEBP, MIME real, extensión válida y máximo5MB; nombres aleatorios de servidor. SVG/HTML/PHP/fake MIME no aceptados. SVG legacy de fixtures confiables preservados por migración no equivale a permitir nuevos SVG.
- Cleanup sólo de uploads generados por servidor no referenciados por ProductImage/Product/ProductVariant, después del commit; rollback elimina sólo nuevas subidas propias. No borra paths legacy/remotos. Retirada de principal y orden son atómicas; corrección de dirty tracking mantiene la principal tras saves sin cambio de galería.

Migration `2026_10_01_000001_create_product_images_table.php`: conserva `products.main_image`, copia sus paths como primary/sort0, backfill idempotente; preflight falla explícitamente con IDs ante publicados legacy sin imagen, **antes** de crear tabla. No oculta ni fabrica placeholders. En QA se reparó explícitamente producto10 con PNG sintético antes de migrar; las imágenes iniciales1/2/3 no se perdieron. Rollback sólo retira tabla nueva, no archivos. Seeder futuro adapta sus productos legacy al servicio; no se reseedó QA en esta fase.

Variant: mantiene imagen propia o fallback principal padre y selección obligatoria. El serializer conserva imagen existente; backend conserva main_image/logística omitidos al actualizar variantes. Browser260/265: versión8GB/128GB, precio1350000, stock agregado14, SKU correcto, imagen existente cargada; no se compró nuevamente. Unit regression preserva imagen de variante147–157 del test de galería. Ninguna decisión adicional de variantes necesaria para esta fase.

### Image QA reutilizado

| Rama | Resultado y evidencia |
|---|---|
| Create1 imagen | PASS: producto12 publicado,177; Guardar y asignar→entradaBAQ5,180. |
| Create múltiples | PASS: producto11 publicado2 imágenes con principal seleccionada,176; ensayo de edición producto10 persistió3 imágenes,169. |
| Publicar0 imágenes |422 backend201; último archivo publicado bloqueado con explicación UI248 y backend201; ningún registro negativo persistido. |
| MIME/extensión insegura |422 browser201/278: HTML fingiendo PNG/JPEG, SVG, PHP/extensión falsa. Tests cubren MIME, extensión y nombres de servidor. |
| >5MB |422 de aplicación278 con5242881 bytes: “Cada imagen debe pesar como máximo5MB”; no sólo fallo de transporte PHP. |
| Edit/preserve/add |PASS167–175: imágenes existentes+dos nuevas, save/reabrir, sin recargar imágenes antiguas. |
| Change primary/order |PASS169/267: seleccionar otra imagen, mover, save/reabrir, principal/order persistidos. |
| Remove primary/additional |PASS174/267: promover otra principal; quitar adicional→save/reabrir, una principal válida. |
| Otros campos sin reupload |PASS248: nombre/precio16000 editados, una imagen existente y principal preservadas; descripción producto10,174. |
| Card/detail/gallery |PASS274: src de card idéntico a principal grande; dos thumbnails/imágenes reales cargadas, no placeholder. |
| Keyboard/responsive |PASS184/277: Tab/Enter/Space en controles con labels/aria-pressed/alt; siete anchuras, cero overflow global y cero imágenes rotas. Editor seis anchuras175. No certificación de lector de pantalla/WCAG. |

**Override PHP QA:** sólo comando del servidor local `php -d upload_max_filesize=6M -d post_max_size=24M -S ...` con router externo existente. Sin php.ini temporal ni override de servidor en producto; env/provider-router/harness no tracked. La validación de aplicación sigue5120KB. Producción deberá configurar upload_max_filesize≥5MB y post_max_size suficiente para la suma de imágenes+multipart; este comando QA no es configuración productiva. La prueba anterior6MB201 fue fallo de transporte2MB;278 confirma específicamente el límite de aplicación. No confundirlas.

### Other Fixes / Bugs Final

| ID | Prioridad | Estado final / evidencia |
|---|---|---|
| FP01–FP03 |P1/P2| FIXED previamente; slug, anchors y transferencia se preservan. |
| FP04 |P1| FIXED: feedback financiero/retry descritos arriba204–209. |
| FP05 |P1| FIXED: propósito demostrado y navegación/capacidades182/286. |
| FP06 |P2| FIXED: create/edit/publication/galería coherentes201/246/248/267. |
| FP07 |P3| FIXED: ledger muestra “Transferencia #1”/“Orden #…”/“Pago #…”, no App\\Models;276 seis anchos. No se implementó enlace nuevo ni se promete númeroTRF en ese label. |
| FP08 |P3| FIXED: Cerrar alineado/no estirado,46px de altura en seis anchos243. |
| FP09 |P3| FIXED: padding búsqueda responsable38px, icono sin solapar en seis anchos252. |
| FP10 |P2| FIXED: header fijo tapaba Volver a tienda en desktop; espaciado local210px y excepción mobile preservada, click193/268; galería277. |
| FP11 |P2| FIXED: overflow10px cotizaciones360 detectado241/242; filtros locales con columna reducible, cero overflow seis anchos243. |
| FP12 |P3| FIXED: ayuda fija15 días sustituida por vigencia configurada en Ventas y cotizaciones,240→241. No se afirma mostrar dinámicamente un número. |
| FP13 |P2| FIXED: servicio activo bajo categoría inactiva seguía ofrecido262. Selección nueva excluye categorías inactivas en quote/sale/appointment266/281; edit histórico conserva servicio actual. Backend comercial sigue autoridad. |

P0 abierto0; P1 abierto0; P2 abierto0; P3 abierto0 **en este alcance funcional**. Sin claim de cero problemas de todo el producto. Chunk>500KB sigue warning, no blocker. Fallback público desconocido pertenece a evaluación posterior01B/01E, no se cambió aquí.

### CRUD Closure — sólo ramas pendientes

| Módulo | Rama cerrada | Resultado / evidencia |
|---|---|---|
| Customers/vehicles |Edit, desactivar/reactivar| PASS219–221; cliente3/vehículo2 activos finales, historial/snapshots preservados; colorGris QA CLOSE. |
| Employees |Edit, deactivate| PASS224–226; empleado2 inactivo, acceso/user4 conservado. No empleado BAQ de baseline desactivado. |
| Inventory |Minimum, adjust, salida insuficiente/recuperación| PASS227–228; mínimo2, ajuste+2; salida100→422 sin cambio; salida1 doble clic una201, stockfinal4. |
| Transfers |Cancel requested| PASS232: transferenciaQA2 cancelada con motivo; recibida1 intacta; no despacho/stock en cancelación. |
| Categories |Delete QA sin artículos| PASS270–272: confirmación explica borrar vs desactivar si hay artículos; categoríaQA2 eliminada, categoría estructural1 preservada. |
| Service categories/services |Create/edit category, deactivate, service deactivate/reactivate| PASS233–237; categoríaQA2 inactiva; servicio2 restaurado activo/categoría1,266/281. |
| Schedules |Edit weekly+validity, override CRUD| PASS211–215: sólo excepciónQA nueva eliminada; horariosBAQ no alterados. |
| Leaves |Edit/cancel| PASS216: registro cancelado conservado. |
| Appointments |Requested→confirm→start→complete, no-show| PASS252–253 sobre citas nuevas4/5; cita baseline2 sigue confirmada5octubre. Reschedule/cancel previo no se repitió. |
| Commercial settings |Validation/save/persistence| PASS239–241; valor0 sin request;15→21→15; email unchanged, sin notificaciones reales. |
| References |Vehicular CRUD, OEM association, permissions| PASS185–208/285–286; cuatro entidades archivan, OEM elimina realmente. |
| Reconciliation |Terminal decision+validation+history+conflict| PASS255–256/278: caso nuevo4, transacción ausente exclusivamente en mock; justificación obligatoria, decisión terminal una201 tras doble clic; nuevo intento tras cierre409. No hay `ignored` soportado. Concurrencia multicliente no se certifica con un doble clic: cubre suite backend, no browser exhaustivo. |

Se eliminaron únicamente categoríaQA2 sin productos, excepciónQA1 creada para este ensayo y sistemaOEMQA2 con su asociaciónQA; no papelera DB (recuperación requeriría reconstruir registros desde la evidencia/backup). Los archivos de imagen QA retirados se limpiaron con las reglas de ownership/referencias. No se borraron fixtures estructurales, archivos externos de evidencia ni datos reales. Caso2/3 escalados siguen abiertos deliberadamente; no se inventó una resolución financiera para subir cobertura. Caso4 resolved tiene tres acciones inmutables y ningún pago/orden asociado; resolverlo no cambió ledger ni dinero.

### Final Browser Coverage / Database Safety

41 pantallas ACTIVE;43 contextos pantalla/perfil; VISITED43/43, INTERACTED43/43, PRIMARY43/43 PASS, CONNECTED8/8 PASS, ROLE VERIFIED43/43 base conservada más negativos187/286. Se cerraron siete excepciones, no se navegó nuevamente todo el inventario. Galería siete widths; críticas CRM/retorno en1440/1024/768/430/390/360. Responsive base43/43, no todos los estados a todos los anchos.

Evidencia externa acumulada286 JSON incrementales y453 PNG (72 originales+381 incrementales),123 registros/174 PNG nuevos de cierre. Los errores de locator/lazy load se conservan y no se cuentan como PASS; sus followups verifican el estado real.264 mantuvo estado antiguo por HMR, no certificó el filtro;266/281 sí, tras remount. Confirmación/reload stales se corroboraron con pantalla estable y SQL; no se cuenta “GET200 + Cargando” como mutación completa.

DB runtime `SELECT DATABASE()`=upgrade_ux_qa. Migración aplicada allí y validada por suite automatizada en upgrade_test; **nunca browser QA en upgrade_test**. upgrade permanece con53 tablas y no se ejecutó allí migración, seeding ni DML. QA/test ahora59 tablas por nueva galería; no se presenta upgrade_test como schema intacto58. Esto no es checksum completo de datos de upgrade. Producción NOT USED; Wompi/Envia/DHL/WhatsApp real EXTERNAL.

Snapshot final: publicados sin imágenes0; productos con imágenes y principal distinta de1=0; producto10BAQ4/BOG5, producto1BAQ7/BOG5, variante1BAQ9/BOG5; producto12BAQ4/min2 y sin fallbackBOG; producto11sin stock; BAQ/BOG activas. Orders11/13/15/18 completed+paid;12/14/17 confirmed+paid. Producto12precio actual16000 no modifica el snapshot15000 de sus dos órdenes. Transfer1received/2cancelled. Customer3/Vehicle2 activos, Employee2 inactivo/User4 activo; calendario baseline intacto. IDs y datos sintéticos; no publicar tokens de esas órdenes.

### Clasificación final de todos los cambios de producto

Los “40 cambios” son un checkpoint aproximado, no el conteo final. `git status --short --untracked-files=all`: **Backend10 modified/6 new/0 deleted**; **Frontend27 modified/5 new/16 deleted**, incluyendo dist y los dos docs. Fuente frontend26 modified+2 new, test1 new, docs2 new. Sin cambios manifests/locks ni staging. Los16 assets dist nuevos ignorados se describen aparte, no se ocultan como fuentes nuevas.

| Clasificación | Archivos (prefijos B/F definidos arriba) | Estado |
|---|---|---|
| BACKEND PRODUCT |B/app/Http/Controllers/Api/ProductController.php; B/app/Http/Resources/{AdminProductResource,PublicProductResource,PublicOrderResource}.php; B/app/Models/{Order,Product}.php; B/database/seeders/UXOperationalQaSeeder.php|7 modified; no credenciales nuevas en diff. |
| BACKEND PRODUCT |B/app/Http/Resources/ProductImageResource.php; B/app/Models/ProductImage.php; B/app/Services/ProductImageService.php|3 new. |
| MIGRATION |B/database/migrations/2026_10_01_000001_create_product_images_table.php|1 new. |
| TEST |B/tests/Feature/{EcommerceShippingFoundationPhaseOneTest,ProductArchitecturePhaseOneTest,ProductCommissionConfigurationPhaseFourTest}.php|3 modified; fixtures explícitamente draft o con imagen, sin bajar garantías. |
| TEST |B/tests/Feature/{ProductGalleryTest,PublicPaymentAttemptPresentationTest}.php; F/tests/paymentPresentation.test.mjs|3 new. |
| FRONTEND PRODUCT |F/src/App.tsx; F/src/components/layout/{Header/Header,Footer/Footer,Layout}.tsx; F/src/modules/crm/layout/CrmLayout.tsx; F/src/types/{branch,order,product}.ts|8 modified; incluye cambios anteriores preservados. |
| FRONTEND PRODUCT |F/src/modules/admin/appointments/AdminAppointmentsPage.{tsx,css}; F/src/modules/admin/branches/AdminBranchesPage.tsx; F/src/modules/admin/inventory/AdminInventoryPage.{tsx,css}|5 modified. |
| FRONTEND PRODUCT |F/src/modules/admin/inventory/product-form/{ProductForm.tsx,ProductForm.css,productFormTypes.ts,productFormUtils.ts}|4 modified. |
| FRONTEND PRODUCT |F/src/modules/admin/orders/ServicePicker.tsx; F/src/modules/admin/products/AdminProductsPage.tsx; F/src/modules/admin/quotations/{AdminQuotationsPage.css,QuotationForm.tsx}; F/src/modules/admin/references/AdminReferencesPage.tsx|5 modified. |
| FRONTEND PRODUCT |F/src/pages/{OrderConfirmation/OrderConfirmationPage.tsx,PaymentReturn/PaymentReturnPage.tsx,ProductDetail/ProductDetailPage.tsx,ProductDetail/ProductDetailPage.css}|4 modified. |
| FRONTEND PRODUCT |F/src/modules/admin/inventory/product-form/ProductImagesEditor.tsx; F/src/utils/paymentPresentation.ts|2 new. |
| DOCUMENTATION |F/docs/screen-inventory.md; F/docs/functional-walkthrough.md|2 new untracked, completados sin otros documentos. |
| GENERATED DIST |F/dist/index.html y chunks assets generados por build final|index1 modified,16 bundles antiguos retirados por build,16 nuevos ignorados por dist/. No se restauró build antiguo;40 assets presentes; referencias index/import/preload sin destinos inexistentes. No release ni deploy. |
| TEMPORARY QA |Q/continue-browser.mjs; Q/provider-router.php; Q/simulate-provider-event.php; Q/provider-status.txt; Q/evidence-01a/; imágenes sintéticas en storage ignorado|NOT TRACKED; evidencia conservada privada; no trasladar al producto. |
| LOCAL CONFIG |B/.env, F/.env.development.local; flags PHP del proceso QA|Ignored/untracked/CLI only; no php.ini nuevo, secretos ni server override en diff. |

Los16 archivos dist nuevos corresponden a los sustitutos hash de los16 retirados: la carpeta es ignorada aunque parte siga tracked. El working tree/build local es coherente; una futura publicación autorizada que conserve dist versionado deberá incluir explícitamente los nuevos artefactos ignorados. No se hizo staging ni se cambió el modelo de release.

### Backend / Frontend Validation final

| Validación | Resultado |
|---|---|
| Backend full suite final de CLOSE |PASS **672 tests /5852 assertions /0 failures**, posterior a los últimos cambios de backend. Supera checkpoint670/5842; no se repite en RESUME porque no hubo código/migration posterior. Caché final01:18:43 Colombia, ProductImageService y ProductGalleryTest01:16:11; la caché conserva historial de defectos antiguos, no sustituye salida de la suite final. |
| composer validate --strict |PASS. |
| composer audit --locked |PASS,0 advisories. |
| vendor/bin/pint --test |PASS. |
| Backend git diff --check |PASS. |
| npm audit --omit=dev |PASS,0 vulnerabilities. |
| npm audit |PASS,0 vulnerabilities. |
| npx tsc -b |PASS. |
| npm run build |PASS,2246 modules; warning chunk>500KB no blocker. Dist final coherente, sin release. |
| node --test tests/paymentPresentation.test.mjs |PASS4 tests,0 failures. |
| Frontend git diff --check |PASS, incluido cierre docs. |

### Git State / Remaining Functional Decisions / Next Phase

No decisiones funcionales genuinas pendientes dentro del alcance de cierre. Imágenes obligatorias y galería **implementadas**, no DECISION REQUIRED. Referencias ACTIVE por evidencia. No producción, proveedores reales, historia Git, SEO, manuales ni training docs. Repos oficiales/HEAD conservados, clones stale y postpurge-verify no utilizados; **NO commit / NO push**.

Próxima fase disponible, **no iniciada**: FINAL-PRODUCT-01B — SEO.

**PASS — FUNCTIONAL WALKTHROUGH COMPLETE**.
