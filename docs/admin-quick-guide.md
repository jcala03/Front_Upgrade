# Guía rápida del administrador — Upgrade La 79

FINAL-PRODUCT-01C · 1 de octubre de 2026. Usa tu cuenta Administrador; las acciones necesitan permisos y estados válidos. Guía completa: [manual](user-manual.md).

## Entrar y empezar el día

1. Abre el acceso interno, escribe **Email** y **Contraseña** y pulsa **Entrar al CRM**.
2. En **Operación → Dashboard**, selecciona General/sede; revisa ventas, por cobrar, stock crítico, cotizaciones y pagos.
3. Usa **Comparar**, **Actualizar** y accesos **Ver órdenes / Ver inventario / Ver clientes** según la pregunta.
4. Revisa Notificaciones, Conciliaciones y Calendario antes de repetir una operación pendiente.

## Registrar cliente y vehículo; cotizar sin repetir información

1. **Clientes → Buscar cliente → Buscar** por nombre/contacto/documento.
2. Si falta: **Nuevo cliente → Nombre** y contacto disponible → **Crear cliente**.
3. Abre detalle → **Agregar vehículo** → Marca/Modelo/Versión/Año y placa disponible → **Guardar vehículo**.
4. Desde el cliente, **Nueva cotización**; revisa cliente/vehículo cargados.
5. Selecciona **Sede**, agrega productos/variantes y servicios, Cantidad/Descuento COP, vigencia y notas → **Crear cotización**.
6. Detalle → **Editar → Guardar cambios** cuando corresponda; **Marcar como enviada** registra estado, no asegura envío de mensaje.
7. Aceptación → **Convertir en venta → Confirmar** → verifica **Venta generada → Ver en Órdenes**. No crees otra venta de lo mismo.

