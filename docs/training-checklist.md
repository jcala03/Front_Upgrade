# Checklist de Capacitación — Upgrade La 79

FINAL-PRODUCT-01D · 1 de octubre de 2026.

Para completar por instructor y aprendiz, con evidencia de práctica. Utiliza [Guía](training-guide.md), [Guion](training-script.md) y [Escenarios](training-scenarios.md). Esta plantilla está sin evaluar: **ninguna casilla marcada implica una capacitación ejecutada por esta fase**.

## Datos de la sesión

| Dato | Completar |
|---|---|
| Fecha / instructor | ____________________ |
| Aprendiz / puesto | ____________________ |
| Recorrido | Admin / Colaborador / Ecommerce-demostración |
| Entorno autorizado de entrenamiento | ____________________ |
| Sede y vínculo operativo cuando corresponde | ____________________ |
| Capacidades concedidas / límites del puesto | ____________________ |
| Prefijo ficticio de sesión | ____________________ |
| Duración / refuerzo acordado | ____________________ |

No registrar contraseñas, códigos bancarios, datos reales de clientes ni enlaces privados de compra. Los números comerciales ficticios pueden anotarse privadamente para relacionar evidencia, sin copiar IDs de otros ejercicios QA.

## Cómo marcar

Para **cada competencia**, marca **una sola** casilla:

- **Aprendido:** lo demostró sin instrucciones de botones, comprobó resultado y explicó consecuencia. En competencias de comprensión puede usar sus propias palabras; no basta asentir.
- **Necesita refuerzo:** se trabajó pero requirió ayuda, omitió comprobación o confundió una consecuencia.
- **No visto:** no se enseñó/practicó o faltó permiso, caso o entorno seguro. Anota la causa; no certificar la acción por verla en pantalla.

Cada `[ ]` se puede marcar con una X en la copia de trabajo. La columna Evidencia indica prueba sugerida; usa el registro de observaciones final para resultado/momento concretos. Las casillas vacías no significan aprobado. Si una acción no forma parte de los permisos del puesto, registra **No visto: fuera del alcance**, explica a quién deriva y no concede una capacidad ficticia. Para función sólo mostrada, la ejecución autónoma sigue pendiente.

## Preparación y conceptos — antes de guardar

Aplicar preparación a todos; conceptos administrativos completos a Admin/colaborador. Para público, evaluar especialmente carrito/pedido/pago, total/entrega y disponibilidad; no exigir administración de módulos internos.

| Competencia / condición | Aprendido | Necesita refuerzo | No visto | Evidencia sugerida |
|---|---|---|---|---|
| Identifica entorno seguro, cuenta/perfil y límites del ejercicio | [ ] | [ ] | [ ] | Preparación de escenarios |
| Explica Producto ≠ Stock | [ ] | [ ] | [ ] | C0: crear ficha no agrega unidades |
| Explica Cotización ≠ Venta y ausencia de reserva al cotizar | [ ] | [ ] | [ ] | C0/E3/E6 |
| Explica Venta ≠ Pago | [ ] | [ ] | [ ] | Estado y saldo de venta |
| Explica Pago ≠ Finalización operativa | [ ] | [ ] | [ ] | Pagada + Confirmada |
| Distingue stock de sede/variante frente a red | [ ] | [ ] | [ ] | BAQ sin unidades/BOG con unidades |
| Explica Transferencia ≠ Ajuste manual | [ ] | [ ] | [ ] | Solicitar/despachar/recibir |
| Distingue Admin de colaborador y cuenta individual | [ ] | [ ] | [ ] | Rol y límite autorizado |
| Ante respuesta incierta consulta resultado antes de repetir escritura | [ ] | [ ] | [ ] | E8: pagos/venta/historial |

**No continuar con escrituras Admin/colaborador si no comprende los siete conceptos de C0.** Refuerzo no se soluciona cambiando permisos o sede.

## Admin — orientación y catálogo

