# FINAL-PRODUCT-01A — Screen inventory

Sesión iniciada: 2026-09-30 America/Bogota; informe cerrado 2026-10-01. Algunas referencias generadas llevan 20261001 porque su numeración utiliza fecha UTC. Inventario del navegador real, no una declaración basada en existencia de componentes.

## Conteo y reglas

- 41 pantallas canónicas distintas: 25 Admin + 8 propias del colaborador + 8 públicas.
- 43 combinaciones pantalla/perfil: 25 Admin + 10 colaborador (Perfil y Notificaciones compartidas) + 8 públicas.
- VISITED: 43/43. INTERACTED: 43/43, contando una acción funcional/entrada de formulario; cinco Tab del crawl inicial solos **no** equivalen a interacción funcional.
- FLOW COMPLETED al cierre FINAL-PRODUCT-01A-CLOSE: 43/43 escenarios primarios representativos PASS; 0 PARTIAL ejecutables en el alcance acordado. Antes: 36/43 y 7 PARTIAL. No significa probar todas las variantes posibles de 43 módulos.
- Flujos conectados exigidos: 8/8 satisfactorios. Payment return/recovery cerrado con DECLINED → retry sobre la misma orden → APPROVED, sin duplicación y con proveedor exclusivamente simulado.
- ROLE VERIFIED: 43/43 contextos positivos; además negativos de permisos/scope documentados en functional-walkthrough. No implica matriz exhaustiva de permisos para todas las rutas.
- RESPONSIVE VERIFIED: 43/43 en revisión base. Público: 1440/1280/1024/768/430/390/360. CRM: 1440/390 iniciales, y vistas críticas adicionales en las seis anchuras solicitadas. No afirmar todas las pantallas/formularios en todas las anchuras.
- PASS en esta tabla corresponde al escenario descrito, no a todas las acciones posibles del módulo. Las acciones omitidas quedan explícitas.
- Ningún acceso manual a URL se usa para aprobar descubrimiento/navegación. Referencias queda ACTIVE BUSINESS MODULE, descubierto desde Catálogo → Marcas y vehículos después de comprobar su propósito; mismo componente y denominador, no pantalla nueva.
- No se cuentan aliases, registros individuales, diálogos, pestañas de reportes ni estados vacíos como pantallas nuevas.

## Fuentes conservadas

Base de evidencia externa: `/home/jhonny/upgrade79-history-incident/`.

1. `qa-harness/recovered-first-run/`: 31 archivos originales recuperados de /tmp, incluidos los crawls de rutas/anchuras y los flujos comerciales satisfactorios.
2. `final-product-screenshots/`: capturas iniciales preservadas.
3. `qa-harness/evidence-01a/`: acciones incrementales numeradas, DOM, HTTP y capturas. Los números de evidencia de las tablas remiten al prefijo de esos archivos; un error de selector no equivale a fallo del producto.
4. `functional-walkthrough.md`: resultados, límites, incidencias, repositorios y clasificación de archivos.

R = revisión base de ruta, DOM/overflow/foco en 1440 y 390; R+ = revisión pública base en siete anchuras; C = ampliación crítica con diálogos/contenido en 1440/1024/768/430/390/360.
Un R sobre un checkout vacío no sustituye a sus capturas con contacto/dirección llenos.

## Public

| Pantalla | Ruta canónica | VISITED | INTERACTED | FLOW COMPLETED | ROLE VERIFIED | RESPONSIVE VERIFIED | Alcance / evidencia |
|---|---|---|---|---|---|---|---|
| Home | `/` | YES | YES | PASS | YES (guest) | R+ | Transformación, CTA tienda y Contacto; WhatsApp EXTERNAL. Evidencia: previous public JSON; 084, 092, 112, 117. |
| Tienda | `/tienda` | YES | YES | PASS | YES (guest) | R+ | Búsqueda Capacitación, filtros vehículo y selección. Evidencia: 004–014, 117–125. |
| Producto | `/tienda/:slug` | YES | YES | PASS | YES (guest) | R+ / C | Simple/variante previos conservados; galería2 imágenes, principal card/detail, teclado y siete anchos274/277; variante propia/SKU/precio/stock preservados260/265. |
| Carrito | `/carrito` | YES | YES | PASS | YES (guest) | R+ | Cantidad 1→2→1, subtotal, quitar/vaciar en run inicial; Enter volver. Evidencia: 014; pickup-flow; 152. |
| Checkout | `/checkout` | YES | YES | PASS | YES (guest) | R+ | Shipping y pickup pagados con proveedor simulado; nuevo formulario responsive sin pago. Evidencia: 018–064, 125–135, 141. |
| Payment return | `/checkout/payment/return` | YES | YES | PASS | YES (guest) | R+ / C | Cierre: PENDING, DECLINED explícito, error de refresh conserva rechazo, retry doble clic una request/misma orden17, APPROVED; 204–209, 238. La candidata retirada 048 no se usa como fix. |
| Confirmación | `/orden-confirmada` | YES | YES | PASS | YES (guest) | R+ | Enlace desde retorno aprobado, total/cargos/pago; pickup limpia carrito. Evidencia: 054, 064. |
| Login interno | `/login` | YES | YES | PASS | YES (guest) | R+ | Admin, colaborador y usuario limitado; cambiar contraseña y salir. Evidencia: login-probe; 087–098, 140, 155–156. |