Resultado: propuesta y venta vinculadas. Cotizar no reserva stock; convertir valida stock actual de la sede. Vigencia vacía usa Configuración comercial, no un plazo fijo. [Detalle](user-manual.md#cotizaciones).

## Venta directa, abonos y operación completada

1. **Órdenes → Nueva venta**, o desde el detalle del cliente.
2. Selecciona cliente, **Sede**, **Vendedor opcional** de esa sede, vehículo y conceptos/variantes.
3. Revisa cantidades/descuentos y total. Si cambias sede, las líneas se eliminan tras confirmación para reconstruirlas con stock correcto.
4. Si ya recibiste dinero, **Registrar pago ahora** permite agregar pago inicial con Monto/Método/Referencia/Notas.
5. **Registrar venta** crea venta Admin Confirmada y descuenta stock validado. El formulario del colaborador es diferente y empieza Pendiente.
6. Detalle → **Registrar pago** para abono/saldo real → revisar pagos y saldo actualizado.
7. Atención terminada → **Marcar completada**. Una Pagada puede seguir Confirmada; una Completada puede conservar saldo.
8. Cancelar, si procede y se ofrece: **Cancelar → razón → Confirmar cancelación**. No duplica manualmente reversión de inventario ni emite una devolución bancaria por este botón.

Ejemplo: total $950.000, abono $400.000, saldo $550.000. Es ejemplo de pagos parciales, no una tarifa del negocio. [Venta](user-manual.md#ventas) · [Pagos](user-manual.md#pagos).

## Crear artículo, fotos y stock por sede

1. Busca SKU/nombre antes de crear.
2. **Inventario → Crear producto**: Nombre/Categoría, marca/SKU, descripción y detalles de categoría.
3. **Agregar imágenes**: JPEG/PNG/WebP ≤5 MB cada una; una principal para publicado. **Hacer principal**, flechas de orden y **Quitar** cambian la galería al guardar.
4. Define compatibilidad, Precio de venta, variantes si existen, opciones avanzadas sólo cuando se necesiten, activo/visible/destacado.
5. **Guardar y asignar inventario** guarda ficha y abre entrada independiente.
6. Selecciona Sede, Producto/Variante, Cantidad que ingresa y Motivo → **Ajustar existencias**. Repite por separado en otra sede si recibió unidades.
7. **Inventario → Existencias**: comprueba sede, stock y **Mínimo → Guardar mínimo**.
8. **Catálogo → Catálogo publicado → Configurar publicación → Guardar publicación**; para corregir ficha/fotos, **Editar producto e imágenes → Guardar producto**. Editar precio/nombre conserva fotos: no vuelvas a cargarlas.

Crear/publicar no agrega stock. La variante es inventariable por sede; servicio no lo es. [Productos](user-manual.md#productos) · [Inventario](user-manual.md#inventario).

## Mover y transferir unidades

1. Para hecho local: Existencias → fila correcta → **Movimiento**.
2. Entrada/Salida usa Cantidad; **Ajuste a cantidad final** usa Nueva existencia, el saldo final. Motivo obligatorio → **Registrar movimiento**.
3. Entre sedes: **Transferencias → Nueva transferencia → origen/destino → artículo → Agregar → cantidad → Solicitar transferencia**.
4. Solicitud no reserva ni descuenta stock. Al salir físicamente: **Ver detalle → Despachar → confirmar**; queda En tránsito.
5. Al recibir todo físicamente: **Confirmar recepción → confirmar**; queda Recibida e ingresa destino.
6. Sólo Solicitada admite **Motivo para cancelar → Cancelar transferencia → confirmar**. No se ofrece devolución automática de una Recibida.
7. Revisa **Movimientos** y saldos. No registres otra entrada/salida por la misma venta/transferencia.

## Agenda y equipo

1. **Empleados → Registrar empleado**: Nombre/Cargo/Sede y datos → registrar.
2. Reutiliza **Vincular usuario CRM existente**, o **Dar acceso CRM → Email/clave confirmada → Crear acceso CRM** para Usuario limitado.
3. En detalle: **Ver horario**, **Ver ausencias**, **Ver tareas**.
4. **Horarios → empleado → Agregar intervalo → día/horas/vigencia → Guardar intervalo**. Para fecha puntual: **Agregar excepción → Horario excepcional/No laborable → Guardar excepción**.
5. **Ausencias → Registrar ausencia → empleado/tipo/rango → Guardar ausencia** registra directamente Aprobada; no solicitud. Cancelar conserva historial.
6. **Citas → Nueva cita → Responsable → cliente/contacto/vehículo → Servicio → estado/título → Inicio/Fin → Crear cita**. Comprueba disponibilidad y horario Colombia.
7. **Reprogramar → Guardar cambios** cambia horario. **Confirmar / Iniciar / Completar / No asistió / Cancelar** aparecen según estado; usa el hecho real.
8. **Tareas → Crear tarea → responsable/título/prioridad/límite → programación si necesita agenda → Guardar tarea**. Colaborador ejecuta desde Mis tareas.
9. **Metas → Nueva meta → empleado/objetivo/periodo → Guardar meta**; **Avance → valor acumulado → Registrar avance**; cierre **Completar → Completar**.

No ignores choques/ausencias usando una excepción fuera de jornada. Desactivar empleado no desactiva su usuario: revisa el acceso aparte. Un cambio de sede puede bloquearse por citas futuras activas o tareas programadas activas con fin futuro en la sede actual; resuelve los compromisos mediante las acciones permitidas antes de moverlo, sin borrar historial ni fingir terminación. [Equipo y acceso](user-manual.md#empleados).

## Conciliación, comisión y reportes

1. **Conciliaciones de pagos → Estado/Motivo → Ver caso → Iniciar revisión** si corresponde.
2. Revisa evidencia/historia, selecciona decisión permitida, Justificación, Referencia de evidencia y pago canónico cuando se exija → **Registrar decisión**.
3. Escalar/devolución requerida dejan abierto; una decisión terminal respaldada resuelve la revisión. Resolver no cambia dinero/stock/orden/comisión ni hace devolución automática.
4. **Comisiones**: filtros → **Ver detalle**. Pendiente por venta confirmada; Ganada por completada; no equivale a pagada al empleado.
5. **Reportes → familia → Sede/fechas/filtros específicos → Aplicar filtros → Exportar Excel**. Hay Ventas, Productos, Pagos, Cartera, Inventario, Movimientos, Cotizaciones y Clientes.
6. Al cambiar reporte revisa fechas y filtros: sólo sede persiste entre familias. Revisa notas de cobertura de costos, reembolsos y movimientos.

## Mantenimiento y cierre

- **Marcas y vehículos:** marcas de artículo y catálogo vehicular se mantienen allí. Marca → modelo → generación/años → asociación OEM. Marcas/modelos/generaciones se desactivan; sistema multimedia se elimina definitivamente con asociaciones.
- **Servicios:** **Guardar servicio**, categorías **Guardar categoría**. Ambos estados deben estar activos para nuevas operaciones.
- **Sedes:** Nueva sede pide Código/Nombre/Ciudad/Identificador público. Desactivar no procede si conserva empleados activos asignados.
- **Configuración:** General y Ventas y cotizaciones → **Guardar cambios**. Usuarios administra cuentas/roles/estado; no contiene editor individual de capacidades comerciales.
- **Notificaciones:** leer/marcar no resuelve el hecho. **Mi perfil → Guardar perfil / Cambiar contraseña** mantiene tu cuenta. Termina con **Salir**.

## Si algo falla

Lee el mensaje, revisa sede/estado/permiso y consulta el registro antes de repetir un guardado. Pago incierto: consulta pagos/soporte; nunca dupliques. Stock insuficiente: coordina stock real. Cotización no convierte: revisa causa y venta existente. Comparte sólo mensaje y número comercial con el responsable, no claves ni enlaces privados. [Recuperación detallada](user-manual.md#problemas).