| Competencia | Aprendido | Necesita refuerzo | No visto | Evidencia sugerida |
|---|---|---|---|---|
| Inicia sesión con su cuenta y navega por menú | [ ] | [ ] | [ ] | A1 |
| Interpreta Dashboard, General/sede, comparación y actualización | [ ] | [ ] | [ ] | A1: por cobrar/stock crítico |
| Localiza Sedes, identifica código/ciudad/estado y restricciones | [ ] | [ ] | [ ] | A1/Manual §6 |
| Crea/edita sede autorizada y distingue activación de abastecimiento | [ ] | [ ] | [ ] | Refuerzo con sede ficticia aparte |
| Lee/marca notificaciones sin afirmar operación resuelta | [ ] | [ ] | [ ] | A1/A9 |
| Localiza perfil/cambio de contraseña y distingue rol/sede | [ ] | [ ] | [ ] | A1; sin revelar claves |
| Busca producto/SKU antes de crear | [ ] | [ ] | [ ] | E1 |
| Crea ficha y completa detalles obligatorios de categoría | [ ] | [ ] | [ ] | E1: producto guardado |
| Comprende campos Producto/Variante y filtros de categoría | [ ] | [ ] | [ ] | A2 |
| Crea/edita categoría con especificaciones correctamente | [ ] | [ ] | [ ] | Refuerzo; Manual §9 |
| Distingue marca de artículo de fabricante del automóvil | [ ] | [ ] | [ ] | A2 |
| Mantiene marcas/modelos/generaciones/OEM por sus formularios | [ ] | [ ] | [ ] | Refuerzo; Manual §8 |
| Declara compatibilidad comprobada sin inventar datos | [ ] | [ ] | [ ] | E1 |
| Crea variantes con SKU/precio/estado propios y compatibilidad aplicable | [ ] | [ ] | [ ] | E1; no variantes por sede |
| Distingue Principal de variante frente a imagen principal | [ ] | [ ] | [ ] | E1 |
| Carga tres fotos válidas, elige principal y ordena galería | [ ] | [ ] | [ ] | E1: tres persistidas/una principal |
| Edita ficha conservando imágenes existentes | [ ] | [ ] | [ ] | E1: reabrir sin recargar |
| Publica/oculta/destaca y comprende requisito de imagen | [ ] | [ ] | [ ] | E1/E8 |
| Configura comisión de producto sólo si corresponde | [ ] | [ ] | [ ] | E1 opcional, no política general |
| Crea/edita servicio y categoría de servicios activos | [ ] | [ ] | [ ] | Refuerzo; Guardar servicio/categoría |
| Explica servicio activo bajo categoría inactiva y ausencia de stock | [ ] | [ ] | [ ] | A2/E8 |

## Admin — inventario y proceso comercial

| Competencia | Aprendido | Necesita refuerzo | No visto | Evidencia sugerida |
|---|---|---|---|---|
| Consulta posición exacta de sede/SKU/variante | [ ] | [ ] | [ ] | E1/E2; Buscar |
| Asigna entradas separadas BAQ/BOG, sin sumar stock del padre | [ ] | [ ] | [ ] | E1: cuatro posiciones |
| Configura mínimo sin cambiar existencia | [ ] | [ ] | [ ] | E1: mínimo 2, stock 6 |
| Ejecuta entrada/salida o ajuste a cantidad final con motivo y distingue efecto | [ ] | [ ] | [ ] | Refuerzo sobre producto aparte |
| Ante stock insuficiente corrige sin saldo negativo/ajuste ficticio | [ ] | [ ] | [ ] | E8 |
| Consulta movimientos, referencias y saldos, reconoce límite de recientes | [ ] | [ ] | [ ] | E2; Reportes para periodos |
| Solicita transferencia sin afirmar reserva/descuento | [ ] | [ ] | [ ] | E2: 6/1 |
| Despacha transferencia y explica En tránsito | [ ] | [ ] | [ ] | E2: 4/1 |
| Recibe completa, verifica destino/movimientos y evita entrada duplicada | [ ] | [ ] | [ ] | E2: 4/3 |
| Cancela sólo solicitud no despachada con motivo | [ ] | [ ] | [ ] | E2 alternativa separada |
| Busca/crea/edita cliente sin duplicar historial | [ ] | [ ] | [ ] | E3 |
| Registra/edita vehículo vinculado con generación/año coherentes | [ ] | [ ] | [ ] | E3 |
| Consulta historial e inicia venta/cotización desde cliente | [ ] | [ ] | [ ] | E3: Ver compras/Nueva cotización |
| Crea cotización con sede, cliente/vehículo, líneas y vigencia | [ ] | [ ] | [ ] | E3 |
| Edita y registra Enviada sin prometer envío automático | [ ] | [ ] | [ ] | E3 |
| Convierte una vez, compara datos conservados y continúa venta generada | [ ] | [ ] | [ ] | E3: vínculo/Confirmada/stock |
| Identifica condiciones que bloquean conversión y recupera con seguridad | [ ] | [ ] | [ ] | E8: estado/vigencia/stock |
| Crea venta directa Admin con sede/vendedor/líneas correctos | [ ] | [ ] | [ ] | E4; Confirmada inicial |
| Registra pago inicial sólo si corresponde y controla saldo | [ ] | [ ] | [ ] | E4 alternativa |
| Registra abono real del ejercicio y luego saldo, sin excederlo | [ ] | [ ] | [ ] | E3: 400000 + 550000 |
| Verifica estado financiero separado del operativo | [ ] | [ ] | [ ] | E3: Pagada antes de completar |
| Completa sólo atención terminada y reconoce cancelación no bancaria | [ ] | [ ] | [ ] | E3/E4 y lectura de reglas |