## Admin

| Pantalla | Ruta canónica | VISITED | INTERACTED | FLOW COMPLETED | ROLE VERIFIED | RESPONSIVE VERIFIED | Alcance / evidencia |
|---|---|---|---|---|---|---|---|
| Dashboard | `/crm` | YES | YES | PASS | YES (admin) | R | General, Bogotá y comparación; refresh disponible. Evidencia: 131, 134. |
| Inventario | `/crm/inventory` | YES | YES | PASS | YES (admin) | R / C | Crear producto/stock BAQ/BOG previo; nuevo producto12 con imagen→asignar180; mínimo2, ajuste+2, salida100 rechazada422, corregir a1/doble clic una201,227–228. |
| Movimientos | `/crm/inventory/movements` | YES | YES | PASS | YES (admin) | R / C | Filtro traslado/BOG previo; copy Transferencia/Orden/Pago sin namespace técnico, seis anchos276. |
| Transferencias | `/crm/inventory/transfers` | YES | YES | PASS | YES (admin) | R / C | Flujo recibido1 preservado; nueva transferenciaQA2 solicitada→cancelada con motivo/confirmación,232; sin afectar stock. |
| Categorías | `/crm/categories` | YES | YES | PASS | YES (admin) | R | Create/search/edit previos; eliminar sólo categoríaQA2 sin artículos270–272; estructural1 preservada. |
| Órdenes/ventas | `/crm/orders` | YES | YES | PASS | YES (admin) | R / C | Cierre: Customer3/Vehicle2 preseleccionados → nueva venta directa Admin18, BAQ/vendedor BAQ/producto12/pago inicial; doble clic una creación201; paid/confirmed → completar200, 221–224. |
| Clientes | `/crm/customers` | YES | YES | PASS | YES (admin) | R | Create/handoff previo; edición y desactivar/reactivar cliente3/vehículo2 con historial conservado219–221; nueva venta preseleccionada221. |
| Cotizaciones | `/crm/quotations` | YES | YES | PASS | YES (admin) | R | Crear, editar, enviar y convertir conservando cliente/vehículo/precios. Evidencia: quotation-create, quotation-lifecycle, quotation-convert. |
| Citas | `/crm/appointments` | YES | YES | PASS | YES (admin) | R / C | Reschedule/cancel previo preservado; nuevas4/5 solicitada→confirmada→en progreso→completada/no-show252–253; icono seis anchos252; servicio indisponible excluido281. |
| Calendario | `/crm/calendar` | YES | YES | PASS | YES (admin) | R | Agenda, siguiente semana, BOG vacío con explicación de scope. Evidencia: 144. |
| Empleados | `/crm/employees` | YES | YES | PASS | YES (admin) | R | Create/link previo; edit/deactivate EmployeeQA2 persistido224–226, User4 conservado. EmployeeBAQ1 intacto. |
| Horarios | `/crm/schedules` | YES | YES | PASS | YES (admin) | R | Intervalo7 editado: fin16:30/vigencia31 octubre; excepción QA creada/editada/eliminada con confirmación, 211–215. Horario baseline BAQ preservado. |
| Ausencias | `/crm/leaves` | YES | YES | PASS | YES (admin) | R | Ausencia1 editada y cancelada; cancelada visible y registro conservado, 216. |
| Tareas | `/crm/tasks` | YES | YES | PASS | YES (admin) | R | Crear/asignar; colaborador inicia y completa tarea nueva; no alterar baseline. Evidencia: 053, 060. |
| Metas | `/crm/goals` | YES | YES | PASS | YES (admin) | R | Crear/asignar, avance 2/2 y cierre; baseline conservado. Evidencia: 059, 066–069. |
| Catálogo/publicación | `/crm/catalog` | YES | YES | PASS | YES (admin) | R / C | Galería create/edit/publication coherente; producto10 Guardar publicación200, ocultar200/publicar200, 246; edición sin reupload, cambio principal/orden/eliminar adicional, 248/267. Publicar sin imagen422, 201. |
| Servicios | `/crm/services` | YES | YES | PASS | YES (admin) | R | Create/search/edit previo; categoríaQA create/edit/deactivate233–237, servicio deactivate/reactivate237; nuevas operaciones excluyen categoría inactiva266/281; servicio2 restaurado a categoría1. |
| Conciliaciones | `/crm/payment-reconciliations` | YES | YES | PASS | YES (admin) | R | Escalamiento3 previo preservado; casoQA4 start→decisión terminal justificada→resolved/history255–256; doble clic una201, conflicto posterior409278. Sin cambio financiero. |
| Comisiones | `/crm/commissions` | YES | YES | PASS | YES (admin) | R | BOG vacío; BAQ Ganada → detalle histórico de $35.000. Evidencia: 137. |
| Reportes | `/crm/reports` | YES | YES | PASS | YES (admin) | R | 8 familias + 8 Excel válidos; sede persistente, rango inválido rechazado. Evidencia: 102, 126. |
| Notificaciones | `/crm/notifications` | YES | YES | PASS | YES (admin) | R | Leer nueva notificación → feedback Leída y contador. Evidencia: 146; collaborator 077. |
| Sedes | `/crm/branches` | YES | YES | PASS | YES (admin) | R | Crear (fix slug), editar ciudad, desactivar; BAQ/BOG intactas. Evidencia: 081–097. |
| Configuración | `/crm/settings` | YES | YES | PASS | YES (admin) | R | General/usuario previos conservados; vigencia0 rechazada, 15→21 guardado200/persistido tras navegación→15 restaurado por UI, sin cambiar email ni enviar mensajes, 239–241. |
| Perfil | `/crm/profile` | YES | YES | PASS | YES (admin) | R | Formulario de rol Admin; guardado con respuesta del servidor; contraseña bajo limitado. Evidencia: 163; 095, 140. |
| Marcas y vehículos (Referencias) | `/crm/references` | YES | YES | PASS | YES (admin) | R / C | ACTIVE: navegación182; marca/modelo/generación/sistema OEM create/edit/asociación/búsqueda/deactivación o eliminación real, 185–208; seis anchos199; negativos403187/286; OEM elimina, no desactiva: confirmación/cancel285. |

