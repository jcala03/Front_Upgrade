# Escenarios Prácticos de Capacitación — Upgrade La 79

FINAL-PRODUCT-01D · 1 de octubre de 2026.

Ejercicios sugeridos, **no ejecutados por esta fase documental**. Todos los datos siguientes son **EJEMPLO FICTICIO**, no registros existentes ni precios/políticas comerciales. Usar únicamente un entorno de entrenamiento autorizado y aislado. No crear estos registros en producción, no enviar mensajes a clientes, no usar fondos/proveedores reales. El instructor prepara el entorno por el proceso autorizado del negocio; este documento no contiene instrucciones técnicas ni credenciales.

Referencias: [Guía](training-guide.md), [Guion](training-script.md), [Checklist](training-checklist.md), [Manual](user-manual.md) y [Roles](roles-permissions.md).

<a id="preparacion"></a>

## Preparación y ficha de datos ficticios

Antes de practicar, identifica cuenta/perfil/sede, permiso de cada acción y una etiqueta única de sesión, por ejemplo **CAP-TALLER-A**. Si ya existe ese prefijo, elige otro; no reutilices documentos convertidos o pagos ya registrados para repetir un ejercicio. Anota los números comerciales que genere la sesión en tu hoja privada, no IDs históricos de QA en el material.

| Dato didáctico | Valor sugerido / condición |
|---|---|
| Producto | Radio de demostración CAP-TALLER-A |
| SKU del padre | CAP-TALLER-A-RAD |
| Categoría | Una categoría activa de radios preparada; revisar sus campos obligatorios |
| Marca del producto | Marca de artículo existente apropiada; no confundir con fabricante del automóvil |
| Variante Básica | SKU CAP-TALLER-A-B; precio $950.000 |
| Variante Plus | SKU CAP-TALLER-A-P; precio $1.150.000 |
| Compatibilidad | Marca/modelo/generación existentes y verificados para el ejemplo; no inventar una compatibilidad real ni declarar Universal sin comprobar |
| Tres imágenes | Fotos frontal, lateral y conexiones del artículo de práctica, sin personas/documentos privados; JPEG/PNG/WebP, ≤5 MB cada una |
| Stock inicial Básica | Nueva variante: 0 en BAQ y 0 en BOG; ingresar 6 en BAQ y 1 en BOG |
| Stock inicial Plus | Nueva variante: 0 en ambas; ingresar 2 en BAQ y 2 en BOG |
| Mínimo Básica BAQ | 2, exclusivamente para enseñar umbral |
| Comisión opcional | $35.000 por unidad del producto, si el ejercicio incluye comisiones; no tarifa general del negocio |
| Cliente | Persona de Práctica CAP-TALLER-A |
| Correo ficticio | cliente.capacitacion@example.invalid; sólo en entorno que no envía comunicaciones reales |
| Teléfono/contacto/destino | Datos de simulación válidos suministrados por el instructor para el entorno aislado; no usar números/direcciones de personas ajenas |
| Vehículo | Marca → modelo → versión existentes; año dentro del rango; notas “Vehículo de demostración CAP-TALLER-A”. Placa/VIN opcionales: no inventar datos reales |
| Servicio | Instalación de práctica CAP-TALLER-A, categoría de servicios activa, precio $50.000, duración 60 minutos |
| Empleado | Asesor de Práctica CAP-TALLER-A, activo en BAQ; Usuario individual vinculado y jornada preparada |
| Permisos colaborador | Acciones propias de cotización/venta/pagos/comisiones a practicar, revisadas de antemano; no dar Admin como atajo |
| Jornada y citas | Fecha futura elegida por instructor en hora Colombia, intervalo laboral y franjas libres separadas; no confundir reloj del entrenamiento con citas reales |
| Tarea | Revisar equipo de práctica CAP-TALLER-A, asignada a ese empleado y reservada Pendiente para E6; Admin utiliza otra tarea si demuestra ejecución antes |
| Meta | Seguimiento de práctica CAP-TALLER-A, objetivo 10 propuestas, avance inicial 2 reservado para E6; Admin utiliza otra meta de demostración para cambiar avance antes |
| Pagos internos | Dinero exclusivamente didáctico; referencia “SIMULACIÓN CAP-TALLER-A” y notas que indiquen entrenamiento |
| Pago público | Sólo pruebas aprobadas sin dinero real; si no están disponibles, lectura de estados preparada y detención antes de la pasarela |

Para ejercicios encadenados, usa **E1 → E2 → E3 → E4 → E5 → E6 → E7**. Revisa saldos de nuevo en cada inicio. Los valores esperados presuponen que nadie más utilizó esas unidades. Si haces ejercicios independientes, prepara registros propios con otro prefijo; no agregues existencias sobre saldos anteriores como si fueran cero.

Las fotos se suministran antes; el material no genera archivos de imagen. Nombre/clave de cuentas se entregan por canal privado, nunca como datos ficticios copiables en un documento. Si crear Usuario o Dar acceso CRM no proporciona permisos comerciales, pausa y pide la habilitación autorizada: Usuarios no ofrece aquí un editor individual de capacidades.

## Cómo conducir cualquier escenario