## Admin — agenda, personal y control

| Competencia | Aprendido | Necesita refuerzo | No visto | Evidencia sugerida |
|---|---|---|---|---|
| Crea/confirma cita con responsable/servicio/contacto y disponibilidad | [ ] | [ ] | [ ] | E5 principal |
| Reprograma la misma cita y comprueba calendario | [ ] | [ ] | [ ] | E5 principal |
| Inicia/completa atención | [ ] | [ ] | [ ] | E5 principal |
| Registra Cancelada y No asistió en citas distintas | [ ] | [ ] | [ ] | E5 ramas; ambas practicadas |
| Consulta Calendario por fuentes/rango/contexto sin editar desde evento | [ ] | [ ] | [ ] | A7; Manual §21 |
| Explica límite de excepción fuera de jornada, no permiso para todo conflicto | [ ] | [ ] | [ ] | A7/E8 |
| Registra empleado con sede y vínculo de cuenta correctamente | [ ] | [ ] | [ ] | Taller de personal |
| Da acceso CRM sólo autorizado y distingue permisos comerciales | [ ] | [ ] | [ ] | Taller; sin claves en evidencia |
| Distingue empleado activo de usuario activo y gestiona acceso por separado | [ ] | [ ] | [ ] | A8/Manual §22/30 |
| Crea/edita intervalo semanal con vigencia | [ ] | [ ] | [ ] | Taller de personal |
| Crea/edita excepción para fecha, sin duplicarla ni cambiar toda semana | [ ] | [ ] | [ ] | Taller de personal |
| Registra/edita/cancela ausencia aprobada y revisa agenda | [ ] | [ ] | [ ] | Taller; sin autoreprogramación |
| Crea/asigna/edita tarea con prioridad y límite | [ ] | [ ] | [ ] | Taller de personal |
| Programa tarea en rango válido del mismo día y distingue fecha límite | [ ] | [ ] | [ ] | Taller de personal |
| Sigue ejecución y cancela tarea con motivo en registro autorizado | [ ] | [ ] | [ ] | Taller; registros separados |
| Crea/edita meta asignada y distingue personal/asignada | [ ] | [ ] | [ ] | Taller de personal |
| Registra avance acumulado y cierra/cancela meta manualmente según reglas | [ ] | [ ] | [ ] | Taller/E6, sin incremento duplicado |
| Consulta comisión/origen/estado y distingue Ganada de pagada al empleado | [ ] | [ ] | [ ] | E4/E6 o ejemplo preparado |
| Lee conciliación, motivo, evidencia e historial sin reparación financiera | [ ] | [ ] | [ ] | Taller de control |
| Inicia revisión/decide sólo con permiso y soporte aplicable | [ ] | [ ] | [ ] | Caso ficticio autorizado; si no existe, No visto |
| Explica escalamiento/devolución requerida frente a resolución terminal | [ ] | [ ] | [ ] | A9 |
| Selecciona Ventas para actividad por sede/periodo | [ ] | [ ] | [ ] | Taller de control |
| Selecciona Productos para artículo/unidades/versión | [ ] | [ ] | [ ] | Taller de control |
| Selecciona Pagos y reconoce límites de resumen de completados | [ ] | [ ] | [ ] | Taller de control |
| Selecciona Cartera para saldo pendiente | [ ] | [ ] | [ ] | Taller de control |
| Selecciona Inventario para estado actual sin fechas | [ ] | [ ] | [ ] | Taller de control |
| Selecciona Movimientos para cambios y referencias | [ ] | [ ] | [ ] | Taller de control |
| Selecciona Cotizaciones para vigencia/conversión | [ ] | [ ] | [ ] | Taller de control |
| Selecciona Clientes para registro/actividad, sin inventar dueño por sede | [ ] | [ ] | [ ] | Taller de control |
| Aplica filtros/exporta Excel y revisa alcance al cambiar familia | [ ] | [ ] | [ ] | A9; sede persiste, otros filtros no |
| Localiza/edita configuración autorizada y comprende vigencia futura | [ ] | [ ] | [ ] | Taller de control |
| Crea/edita Usuario/rol/estado sin inventar editor de capacidades | [ ] | [ ] | [ ] | Refuerzo, cuenta ficticia |
| Actualiza perfil/cambia clave propia con seguridad | [ ] | [ ] | [ ] | Práctica privada autorizada |
| Cierra sesión con Salir | [ ] | [ ] | [ ] | Cierre del guion |