## Collaborator

| Pantalla | Ruta canónica | VISITED | INTERACTED | FLOW COMPLETED | ROLE VERIFIED | RESPONSIVE VERIFIED | Alcance / evidencia |
|---|---|---|---|---|---|---|---|
| Inicio | `/crm/me` | YES | YES | PASS | YES (user / Employee BAQ) | R | Prioridades, enlaces operativos, resumen propio BAQ; Home limitado BOG. Evidencia: 087, 089, 140. |
| Mi calendario | `/crm/me/calendar` | YES | YES | PASS | YES (user / Employee BAQ) | R | Agenda, rango siguiente, cita cancelada y horario propios. Evidencia: 130. |
| Resumen negocio | `/crm/me/business-overview` | YES | YES | PASS | YES (user / Employee BAQ) | R | Resumen agregado no financiero, actualizar; sin márgenes/COGS globales. Evidencia: 079–085. |
| Mis cotizaciones | `/crm/me/quotations` | YES | YES | PASS | YES (user / Employee BAQ) | R | Crear → editar → enviada → convertida; sede inferida BAQ. Evidencia: 028–038. |
| Mis ventas | `/crm/me/sales` | YES | YES | PASS | YES (user / Employee BAQ) | R | Convertida y directa → confirmar → pagar → completar; stock real de BAQ. Evidencia: 040–045, 108–121. |
| Mis comisiones | `/crm/me/commissions` | YES | YES | PASS | YES (user / Employee BAQ) | R | Vacío inicial, después Ganada $35.000, filtro estado. Evidencia: 055, 124, 127. |
| Mis tareas | `/crm/me/tasks` | YES | YES | PASS | YES (user / Employee BAQ) | R | Nueva tarea asignada → iniciar → completar; tarea baseline preservada. Evidencia: 060. |
| Mis metas | `/crm/me/goals` | YES | YES | PASS | YES (user / Employee BAQ) | R | Asignada completada visible; personal crear/editar/avance/completar/filtrar. Evidencia: 136–149. |
| Notificaciones | `/crm/notifications` | YES | YES | PASS | YES (user / Employee BAQ) | R | Marcar leída, filtro No leídas y contador. Evidencia: 077. |
| Mi perfil | `/crm/profile` | YES | YES | PASS | YES (user / Employee BAQ) | R | Guardar perfil colaborador; limitado cambió password y volvió a entrar/salir. Evidencia: 095, 140. |

## Responsive crítico ampliado (C)