1. Confirma entorno, perfil, sede, registro y saldo inicial.
2. Pide que el aprendiz diga el resultado esperado **antes** de confirmar.
3. Ejecuta una vez; espera feedback. Si tarda o queda incierto, consulta el registro, no repitas una escritura a ciegas.
4. Compara estado anterior/posterior, importes/unidades e historial.
5. Registra en checklist si lo hizo sin ayuda, con ayuda o no lo hizo. No declares un escenario ejecutado por mostrar una captura.
6. Conserva los documentos de entrenamiento con su prefijo. No borres historial ni anules operaciones financieras sólo para limpiar. La administración del entorno de práctica queda a cargo de su responsable; aquí no hay procedimiento de borrado.

<a id="e1"></a>

## E1. Producto, tres imágenes, publicación y stock en dos sedes

**Perfil:** Admin con permisos de catálogo/inventario. **Lecciones:** A2 y A3. **Tiempo práctico:** 15–20 min combinado; listas ya preparadas. **Referencia:** [Manual §7](user-manual.md#productos), [§10](user-manual.md#inventario), [§35](user-manual.md#flujo-producto).

**Preparación:** producto/SKUs no existentes, categoría y listas activas, tres archivos propios y cantidades ficticias contadas. Antes de publicar, revisa los campos obligatorios y la compatibilidad elegida.

**Consigna al aprendiz:** “Prepara este artículo con dos versiones, tres fotos y una principal. Publícalo y abastece cada versión en ambas sedes. Luego comprueba qué verá el comprador”.

1. Busca nombre/SKU antes de crear. Abre **Inventario → Crear producto**.
2. Completa nombre/categoría/marca/SKU y los detalles obligatorios. Registra compatibilidad verificada, descripción y precio.
3. Agrega Básica y Plus en **+ Agregar variante**, con sus SKUs/precios distintos, Activa y Visible. Conserva compatibilidad general cuando corresponde y selecciona la variante Principal predeterminada. Si configuras comisión, habilítala en el producto con $35.000 como tarifa didáctica; variantes heredan.
4. En **Agregar imágenes**, carga tres. Selecciona lateral con **Hacer principal** y usa flechas para cambiar orden; explica por qué principal y posición no son lo mismo.
5. Revisa Producto activo/Visible en ecommerce y guarda con **Guardar y asignar inventario**. Si el formulario señala un campo obligatorio, corrígelo sin duplicar la ficha.
6. En entrada, selecciona BAQ y variante Básica, Cantidad 6, Motivo “Recepción ficticia de entrenamiento”; pulsa **Ajustar existencias**. Revisa stock actual: sólo se suma esa entrada.
7. Vuelve al formulario de entrada y registra Básica BOG 1, Plus BAQ 2 y Plus BOG 2, cada una con sede/variante/motivo y comprobación individual. No registres stock del padre como una quinta bolsa.
8. En **Existencias**, selecciona sede, busca SKU con **Buscar** y verifica cuatro posiciones. Configura Básica BAQ **Mínimo → 2 → Guardar mínimo**: stock debe seguir 6.
9. En **Catálogo publicado → Configurar publicación**, verifica publicado/destacado y **Guardar publicación** si hay cambio. Si ya se publicó al guardar ficha, no necesitas alternar repetidamente para practicar.
10. Usa **Editar producto e imágenes**, cambia sólo una descripción y **Guardar producto**. Reabre: las tres fotos y principal deben conservarse sin volver a cargarlas.
11. Abre **Tienda** desde navegación pública, busca el artículo, revisa tarjeta/galería y elige cada **Versión**. Verifica precio y disponibilidad, sin iniciar compra todavía.

**Resultados que comprueba el instructor:** producto único, dos versiones, tres imágenes persistidas, una principal; Básica BAQ 6/BOG 1 y Plus 2/2; mínimo no alteró stock; cuatro entradas trazables. Tienda muestra el artículo elegible y sus precios/versiones; no inferir stock de cada sede sólo por la tarjeta de red.

**Si hay problemas:** foto/formato/peso, SKU duplicado, categoría obligatoria o filtros de tienda: corrige causa. Si se canceló entrada después de guardar producto, retoma la ficha existente; no vuelve a crearla. No declarar Universal para eludir selección de vehículos.

**Aprobado si:** conserva fotos al editar, elige principal conscientemente y prueba las posiciones/publicación sin ayuda. Si variantes sólo se mostraron, registra esa competencia pendiente.

<a id="e2"></a>

## E2. Transferir dos unidades BAQ → BOG

**Perfil:** Admin con solicitud/despacho/recepción. **Lección:** A3. **Tiempo:** 7–10 min. **Referencia:** [Manual §12](user-manual.md#transferencias).

**Preparación:** Básica de E1, BAQ 6/BOG 1, origen/destino activos. Plus no participa. No registrar compras/ventas simultáneas sobre estas unidades.

**Consigna:** “Mueve dos unidades Básica y explica dónde se contabilizan mientras viajan”.

1. En **Inventario → Transferencias → Nueva transferencia**, selecciona BAQ origen y BOG destino.
2. Busca CAP-TALLER-A-B, selecciona **Artículo con stock → Agregar**, Cantidad 2, Notas “Traslado didáctico”; pulsa **Solicitar transferencia**.
3. En **Ver detalle**, comprueba Solicitada y stock 6/1. Pregunta si se reservó stock: no.
4. Simula el hecho físico de salida del material didáctico; pulsa **Despachar**, revisa/acepta confirmación y comprueba En tránsito: BAQ 4/BOG 1.
5. Simula recepción completa de las dos unidades; pulsa **Confirmar recepción**, acepta y comprueba Recibida: BAQ 4/BOG 3.
6. En **Movimientos**, consulta origen/destino y verifica Salida por traslado -2/Entrada por traslado +2, referencia de transferencia y saldos.
7. Explica cancelación sólo de una solicitud no despachada. Si debes practicarla, crea **otra** solicitud de entrenamiento y **Motivo para cancelar → Cancelar transferencia**, sin despacharla. No cancelar la Recibida.

| Momento | BAQ Básica | BOG Básica | Estado |
|---|---|---|---|
| Antes / después de solicitar | 6 | 1 | Solicitada |
| Después de despachar | 4 | 1 | En tránsito |
| Después de recibir | 4 | 3 | Recibida |

**Comprobación:** origen disminuyó sólo al despacho, destino aumentó sólo a la recepción, total 7 unidades; Plus sigue 2/2. Nada de entrada/salida manual adicional.

**Si falla despacho:** consulta stock real de origen; solicitar no reservaba. No aumenta stock mediante ajuste ficticio. Si hay respuesta incierta, abre detalle y movimientos antes de repetir. No hay recepción parcial ni devolución automática de Recibida.

**Aprobado si:** anticipa los tres saldos y verifica movimientos sin ayuda.

<a id="e3"></a>

## E3. Cliente → vehículo → cotización → venta → abono → saldo → completar

**Perfil:** Admin. **Lecciones:** A4–A6. **Tiempo:** 15–20 min de trabajo distribuido. **Referencia:** [Manual §13–17](user-manual.md#clientes), [§34](user-manual.md#flujo-comercial).

**Preparación:** cliente ficticio inexistente; vehículo de catálogo confirmado; Básica BAQ 4/BOG 3 tras E2; vigencia futura válida. Para que el total sea $950.000 utiliza sólo una Básica, sin servicio ni descuento en este ejercicio. Si quieres observar comisión, verifica configuración y vendedor/contexto del documento; no prometas comisión si no existe asignación aplicable.

1. Busca cliente por nombre/contacto con **Buscar cliente → Buscar**. Si no existe, **Nuevo cliente → Crear cliente** con nombre/correo ficticios y contacto de simulación.
2. Abre detalle, **Agregar vehículo**, selecciona marca/modelo/versión reales de la lista y año válido; guarda con **Guardar vehículo**. No inventes placa/VIN obligatorios: son datos opcionales.
3. Edita una nota del cliente y guarda; comprueba que no generó otro perfil.
4. Desde detalle pulsa **Nueva cotización** y verifica cliente/vehículo. Selecciona **Sede BAQ**, agrega una Básica y comprueba Cantidad 1/Descuento 0/Total $950.000.
5. Completa Válida hasta con fecha futura válida o revisa la vigencia configurada aplicada; añade nota “Propuesta de entrenamiento”. Pulsa **Crear cotización** y anota su número.
6. Abre **Editar**, cambia la nota y **Guardar cambios**. Comprueba stock aún BAQ 4/BOG 3.
7. Simula que se comunicó la propuesta sin enviar mensajes externos; pulsa **Marcar como enviada**. Explica que el estado no envía automáticamente un correo.
8. Simula aceptación; **Convertir en venta → Confirmar**. Comprueba Convertida/Venta generada y abre **Ver en Órdenes**.
9. Compara cliente, vehículo, sede, líneas y total conservados. Venta Confirmada, sin pago, BAQ Básica 3/BOG 3. No **Nueva venta** por la misma aceptación ni salida manual.
10. En esa venta, **Registrar pago → Monto 400000 → Método Efectivo → Referencia SIMULACIÓN CAP-TALLER-A → notas de entrenamiento → Registrar pago**. Es dinero didáctico, no efectivo real.
11. Verifica Pago parcial, pagado $400.000/saldo $550.000 y operación todavía Confirmada.
12. Registra otro pago didáctico de $550.000 sólo después de consultar saldo. Verifica dos pagos, total pagado $950.000/saldo 0/Pagada, todavía Confirmada.
13. Simula que terminó atención/entrega; pulsa **Marcar completada**. Verifica Completada/Pagada sin nuevos movimientos por pago o terminación.
14. Vuelve a cliente/vehículo y **Ver compras** para consultar historial relacionado. Revisa comisión únicamente si se generó por configuración/asignación aplicables.

**Comprobación:** una cotización, una venta vinculada, dos pagos didácticos, cliente/vehículo reutilizados, descuento de una unidad de BAQ sólo al convertir; pago y operación separados. El resultado de comisión no es universal.

**Errores a explicar:** vigencia, conversión ya realizada, cambio de stock/servicio, monto mayor al saldo y respuesta incierta. Antes de repetir consulta Venta generada, pagos y saldo. No borrar pagos históricos ni crear otra venta para solucionarlos.

**Aprobado si:** completa cadena y explica exactamente cuándo se descuenta stock y cuándo cambia dinero. La evaluación independiente usa otro prefijo, no reconvierte ésta.

<a id="e4"></a>

## E4. Venta directa, sin cotización

**Perfil:** Admin. **Lección:** A6/refuerzo. **Tiempo:** 6–8 min. **Referencia:** [Manual §16–17](user-manual.md#ventas).

**Preparación:** operación didáctica distinta de E3; Básica BAQ 3 tras E3, servicio de $50.000 y categoría activos, vendedor activo de BAQ. No registrar la misma compra del escenario anterior.

1. **Órdenes → Nueva venta**, elige Cliente existente y reutiliza el perfil/vehículo ficticios, o Venta mostrador si el instructor asigna esa alternativa.
2. Selecciona **Sede BAQ** y **Vendedor opcional** preparado de esa sede.
3. Agrega una Básica de $950.000 y servicio de $50.000, ambos Cantidad 1/Descuento 0: total $1.000.000.
4. Revisa stock y contexto. Si instructor asigna pago inicial de entrenamiento, activa **Registrar pago ahora**, monto $200.000, método/soporte de simulación. Si no, deja sin pago inicial; no fingir que se recibió dinero real.
5. Pulsa **Registrar venta** una vez. Comprueba Confirmada, líneas, total, vendedor y BAQ Básica 2/BOG 3; el servicio no descontó unidades.
6. Con pago inicial, verifica Pago parcial/saldo $800.000. Sin él, Sin pagar/saldo $1.000.000. Registra el saldo didáctico que realmente corresponda y comprueba Pagada.
7. Simula terminación y **Marcar completada**; revisa comisión aplicable, sin confundir Ganada con liquidada.

**Comprobación:** venta nueva independiente sin cotización, stock consumido al Registrar venta, importe correcto según pago elegido. Un cambio de sede con líneas pide confirmar su retirada; no hace falta provocarlo para aprobar.

**Errores:** vendedor de otra sede, cantidad insuficiente, pago inicial excedido. No suponer que comienza Pendiente como la venta directa del colaborador.

**Aprobado si:** crea la operación sin ayuda y distingue su Confirmada inicial de Crear venta pendiente propia.

<a id="e5"></a>

## E5. Citas: tres resultados en registros separados

**Perfil:** Admin. **Lección:** A7/refuerzo. **Tiempo:** 10–12 min para las tres ramas; inicial puede practicar principal y mostrar las otras. **Referencia:** [Manual §20–21](user-manual.md#citas).

**Preparación:** empleado ficticio activo con sede/jornada, sin ausencias/tareas/citas en tres franjas futuras distintas; servicio/categoría activos. Todas las horas en Colombia. Instructor anota día y rangos elegidos antes de la sesión.

**Cita principal — atención terminada:**

1. **Citas → Nueva cita**, Responsable, cliente/vehículo ficticios, Servicio y Título “Atención de práctica CAP-TALLER-A”; Estado inicial Solicitada.
2. Selecciona primera franja libre y verifica Inicio/Fin sugeridos por servicio. **Crear cita**, comprueba Solicitada.
3. Pulsa **Confirmar**, comprueba Confirmada.
4. **Reprogramar**, elige otra franja libre, **Guardar cambios**; consulta Calendario para comprobar nuevo horario y responsable.
5. Simula inicio de atención: **Iniciar** → En progreso. Simula terminación: **Completar** → Completada.

**Segunda cita — cancelación:**

1. Crea otra cita ficticia con título “Cancelación de práctica”, contacto y rango libre distintos, Confirmada.
2. **Cancelar → motivo de entrenamiento → Cancelar cita**. Comprueba Cancelada y registro conservado. No cancelar la Completada del caso anterior.

**Tercera cita — no asistencia:**

1. Crea otra Confirmada, título “No asistencia de práctica”, tercera franja disponible.
2. Simula ausencia del cliente: **No asistió**. Comprueba No asistió, no Completada ni Cancelada.

**Comprobación:** tres números distintos, agenda/horarios coherentes y estados terminales distintos. El calendario consulta, no modifica los eventos directamente. Guardar no garantiza mensajes al cliente.

**Errores:** fin anterior a inicio, responsable inactivo, solapamiento/ausencia/fuera de jornada. Elegir franja válida. Excepción fuera de jornada sólo cuando el formulario la ofrece y se autoriza con motivo; nunca para ignorar solapamiento/ausencia.

**Aprobado si:** crea/reprograma/cierra principal y elige correctamente las otras dos ramas. Si sólo observó cancelación/no asistencia, esas competencias quedan en refuerzo.

<a id="e6"></a>

## E6. Colaborador: día propio completo

**Perfil:** Usuario vinculado a empleado activo BAQ; permisos de cada acción concedidos. **Lecciones:** C1–C4. **Tiempo:** 15–20 min dentro del itinerario de 30. **Referencia:** [Manual §32](user-manual.md#colaborador), [Roles](roles-permissions.md).

**Preparación:** cuenta individual privada, tarea Pendiente y meta propia Asignada activa con avance 2; meta personal no existente; comisión del producto configurada si se va a comprobar. En secuencia completa, Básica BAQ 2/BOG 3 tras E4. No reutilizar cotización Admin para editarla como propia.

1. Entra con **Email/Contraseña → Entrar al CRM**. En Inicio identifica identidad/sede, próxima cita/tarea/meta y tarjetas comerciales disponibles.
2. Abre **Mi calendario**, consulta Agenda/Semana y fecha. Abre **Resumen del negocio**, revisa contexto/periodo y **Aplicar**. Explica que agregados no permiten abrir ventas ajenas ni datos financieros globales.
3. En **Mis cotizaciones → Nueva cotización**, agrega una Básica, Cantidad 1/Descuento 0. Selecciona Cliente registrado y vehículo ficticios; no administra Clientes ni crea vehículos desde su espacio.
4. Revisa Sede actual BAQ, vigencia/notas y total $950.000; **Crear cotización**. En Borrador, **Editar → Guardar cambios** para una nota.
5. **Enviar cotización**, acepta confirmación; Enviada congela edición propia. Comunicación es simulada, no envío automático real.
6. Simula aceptación: **Convertir en venta**, confirma y comprueba Convertida/Venta generada. Abre **Mis ventas → Ver venta**: ya Confirmada, BAQ Básica 1/BOG 3. No crear otra venta ni confirmar otra vez.
7. Si tiene Registrar pago, registra pago didáctico de $950.000, método/soporte de simulación y comprueba Pagada/saldo cero. Si no, registra límite y solicita gestión al Admin autorizado; no usa sus credenciales.
8. Si autorizado y atención simulada terminó, **Completar venta**, acepta y comprueba Completada. Estado financiero se consulta aparte; completar no inventa el pago faltante.
9. **Mis tareas → Ver detalle → Iniciar → Completar** para la tarea ficticia, simulando ejecución. Comprueba Completada.
10. **Mis metas → Avance → Nuevo avance 4 → Registrar avance** en la asignada: debe mostrar 4, no 6. No redefine/cancela la asignada.
11. **Crear meta personal**, título “Repaso propio CAP-TALLER-A”, meta numérica 1/unidad “práctica”, fechas válidas, **Guardar meta**. Una vez realizada la práctica, registra avance 1 y usa cierre **Completar → Completar**; el avance no la cierra solo.
12. **Mis comisiones**: si el contexto generó comisión, identifica pendiente antes de completar y Ganada después, $35.000 × una unidad. Si no existe, revisa configuración/asignación con Admin; no inventa un registro ni afirma que todas las ventas comisionan.
13. **Notificaciones → Marcar como leída** sobre novedad ficticia; localiza Mi perfil/cambio de clave sin revelar contraseña; termina con **Salir**.

**Alternativa de venta directa propia — otra operación:** **Mis ventas → Nueva venta → líneas/cliente/notas → Crear venta pendiente** (sin descuento de stock) **→ Ver venta → Confirmar venta** (valida/descuenta) **→ Registrar pago / Completar venta** según permisos. Usa producto/stock/prefijo separados para practicarla; no añade esta ruta a la venta ya convertida de E6.

**Comprobación:** diez pantallas personales localizadas, una cadena propia, sede derivada y límites respetados; tarea/meta verificadas, comisión sólo si aplica. Un usuario limitado puede no tener acciones comerciales: registrar lo permitido, No visto en lo no practicable y refuerzo/aclaración de alcance, no “capacidad aprobada”.

**Errores:** falta de vínculo/sede/permisos, Enviada sin edición, stock insuficiente, abono incierto o meta actualizada como incremento. Pide revisión sin modificar enlaces ni acceder a Configuración Admin.

**Aprobado si:** opera sin ayuda dentro de permisos concedidos y deriva las acciones ausentes al autorizado. No equiparar permisos limitados con fallos de aprendizaje.

<a id="e7"></a>

## E7. Compra pública y recuperación del mismo pedido

**Perfil:** visitante invitado; también soporte/comercial que hará demostraciones. **Lecciones:** P1–P3. **Tiempo:** 12–16 min con una entrega practicada; la otra preparada. **Referencia:** [Manual §36](user-manual.md#compra), [Guía del cliente](customer-guide.md).

**Preparación:** producto publicado con versiones/fotos y stock elegible comprobado; navegador de comprador separado del CRM; contacto/destino de simulación admitidos; recogida o tarifas de prueba disponibles. Pago sólo con entorno aprobado sin fondos reales. Estados de retorno preparados/evidencia autorizada; no existe un selector público para forzarlos.

1. En Inicio, usa **Explorar artículos → Tienda**. Busca prefijo, filtra categoría/marca y, si corresponde, vehículo. Quita una restricción con Limpiar y explica stock/destacados.
2. Abre ficha, revisa galería mediante miniaturas y compatibilidad. Selecciona **Versión Básica**, comprueba $950.000/stock y agrega Cantidad 1 con **Agregar al carrito**.
3. Abre Carrito: versión/SKU/unidades/subtotal. Muestra controles de cantidad/Quitar/Seguir comprando sin duplicar la línea para la misma operación. **Continuar compra**.
4. Elige Envío o Recoger en sede antes de preparar; completa Nombre completo/Correo electrónico/Celular de simulación. **Preparar orden**, espera número. No cobra.

**Rama R — recogida:** espera sedes, elige una que abastece todas las líneas y **Recoger en esta sede**. Comprueba Sede de recogida aplicada y Resumen final/Listo para pagar. No llenar dirección de envío ni prometer stock de cualquier sede por disponibilidad de red.

**Rama E — envío:** utiliza pedido didáctico separado/preparado para enseñar la otra modalidad, o cambia modalidad antes de pago en el mismo pedido y reaplica todo; nunca después de pagarlo como si pudiera editarse libremente.

1. Revisa quien recibe; sólo si es otra persona completa sus datos.
2. Completa País CO, departamento/ciudad/código postal/dirección de simulación válidos, complemento/indicaciones si corresponde.
3. **Guardar dirección**, espera Dirección guardada.
4. **Calcular envío**, espera tarifas; selecciona una y **Aplicar tarifa**.
5. Verifica costo/plazo mostrados, cargos y total final. No son precios/plazos fijos del manual.
6. Si cambias dirección para demostrar edición, vuelve a guardar, calcular y aplicar. No fingir que seleccionar una tarifa basta.

**Continuación segura de pago:**

1. Con entrega/cargos aplicados, identifica Listo para pagar/total y **Continuar al pago** sólo si hay pruebas seguras aprobadas. En su ausencia, detenerse aquí: marcar pago No visto y explicar estados con evidencia preparada; no afirmar compra pagada.
2. En pasarela de pruebas disponible, seguir las indicaciones suministradas privadamente por el instructor. Este material no reproduce datos bancarios ni garantiza el proveedor real.
3. Al retorno, leer estado de la misma orden: pendiente/confirmando → esperar/**Consultar nuevamente**; incierto → consultar/contactar antes de otro cobro; rechazado explícito → **Intentar pago nuevamente** sólo si se ofrece; aprobado → **Ver mi orden**.
4. Para practicar rechazo/reintento, usa otro pedido de pruebas rechazado preparado por instructor y su mismo número durante el reintento. No provoca un rechazo real ni afirma que hay un botón de selección de estados.
5. En confirmación, localizar número, productos/versiones/cantidades, total/entrega/pago; **Consultar nuevamente**. Explicar Contactar por WhatsApp sin enviar mensaje externo. Confirmación de pago no equivale a entrega completada.

**Comprobación:** el aprendiz navega sin direcciones manuales, aplica entrega, entiende total y recupera estados seguros en la misma orden. Cada modalidad/pago se registra según realmente se practicó. No compartir enlace privado, claves ni tarjetas en capturas.

**Errores:** ninguna sede abastece todo, dirección sin guardar, tarifa sin aplicar, cargos incompletos y stock cambiado. No inventa código/dirección ni crea otro pedido para “desbloquear” pago. Si falta un servicio de prueba, se registra límite; no se cambia a proveedor real.

**Aprobado si:** completa navegación/checkout asignado y explica correctamente esperar/reintentar/confirmar. Ejecución de pago sólo aprobada con evidencia de prueba segura; lectura de estados se califica aparte.

<a id="e8"></a>

## E8. Clínica de errores reales y recuperación segura

**Perfil:** según cada fila, nunca elevar permisos para probar. **Lección:** refuerzo selectivo en cualquier itinerario. **Tiempo:** 2–3 min por caso elegido. **Referencia:** [Manual §38](user-manual.md#problemas), [Roles](roles-permissions.md).

Instructor: plantea el caso, pide al aprendiz identificar causa y siguiente acción, deja corregir y comprobar. Usa sólo registros ficticios separados; no daña E1–E7 para crear problemas.

| Caso | Preparación y ejercicio | Resultado esperado / recuperación | Evidencia de comprensión |
|---|---|---|---|
| Producto sin foto | Admin, ficha nueva ficticia oculta sin galería; pide publicarla. Lee Validación para publicar; si el control ya bloquea, no fuerces el envío | Agrega foto válida/principal y guarda, u opta por conservar oculto; no inventa imagen | Explica requisito y comprueba estado; no crea otra ficha |
| Stock insuficiente | Producto ficticio distinto con 1 unidad en sede; intenta seleccionar 2 para una salida/venta sólo por controles normales. Si UI lo impide, reconoce prevención | Reduce a disponibilidad real o solicita traslado/recepción; saldo no se hace negativo por intento | Comprueba sede/variante y ausencia de cambio; no ajuste ficticio |
| Servicio inactivo | Servicio de entrenamiento aparte desactivado, o categoría de entrenamiento aparte inactiva; no cambiar la categoría compartida de E1–E7. Buscar en nueva cotización/cita | Reconoce ausencia y revisa ambos estados con Admin. Reactivar sólo si instructor autoriza ejercicio; no alterar histórico | Explica que servicio activo con categoría inactiva tampoco se ofrece |
| Permiso insuficiente | Usuario limitado preparado, sin acción comercial específica | Encuentra función ausente/aviso y pide revisión de vínculo/sede/permiso; no modifica enlaces ni usa Admin | Identifica quién puede continuar y qué acción falta |
| Pago rechazado | Pedido de pruebas rechazado/evidencia preparada, jamás cargo real | Lee rechazo explícito; si ofrece Intentar pago nuevamente, continúa misma orden; si no, consulta soporte | No crea pedido duplicado; compara número antes/después si ejecuta |
| Cotización ya convertida | Consulta la propuesta de E3/E6 y Venta generada; no intenta reconvertir con medios fuera de la UI | Continúa venta existente; reconoce estado terminal y ausencia de segunda conversión | Identifica vínculo y no registra otra venta |
| Cotización vencida | Sólo ejemplo preparado ya Vencida; no inventar un botón de vencimiento ni forzar fechas inválidas | Lee causa y deriva revisión de la propuesta por acciones permitidas; no da por válido convertir vencida | Explica vigencia y que cotizar no reservó stock |
| Pago pendiente/incierto | Estado de pruebas preparado y listado de pagos/saldo didácticos | Consultar nuevamente o revisar pagos antes de repetir; timeout no es rechazo | Elige esperar/consultar frente a “pagar otra vez” |
| Dirección editada después de cotizar | Pedido público de pruebas sin pagar | Guardar nueva dirección → calcular → aplicar tarifa → revisar total | Explica por qué pago no está listo con cambios pendientes |
| Respuesta de escritura incierta | Discusión con una venta/pago guardado de entrenamiento, sin cortar deliberadamente servicios | Consulta estado/pagos/historial antes de repetir; en conciliación usa Reintentar misma solicitud sólo si aparece | No interpreta lentitud como operación perdida |

**Aprobado si:** identifica causa, corrige por controles permitidos y comprueba resultado; en casos sólo ilustrados, marcar comprensión demostrada y acción ejecutiva No visto. No inventar el texto literal de un error: lee el mensaje que muestre el entorno.

<a id="movimientos"></a>

## Taller de movimientos: entrada, salida y saldo final

**Perfil:** Admin con movimientos. **Tiempo de refuerzo:** 4–6 min. **Referencia:** [Manual §10.3](user-manual.md#inventario).

Usa un artículo ficticio **distinto**, preparado con saldo 3 en BAQ y SKU de sesión terminado en MOV; no las unidades vendidas/trasladadas de E1–E7. El instructor plantea hechos físicos didácticos, no inventa mercancía real para conseguir el saldo.

1. **Inventario → Existencias → Sede BAQ → Producto o SKU → Buscar**; comprueba saldo 3 de la fila.
2. **Movimiento → Tipo Entrada → Cantidad 2 → Motivo de recepción didáctica → Registrar movimiento**. Comprueba saldo 5 y movimiento +2.
3. En esa misma fila: **Movimiento → Tipo Salida → Cantidad 1 → Motivo de retiro didáctico → Registrar movimiento**. Comprueba saldo 4 y movimiento -1. No es salida por una venta que ya consumió stock.
4. Simula un conteo físico final de 6 unidades: **Movimiento → Ajuste a cantidad final → Nueva existencia 6 → Motivo de conteo didáctico verificado → Registrar movimiento**. Comprueba saldo final 6, no 10; movimiento de diferencia +2.
5. En **Movimientos**, verifica sede/artículo/tipos/saldos/motivos; configurar mínimo 2, si lo practicas, no cambia ese saldo 6.

**Aprobado si:** anticipa 3 → 5 → 4 → 6 y explica unidades del movimiento frente a saldo final, sin simular una transferencia con ajustes. Si duda de un guardado, consulta saldo/historial antes de repetir.

<a id="personal"></a>

## Taller de personal: preparación y refuerzo de A8

**Perfil:** Admin; partes propias se practican en E6. **Tiempo de refuerzo:** 15–20 min seleccionando lo no aprendido, con otros registros ya preparados. **Referencia:** [Manual §22–27](user-manual.md#empleados).

1. **Empleados → Registrar empleado**: nombre/cargo ficticios, sede BAQ, estado activo. Si hay cuenta, **Vincular usuario CRM existente**; si requiere acceso y está autorizado, **Dar acceso CRM → Crear acceso CRM** con datos entregados privadamente. Comprueba vínculo; no asumir permisos comerciales automáticos.
2. **Ver horario → Agregar intervalo → Guardar intervalo**: día/inicio/fin/vigencia válidos. **Agregar excepción → Fecha → Horario excepcional o No laborable → Guardar excepción** para otro día sin citas; explica que reemplaza ese día, no toda la semana. Para fecha existente, editar, no duplicar.
3. **Ver ausencias → Registrar ausencia → Guardar ausencia**: empleado, tipo y rango libre separados de las citas/tareas; ya Aprobada. Comprueba agenda/disponibilidad. Si practicas cancelar, **Cancelar ausencia**, conserva Cancelada; no reprogramación automática.
4. **Tareas → Crear tarea → Guardar tarea**: responsable/título/prioridad y límite. Si activas Programar en agenda, Inicio/Fin válidos del mismo día y disponibilidad. Fecha límite sola no reserva intervalo. E6 realiza Iniciar/Completar en propia. Practica editar/cancelar sólo otra tarea ficticia con motivo.
5. **Metas → Nueva meta → Guardar meta**: empleado/título/objetivo 10/unidad propuestas/periodo. **Avance → Nuevo avance 2 → Registrar avance**; E6 lo cambia a 4. Conserva ésta con avance 2 y la tarea de E6 Pendiente hasta su práctica. Para demostrar avance 2 → 4 en A8 utiliza otra meta ficticia titulada “Demo Admin CAP-TALLER-A”; no completes ni modifiques la reservada. Otra meta preparada sirve para Editar/Guardar meta o Cancelar/Razón/Cancelar meta si falta esa competencia.
6. **Comisiones → Ver detalle** de E4/E6 según contexto. Compara Pendiente antes de completar venta y Ganada después; Anulada se explica con ejemplo preparado de venta cancelada antes de ganarse. No cancelar una venta sólo para alterar comisión ni registrar pago bancario al empleado desde esta pantalla.

**Comprobación:** el instructor pide al aprendiz señalar sede/vínculo/estado, jornada, excepción/ausencia, tarea programada frente a vencimiento, meta manual y comisión histórica. Cada alta/edición requiere práctica para su aprobación. No desactivar empleado en uso por E5/E6; para explicar independencia de usuario, usar lectura de estados o registro aparte autorizado.

<a id="control"></a>

## Taller de control: conciliación, ocho reportes y configuración

**Perfil:** Admin autorizado. **Tiempo:** 8–12 min; se reparte entre A9 y refuerzo. **Referencia:** [Manual §18](user-manual.md#conciliaciones), [§28–30](user-manual.md#reportes).

**Conciliación:** utiliza caso ficticio preparado Pendiente de revisión, sin datos/provider reales. **Ver caso → leer motivo/pago/orden/historial → Iniciar revisión**. Si ofrece **Escalar revisión**, selecciona, justifica la falta real de información en el caso didáctico y **Registrar decisión**; comprueba En revisión e historial, sin mutación financiera/stock. Si no existe ese caso/acción, sólo consulta evidencia preparada y marca ejecución pendiente. No elegir decisión terminal sin evidencia ni inventar un número de pago canónico. Marcar devolución requerida no devuelve dinero ni cierra; resolución terminal requiere soporte según caso.

**Reportes:** pide resolver las siguientes preguntas; enseñar las ocho familias no significa exportar ocho veces.

| Pregunta del instructor | Familia |
|---|---|
| ¿Qué vendimos en la sede/periodo? | Ventas |
| ¿Qué artículo o versión se vendió y cuántas unidades? | Productos |
| ¿Qué pagos registrados hay por método/estado? | Pagos |
| ¿Qué saldo queda por cobrar? | Cartera |
| ¿Qué unidades y mínimos tenemos ahora? | Inventario |
| ¿Qué cambio explica el saldo? | Movimientos |
| ¿Qué propuestas se convirtieron? | Cotizaciones |
| ¿Qué clientes están registrados y atendidos en el periodo? | Clientes |

Practica **Sede/periodo/filtros → Aplicar filtros → comprobar filas → Exportar Excel** en Ventas o Cartera. Cambia a Inventario: sede conservada, otros filtros restablecidos y sin fechas. Comprueba alcance antes de descargar. No interpretar resumen de Pagos como neto descontando devoluciones; costos conocidos no garantizan cobertura completa de utilidad. No compartir archivos internos reales.

**Configuración:** **General / Ventas y cotizaciones / Usuarios**. Localizar identidad/contactos, vigencia y destinatario interno; si se practica editar, usar sólo valores didácticos autorizados y **Guardar cambios** con comprobación. Comparar fecha de cotización existente frente a nueva creada por trabajo de entrenamiento: no se reescribe la anterior. Para cuenta nueva, **Nuevo usuario → Crear usuario**, rol Usuario cuando corresponda; no compartir cuenta ni inventar editor de permisos individuales. Perfil propio se cambia con Guardar perfil; no cambio de clave ajena en edición de Usuarios.

**Aprobado si:** explica consecuencias de conciliación, identifica las ocho familias, aplica/exporta alcance correcto y localiza configuración sin inventar capacidades. Decisiones/altas no ejecutadas no se califican como aprendidas.

## Evaluación final independiente

El instructor elige un prefijo nuevo y sólo las competencias pendientes. Puede suministrar categoría/listas/horarios preparados: no necesita recrear cada dato de catálogo para evaluar una venta. El aprendiz no recibe la secuencia de botones durante la evaluación; después puede consultar el Manual para reforzar.

- **Admin:** demostrar producto/fotos/stock, cliente/vehículo, cotización → venta → pagos, transferencia y cita en entorno seguro. Talleres amplían su autorización operativa según puesto. Comprobar estados y números, no sólo pantalla de éxito.
- **Colaborador:** localizar trabajo propio, realizar operación autorizada y tarea/meta, interpretar comisión y límites; no exigir acceso inexistente.
- **Ecommerce:** encontrar versión, preparar checkout y explicar ambas entregas y recuperación. Pago de pruebas y cada rama ejecutada se califican separadamente de la comprensión verbal.

Registra [Aprendido / Necesita refuerzo / No visto](training-checklist.md) por competencia. Si necesita instrucciones para confirmar o interpreta mal una consecuencia crítica, no se aprueba todavía. No iniciar producción como ejercicio final; el uso real requerirá autorización del negocio.