## Colaborador — diez pantallas y operación propia

| Competencia | Aprendido | Necesita refuerzo | No visto | Evidencia sugerida |
|---|---|---|---|---|
| Entra con cuenta individual e identifica empleado/sede | [ ] | [ ] | [ ] | E6 |
| Desde Inicio reconoce prioridad y abre trabajo propio | [ ] | [ ] | [ ] | C1 |
| Consulta Mi calendario, periodo/fuentes y eventos | [ ] | [ ] | [ ] | C1/E6 |
| Interpreta Resumen del negocio sin acceso financiero/detalle ajeno | [ ] | [ ] | [ ] | C1/E6 |
| Identifica límites y pide revisión de vínculo/sede/permisos | [ ] | [ ] | [ ] | E8; no Admin prestado |
| Selecciona cliente/vehículo comercial sin gestionar Clientes Admin | [ ] | [ ] | [ ] | E6 |
| Crea cotización propia con líneas/vigencia y sede derivada | [ ] | [ ] | [ ] | E6 |
| Edita Borrador y reconoce congelación al Enviar cotización | [ ] | [ ] | [ ] | E6 |
| Convierte una vez y encuentra la venta generada Confirmada | [ ] | [ ] | [ ] | E6 |
| Crea venta directa propia Pendiente, cuando autorizado | [ ] | [ ] | [ ] | E6 alternativa independiente |
| Confirma venta pendiente y verifica consumo de su sede | [ ] | [ ] | [ ] | E6 alternativa |
| Registra pago propio autorizado y revisa saldo antes de repetir | [ ] | [ ] | [ ] | E6; o límite explícito si no tiene permiso |
| Completa venta al terminar atención, separada de pago | [ ] | [ ] | [ ] | E6 |
| Ante stock insuficiente coordina, no elige otra sede por enlaces | [ ] | [ ] | [ ] | E8 |
| En Mis tareas lee detalle, inicia y completa lo asignado | [ ] | [ ] | [ ] | E6 |
| En Mis metas registra avance acumulado correcto | [ ] | [ ] | [ ] | E6: 2 → 4 escribiendo 4 |
| Distingue meta asignada, sin redefinir/cancelar como personal | [ ] | [ ] | [ ] | C3/E6 |
| Crea y cierra meta personal cuando se ofrece | [ ] | [ ] | [ ] | E6 |
| Consulta Mis comisiones, estados y ausencia legítima de comisión | [ ] | [ ] | [ ] | C3/E6 |
| Lee/marca Notificaciones sin afirmar trabajo resuelto | [ ] | [ ] | [ ] | C4 |
| Localiza/actualiza Mi perfil y clave propia sin cambiar permisos/sede | [ ] | [ ] | [ ] | C4; práctica privada si se califica ejecución |
| Cierra sesión con Salir | [ ] | [ ] | [ ] | Cierre del guion |

## Ecommerce / persona que demuestra la tienda

No se evalúa ni enseña login de comprador: la compra es como invitado. Se evalúa comprensión de estados aparte de ejecución de pago/reintento de pruebas.

