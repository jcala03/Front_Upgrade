# Roles y permisos — Upgrade La 79

FINAL-PRODUCT-01C · 1 de octubre de 2026.

Esta matriz describe capacidades de negocio, no direcciones técnicas. **YES** = función del perfil indicado; **LIMITED** = sólo datos propios, contenido público o permiso/condición adicional; **NO** = no disponible en ese espacio. Admin también necesita la autorización de la acción correspondiente. Una cuenta Usuario no obtiene todas las funciones comerciales por llamarse colaborador.

## Perfiles reales

- **Administrador:** rol Administrador; espacio de gestión del negocio.
- **Colaborador:** rol Usuario vinculado a un empleado; calendario/trabajo propios y capacidades comerciales concedidas por separado.
- **Usuario limitado:** el mismo rol Usuario, pero sin algunas capacidades, por ejemplo ventas/cotizaciones. No es un rol nuevo ni Super Admin.
- **Público:** visitante invitado. No hay un portal de cliente con login.

## Matriz de negocio

| Capacidad | Admin | Colaborador | Público | Límite importante |
|---|---|---|---|---|
| Explorar Home, Tienda y producto publicado | YES | YES | YES | Como visitante público, no acceso a fichas ocultas |
| Carrito, entrega y pago público | YES | YES | YES | Como comprador invitado de su pedido; no reemplaza venta CRM |
| Entrar al CRM | YES | YES | NO | Cuenta interna activa; el login público del inventario no es de comprador |
| Dashboard y comparación de sedes | YES | NO | NO | No equivale al resumen operativo del colaborador |
| Resumen del negocio personal | NO | LIMITED | NO | En el menú personal; Admin utiliza Dashboard. Agregados operativos permitidos, no ingresos/costos/márgenes globales |
| Crear/editar productos, galería y publicación | YES | NO | NO | Estado y foto obligatoria para publicación |
| Marcas de artículos/vehículos, modelos, generaciones y OEM | YES | NO | NO | Sólo catálogo; OEM se elimina realmente, otras familias se desactivan |
| Categorías de productos y especificaciones | YES | NO | NO | No son categorías de servicios |
| Consultar inventario por sede | YES | NO | LIMITED | Público ve disponibilidad elegible de red, no movimientos/stock interno por sede |
| Entradas, salidas, ajustes y mínimos | YES | NO | NO | Motivo y sede/variante; sin stock negativo |
| Solicitar, despachar y recibir transferencias | YES | NO | NO | Cada etapa según permisos/estado; solicitud no reserva unidades |
| Clientes y vehículos: alta/edición/estado/historial | YES | NO | NO | Seleccionar cliente en una operación propia no concede gestión administrativa |
| Seleccionar cliente registrado/vehículo al vender o cotizar | YES | LIMITED | NO | Descubrimiento comercial autorizado; no acceso irrestricto al historial de todos |
| Cotizaciones administrativas | YES | NO | NO | Colaborador usa Mis cotizaciones, no listado global |
| Crear/editar/enviar/convertir en Mis cotizaciones | NO | LIMITED | NO | Admin utiliza Cotizaciones. Colaborador requiere permisos por acción; editar sólo Borrador; sede derivada del empleado |
| Venta directa administrativa con sede/vendedor/pago inicial | YES | NO | NO | Se registra Confirmada; no es el formulario propio pendiente |
| Crear/confirmar/completar en Mis ventas | NO | LIMITED | NO | Admin utiliza Órdenes. Colaborador requiere permiso de cada acción; su sede y dueño no se eligen libremente |
| Cancelar venta desde gestión administrativa | YES | NO | NO | Sólo estados habilitados; no equivale a devolución bancaria |
| Registrar pagos internos | YES | LIMITED | NO | Colaborador: venta propia y permiso; monto positivo ≤ saldo |
| Cambiar dinero/stock desde conciliación | NO | NO | NO | Resolver caso documenta revisión, no muta finanzas/operación |
| Consultar/iniciar/decidir conciliaciones | YES | NO | NO | Consultar no basta para decidir; evidencia/justificación y decisiones según motivo |
| Mantener servicios y categorías | YES | NO | NO | Servicio y categoría activos para nuevas selecciones |
| Crear/reprogramar/cambiar estado/cancelar citas de equipo | YES | NO | NO | Colaborador consulta calendario propio; público solicita visita por WhatsApp, no cita confirmada |
| Consultar calendario de equipo | YES | NO | NO | Alcance de sede histórica distinto de jornada personal |
| Consultar Mi calendario en menú personal | NO | LIMITED | NO | Admin utiliza Calendario. Empleado vinculado; sólo alcance propio para Usuario |
| Empleados, sede y vínculo con usuario | YES | NO | NO | Empleado y cuenta tienen estados independientes |
| Horarios, excepciones y ausencias aprobadas | YES | NO | NO | Colaborador puede ver su contexto personal; no administrar jornadas/ausencias |
| Crear/asignar/editar/cancelar tareas del equipo | YES | NO | NO | Programación valida disponibilidad |
| Iniciar/completar tareas | YES | LIMITED | NO | Admin desde Tareas, con permiso; colaborador sólo asignadas desde Mis tareas |
| Crear/gestionar metas asignadas | YES | NO | NO | No reasignar una meta personal como si fuera asignada |
| Crear metas personales desde Mi espacio | NO | LIMITED | NO | Colaborador con vínculo; puede editar/cancelar personales activas. Admin crea asignadas y tiene gestión autorizada de metas del equipo |
| Registrar avance/completar metas propias asignadas o personales | YES | LIMITED | NO | Avance manual; colaborador no redefine/cancela metas asignadas |
| Consultar comisiones de equipo | YES | NO | NO | Historial no editable como ficha comercial |
| Consultar Mis comisiones | NO | LIMITED | NO | Admin utiliza Comisiones. Vínculo y permiso, sólo propias; Ganada ≠ transferida al empleado |
| Crear/editar una comisión manual desde su pantalla | NO | NO | NO | Surge del ciclo de venta y configuración histórica |
| Ocho reportes y Exportar Excel | YES | NO | NO | Información financiera según autorización |
| Leer/marcar notificaciones | YES | YES | NO | Notificaciones propias; marcar no resuelve el evento |
| Mantener sedes | YES | NO | NO | Desactivar restringida con empleados activos |
| Configuración General / Ventas y cotizaciones | YES | NO | NO | Consultar/editar diferenciados |
| Crear/editar usuarios y rol autorizado | YES | NO | NO | Dos roles: Administrador y Usuario; protección de estado/rol propios |
| Editar permisos comerciales individuales desde Usuarios | NO | NO | NO | Esta pantalla actual no ofrece ese editor; no inventar un botón |
| Mi perfil, contraseña y Salir | YES | YES | NO | Cuenta propia; no cambia rol/sede/permisos |
| Portal autenticado del comprador / Super Admin independiente | NO | NO | NO | No existen como recorridos de la interfaz actual |