| Vista | Anchuras | Evidencia / estado |
|---|---|---|
| Home, tienda, producto simple, carrito | 1440, 1024, 768, 430, 390, 360 (+1280 inicial) | JSON públicos recuperados; fotos representativas 1440/390. Los estados iniciales de carrito/checkout vacíos se distinguen de los llenos posteriores. |
| Checkout contacto lleno | Las seis | `checkout-filled-{width}.png`, 128; 3 campos reales sintéticos y shipping seleccionado. |
| Checkout dirección llena | Las seis | `checkout-address-{width}.png`, 135; guardar disponible, pago disabled por cambios pendientes. Sin segundo cobro. |
| Dashboard comparación | Las seis | `dashboard-compare-{width}.png`, 134; datos agregados reales de QA. |
| Transferencia recibida | Las seis | `transfer-fixed-{width}.png`, 111; panel ya sin overflow propio (718/718 desktop). |
| Producto, descripción expandida | Las seis | `product-form-{width}.png`, 142; nombre/categoría llenos. No se guardó un producto duplicado. |
| Cotización, venta Admin y cita | Las seis | `form-{Cotizaciones,Órdenes,Citas}-{width}.png`, 151; formularios abiertos, sin submit. Error final de selector de menú no invalida fotos previas ni aprueba navegación. |
| Mis comisiones | Las seis | `own-commissions-{width}.png`, 127; registro ganado visible. |
| Navegación móvil CRM | 390 | 157: Abrir menú → Inventario → Movimientos → filtros BOG/entrada traslado. |
| Acceso denegado limitado | 390 | `limited-ui-denied-390.png`, 140. |

En el alcance medido no hubo overflow global. Ese resultado no certifica ausencia de recortes internos: el modal de transferencia sí tenía uno y fue corregido/retestado. Inspección visual de producto 390, cotización/cita 360 y venta 768; las incidencias de densidad/icono están en el walkthrough.

## Usuario limitado, Super Admin y aliases

Usuario limitado creado para QA: rol user, Employee BOG, sin capacidades comerciales propias. Home BOG, perfil/contraseña/login/logout y rechazo de Configuración fueron recorridos realmente (087–098, 140). No se duplica todo el inventario ni se atribuye acceso a módulos que su permiso niega.

La interfaz y cuentas observadas diferencian Admin y User/Employee con capacidades. No se encontró un perfil Super Admin con flujo independiente ni un portal de cliente autenticado: checkout es invitado. No se inventan pruebas para roles inexistentes.

Aliases observados por diagnóstico de comportamiento: `/admin/*`, `/crm/settings/categories`, `/crm/settings/brands`, `/crm/settings/product-brands`, `/crm/settings/compatibility`. Comparten componentes/scopes y no incrementan el conteo; no todos fueron navegados y no se declaran PASS como rutas independientes.

## Cierre FINAL-PRODUCT-01A-CLOSE

Resultado: **PASS — FUNCTIONAL WALKTHROUGH COMPLETE** para el baseline funcional acordado, no certificación de CRUD exhaustivo, WCAG, concurrencia multicliente por navegador ni proveedores reales. Se continuaron sólo excepciones y regresiones dirigidas; no se repitió la matriz completa 43/43.

Las notas anteriores sobre ramas omitidas corresponden al recorrido inicial. Cierres complementarios: Customer/Vehicle edición y desactivar/reactivar219–221; Employee edición/desactivación224–226 (user4 conservado); mínimo/ajuste/salida insuficiente/salida válida227–228; transferencia QA2 cancelada232, transferencia1 recibida intacta; categoría QA sin productos eliminada270–272; categoría servicio create/edit233–234 y desactivar237; servicio desactivar/reactivar237/restaurar266/281; citas solicitada→confirmada→en progreso→completada y no-show252–253; conciliación QA4 resuelta255–256 y conflicto409278, sin cambio financiero. No existe estado `ignored` en ese contrato.

Regresión nueva: galería pública siete anchuras1440/1280/1024/768/430/390/360, thumbnails por Space/Enter y alt/labels, cero overflow/imagenes rotas, 184/277; editor en las seis175; retorno aprobado en las seis209; Referencias en las seis199; copy movimientos276, Cerrar cotización243 e icono cita252 en las seis, cero overflow final. Cotizaciones tenía overflow10px a360 en241/242, corregido y retestado243; no se oculta el resultado anterior.

Evidencia acumulada: 286 registros incrementales (123 nuevos de cierre; incluyen errores de selector y diagnósticos, no equivalen a286 PASS); 381 PNG incrementales +72 originales =453 capturas, de las cuales174 nuevas. Paths privados del harness existentes, sin publicar sesiones ni capability tokens. Detalle, arquitectura, decisiones y validaciones en [functional-walkthrough.md](functional-walkthrough.md).

No SEO, manuales, producción, proveedor real, commit ni push. Próxima fase disponible, no iniciada: FINAL-PRODUCT-01B — SEO.