| Competencia | Aprendido | Necesita refuerzo | No visto | Evidencia sugerida |
|---|---|---|---|---|
| Navega Inicio/Tienda/Carrito sin cuenta CRM | [ ] | [ ] | [ ] | P1/E7 |
| Explica Contacto/WhatsApp como solicitud, no cita confirmada | [ ] | [ ] | [ ] | P1; sin enviar mensajes reales |
| Busca/filtra/ordena y limpia restricciones | [ ] | [ ] | [ ] | E7 |
| Revisa ficha/compatibilidad/especificaciones sin promesas inventadas | [ ] | [ ] | [ ] | E7 |
| Utiliza galería y distingue foto de versión | [ ] | [ ] | [ ] | E7 |
| Selecciona versión/cantidad y comprueba precio/stock | [ ] | [ ] | [ ] | E7 |
| Explica precio Desde y disponibilidad de red | [ ] | [ ] | [ ] | P1 |
| Revisa carrito, modifica unidades/quita y entiende subtotal | [ ] | [ ] | [ ] | E7, sin duplicar pedido |
| Elige entrega/contacto y prepara orden una vez | [ ] | [ ] | [ ] | E7 |
| Explica recogida frente a envío | [ ] | [ ] | [ ] | P2 |
| Aplica sede elegible con todo el pedido para recogida | [ ] | [ ] | [ ] | E7 rama R |
| Guarda dirección y receptor correctos para envío | [ ] | [ ] | [ ] | E7 rama E |
| Calcula/selecciona/aplica tarifa y comprueba cargos/total final | [ ] | [ ] | [ ] | E7 rama E |
| Repite guardar/calcular/aplicar si cambia dirección | [ ] | [ ] | [ ] | E7/E8 |
| Reconoce por qué aún no puede pagar y corrige paso pendiente | [ ] | [ ] | [ ] | P2/E8 |
| Explica pago pendiente/incierto y consulta antes de otro cobro | [ ] | [ ] | [ ] | P3/E8 |
| Explica rechazo explícito y reintento habilitado en misma orden | [ ] | [ ] | [ ] | P3/E8 |
| Ejecuta pago sólo en pruebas seguras aprobadas | [ ] | [ ] | [ ] | E7; sin pruebas, No visto |
| Ejecuta reintento autorizado sin cambiar número de orden | [ ] | [ ] | [ ] | E7 caso preparado; lectura no basta |
| Interpreta confirmación, número/líneas/total/entrega/estado | [ ] | [ ] | [ ] | P3 |
| Distingue pago confirmado de entrega completada | [ ] | [ ] | [ ] | P3 |
| Pide ayuda con número/soporte privado, sin compartir secretos/enlace | [ ] | [ ] | [ ] | Cierre/E8 |

## Registro de observaciones y evidencia

| Competencia / escenario | Qué hizo sin ayuda | Ayuda o error observado | Resultado comprobado | Próxima práctica / responsable / fecha |
|---|---|---|---|---|
| ____________________ | ____________________ | ____________________ | ____________________ | ____________________ |
| ____________________ | ____________________ | ____________________ | ____________________ | ____________________ |
| ____________________ | ____________________ | ____________________ | ____________________ | ____________________ |

Anota qué se observó realmente. Por ejemplo: “E2, predijo 4/1 En tránsito y verificó 4/3 Recibida; sin ajustes manuales”. No escribe “transferencia aprendida” si sólo vio la demo. Si falta permiso, indica alcance autorizado y a quién deriva; si falta proveedor de pruebas, separa comprensión del pago de ejecución no realizada.

## Criterios de cierre

| Perfil | Evidencia mínima para autonomía básica |
|---|---|
| Admin | Conceptos críticos; producto/fotos/stock, cliente/vehículo, cotización → venta, abono/saldo, transferencia y cita ejecutados sin guía y con resultados comprobados. Otras competencias del puesto requieren su práctica específica |
| Colaborador | Acceso/prioridades propios, operación comercial concedida, tarea/meta, lectura de comisión si aplica y límites de acceso; nunca exigir permisos ausentes |
| Ecommerce/Demo | Navegación hasta checkout, modalidad practicada y explicación de ambas, total final, comprensión de pendiente/rechazo/reintento. Ejecución de pago/reintento y otra rama se certifican sólo si se practicaron de forma segura |

- [ ] Competencias críticas del alcance previsto demostradas sin guía.
- [ ] Refuerzo/No visto documentados sin ocultarlos como aprobados.
- [ ] Aprendiz sabe dónde consultar manual/guía rápida y a quién pedir ayuda.
- [ ] Sesión CRM cerrada cuando corresponde; sin datos privados expuestos.
- [ ] Uso real posterior requiere autorización del negocio; no es ejercicio final en producción.

**Conclusión de esta sesión:** ____________________ (autonomía básica demostrada / necesita refuerzo / evaluación pendiente). **Alcance exacto:** ____________________.

Esta hoja registra aprendizaje, no disponibilidad técnica de proveedores ni una auditoría funcional nueva. No impone política laboral o comercial ni habilita accesos automáticamente.