## Qué comprobar si falta una función

1. Confirma que usas tu cuenta y que está activa.
2. Para colaborador, solicita revisar vínculo de empleado, estado operativo y sede.
3. Indica al administrador exactamente qué módulo/acción necesitas. Consulta, crear, confirmar, pagar y convertir pueden tener autorizaciones diferentes.
4. No intentes acceder a ventas/cotizaciones ajenas ni cambiar la sede modificando enlaces. Tus operaciones propias utilizan el contexto autorizado.
5. Crear **Usuario** o **Dar acceso CRM** no concede automáticamente todas las capacidades comerciales. No existe editor de esas capacidades en la pantalla actual de Usuarios; el responsable debe gestionar la autorización por el proceso habilitado, sin dar Admin como atajo.

## Separaciones que protegen el negocio

- **Empleado activo ≠ usuario activo:** desactivar empleado no elimina/desactiva su cuenta; revisar ambos.
- **Consulta ≠ escritura:** ver conciliación no autoriza resolver; ver catálogo no autoriza editar.
- **Stock red ≠ sede:** colaborador vende desde su sede; pickup exige una sede que abastezca todas las líneas.
- **Pagada ≠ Completada:** dinero y atención se gestionan por separado.
- **Datos personales ≠ globales:** resumen operativo agregado no habilita el detalle comercial de otro colaborador.

Los permisos propios y rechazos de acceso se verificaron en el baseline aprobado; esta fase documenta ese alcance, no afirma una prueba exhaustiva nueva de todas las combinaciones. Procedimientos: [manual de usuario](user-manual.md#roles).
