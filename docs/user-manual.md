# Manual de usuario — Upgrade La 79

Versión: FINAL-PRODUCT-01C · 1 de octubre de 2026 · Idioma: español.

Este manual describe la aplicación actual. El dominio previsto es upgradecolombia.com; todavía no está desplegado. Utiliza la dirección de acceso que te entregue el administrador. Los importes y nombres de ejemplo no establecen precios, comisiones, plazos ni políticas del negocio.

## Índice

1. [Introducción](#introduccion)
2. [Roles y permisos](#roles)
3. [Conceptos esenciales](#conceptos)
4. [Entrar y salir](#acceso)
5. [Dashboard](#dashboard)
6. [Sedes](#sedes)
7. [Productos, imágenes y variantes](#productos)
8. [Marcas y vehículos](#marcas)
9. [Categorías de productos](#categorias)
10. [Inventario](#inventario)
11. [Movimientos](#movimientos)
12. [Transferencias](#transferencias)
13. [Clientes](#clientes)
14. [Vehículos de clientes](#vehiculos)
15. [Cotizaciones](#cotizaciones)
16. [Ventas y órdenes](#ventas)
17. [Pagos](#pagos)
18. [Conciliaciones de pagos](#conciliaciones)
19. [Servicios y sus categorías](#servicios)
20. [Citas](#citas)
21. [Calendario](#calendario)
22. [Empleados y acceso CRM](#empleados)
23. [Horarios y excepciones](#horarios)
24. [Ausencias](#ausencias)
25. [Tareas](#tareas)
26. [Metas](#metas)
27. [Comisiones](#comisiones)
28. [Ocho reportes](#reportes)
29. [Notificaciones](#notificaciones)
30. [Configuración y usuarios](#configuracion)
31. [Mi perfil y contraseña](#perfil)
32. [Jornada del colaborador](#colaborador)
33. [Jornada del administrador](#administrador)
34. [Cliente → vehículo → cotización → venta → pago](#flujo-comercial)
35. [Producto → publicación → stock → traslado](#flujo-producto)
36. [Compra pública, entrega, pago y confirmación](#compra)
37. [Estados](#estados)
38. [Problemas frecuentes y recuperación](#problemas)
39. [Buenas prácticas](#practicas)
40. [Qué no hacer](#no-hacer)
41. [Glosario](#glosario)
42. [Cómo usar este manual y cobertura](#navegacion-manual)

<a id="introduccion"></a>

## 1. Introducción

Upgrade La 79 tiene dos espacios:

- **Tienda pública:** conocer el negocio, explorar artículos, comprobar compatibilidad, preparar un pedido y pagar como invitado.
- **CRM interno:** gestionar clientes, catálogo, inventario, ventas, pagos y trabajo del equipo. Requiere una cuenta interna.

Un comprador no necesita entrar al CRM. Una cuenta interna no sustituye el proceso público de pago. El menú muestra únicamente las funciones permitidas para tu cuenta. En móvil, abre **Menú** para encontrar la navegación; si una tabla tiene muchas columnas, consulta sus datos antes de actuar y desplázate dentro de ella cuando sea necesario.

Un formulario abierto no está guardado. Espera el mensaje de éxito y verifica el registro resultante. Mientras veas **Guardando...**, **Procesando...** o un botón bloqueado, no repitas la acción ni cambies de pantalla. **Cancelar** o **Cerrar** abandona cambios todavía no guardados; no deshace operaciones ya confirmadas.

<a id="roles"></a>

## 2. Roles y permisos

**Administrador:** administra los módulos del negocio con los permisos correspondientes. Consulta varias sedes y asigna sede y vendedor cuando el formulario lo permite.

**Colaborador:** es una cuenta de **Usuario** vinculada a un empleado. Sus funciones comerciales dependen de los permisos concedidos. Opera sobre sus propios registros y su sede; no equivale a administrador.

**Usuario limitado:** sigue siendo Usuario; puede carecer de ventas o cotizaciones aunque tenga Inicio, calendario, tareas o perfil. No es un tercer rol administrativo.

**Cliente público:** invitado en la tienda. No hay un portal autenticado de cliente ni un recorrido separado de Super Admin en la interfaz actual.

| Función | Admin | Colaborador | Público |
|---|---|---|---|
| Catálogo, referencias e inventario | Sí, con permisos | No en su espacio propio | Sólo catálogo publicado |
| Clientes y vehículos | Sí | Sólo selección comercial autorizada, no gestión del módulo | Datos de su pedido |
| Cotizaciones y ventas | Gestión administrativa | Propias, si está autorizado | Compra pública, no ventas CRM |
| Registrar pago interno | Sí, con permiso | En ventas propias, con permiso | Pagar su pedido por la pasarela |
| Conciliaciones y reportes globales | Sí, con permisos | No | No |
| Calendario, tareas y metas | Equipo | Propios | No |
| Perfil y notificaciones | Propios | Propios | No perfil CRM |

Consulta la [matriz completa](roles-permissions.md). Si no aparece una acción, no intentes acceder a registros ajenos cambiando enlaces: solicita al administrador que revise tu acceso.

<a id="conceptos"></a>

## 3. Conceptos esenciales

| Concepto | Qué significa en el trabajo diario |
|---|---|
| Producto | La ficha del artículo: nombre, precio, fotos, categoría y compatibilidad. Crearla no agrega unidades. |
| Variante | Una versión específica del producto, con su propio SKU, precio y stock. Seleccionar el producto padre no sustituye elegir versión. |
| Inventario | Unidades de un artículo o variante en una sede concreta. |
| BAQ / BOG | Barranquilla / Bogotá. Revisa el nombre y código, no sólo la posición del selector. |
| Disponibilidad pública | Disponibilidad de la red de sedes elegibles. No garantiza que una sola sede pueda entregar todo el carrito. |
| Stock de venta CRM | Existencias exactas de la sede seleccionada o asignada al colaborador. |
| Cotización | Propuesta comercial con vigencia. No reserva ni descuenta stock. |
| Venta / orden | Documento comercial con productos, servicios, total y estado operativo. Órdenes reúne ventas CRM y pedidos ecommerce. |
| Pago | Registro del dinero recibido o del intento de cobro. No es la orden. |
| Estado operativo | Pendiente, Confirmada, Completada o Cancelada: qué pasó con la atención o entrega. |
| Estado de pago | Sin pagar, Pago parcial, Pagada o Reembolsada: qué pasó con el dinero. |
| Transferencia | Solicitud entre sedes. Despachar descuenta origen; recibir agrega destino. En tránsito no está disponible en destino. |

Una venta **Pagada + Confirmada** puede ser correcta: falta completar la atención. Una venta **Completada + Pago parcial** conserva saldo por cobrar. No conviertas un estado en el otro para que “se vea terminado”.

<a id="acceso"></a>

## 4. Entrar y salir

### Entrar al CRM

**Para qué sirve:** acceder al espacio interno personal o administrativo.

**Quién puede hacerlo:** cuentas internas activas.

**Dónde está:** pantalla de acceso interno facilitada por el administrador → **Entrar al CRM**.

**Antes de empezar:** ten tu correo y contraseña; no utilices la cuenta de otra persona.

**Paso a paso:**

1. Abre el acceso interno.
2. Escribe **Email** y **Contraseña**.
3. Pulsa **Entrar al CRM** una vez y espera.
4. Comprueba tu nombre y el menú. Admin entra al espacio administrativo; Usuario al espacio personal.
5. Al terminar, pulsa **Salir** en el menú. Cerrar la pestaña no sustituye salir en un equipo compartido.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Email | Correo de tu cuenta interna, no el correo de un cliente | Tu correo asignado |
| Contraseña | Clave privada de acceso | No se incluye una clave de ejemplo |

**Resultado esperado:** aparece el CRM con las funciones autorizadas.

**Qué hacer después:** Admin: [Dashboard](#dashboard). Colaborador: [Inicio](#colaborador). Cambiar clave: [Mi perfil](#perfil).

**Problemas frecuentes:** revisa espacios y mayúsculas de la contraseña si el acceso falla. Si la cuenta está inactiva o no recuerdas la clave, contacta al administrador; no se documenta un botón de recuperación que no existe. Si aparece **Acceso denegado**, no repitas el intento con otra dirección: verifica permisos.

<a id="dashboard"></a>

## 5. Dashboard

### Consultar el estado del negocio

**Para qué sirve:** reconocer ventas, cobros y alertas antes de entrar a cada módulo.

**Quién puede hacerlo:** Admin con acceso al Dashboard.

**Dónde está:** **Operación → Dashboard**.

**Antes de empezar:** decide si necesitas el panorama general o una sede.

**Paso a paso:**

1. Abre **Dashboard**.
2. Selecciona **General** o la sede que deseas analizar.
3. Revisa ventas de hoy/mes, por cobrar y stock crítico.
4. Revisa el gráfico de los últimos 30 días, cotizaciones, pagos/cartera, ventas recientes y productos más vendidos.
5. Pulsa **Comparar** para contrastar sedes y **Actualizar** para volver a consultar.
6. Usa **Ver órdenes**, **Ver inventario** o **Ver clientes** para investigar un dato; no ajustes dinero desde una tarjeta.

**Qué significa cada control:**

| Control o dato | Qué significa | Ejemplo |
|---|---|---|
| General / sede | Alcance de las métricas, no traslado de registros | Consultar Bogotá |
| Comparar | Lectura conjunta de sedes | Contrastar BAQ y BOG |
| Por cobrar | Saldo pendiente, no número de pagos rechazados | Investigar una venta con abono |
| Conversión | Cotizaciones convertidas sobre resueltas | No comparar con todas las creadas como si fuese la misma métrica |
| Costos y utilidad | Información basada en costos históricos conocidos | Revisar la cobertura de costos antes de interpretar utilidad |

**Resultado esperado:** indicadores del alcance elegido; una sede sin actividad puede mostrar ceros.

**Qué hacer después:** atender primero alertas verificadas en sus módulos. Los indicadores no sustituyen el detalle ni una conciliación contable completa.

**Problemas frecuentes:** comprueba sede y periodo antes de concluir que faltan ventas. Espera a que termine la actualización; ante error, reintenta la consulta, no recrees registros.

<a id="sedes"></a>

## 6. Sedes

### Crear, editar o cambiar el estado de una sede

**Para qué sirve:** identificar dónde trabajan empleados, existen unidades y se gestionan operaciones.

**Quién puede hacerlo:** Admin con permisos de sedes; consultar y modificar son permisos distintos.

**Dónde está:** **Administración → Sedes**.

**Antes de empezar:** busca la sede existente. No dupliques BAQ/BOG ni cambies su identidad para representar otra ciudad.

**Paso a paso:**

1. Abre **Sedes** y revisa sus tarjetas y estados.
2. Pulsa **Nueva sede**.
3. Completa código, nombre, ciudad e identificador público.
4. Pulsa **Crear sede**; comprueba la tarjeta resultante.
5. Para corregir nombre o ciudad, pulsa **Editar → Guardar cambios**.
6. Para retirarla de nuevas operaciones, pulsa **Desactivar**, lee la confirmación y pulsa **Desactivar sede** sólo si corresponde. Para habilitar una inactiva, pulsa **Activar**.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Código * | Identificador interno único; no se modifica al editar | NOR |
| Nombre * | Nombre reconocible de la sede | Sede Norte |
| Ciudad * | Ubicación de la sede | Barranquilla |
| Identificador público * | Nombre corto para recogida; minúsculas, números y guiones | sede-norte |

**Resultado esperado:** sede creada o actualizada; desactivarla conserva información histórica. El código y el identificador público no son campos editables posteriores en este formulario.

**Qué hacer después:** vincula empleados y registra stock real de la sede; crearla no la abastece.

**Problemas frecuentes:** un código/identificador duplicado exige corregir la identidad, no repetir el alta. No se permite desactivar una sede que conserva empleados activos asignados; revisa esas asignaciones primero.

<a id="productos"></a>

## 7. Productos, imágenes y variantes

### 7.1 Crear un producto

**Para qué sirve:** registrar un artículo comercial con datos coherentes para ventas y tienda.

**Quién puede hacerlo:** Admin autorizado para crear productos.

**Dónde está:** **Operación → Inventario → Crear producto**.

**Antes de empezar:** busca nombre/SKU para evitar duplicados. Ten categoría activa, marca, precio, fotografías y compatibilidad verificable. Si necesitas listas nuevas, consulta [Marcas y vehículos](#marcas) y [Categorías](#categorias).

**Paso a paso:**

1. Pulsa **Crear producto**. El formulario puede mostrar **Crear artículo** como encabezado.
2. En **Información**, completa nombre y categoría. Selecciona marca del producto y SKU cuando correspondan. Pulsa **Agregar descripción** para añadirla.
3. Completa **Detalles de [categoría]**. Los campos dependen de la categoría; los obligatorios deben completarse. Usa **Completar detalles** para los opcionales.
4. En **Imágenes del producto**, agrega las fotos y verifica una principal; sigue el procedimiento 7.2.
5. En **Compatibilidad**, elige **Universal** sólo si está comprobado. Para **Vehículos específicos**, selecciona **Marca**, **Modelo** y **Versión / generación** y completa **Nota técnica**. Usa **+ Agregar vehículo** para otra compatibilidad. El rango natural se muestra al seleccionar generación; la compatibilidad general no ofrece campos de años ni OEM editables. Las variantes con compatibilidad propia sí ofrecen esas **Opciones avanzadas**.
6. Introduce **Precio de venta**.
7. Si existen versiones comercialmente distintas, utiliza **+ Agregar variante** y completa cada una; no crees variantes para representar sedes.
8. Abre **Opciones comerciales avanzadas → Configurar** sólo si necesitas costos, cálculo de precio o comisión.
9. Revisa **Producto activo**, **Visible en ecommerce** y **Producto destacado**.
10. Pulsa **Guardar producto** para terminar la ficha, o **Guardar y asignar inventario** para guardarla y abrir una entrada de stock independiente.
11. Espera el resultado. Si aparecen errores, corrige el bloque indicado y vuelve a guardar; no crees otra ficha para eludirlos.

**Qué significa cada campo:**

| Campo / bloque | Qué significa | Ejemplo |
|---|---|---|
| Nombre * | Denominación comercial del artículo | Radio multimedia |
| Categoría * | Familia que determina detalles técnicos | Radios |
| Marca del producto | Fabricante del artículo, no marca del vehículo | Pioneer |
| SKU / referencia | Código comercial para identificarlo | RAD-001 |
| Descripción | Información de compra útil y comprobable | Conectividad y contenido del paquete |
| Detalles de categoría | Especificaciones definidas por esa categoría | Material o tamaño, si el campo existe |
| Universal / Vehículos específicos | Alcance de compatibilidad declarado | Compatibilidad para un modelo confirmado |
| Marca / Modelo / Versión / generación | Vehículos compatibles, en selección dependiente | Marca → modelo → generación |
| Desde / Hasta (compatibilidad propia de variante) | Años aplicables a esa compatibilidad avanzada | Rango comprobado del vehículo |
| Sistema multimedia OEM (compatibilidad propia de variante) | Equipo original que condiciona instalación | Sistema original identificado |
| Nota técnica | Condiciones o limitaciones de montaje | Adaptador requerido, si está comprobado |
| Precio de venta | Valor comercial en pesos | 950000, sólo ejemplo |
| Costo / Impuestos / Cargos extra | Valores del cálculo comercial del artículo; no la cotización de envío | Costo conocido del artículo |
| Modo de precio | Manual, Ganancia sobre costo o Margen real | Manual si ya tienes el precio |
| Ganancia sobre costo % / Margen deseado % | Porcentaje del modo elegido; no son fórmulas equivalentes | Un porcentaje aprobado por el negocio |
| Genera comisión | Habilita tarifa fija del producto | Activar sólo si corresponde |
| Comisión por unidad (COP) | Monto fijo por unidad; obligatorio y positivo al habilitar comisión | 35000, ejemplo, no política general |
| Producto activo | Habilitación operativa del artículo | Activo para utilizarlo |
| Visible en ecommerce | Publicación en tienda; requiere imagen | Desmarcado mientras preparas una ficha |
| Producto destacado | Promoción en vitrinas; no agrega stock | Artículo que quieres destacar |

**Resultado esperado:** ficha guardada. **Guardar y asignar inventario** no realiza la entrada automáticamente ni mezcla ambos guardados.

**Qué hacer después:** registra stock por sede/variante y verifica publicación. Un artículo publicado pero agotado no está disponible para agregar a compra.

**Problemas frecuentes:** categoría inexistente/inactiva, SKU repetido, detalles obligatorios o compatibilidad incompleta: corrige el campo. Para publicar sin foto, agrega una imagen válida o desmarca **Visible en ecommerce** para conservarlo oculto. Un margen inválido debe corregirse, no confundirse con ganancia sobre costo.

### 7.2 Agregar, ordenar y conservar fotografías

**Para qué sirve:** mostrar el artículo correcto y ayudar al comprador a reconocerlo.

**Quién puede hacerlo:** Admin con creación/edición de productos.

**Dónde está:** formulario del producto → **Imágenes del producto**.

**Antes de empezar:** usa fotografías pertinentes en JPEG, PNG o WebP, de máximo 5 MB cada una. Un producto publicado necesita al menos una imagen y exactamente una principal; un producto oculto puede tener cero.

**Paso a paso:**

1. En **Agregar imágenes**, selecciona una o varias fotos.
2. Revisa las miniaturas y la marca **Principal**.
3. En la foto que debe representar el artículo, pulsa **Hacer principal**. El botón ya está bloqueado en la principal actual.
4. Usa **←** o **→** para mover una foto antes/después. El orden de galería y la principal son decisiones distintas.
5. Usa **Quitar** para retirar una imagen equivocada. Si retiras la principal, verifica cuál queda como principal; no dejes un publicado sin imagen.
6. Pulsa **Guardar producto**. Los cambios del editor todavía no son definitivos antes de guardar.
7. Reabre **Editar producto e imágenes** desde **Catálogo publicado** y verifica fotos/principal/orden. Consulta el detalle público si está publicado.

**Qué significa cada control:**

| Control | Qué significa | Ejemplo |
|---|---|---|
| Agregar imágenes | Añade archivos; no reemplaza por sí solo toda la galería | Añadir vista frontal y lateral |
| Principal / Hacer principal | Foto usada en tarjeta y vista previa | La foto más clara del artículo |
| ← / → | Orden de las fotos adicionales | Dejar primero una vista útil |
| Quitar | Retirar esa foto al guardar | Quitar una foto de otro modelo |

**Resultado esperado:** galería persistida con una principal. La principal puede no ocupar la primera posición de la lista. En el detalle público, las miniaturas cambian la foto mostrada sin cambiar la principal comercial.

**Qué hacer después:** comprueba tarjeta, detalle y claridad de las imágenes. No publiques fotos con información privada.

**Problemas frecuentes:** archivo demasiado pesado o formato inválido: convierte/exporta la imagen apropiadamente; renombrar su extensión no convierte el archivo. Si falla una carga, verifica el mensaje y las fotos guardadas antes de volver a añadirlas. No uses una foto ficticia para pasar la validación.

### 7.3 Editar una ficha sin volver a cargar imágenes

**Para qué sirve:** actualizar información manteniendo las fotografías existentes.

**Quién puede hacerlo:** Admin con edición de productos.

**Dónde está:** **Catálogo → Catálogo publicado → buscar artículo → Editar producto e imágenes**.

**Antes de empezar:** confirma nombre y SKU del artículo. Las ventas anteriores conservan sus datos comerciales históricos.

**Paso a paso:**

1. Busca el artículo y abre **Editar producto e imágenes**.
2. Cambia nombre, precio, descripción, compatibilidad o el bloque que necesites.
3. Revisa las fotos existentes. No uses **Agregar imágenes** si no deseas añadir nuevas.
4. Pulsa **Guardar producto** y reabre para comprobar el cambio.

**Qué significa cada campo:** son los mismos de 7.1; las imágenes existentes ya están cargadas en el editor.

**Resultado esperado:** datos actualizados e imágenes conservadas. El nuevo precio no reescribe los precios de ventas anteriores.

**Qué hacer después:** comprueba el resultado publicado y, por separado, las existencias.

**Problemas frecuentes:** si una foto no carga, comprueba la ficha antes de quitarla; no borres todas para corregir únicamente un nombre.

### 7.4 Publicar, ocultar o destacar

**Para qué sirve:** decidir qué artículos puede ver el comprador.

**Quién puede hacerlo:** Admin con edición del catálogo.

**Dónde está:** **Catálogo → Catálogo publicado → Configurar publicación**.

**Antes de empezar:** revisa la imagen principal y los avisos de **Validación para publicar**.

**Paso a paso:**

1. Busca el artículo.
2. Abre **Configurar publicación**.
3. Marca o desmarca **Publicado en la tienda**.
4. Activa **Artículo destacado** si corresponde.
5. Pulsa **Guardar publicación** y comprueba su estado en la lista.
6. Para modificar fotos u otros datos, usa **Editar producto e imágenes**, no el cuadro de publicación.

En la lista, los botones **Publicado / Oculto** y **Destacado / Normal** cambian directamente esa condición al pulsarlos; no son sólo etiquetas decorativas. Espera el guardado y revisa el estado resultante. Para revisar las condiciones antes de cambiar, utiliza **Configurar publicación**. **Configurar comisión** (o el botón que muestra la comisión actual) abre **Genera comisión / Comisión por unidad (COP) → Guardar comisión**; las variantes heredan la tarifa del producto.

**Qué significa cada campo:** publicado = visible al público; destacado = promocionado; ninguno crea unidades ni activa una variante inactiva.

**Resultado esperado:** el artículo aparece o deja de aparecer en la tienda según su estado y elegibilidad.

**Qué hacer después:** verifica en tienda; si sólo buscas agotados, desmarca su filtro de stock.

**Problemas frecuentes:** si la validación pide imagen principal, edita las imágenes. Si no aparece, revisa activo, visible, variantes y filtros. No ingreses stock falso para hacerlo visible.

### 7.5 Variantes

**Para qué sirve:** distinguir versiones realmente diferentes sin duplicar la ficha principal.

**Quién puede hacerlo:** Admin con edición de producto.

**Dónde está:** formulario del producto → **Variantes → + Agregar variante**.

**Antes de empezar:** determina qué especificaciones cambian por versión y configura esos campos de categoría para **Variante**.

**Paso a paso:**

1. Agrega una variante y abre su bloque.
2. Completa **Nombre**, **SKU**, detalles y **Precio**.
3. Conserva **Usar la compatibilidad general del producto** si es correcta; desmárcala para definir compatibilidad específica de esa versión. En una fila específica, **Opciones avanzadas** muestra **Desde**, **Hasta**, **Sistema multimedia OEM** y **Nota técnica**. Usa **+ Agregar vehículo** si hay otro caso compatible.
4. Revisa **Activa** y **Visible**. Pulsa **Principal** en la variante que será la predeterminada; esto es distinto de elegir la imagen principal.
5. **Duplicar** permite partir de una configuración: cambia nombre, SKU y datos antes de guardar. **Eliminar** retira una variante del formulario; no lo uses para limpiar registros históricos sin revisar las consecuencias que informe el sistema.
6. Guarda el producto y asigna stock a cada variante en cada sede.

**Qué significa cada campo:** nombre = versión reconocible; SKU = código propio; precio = valor de esa versión; activa/visible = habilitación y exposición de esa versión; compatibilidad general = herencia del padre, no copia de stock.

**Resultado esperado:** el comprador debe elegir **Versión** para agregar un artículo con variantes; precio y disponibilidad corresponden a esa elección.

**Qué hacer después:** comprueba cada versión y sus existencias. La variante puede tener una imagen propia ya registrada y, si falta, utilizar la del producto. No existe aquí un editor de galería independiente ni un campo nuevo de carga de fotos por variante.

**Problemas frecuentes:** elegir una versión sin stock bloquea la compra. No sumes el stock del padre como si fueran unidades adicionales de las variantes. Una variante duplicada con el mismo SKU debe corregirse.

<a id="marcas"></a>

## 8. Marcas y vehículos

### 8.1 Mantener marcas, modelos, generaciones y sistemas originales

**Para qué sirve:** mantener listas reutilizables para productos y vehículos; no es un inventario de artículos.

**Quién puede hacerlo:** Admin con permisos de catálogo. El nombre anterior “Referencias” corresponde a este mismo módulo.

**Dónde está:** **Catálogo → Marcas y vehículos**.

**Antes de empezar:** busca el nombre antes de crearlo y distingue fabricante del artículo de fabricante del automóvil.

**Paso a paso:**

1. Para fabricantes de artículos, abre **Marcas de artículos → Nueva marca de artículo**.
2. Para vehículos, abre **Compatibilidad vehicular → Marcas de vehículos → Nueva marca de vehículo**.
3. Completa nombre, descripción y estado; pulsa **Crear**.
4. En **Modelos → Nuevo modelo**, selecciona la marca, completa el nombre y pulsa **Crear**.
5. En **Generaciones y años → Nueva generación**, selecciona modelo, código de generación y años. Una generación no es un vehículo particular de un cliente.
6. Si corresponde, crea el equipo original en **Sistemas multimedia → Nuevo sistema multimedia**, indicando marca, nombre y código interno.
7. Edita la generación y selecciona sus **Sistemas multimedia OEM**. Ajusta **Desde / Hasta** sólo para el rango específico de la asociación cuando corresponda; guarda con **Actualizar**.
8. Busca y abre **Editar** para corregir un registro existente; pulsa **Actualizar**.
9. Para retirar marcas, modelos o generaciones, pulsa **Desactivar** y lee la confirmación. Para un sistema multimedia, **Eliminar** advierte eliminación definitiva y retirada de sus asociaciones: no equivale a desactivar.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Nombre * | Nombre de una marca o sistema compartido | Pioneer / BMW, según pestaña |
| Descripción | Contexto interno útil | Familia de equipos |
| Activo | Disponible para nuevas selecciones | Desactivar una referencia retirada |
| Marca del vehículo * | Fabricante al que pertenece modelo o sistema | BMW |
| Nombre del modelo * | Modelo bajo esa marca | X5 |
| Modelo del vehículo * | Modelo de la generación | El modelo correcto de la lista |
| Código de generación | Identificación de la generación | Código comprobado del fabricante |
| Año desde * / Año hasta | Rango de fabricación; hasta vacío = continúa vigente | Rango confirmado |
| Nombre del sistema * / Código interno | Equipo multimedia original y su identificación | NBT / código interno del negocio |
| Sistemas multimedia OEM / Desde / Hasta | Asociación de generación con equipo original y rango aplicable | Equipo usado sólo en parte de los años |

**Resultado esperado:** listas coherentes. Desactivar marcas/modelos/generaciones conserva relaciones históricas; eliminar un sistema multimedia quita definitivamente sus asociaciones con generaciones. No se promete papelera ni recuperación automática.

**Qué hacer después:** utiliza esas listas en productos, compatibilidad y vehículos de clientes. Revisa asociaciones antes de una eliminación.

**Problemas frecuentes:** un modelo no aparece si no has elegido su marca; una generación depende del modelo. Si el rango OEM no corresponde a la generación, corrígelo. Para reactivar un registro desactivado, edita **Activo** y pulsa **Actualizar**; no crees otro con el mismo nombre.

### 8.2 Dónde se reutiliza esta información

La **Marca del producto** identifica el artículo. Marca/modelo/generación/años/OEM describen compatibilidad. **Clientes → Vehículos** identifica el automóvil atendido. Ventas y cotizaciones utilizan esas selecciones y conservan los datos de su momento comercial. No cambies una generación compartida para corregir sólo la placa o el año de un cliente.

<a id="categorias"></a>

## 9. Categorías de productos

### Crear y mantener una categoría

**Para qué sirve:** agrupar artículos y definir qué detalles se piden a productos/variantes.

**Quién puede hacerlo:** Admin con permisos de catálogo.

**Dónde está:** **Operación → Categorías**.

**Antes de empezar:** busca la categoría; considera los artículos que ya la utilizan antes de modificar sus campos.

**Paso a paso:**

1. Busca por categoría o campo técnico y revisa el filtro de estado.
2. Pulsa **Crear categoría**; completa nombre y descripción y revisa su estado activo.
3. Pulsa **Agregar campo** para cada especificación necesaria.
4. Define nombre, tipo y **Aplica a**; completa opciones si es **Selector**.
5. Marca **Obligatorio**, **Activo** y **Usar como filtro** únicamente cuando correspondan. Si es filtro, define etiqueta y unidad.
6. Pulsa **Crear categoría**. Para modificarla, **Editar → Actualizar categoría**.
7. **Eliminar** pide confirmación: sin artículos elimina definitivamente; con artículos asociados sólo desactiva para protegerlos. Lee el resultado, no asumas que ambas situaciones son iguales.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Nombre / Descripción | Familia comercial y contexto interno | Radios |
| Nombre del campo | Especificación que el equipo registrará | Material |
| Tipo | Texto, Número, Selector o Sí / No | Selector para una lista cerrada |
| Aplica a * | Producto = común; Variante = puede cambiar por versión | Memoria por variante |
| Opciones | Alternativas de un selector | Valores reales aceptados |
| Obligatorio / Activo | Exigir el dato / utilizar el campo | Obligatorio si es indispensable |
| Usar como filtro | Ofrecer esa característica para explorar | Sólo una característica útil al comprador |
| Etiqueta del filtro / Unidad | Nombre legible y unidad de medida | Tamaño / pulgadas |

**Resultado esperado:** los campos aparecen en el bloque correspondiente del formulario de producto. Cambiar **Aplica a** modifica dónde se utiliza un campo; revisa las advertencias y datos existentes.

**Qué hacer después:** crea/edita un producto de esa categoría y comprueba las especificaciones.

**Problemas frecuentes:** un campo obligatorio vacío impedirá guardar productos. **Quitar** retira un campo del formulario de categoría; no lo uses sin revisar artículos existentes. No crees categorías de producto para organizar servicios: son listas distintas.

<a id="inventario"></a>

## 10. Inventario

### 10.1 Consultar existencias exactas

**Para qué sirve:** saber qué unidades puedes vender o trasladar desde una sede.

**Quién puede hacerlo:** Admin con consulta de inventario.

**Dónde está:** **Operación → Inventario → Existencias**.

**Antes de empezar:** identifica producto o variante y sede.

**Paso a paso:**

1. Selecciona **Sede**, escribe en **Producto o SKU** y pulsa el botón **Buscar** del campo.
2. Activa **Solo stock bajo** si buscas reposición.
3. Lee artículo, variante, existencia y mínimo de la fila.
4. Confirma la sede antes de usar **Movimiento** o **Mínimo**.

**Qué significa cada dato:** Existencia = unidades de esa posición; Mínimo = umbral de alerta local; Disponible/Stock bajo/Agotado = situación de esa fila, no publicación.

**Resultado esperado:** stock por sede y artículo, no una única bolsa de stock para toda la empresa.

**Qué hacer después:** registra entradas/salidas justificadas o solicita un traslado real.

**Problemas frecuentes:** si un producto recién creado no tiene posición, usa **Ajustar existencias** para su primer ingreso. No confíes en la disponibilidad de red para vender desde BAQ si las unidades están en BOG.

### 10.2 Asignar stock después de crear un producto

**Para qué sirve:** registrar unidades físicas en una sede, incluso el primer ingreso.

**Quién puede hacerlo:** Admin con creación de productos y movimiento de inventario.

**Dónde está:** **Inventario → Crear producto → Guardar y asignar inventario**; para una ficha existente: **Inventario → Ajustar existencias**.

**Antes de empezar:** el producto debe estar guardado. Cuenta las unidades recibidas y determina la variante.

**Paso a paso:**

1. Guarda el producto con **Guardar y asignar inventario**. La pantalla aclara que ya fue creado.
2. Selecciona **Sede**: por ejemplo Barranquilla.
3. Selecciona **Producto / Variante**; si hay variantes, elige la unidad inventariable concreta.
4. Revisa **Stock actual en sede**.
5. Escribe la **Cantidad** que ingresa, el **Motivo** y, si aporta contexto, **Notas**.
6. Pulsa **Ajustar existencias** y espera el resultado.
7. Para abastecer Bogotá, vuelve a **Ajustar existencias**, busca la misma ficha/variante, selecciona Bogotá y registra su entrada independiente. No supongas que el primer guardado abasteció ambas sedes.
8. Comprueba cada posición y su movimiento.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Sede * | Lugar que recibe las unidades | Barranquilla |
| Buscar producto o SKU | Encontrar una ficha existente; no aparece si acabas de continuar desde el producto | RAD-001 |
| Producto / Variante * | Unidad concreta | Versión seleccionada del radio |
| Cantidad * | Unidades que se suman; no el saldo final | 4 unidades recibidas |
| Stock actual en sede | Saldo anterior de esa posición | 2 antes del ingreso |
| Motivo * | Razón trazable del ingreso | Recepción de mercancía |
| Notas | Contexto adicional | Referencia del soporte interno |

**Resultado esperado:** saldo anterior + ingreso en esa sede, con historial. Aunque el botón diga **Ajustar existencias**, este formulario registra una **Entrada**, no reemplaza el saldo por la cantidad escrita.

**Qué hacer después:** verifica [Movimientos](#movimientos), mínimos y disponibilidad pública si está publicado.

**Problemas frecuentes:** si cancelas el formulario de inventario, la ficha ya guardada permanece. No vuelvas a crearla: búscala y registra su entrada. No registres la misma recepción dos veces.

### 10.3 Registrar entrada, salida o ajuste a saldo final

**Para qué sirve:** reflejar un hecho físico con motivo, sin perder trazabilidad.

**Quién puede hacerlo:** Admin con permiso de movimientos.

**Dónde está:** **Inventario → Existencias → fila de sede/artículo → Movimiento**.

**Antes de empezar:** verifica sede, SKU, variante y saldo de la fila; para una venta utiliza el flujo de venta, no una salida manual duplicada.

**Paso a paso:**

1. Pulsa **Movimiento** en la posición correcta.
2. Selecciona **Tipo**: **Entrada**, **Salida** o **Ajuste a cantidad final**.
3. Para Entrada/Salida escribe unidades en **Cantidad**. Para Ajuste escribe el saldo físico final en **Nueva existencia**.
4. Completa **Motivo** y las **Notas** necesarias.
5. Pulsa **Registrar movimiento** una vez.
6. Comprueba saldo y movimiento registrado.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Tipo * | Sumar, restar o fijar saldo final | Ajuste después de conteo físico |
| Cantidad * | Unidades de entrada/salida | Salida de 1 |
| Nueva existencia * | Saldo final, no diferencia | Conteo físico final de 6 |
| Motivo * / Notas | Justificación y soporte | Corrección de conteo verificada |

**Resultado esperado:** se registra el cambio con saldo anterior/posterior. Una salida insuficiente se rechaza sin reducir el stock.

**Qué hacer después:** revisa la causa si el sistema rechaza; reduce la salida a las unidades reales o gestiona un traslado, nunca fuerces saldos negativos.

**Problemas frecuentes:** escribir 2 en ajuste fija el saldo en 2; no agrega 2. No uses ajuste para simular recepción de un traslado, cancelar una venta o corregir pagos.

### 10.4 Configurar mínimo por sede

**Para qué sirve:** detectar reposición necesaria sin alterar las unidades disponibles.

**Quién puede hacerlo:** Admin con permiso para mínimos.

**Dónde está:** **Inventario → Existencias → Mínimo** de la fila.

**Antes de empezar:** determina el umbral para esa sede y variante.

**Paso a paso:**

1. Pulsa **Mínimo** en la fila correcta.
2. Introduce **Mínimo por sede**, entero no negativo.
3. Pulsa **Guardar mínimo**.
4. Comprueba la fila y **Solo stock bajo**.

**Qué significa cada campo:** mínimo = umbral de alerta, no unidades nuevas ni límite de compra.

**Resultado esperado:** alerta coherente con el saldo; el stock físico no cambia.

**Qué hacer después:** coordina reposición según el negocio. No reduzcas el mínimo sólo para ocultar una alerta.

**Problemas frecuentes:** el mínimo de BAQ no configura automáticamente BOG ni otras variantes.

<a id="movimientos"></a>

## 11. Movimientos

### Consultar la trazabilidad del inventario

**Para qué sirve:** explicar por qué cambió un saldo.

**Quién puede hacerlo:** Admin con consulta de movimientos.

**Dónde está:** **Operación → Inventario → Movimientos**.

**Antes de empezar:** identifica sede y tipo de cambio investigado.

**Paso a paso:**

1. Abre **Movimientos** y selecciona **Sede** y **Tipo**.
2. Lee fecha, artículo/variante, cambio, saldo anterior/posterior, motivo/referencia y operador.
3. Distingue **Entrada**, **Salida**, **Ajuste**, **Venta**, **Reversión de venta**, **Salida por traslado** y **Entrada por traslado**.
4. Una referencia **Transferencia #…**, **Orden #…** o **Pago #…**, cuando aparezca, identifica el origen del movimiento. No se presenta aquí un botón nuevo para abrirla.
5. Si falla la consulta, pulsa **Reintentar**.

**Qué significa cada control:** sede limita posiciones; tipo limita hechos; cambio positivo suma y negativo resta; saldo posterior es el resultado, no la cantidad del movimiento.

**Resultado esperado:** hasta 150 movimientos recientes con los filtros elegidos.

**Qué hacer después:** para periodos y exportación, usa **Reportes → Movimientos**. Esta pantalla no tiene un buscador por SKU o rango de fechas propio.

**Problemas frecuentes:** “sin movimientos” puede ser un filtro restrictivo. No registres otro movimiento únicamente porque el anterior no esté entre los recientes; comprueba el reporte y el saldo.

<a id="transferencias"></a>

## 12. Transferencias

### Solicitar → despachar → recibir

**Para qué sirve:** trasladar unidades físicamente entre sedes con responsables y etapas visibles.

**Quién puede hacerlo:** Admin con los permisos correspondientes a cada etapa.

**Dónde está:** **Operación → Inventario → Transferencias**.

**Antes de empezar:** confirma origen/destino activos y diferentes, SKU/variante, cantidad disponible y coordinación física. Solicitar no reserva stock.

**Paso a paso:**

1. Pulsa **Nueva transferencia**.
2. Selecciona **Sede origen** y **Sede destino**.
3. Busca el artículo en origen y selecciona **Artículo con stock**.
4. Pulsa **Agregar**, escribe la **Cantidad** y repite para más artículos.
5. Completa **Notas** y pulsa **Solicitar transferencia**.
6. Busca la transferencia y pulsa **Ver detalle**. Verifica estado **Solicitada**, unidades y actores.
7. Cuando efectivamente salga la mercancía, pulsa **Despachar** y acepta la confirmación: se valida stock, se descuenta origen y queda **En tránsito**.
8. En destino, comprueba físicamente la recepción completa. Pulsa **Confirmar recepción** y acepta la confirmación.
9. Verifica **Recibida**, entrada en destino e historial. No vuelvas a registrar una entrada manual de las mismas unidades.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Sede origen * / Sede destino * | De dónde sale / dónde ingresa | BAQ → BOG |
| Buscar artículo en origen | Consulta unidades de la sede origen | Nombre o SKU |
| Artículo con stock | Producto o variante exacto | La versión preparada para envío |
| Cantidad | Unidades a trasladar | 1 |
| Notas | Contexto logístico | Soporte del traslado |
| Motivo para cancelar | Razón de cancelar una solicitud | Traslado ya no requerido |

**Resultado esperado:** Solicitada = sin descuento; En tránsito = origen reducido y destino todavía sin entrada; Recibida = entrada completa en destino.

**Qué hacer después:** verifica ambos movimientos y existencias. La recepción es completa; no se documenta recepción parcial ni devolución automática de un traslado recibido.

**Problemas frecuentes:** si otro proceso consumió stock desde la solicitud, el despacho puede rechazarse. Investiga disponibilidad y coordina; no hagas un ajuste ficticio.

### 12.1 Cancelar una solicitud

**Para qué sirve:** retirar un traslado que aún no fue despachado.

**Quién puede hacerlo:** Admin con permiso de cancelación.

**Dónde está:** **Transferencias → Ver detalle** de una **Solicitada**.

**Antes de empezar:** comprueba que no salió físicamente la mercancía.

**Paso a paso:**

1. Escribe **Motivo para cancelar**.
2. Pulsa **Cancelar transferencia** y acepta la confirmación sólo si corresponde.
3. Verifica **Cancelada** y el motivo conservado.

**Qué significa cada campo:** el motivo explica una cancelación de solicitud, no una devolución de unidades.

**Resultado esperado:** no cambia stock porque la solicitud aún no lo había descontado.

**Qué hacer después:** conserva el registro. Para una transferencia en tránsito/recibida, coordina con el administrador; esta acción no permite cancelarla ni retornar stock automáticamente.

**Problemas frecuentes:** una acción ausente puede deberse al estado, no a un error de pantalla.

<a id="clientes"></a>

## 13. Clientes

### Crear, consultar y actualizar un cliente

**Para qué sirve:** reutilizar contactos, vehículos e historial sin volver a pedir todos los datos.

**Quién puede hacerlo:** Admin con permisos de clientes. Un colaborador puede seleccionar clientes en su formulario comercial autorizado, pero no gestionar este módulo.

**Dónde está:** **Operación → Clientes**.

**Antes de empezar:** busca por nombre, teléfono, email o documento.

**Paso a paso:**

1. Escribe en **Buscar cliente** y pulsa **Buscar**. Usa **Limpiar** si el filtro oculta resultados.
2. Si no existe, pulsa **Nuevo cliente**, completa los datos y **Crear cliente**.
3. Abre su detalle para comprobar contacto, vehículos e historial.
4. Pulsa **Editar**, corrige datos y **Guardar cambios**.
5. Para desactivar/reactivar, cambia **Cliente activo** en edición y guarda. Se conserva el historial.
6. Desde el detalle, **Nueva cotización** o **Nueva venta** abre el formulario con el cliente seleccionado, si tienes permiso.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Nombre * | Persona o entidad cliente | Nombre confirmado por el cliente |
| Teléfono / Email | Contactos | Datos autorizados del cliente |
| Documento | Identificación aportada | Su documento correspondiente |
| Ciudad / Dirección | Datos reutilizables de contacto | Ubicación comunicada |
| Notas | Contexto comercial pertinente | Preferencia de contacto |
| Cliente activo | Habilitación para nuevas operaciones | Desactivar sin borrar historial |

**Resultado esperado:** un perfil reutilizable; editarlo no reescribe datos históricos de documentos anteriores.

**Qué hacer después:** agrega el vehículo antes de cotizar si necesitas comprobar compatibilidad.

**Problemas frecuentes:** no crees otro cliente para corregir un teléfono. **Cliente ad hoc** en una venta/cotización guarda datos de ese documento, no sustituye crear un perfil reutilizable.

<a id="vehiculos"></a>

## 14. Vehículos de clientes

### Registrar o actualizar un vehículo

**Para qué sirve:** relacionar el automóvil atendido con compras, cotizaciones y compatibilidad.

**Quién puede hacerlo:** Admin con permisos de clientes.

**Dónde está:** **Clientes → detalle del cliente → Vehículos → Agregar vehículo**.

**Antes de empezar:** confirma el cliente propietario y datos del vehículo; la generación se mantiene en **Marcas y vehículos**, no se crea aquí.

**Paso a paso:**

1. Abre el detalle del cliente y pulsa **Agregar vehículo**.
2. Selecciona **Marca → Modelo → Versión**. Cada selección limita la siguiente.
3. Introduce año, placa y datos adicionales disponibles.
4. Pulsa **Guardar vehículo** y verifica su tarjeta.
5. Usa **Editar → Guardar vehículo** para corregir datos; cambia **Vehículo activo** para desactivar/reactivar conservando el registro.
6. Usa **Ver compras** para consultar historial del vehículo. Inicia **Nueva venta** o **Nueva cotización** desde el cliente y verifica la selección del vehículo en el formulario.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Marca / Modelo / Versión | Identificación del catálogo vehicular | Marca → modelo → generación real |
| Año | Año de este automóvil, dentro del rango aplicable | 2024, si corresponde |
| Placa | Matrícula del vehículo | La placa aportada |
| VIN | Identificación del automóvil | VIN comprobado |
| Color / Alias | Descripción y nombre corto reconocible | Gris / vehículo familiar |
| Notas | Contexto particular del automóvil | Equipo original verificado |
| Vehículo activo | Disponible en nuevas selecciones | Desactivar un automóvil que ya no se atiende |

**Resultado esperado:** vehículo enlazado al cliente y seleccionable cuando está activo. Puede registrarse información parcial; no inventes datos faltantes.

**Qué hacer después:** confirma compatibilidad de producto/variante para ese vehículo. Un único vehículo activo puede quedar preseleccionado; compruébalo igualmente.

**Problemas frecuentes:** año fuera de rango: verifica generación/año. Marca inactiva o modelo incorrecto: pide revisión de la lista; no crees un vehículo duplicado. No asumas que elegir cliente siempre selecciona el automóvil correcto.

<a id="cotizaciones"></a>

## 15. Cotizaciones

### Crear, editar, marcar enviada y convertir

**Para qué sirve:** preparar una propuesta antes de comprometer una venta e inventario.

**Quién puede hacerlo:** Admin autorizado; colaborador usa el procedimiento propio de [su jornada](#colaborador).

**Dónde está:** **Operación → Cotizaciones → Nueva cotización**, o **Clientes → detalle → Nueva cotización**.

**Antes de empezar:** cliente/vehículo si corresponde, sede activa, productos/variantes y servicios activos con categorías activas. Una cotización no reserva stock.

**Paso a paso:**

1. Pulsa **Nueva cotización** o inicia desde el cliente.
2. Selecciona **Sede**. La conversión usará esa sede, no stock de toda la red.
3. En **Cliente**, elige **Cliente existente**, **Cliente ad hoc** o **Sin cliente**. Para uno existente, búscalo y selecciónalo; no reescribas sus datos como ad hoc.
4. En **Vehículo**, selecciona **Vehículo del cliente**, **Vehículo ad hoc** o **Sin vehículo** según el caso.
5. En **Productos y servicios**, busca y agrega cada línea. Selecciona la variante cuando exista.
6. Revisa **Cantidad**, **Descuento COP**, precios y total estimado. **Eliminar** quita una línea antes del guardado.
7. Completa **Válida hasta** si necesitas una fecha explícita y **Notas de la cotización**. Vacío aplica la vigencia configurada en **Ventas y cotizaciones**, no un plazo fijo universal.
8. Pulsa **Crear cotización**. Abre el detalle y verifica número, total, cliente, vehículo, vigencia y estado.
9. Mientras sea editable, pulsa **Editar → Guardar cambios**. Para registrar que fue enviada, pulsa **Marcar como enviada**. Esta acción cambia el estado; no garantiza envío de correo o WhatsApp.
10. Si el cliente acepta, pulsa **Convertir en venta**, revisa la advertencia de validación de inventario y **Confirmar**.
11. Comprueba **Convertida**, la **Venta generada** y **Ver en Órdenes**. La venta queda confirmada; no vuelve a pedir toda la información.
12. Para una propuesta enviada que fue rechazada, pulsa **Marcar como rechazada**, añade **Razón opcional** si aporta contexto y **Confirmar**. No la conviertas para cerrarla.

Para volver a localizar una propuesta: en Cotizaciones escribe número, cliente, teléfono o email en **Buscar**, pulsa **Buscar**, revisa **Estado** y navega con **Anterior / Siguiente**. Abre **Ver** en tabla o **Ver cotización** en tarjeta móvil.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Sede * | Lugar que gestionará y abastecerá la venta | Barranquilla |
| Sin cliente / existente / ad hoc | Ninguno / perfil reutilizado / datos sólo para el documento | Existente para un comprador habitual |
| Nombre, Teléfono, Email, Documento, Ciudad, Dirección, Notas | Contacto del cliente ad hoc; no alta automática de cliente | Datos aportados para esa propuesta |
| Nota de esta cotización | Nota contextual del cliente seleccionado | Requisito comunicado |
| Sin vehículo / del cliente / ad hoc | Sin automóvil / reutilizar registro / datos del documento | Vehículo registrado del cliente |
| Marca, Modelo, Versión, Año, Placa, VIN, Color, Notas | Datos vehiculares ad hoc | Automóvil comprobado |
| Producto / variante / servicio | Concepto cotizado | Radio elegido + instalación |
| Cantidad / Descuento COP | Unidades y descuento monetario de la línea; no porcentaje | 1 / descuento aprobado |
| Válida hasta | Fecha límite explícita; si vacía, configuración comercial | Fecha acordada válida |
| Notas de la cotización | Condiciones pertinentes | Alcance de instalación |

**Resultado esperado:** propuesta con historial; al convertir se conservan cliente, vehículo y condiciones comerciales y se valida stock actual de la sede. No es un pago.

**Qué hacer después:** registrar pagos y completar la atención en la venta generada. No crear una segunda venta manual por la misma aceptación.

**Problemas frecuentes:** stock cambió desde la cotización, sede inactiva, servicio no disponible, propuesta vencida/terminal o ya convertida: comprueba el motivo y el documento resultante antes de repetir. No modifiques listas históricas para forzar conversión. Una propuesta enviada puede tener controles diferentes entre Admin y colaborador; no atribuyas edición libre al colaborador.

<a id="ventas"></a>

## 16. Ventas y órdenes

### Registrar una venta directa Admin y gestionar su operación

**Para qué sirve:** registrar una atención comercial sin cotización previa, o continuar la venta ya convertida.

**Quién puede hacerlo:** Admin con permisos de órdenes; colaborador opera sólo **Mis ventas**.

**Dónde está:** **Operación → Órdenes → Nueva venta**, o **Clientes → detalle → Nueva venta**.

**Antes de empezar:** comprueba que no existe una venta/cotización convertida para la misma operación. Verifica sede y vendedor antes de seleccionar artículos.

**Paso a paso:**

1. Pulsa **Nueva venta**. Si vienes de Clientes, revisa la selección ya cargada.
2. Elige **Venta mostrador**, **Cliente existente** o **Cliente ad hoc**; selecciona/completa lo necesario.
3. Selecciona **Sede** y, si corresponde, **Vendedor opcional** de esa sede.
4. Selecciona el vehículo del cliente o los datos ad hoc; usa **Sin vehículo** sólo cuando corresponde.
5. Agrega productos/variantes y servicios. El catálogo utiliza las existencias exactas de esa sede.
6. Revisa cantidades, descuentos y total aproximado. Cambiar sede con líneas agregadas pide confirmación y las elimina porque deben recalcularse con la nueva sede.
7. Si ya recibiste dinero y tienes autorización, activa **Registrar pago ahora** y completa método, monto, referencia y notas. No marques un pago que todavía no recibiste.
8. Pulsa **Registrar venta** y revisa el detalle resultante. La venta directa Admin se crea confirmada y descuenta el inventario validado. No es el mismo inicio pendiente de **Mis ventas**.
9. Para una orden que esté **Pendiente**, usa **Confirmar venta** cuando corresponda; se valida sede y stock al confirmar.
10. Cuando termine realmente la atención/entrega, pulsa **Marcar completada** en una Confirmada.
11. Si corresponde cancelar una Pendiente/Confirmada, pulsa **Cancelar**, revisa la razón y **Confirmar cancelación**. El sistema determina la reversión de inventario aplicable; no la dupliques manualmente.

Para localizar una venta existente, utiliza **Buscar** (orden/cliente/teléfono/email), **Estado**, **Pago** y **Origen**; abre **Ver orden**. **Actualizar** vuelve a consultar. Los totales de la lista describen los registros mostrados, no sustituyen las métricas del Dashboard o un reporte del periodo completo.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Cliente / vehículo | Mismos modos y datos explicados en cotizaciones | Reutilizar cliente y automóvil |
| Notas de esta venta / Notas del vehículo | Contexto de este documento | Condición confirmada de atención |
| Sede * | Stock y sede histórica de la venta | Bogotá |
| Vendedor opcional | Empleado activo compatible con la sede | Asesor que realizó la venta |
| Cantidad / Descuento COP | Unidades y descuento monetario por línea | 1 unidad |
| Registrar pago ahora | Incluir un pago real en el alta | Abono ya recibido |
| Método / Monto / Referencia / Notas | Cómo y cuánto se recibió, y su soporte | Transferencia verificada |
| Razón opcional | Contexto de cancelación operativa | Motivo comprobado |

**Resultado esperado:** venta única, con origen, estado operativo, estado de pago, líneas, historial y pagos separados. Sede/vendedor de una venta confirmada son históricos, no una asignación libre posterior.

**Qué hacer después:** registra el saldo si corresponde y completa la operación cuando haya terminado; revisa comisiones relacionadas. Para una venta convertida, abre la generada, no uses **Nueva venta**.

**Problemas frecuentes:** sin sede o líneas no se puede registrar. Vendedor de otra sede o stock insuficiente: corrige la selección; no utilices unidades de otra sede sin traslado. Cancelar una venta no es emitir una devolución de dinero mediante este botón. No se ofrecen edición libre de líneas, borrado de historial ni reapertura de una Completada.

<a id="pagos"></a>

## 17. Pagos

### Registrar abono o saldo

**Para qué sirve:** dejar constancia del dinero efectivamente recibido para una venta.

**Quién puede hacerlo:** Admin con pagos; colaborador autorizado en ventas propias.

**Dónde está:** **Órdenes → detalle de la venta → Registrar pago**. Colaborador: **Mis ventas → Ver venta → Registrar pago**.

**Antes de empezar:** verifica número de venta, pagos anteriores y saldo. Si un intento público está pendiente o incierto, consulta su resultado antes de agregar un pago manual.

**Paso a paso:**

1. Abre la venta correcta y revisa **Pagos** y saldo pendiente.
2. Pulsa **Registrar pago**.
3. Escribe **Monto**, selecciona **Método** y completa **Referencia** y **Notas** pertinentes.
4. Confirma que el monto es positivo y no supera el saldo.
5. Pulsa **Registrar pago** una vez y espera la confirmación.
6. Verifica el nuevo pago y estado financiero. Para otro abono legítimo, repite sobre el saldo actualizado, no sobre el total original.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Monto | Dinero de este pago, no nuevo total de venta | 400000 |
| Método | Efectivo, Transferencia, Tarjeta / datáfono, Wompi u Otro; en espacio propio figura Datáfono | Medio efectivamente usado |
| Referencia | Identificación del soporte del pago | Número del comprobante |
| Notas | Contexto verificable, nunca claves o datos completos de tarjeta | Abono confirmado |

**Resultado esperado:** ejemplo pedagógico: total $950.000, primer pago $400.000 → **Pago parcial**, saldo $550.000. Un segundo pago real de $550.000 → **Pagada**, saldo cero. El estado operativo no cambia a Completada por registrar dinero.

**Qué hacer después:** comprueba que la atención fue completada por separado. **Pagos** en el detalle y **Reportes → Pagos/Cartera** permiten revisar dinero y saldo respectivamente.

**Problemas frecuentes:** monto excesivo: consulta el saldo actual. Resultado incierto de guardado: revisa pagos antes de intentar nuevamente. Seleccionar Wompi como método de un registro interno no abre ni prueba un cobro público. No se ofrece editar/borrar un pago histórico para corregirlo informalmente.

<a id="conciliaciones"></a>

## 18. Conciliaciones de pagos

### Revisar, escalar o resolver una discrepancia

**Para qué sirve:** investigar inconsistencias de pagos Wompi con decisiones justificadas y trazables.

**Quién puede hacerlo:** Admin autorizado. Consultar casos no implica permiso para iniciar revisión o registrar decisiones.

**Dónde está:** **Análisis → Conciliaciones de pagos**.

**Antes de empezar:** identifica el caso y consigue evidencia verificable. Este módulo no sirve para cambiar dinero o inventario a mano.

**Paso a paso:**

1. Filtra **Estado** y **Motivo** y abre **Ver caso**.
2. Revisa pago/orden relacionados, transacción, motivo, responsable e **Historial inmutable**.
3. Si está **Pendiente de revisión**, pulsa **Iniciar revisión**. Queda asignada a tu usuario y **En revisión**.
4. En **Registrar decisión**, elige sólo una decisión disponible y respaldada por el caso.
5. Escribe **Justificación**. Completa **Referencia de evidencia** cuando sea obligatoria y el **ID del pago canónico** únicamente si la decisión lo exige y verificaste cuál es el pago válido.
6. Revisa el efecto anunciado y pulsa **Registrar decisión**.
7. Comprueba la decisión, autor y fecha en historial. **Escalar revisión** o **Marcar devolución requerida** dejan el caso abierto; las decisiones terminales justificadas lo dejan **Resuelta**.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Estado | Pendiente de revisión / En revisión / Resuelta | Filtrar pendientes |
| Motivo | Diferencia de monto, moneda, referencia, orden, transacción u otra inconsistencia mostrada | Investigar el motivo específico |
| Decisión * | Resultado administrativo permitido para ese motivo | Escalar revisión si falta evidencia |
| Justificación * | Explicación suficiente de lo verificado | Hallazgo y motivo de la decisión |
| Referencia de evidencia | Soporte documental, no el contenido secreto del proveedor | Ticket interno o caso del proveedor |
| ID del pago canónico * | Número del pago que se comprobó como válido en un conflicto | Identificador verificado, no uno elegido al azar |

| Decisión disponible según el caso | Qué ocurre |
|---|---|
| Marcar devolución requerida | Registra una devolución que debe hacerse externamente; no cierra el caso ni devuelve dinero |
| Escalar revisión | Deja la investigación abierta |
| Confirmar devolución realizada externamente | Documenta una devolución ya comprobada fuera de Upgrade |
| Confirmar anulación verificada | Documenta verificación de anulación del proveedor |
| Confirmar propiedad de transacción verificada | Documenta cuál pago posee correctamente la transacción |
| Confirmar evento o integridad inválida | Documenta la invalidez comprobada |
| Confirmar ausencia de pago local | Documenta ausencia verificada del registro interno |
| Confirmar ausencia de transacción en proveedor | Documenta ausencia verificada en el proveedor |

**Resultado esperado:** revisión documentada con historial que no se edita. Resolver el caso no cambia automáticamente montos, moneda, estados financieros de pagos, stock, comisiones ni estados operativos de órdenes. Puede actualizar la indicación administrativa de revisión pendiente del pago relacionado; eso no registra dinero, devuelve fondos ni confirma una venta.

**Qué hacer después:** coordina las acciones externas que realmente correspondan. No afirmes al cliente que recibió una devolución porque marcaste “requerida”.

**Problemas frecuentes:** falta de justificación/evidencia: completa el soporte. Caso ya cerrado o modificado: consulta el historial actualizado antes de actuar. Si la pantalla indica resultado incierto, utiliza **Reintentar misma solicitud** cuando aparezca: conserva la misma operación y datos; no abras otra decisión para duplicarla. No existe un estado “ignorada” documentado ni un botón de reparación financiera automática.

<a id="servicios"></a>

## 19. Servicios y sus categorías

### Crear y mantener un servicio

**Para qué sirve:** ofrecer mano de obra y otros conceptos no inventariables en ventas, cotizaciones y citas.

**Quién puede hacerlo:** Admin con permisos de servicios.

**Dónde está:** **Catálogo → Servicios → Servicios**.

**Antes de empezar:** necesita una categoría de servicio adecuada; no una categoría de productos. Busca para evitar duplicar.

**Paso a paso:**

1. Busca y revisa filtros **Categoría** y **Estado**.
2. Pulsa **Nuevo servicio**.
3. Selecciona categoría, completa nombre, descripción, precio y duración; revisa costos y orden si corresponden.
4. Revisa **Servicio activo** y pulsa **Guardar servicio**.
5. Usa **Ver** para revisar el detalle y **Editar → Guardar servicio** para modificarlo.
6. **Desactivar** abre confirmación; confirma sólo si debe dejar de ofrecerse. Para rehabilitarlo, marca **Servicio activo** en edición y guarda.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Categoría | Familia de mano de obra; debe estar activa para nuevas operaciones | Instalaciones |
| Nombre / Descripción | Concepto y alcance del servicio | Instalación de radio |
| Precio COP | Valor comercial del servicio | Valor aprobado por el negocio |
| Costo directo opcional | Costo conocido asociado a su ejecución | Costo comprobado de mano de obra |
| Duración en minutos | Tiempo estimado usado como ayuda al programar | 60, sólo ejemplo |
| Orden | Posición de presentación | Orden deseado dentro del catálogo |
| Servicio activo | Habilitación para nuevas operaciones | Activar si se ofrece actualmente |

**Resultado esperado:** servicio registrado sin crear unidades de inventario. Se conservan conceptos históricos de documentos anteriores.

**Qué hacer después:** selecciona el servicio en venta/cotización o cita; verifica el horario final de la cita aunque el fin se sugiera por duración.

**Problemas frecuentes:** un servicio activo bajo categoría inactiva no se ofrece para nuevas ventas, cotizaciones o citas. Revisa ambos estados, no sólo el servicio. No hagas una entrada de stock de mano de obra.

### 19.1 Mantener categorías de servicios

**Para qué sirve:** organizar los servicios disponibles.

**Quién puede hacerlo:** Admin con permisos de servicios.

**Dónde está:** **Servicios → Categorías**.

**Antes de empezar:** revisa servicios que dependen de la categoría.

**Paso a paso:**

1. Abre **Categorías → Nueva categoría**.
2. Completa **Nombre**, **Descripción**, **Orden** y **Categoría activa**; pulsa **Guardar categoría**.
3. Para cambiarla, usa **Editar → Guardar categoría**.
4. Para retirarla, pulsa **Desactivar**, lee la advertencia y confirma.
5. Para rehabilitarla, edita **Categoría activa** y guarda.

**Qué significa cada campo:** nombre/descripcion = familia de servicios; orden = presentación; activa = elegibilidad de sus servicios para nuevas operaciones.

**Resultado esperado:** al desactivarla, sus servicios dejan de ser seleccionables en nuevas operaciones sin desactivarse individualmente; el histórico se conserva.

**Qué hacer después:** revisa también **Servicio activo** al rehabilitar una categoría. Activar la familia no convierte automáticamente un servicio inactivo en activo.

**Problemas frecuentes:** no sustituyas una categoría histórica por otra sólo para esconder un servicio; desactiva según corresponda y conserva trazabilidad.

<a id="citas"></a>

## 20. Citas

### Crear y programar una cita

**Para qué sirve:** organizar una atención con responsable, contacto y horario disponible.

**Quién puede hacerlo:** Admin con permisos de citas y, cuando corresponde, consulta de disponibilidad.

**Dónde está:** **Operación → Citas → Nueva cita**.

**Antes de empezar:** verifica empleado activo, sede, jornada, ausencias y servicio disponible. Las horas del formulario son de Colombia.

**Paso a paso:**

1. Pulsa **Nueva cita**.
2. Busca y selecciona **Responsable**. Revisa la ayuda de sede: la cita conserva una sede histórica vinculada a la operación del responsable, no un stock de red.
3. En **Cliente o contacto**, selecciona un cliente existente; sus datos se reutilizan. Selecciona **Vehículo** si corresponde.
4. Para contacto manual, completa **Nombre del contacto** y **Teléfono**.
5. Selecciona **Servicio**, o deja **Sin servicio asociado** cuando sea apropiado.
6. Revisa **Estado inicial**: **Solicitada** queda pendiente; **Confirmada** reserva disponibilidad.
7. Completa **Título**. Abre **Detalles adicionales** para descripción, email manual o descripción del vehículo si son necesarios.
8. Introduce **Inicio** y **Fin** en **Horario · Colombia**. El fin puede sugerirse por duración del servicio, pero debes comprobarlo.
9. Espera la consulta de disponibilidad. Si hay choque con cita/tarea, ausencia o empleado inactivo, corrige responsable/horario.
10. Sólo si el conflicto es fuera de jornada y el formulario lo permite, evalúa **Confirmar override fuera de jornada** y documenta **Motivo**. No evita otros conflictos ni sustituye autorización del negocio.
11. Pulsa **Crear cita** y verifica contacto, horario, responsable, sede y estado en la lista/detalle.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Responsable | Empleado que realizará la atención | Instalador disponible |
| Cliente o contacto / Vehículo | Reutiliza registros existentes | Cliente y automóvil registrados |
| Nombre del contacto / Teléfono | Datos obligatorios del contacto manual | Contacto aportado por el cliente |
| Servicio | Trabajo previsto y duración orientativa | Instalación activa |
| Estado inicial | Solicitada o Confirmada | Confirmada si ya está acordada |
| Título / Descripción | Nombre corto y contexto de la atención | Instalación de equipo |
| Email del contacto | Contacto opcional cuando es manual | Email facilitado |
| Descripción manual del vehículo | Automóvil cuando no hay vehículo registrado | Datos conocidos sin inventar |
| Inicio / Fin | Fecha y hora Colombia; fin posterior al inicio | Rango realmente disponible |
| Confirmar override fuera de jornada / Motivo | Excepción autorizada fuera del horario habitual | Razón documentada de la excepción |

**Resultado esperado:** cita guardada con datos históricos. Una consulta **Disponible** es previa; el guardado vuelve a validar y puede rechazar cambios concurrentes.

**Qué hacer después:** consulta [Calendario](#calendario) y comunica al cliente los acuerdos por el canal que corresponda. Guardar no garantiza que haya recibido un mensaje.

**Problemas frecuentes:** fin anterior al inicio, responsable sin jornada, ausencia o cita/tarea superpuesta: corrige la causa. Si no tienes permiso de prevalidación, la pantalla lo explica y el sistema valida al guardar; no se trata de autorización para ignorar disponibilidad.

### Reprogramar y registrar el resultado de la cita

**Para qué sirve:** mantener agenda y atención coherentes.

**Quién puede hacerlo:** Admin con actualización/cancelación de citas.

**Dónde está:** **Citas → Ver** o acciones de la fila.

**Antes de empezar:** comprueba estado y comunica el cambio acordado.

**Paso a paso:**

1. Filtra por contacto, sede histórica, responsable, estado o fechas y abre **Ver**.
2. Para cambiar horario de una Solicitada/Confirmada, pulsa **Reprogramar**, ajusta Inicio/Fin y **Guardar cambios**. Comprueba disponibilidad y nuevo horario.
3. Usa **Editar → Guardar cambios** para datos editables de una cita, sin confundirlo con iniciar atención.
4. En una **Solicitada**, pulsa **Confirmar** cuando se acepte.
5. En una **Confirmada**, pulsa **Iniciar** al comenzar y **Completar** al terminar; la interfaz también permite completar directamente una Confirmada cuando corresponde.
6. Si el cliente no llegó, usa **No asistió**, no **Completar**.
7. Si corresponde cancelar y la acción está disponible, pulsa **Cancelar**, escribe el motivo solicitado y confirma **Cancelar cita**. El registro permanece Cancelada.

**Qué significa cada campo:** Inicio/Fin son el nuevo rango; motivo de cancelación explica retirada de la atención; estados describen atención, no pago de una venta.

**Resultado esperado:** cita reprogramada o estado actualizado con historial; terminales no ofrecen el mismo conjunto de acciones.

**Qué hacer después:** vuelve al calendario para comprobar el espacio liberado u ocupado. No crees otra cita para simular una reprogramación.

**Problemas frecuentes:** una acción ausente puede deberse al estado o permiso. Si aparece validación sólo al guardar en edición, evita asumir que la ausencia de una consulta previa permite un conflicto.

<a id="calendario"></a>

## 21. Calendario

### Consultar agenda de equipo o personal

**Para qué sirve:** reconocer citas, tareas programadas, jornada y excepciones en el tiempo.

**Quién puede hacerlo:** Admin para equipo; colaborador para **Mi calendario**.

**Dónde está:** **Operación → Calendario**; colaborador: **Mi espacio → Mi calendario**.

**Antes de empezar:** distingue eventos ligados al empleado de eventos con sede histórica.

**Paso a paso:**

1. Abre el calendario y selecciona **Semana** o **Agenda**.
2. Usa **Hoy**, **Anterior** o **Siguiente** para el rango deseado.
3. Admin: abre **Filtros**, selecciona sede, empleados, **Fuentes** y estados de citas/tareas. Usa **Limpiar** para quitar filtros.
4. Abre un evento para ver inicio, fin, empleado y contexto. El calendario es una consulta; gestiona cambios en Citas, Tareas, Horarios o Ausencias.
5. Comprueba la indicación **Zona horaria: Bogotá**.

**Qué significa cada control:**

| Control | Qué significa | Ejemplo |
|---|---|---|
| Semana / Agenda | Cuadrícula semanal / lista cronológica | Agenda para leer en móvil |
| Fuentes | Cita, Tarea, Ausencia, Horario laboral, Ajuste de horario | Mostrar tareas programadas |
| Sede | Limita eventos comerciales con sede histórica | Citas atendidas en BOG |
| Empleados | Personas del calendario administrativo | Responsable específico |

**Resultado esperado:** eventos del alcance seleccionado. Horarios y ausencias pertenecen al empleado y no tienen sede histórica; una vista por sede no equivale a todas las jornadas de sus empleados.

**Qué hacer después:** modifica el registro en su módulo de origen. Mi calendario mantiene el alcance personal, sin seleccionar a otra persona.

**Problemas frecuentes:** un calendario vacío puede ser semana/fuentes/sede. La fecha límite de una tarea no reserva tiempo; sólo la tarea programada aparece como bloque de agenda.

<a id="empleados"></a>

## 22. Empleados y acceso CRM

### Registrar empleado, vincular acceso y consultar operación

**Para qué sirve:** identificar al colaborador operativo y su sede, independientemente de su cuenta de acceso.

**Quién puede hacerlo:** Admin con permisos de empleados; crear una cuenta requiere autorización adicional de usuarios.

**Dónde está:** **Personal → Empleados**.

**Antes de empezar:** busca empleado y cuenta existentes. Empleado y Usuario son registros distintos: puede existir uno sin el otro.

**Paso a paso:**

1. Busca por datos del empleado y usa filtros de estado, acceso CRM, sede, cargo o especialidad. Pulsa **Aplicar** cuando corresponda.
2. Pulsa **Registrar empleado**.
3. Completa nombre, cargo y los datos operativos. Selecciona sede activa para trabajar comercialmente desde ella.
4. Si ya existe una cuenta adecuada, usa **Vincular usuario CRM existente**. No crees otra cuenta para la misma persona.
5. Revisa **Empleado activo** y pulsa **Registrar empleado**.
6. Si no tiene cuenta y necesita entrar, pulsa **Dar acceso CRM**, completa correo y contraseña confirmada y **Crear acceso CRM**. Crea una cuenta Usuario limitada vinculada al empleado; no otorga automáticamente todas las funciones comerciales.
7. Abre **Ver** para revisar datos y utiliza **Ver horario**, **Ver ausencias** y **Ver tareas** según permisos.
8. Para corregir datos, usa **Editar → Guardar cambios**.
9. Para retirarlo de nuevas asignaciones, pulsa **Desactivar**, revisa la confirmación y confirma. También puedes revisar **Empleado activo** en edición para su habilitación cuando corresponda.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Nombre * / Cargo * | Identidad operativa y función | Asesor / instalador |
| Sede | Lugar de operación; Sin sede no habilita ventas desde una sede inventada | BAQ |
| Especialidad | Área de trabajo | Audio |
| Teléfono / Fecha de ingreso / Notas | Datos operativos | Fecha real de ingreso |
| Vincular usuario CRM existente | Reutiliza una cuenta, no la crea | Cuenta Usuario de esa persona |
| Empleado activo | Disponible para nuevas asignaciones | Activo mientras trabaja |
| Email de acceso * | Correo de la cuenta nueva | Correo personal autorizado |
| Contraseña * / Confirmar contraseña * | Clave inicial de esa cuenta | Clave privada, no ejemplo público |

**Resultado esperado:** empleado registrado con sede y, si se creó/vinculó, cuenta propia. Desactivar empleado conserva historial y **no desactiva ni elimina su usuario CRM vinculado**.

**Qué hacer después:** configura horarios; registra ausencias y asigna tareas/metas. Revisa por separado la habilitación del usuario en Configuración y los permisos comerciales autorizados.

**Problemas frecuentes:** cuenta inactiva = no puede iniciar sesión aunque empleado esté activo. Empleado inactivo/sin sede = problema operativo aunque la cuenta pueda entrar. El correo existente debe vincularse correctamente, no duplicarse. Cambiar de sede puede rechazarse si conserva citas futuras activas o tareas programadas activas con fin futuro en su sede actual. Revisa esos compromisos y gestiona su reasignación, cancelación o finalización mediante las acciones permitidas del módulo correspondiente, antes de cambiar la sede; no borres historial ni marques trabajo terminado si no ocurrió. No des al colaborador una cuenta Admin para resolver un acceso limitado.

<a id="horarios"></a>

## 23. Horarios y excepciones

### Configurar jornada semanal

**Para qué sirve:** establecer intervalos habituales usados al validar disponibilidad.

**Quién puede hacerlo:** Admin autorizado para horarios.

**Dónde está:** **Personal → Horarios**, o **Empleados → Ver → Ver horario**.

**Antes de empezar:** selecciona el empleado correcto y ten la jornada y vigencia acordadas.

**Paso a paso:**

1. Selecciona empleado en **Horarios**.
2. En **Horario semanal**, pulsa **Agregar intervalo**.
3. Selecciona día, hora inicio/fin y vigencia desde/hasta.
4. Pulsa **Guardar intervalo** y comprueba el día. Repite para cada intervalo realmente requerido.
5. Usa **Editar → Guardar intervalo** para corregir uno existente.
6. **Eliminar** requiere confirmar la retirada del intervalo; no lo uses para una sola fecha excepcional.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Día | Día semanal recurrente | Lunes |
| Hora inicio / Hora fin | Intervalo de jornada, no una cita | Horas acordadas |
| Vigente desde | Desde cuándo aplica el intervalo | Fecha de inicio |
| Vigente hasta | Fin opcional de vigencia | Vacío si no tiene final definido |

**Resultado esperado:** jornada habitual disponible en el calendario personal y en validaciones. No crea citas ni modifica stock.

**Qué hacer después:** registra excepciones o ausencias particulares por separado.

**Problemas frecuentes:** fin antes de inicio o vigencia invertida: corrige el rango. Revisa intervalos que se superponen antes de guardar; sin horario configurado puede bloquearse una nueva programación.

### Agregar una excepción de fecha

**Para qué sirve:** reemplazar la jornada habitual sólo para una fecha.

**Quién puede hacerlo:** Admin con permisos de horarios.

**Dónde está:** **Horarios → empleado → Excepciones → Agregar excepción**.

**Antes de empezar:** consulta si ya existe una excepción para esa fecha.

**Paso a paso:**

1. Pulsa **Agregar excepción** y elige **Fecha**.
2. Selecciona **Horario excepcional** e Inicio/Fin, o **No laborable** para todo el día.
3. Completa **Motivo** si aporta contexto y **Guardar excepción**.
4. Para modificar, usa **Editar**. Si la fecha ya tiene excepción, usa **Editar excepción existente**, no crees otra.
5. Para retirarla, usa **Eliminar** y confirma; se vuelve a evaluar el horario habitual aplicable.

**Qué significa cada campo:** fecha = día puntual; tipo = jornada diferente/no laborable; inicio/fin = intervalo excepcional; motivo = contexto del cambio.

**Resultado esperado:** reemplazo para ese día, no modificación de toda la semana. Eliminar la excepción es una eliminación real, no un estado Cancelada conservado como ausencia.

**Qué hacer después:** comprueba agenda y compromisos existentes; cambiar jornada no comunica ni reprograma automáticamente las citas.

**Problemas frecuentes:** fecha duplicada: edita la existente. No confundir un día no laborable con vacaciones de varios días.

<a id="ausencias"></a>

## 24. Ausencias

### Registrar, editar o cancelar una ausencia aprobada

**Para qué sirve:** informar periodos en que el empleado no estará disponible.

**Quién puede hacerlo:** Admin autorizado; el colaborador no presenta aquí solicitudes de permiso.

**Dónde está:** **Personal → Ausencias**, o **Empleados → Ver → Ver ausencias**.

**Antes de empezar:** la ausencia debe estar aprobada por el proceso del negocio. Guardar registra directamente Aprobada, no envía una solicitud.

**Paso a paso:**

1. Pulsa **Registrar ausencia** y selecciona empleado.
2. Elige Tipo y completa Inicio/Fin en hora Colombia.
3. Completa Motivo y Notas administrativas cuando correspondan.
4. Pulsa **Guardar ausencia** y verifica **Aprobada**.
5. Para corregir, usa **Editar → Guardar ausencia**; no cambies el empleado mediante una ausencia existente.
6. Para retirarla, pulsa **Cancelar**, lee la confirmación y **Cancelar ausencia**. Permanece visible como Cancelada.
7. Filtra por empleado, tipo, estado y fechas para consultar el detalle y responsables.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Empleado | Persona ausente | Colaborador correspondiente |
| Tipo | Vacaciones, Permiso, Incapacidad, Ausencia u Otra | Vacaciones aprobadas |
| Inicio / Fin · hora Colombia | Periodo completo de no disponibilidad | Rango real aprobado |
| Motivo | Contexto de la ausencia, opcional | Permiso autorizado |
| Notas administrativas | Información mostrada sólo en este módulo administrativo | Soporte interno pertinente |

**Resultado esperado:** ausencia considerada en disponibilidad. Cancelarla conserva el historial y deja de actuar como ausencia aprobada.

**Qué hacer después:** revisa agenda y coordina cambios de atención; no asumas que las citas ya guardadas se reprograman solas.

**Problemas frecuentes:** rango inválido o empleado incorrecto: corrige antes de guardar. No existe aquí cálculo de saldo de vacaciones, nómina o aprobación por el colaborador.

<a id="tareas"></a>

## 25. Tareas

### Crear, asignar y seguir una tarea

**Para qué sirve:** indicar qué trabajo debe realizar una persona y seguir su ejecución.

**Quién puede hacerlo:** Admin asigna; colaborador inicia/completa sus tareas.

**Dónde está:** **Personal → Tareas → Crear tarea**; colaborador: **Mi espacio → Mis tareas**.

**Antes de empezar:** confirma responsable y si necesitas una fecha límite o un bloque reservado de agenda: no son lo mismo.

**Paso a paso:**

1. Pulsa **Crear tarea** y selecciona **Empleado responsable**.
2. Completa **Título**, **Descripción**, **Prioridad** y **Fecha límite · Colombia** cuando corresponda.
3. Para reservar un intervalo, activa **Programar en agenda** y completa **Inicio programado · Colombia / Fin programado · Colombia**, en un rango válido del mismo día.
4. Espera disponibilidad. **Programar de todas formas** sólo se usa si la interfaz permite una excepción fuera de jornada y registras motivo; no evita solapamientos o ausencias no autorizables.
5. Pulsa **Guardar tarea** y verifica la asignación.
6. Admin puede **Ver**, **Editar → Guardar tarea** y, según estado/permisos, **Iniciar** o **Completar** desde las acciones del registro. Consulta filtros de estado/prioridad/responsable y fechas avanzadas; registra ejecución sólo cuando ocurrió realmente.
7. Colaborador abre **Mis tareas → Ver detalle → Iniciar** al empezar y **Completar** al terminar. La interfaz permite completar una Pendiente si el trabajo ya terminó, sin exigir un inicio ficticio.
8. Admin cancela desde **Cancelar → Motivo de cancelación → Cancelar tarea**. Se conserva el registro.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Empleado responsable / Título | A quién y qué trabajo se asigna | Revisar equipo recibido |
| Descripción | Alcance y contexto | Comprobaciones necesarias |
| Prioridad | Baja, Normal, Alta o Urgente | Según necesidad real |
| Fecha límite · Colombia | Momento para terminar, no reserva agenda | Límite acordado |
| Programar en agenda / Inicio / Fin | Intervalo operativo reservado | Bloque dentro de jornada |
| Motivo de excepción / cancelación | Razón trazable | Cambio operativo justificado |

**Resultado esperado:** Pendiente → En progreso → Completada, o Cancelada con motivo. Una tarea sin programación no ocupa un bloque en calendario.

**Qué hacer después:** revisa prioridades en Inicio y calendario. Admin no debe marcar trabajo terminado por haberlo asignado.

**Problemas frecuentes:** una tarea vencida no desaparece; filtra pendientes y revisa el límite. El colaborador no obtiene un botón de crear tareas del equipo ni reasignarlas a otro empleado.

<a id="metas"></a>

## 26. Metas

### Crear una meta y registrar avance manual

**Para qué sirve:** seguir un objetivo asignado o personal. No se completa automáticamente por las ventas registradas.

**Quién puede hacerlo:** Admin crea asignadas; colaborador crea personales y actualiza avance de las propias, incluidas asignadas, según acciones disponibles.

**Dónde está:** **Personal → Metas → Nueva meta**; colaborador: **Mis metas → Crear meta personal**.

**Antes de empezar:** determina objetivo, unidad, periodo y responsable. Las metas personales no se reasignan como metas de equipo.

**Paso a paso:**

1. Pulsa **Nueva meta** (Admin) o **Crear meta personal** (colaborador).
2. Admin selecciona **Empleado**; el colaborador no selecciona a otra persona.
3. Completa título, descripción y, si corresponde, meta numérica/unidad e inicio/fecha límite.
4. Pulsa **Guardar meta** y verifica **Activa** y origen **Asignada** o **Personal**.
5. Para actualizar, pulsa **Avance**, escribe **Nuevo avance** y **Registrar avance**. Es el valor acumulado nuevo, no un incremento que se suma al anterior.
6. Para finalizar una meta activa, pulsa **Completar**, revisa confirmación y **Completar** de nuevo. Llegar al valor objetivo no sustituye este cierre manual.
7. Admin edita/cancela según permisos; colaborador puede editar/cancelar una Personal activa, pero no redefinir/cancelar una Asignada del administrador. Para editar: **Editar → modificar definición → Guardar meta**. Para cancelar: **Cancelar → Razón de cancelación** (obligatoria para Admin; opcional para personal del colaborador) **→ Cancelar meta**. Revisa Cancelada antes de salir.
8. Usa filtros de origen, estado, búsqueda, empleado (Admin) y fechas para localizar metas.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Empleado | Responsable de meta asignada | Asesor correspondiente |
| Título / Descripción | Objetivo y alcance | Seguimiento de propuestas |
| Meta numérica | Valor objetivo opcional, positivo | 10, sólo ejemplo |
| Unidad | Qué cuenta el número | propuestas |
| Inicia / Fecha límite | Periodo del objetivo | Fechas acordadas |
| Nuevo avance | Total acumulado que reemplazas al guardar | De 2 a 4: escribe 4, no 2 |

**Resultado esperado:** avance visible y cierre explícito. **Vencida** describe fecha superada; no significa Completada.

**Qué hacer después:** revisa la siguiente prioridad de Inicio; conserva evidencia de cómo mediste el avance.

**Problemas frecuentes:** sin meta numérica existe seguimiento manual; no inventes un porcentaje. No asumas que el sistema cuenta ventas para actualizar una meta ni uses una meta para cambiar comisiones.

<a id="comisiones"></a>

## 27. Comisiones

### Consultar comisiones y su origen

**Para qué sirve:** revisar el historial real de comisión por venta, producto y colaborador.

**Quién puede hacerlo:** Admin consulta equipo; colaborador autorizado consulta las propias.

**Dónde está:** **Análisis → Comisiones**; colaborador: **Mi espacio → Mis comisiones**.

**Antes de empezar:** distingue el historial de comisión de un pago al empleado. La pantalla no realiza una liquidación ni transferencia bancaria.

**Paso a paso:**

1. Admin busca por colaborador, venta, producto o SKU y filtra estado, sede histórica y fechas.
2. Pulsa **Ver detalle** para revisar venta, producto/variante, cantidad, tarifa por unidad, monto, fechas y motivo de anulación si existe.
3. Colaborador revisa **Ganadas este mes**, **Pendientes**, **Anuladas**, unidades y su lista; usa Estado/Desde/Hasta.
4. Si no hay registros, comprueba venta, vendedor asignado y configuración de comisión del producto; no crees una comisión manual desde esta pantalla.

**Qué significa cada dato:**

| Dato | Qué significa | Ejemplo |
|---|---|---|
| Pendiente | Venta confirmada todavía no completada | Atención en curso |
| Ganada | Venta completada | No equivale a comisión ya pagada al empleado |
| Anulada | Venta cancelada antes de quedar ganada | Motivo histórico conservado |
| Por unidad / Cantidad / Total | Tarifa histórica × unidades del registro | $35.000 × 1, sólo ejemplo |
| Sede histórica | Sede de la venta, no reasignación actual del empleado | Lugar de esa atención |

**Resultado esperado:** historial de consulta, generado por el ciclo de venta. Cambiar la tarifa actual de producto no permite editar este historial como una venta nueva.

**Qué hacer después:** ante duda revisa la venta y coordina con el administrador; no reabras/copies la venta para producir otra comisión.

**Problemas frecuentes:** no toda venta genera comisión: requiere configuración aplicable y vendedor asociado. No interpretes “Pagada” de la venta como “Ganada” ni “Ganada” como transferencia al colaborador.

<a id="reportes"></a>

## 28. Ocho reportes

### Consultar y exportar un reporte

**Para qué sirve:** analizar operaciones y descargar resultados con filtros definidos.

**Quién puede hacerlo:** Admin con reportes; los datos financieros requieren su autorización correspondiente.

**Dónde está:** **Análisis → Reportes**.

**Antes de empezar:** elige la pregunta de negocio y la sede/periodo. Los clientes son globales; filtrar sede limita actividad comercial, no cambia su propietario.

**Paso a paso:**

1. Elige una familia en **Reporte**.
2. Selecciona **Sede** y los filtros específicos de la tabla siguiente.
3. Revisa fechas, **Ordenar por** y **Dirección**.
4. Pulsa **Aplicar filtros**. Espera los resultados y comprueba el alcance mostrado.
5. Lee métricas, notas y filas; utiliza **Anterior / Siguiente** si hay varias páginas.
6. Pulsa **Exportar Excel** y espera la descarga. Comprueba el archivo recibido y evita compartir información interna fuera del equipo autorizado.
7. Al cambiar familia, la sede se conserva, pero fechas y filtros específicos se restablecen a los valores de esa familia. Revísalos y vuelve a aplicar; no asumas persistencia total.
8. Usa **Limpiar filtros** para volver a los valores predeterminados.

**Qué significa cada familia y sus filtros:**

| Reporte | Para qué sirve / resultado | Filtros específicos reales, además de sede y orden |
|---|---|---|
| Ventas | Ventas por periodo/origen, totales y filas de cliente/vehículo/pago; financieros si autorizados | Desde/Hasta, Origen CRM/Ecommerce, Estado de pago, Buscar; orden Fecha/Total |
| Productos | Unidades, ingresos mostrados como Revenue, descuentos y órdenes distintas por artículo o SKU | Desde/Hasta, Origen, Agrupar por Producto o SKU / Variante; orden Cantidad/Revenue/Órdenes. No tiene Buscar propio |
| Pagos | Pagos, monto recibido y desglose de pagos completados por método | Desde/Hasta, Método, Estado, Buscar; orden Fecha/Monto |
| Cartera | Órdenes con saldo, total pagado, pendiente y antigüedad | Desde/Hasta de las ventas, Estado Sin pago/Parcial, Buscar; orden Pendiente/Fecha de venta/Antigüedad |
| Inventario | Posiciones actuales, cantidad, mínimo, stock bajo y agotados | Estado Todos/Normal/Stock bajo/Agotado, Buscar; orden Nombre/SKU/Stock. No usa rango de fechas |
| Movimientos | Cambios registrados, entradas/salidas, saldo anterior/posterior y referencias | Desde/Hasta, Tipo, Buscar; orden Fecha/Cambio |
| Cotizaciones | Creadas, convertidas, resueltas, vigencia y conversión sobre resueltas | Desde/Hasta, Estado, Conversión Todas/Convertidas/No convertidas, Buscar; orden Creación/Vigencia/Total/Conversión |
| Clientes | Registro global, activos, nuevos y compradores/atendidos del periodo | Desde/Hasta, Estado Activos/Inactivos, Comprador Sí/No/Todos, Buscar; orden Fecha de alta/Compras/Total comprado/Última compra |

**Qué significa cada campo común:** Desde/Hasta delimitan el periodo de la familia, no fechas universales para todo; Sede limita contexto; Dirección ordena ascendente/descendente; Buscar busca en la familia elegida, no en todo el CRM.

**Resultado esperado:** reporte filtrado y archivo Excel del alcance aplicado. **Pagos** resume completados y advierte que los reembolsos no se descuentan de ese resumen en esta fase. **Movimientos** no constituye una conciliación histórica completa de inventario. Costos históricos incompletos no deben interpretarse como utilidad de cobertura total.

**Qué hacer después:** investiga diferencias en Órdenes/Inventario, no modifiques cifras desde reportes.

**Problemas frecuentes:** Desde posterior a Hasta se rechaza; corrige y vuelve a aplicar. “Sin datos” puede deberse al periodo/sede. Si cambias filtros sin aplicar, no asumas que la pantalla ya los representa. Si falla exportación, revisa descarga/error antes de pulsar otra vez.

<a id="notificaciones"></a>

## 29. Notificaciones

### Leer y localizar una novedad

**Para qué sirve:** reconocer alertas personales y abrir el registro relacionado cuando exista una acción.

**Quién puede hacerlo:** Admin y Usuario con notificaciones propias.

**Dónde está:** **Análisis → Notificaciones** (Admin) o **Mi espacio → Notificaciones**; también desde el acceso de campana cuando aparece.

**Antes de empezar:** el contador representa no leídas, no operaciones pendientes de resolver.

**Paso a paso:**

1. Elige **No leídas** o **Todas**.
2. Lee título, mensaje, fecha y datos relacionados.
3. Pulsa **Marcar como leída**. Si hay botón de acción del registro, úsalo para abrirlo según tu permiso; esa navegación también puede marcarla como leída.
4. Comprueba **Leída** y la reducción del contador.
5. Usa **Marcar todas como leídas** sólo cuando corresponda; no resuelve los hechos que describen.

**Qué significa cada control:** No leídas filtra novedades; Todas incluye histórico; marcar cambia lectura personal, no stock/pago/venta.

**Resultado esperado:** contador y estado personal actualizados.

**Qué hacer después:** resuelve la operación en su módulo autorizado. Una alerta leída todavía puede requerir trabajo.

**Problemas frecuentes:** un enlace relacionado puede no estar disponible para tu perfil o el estado actual del registro. No solicites una cuenta Admin sólo para abrir toda notificación.

<a id="configuracion"></a>

## 30. Configuración y usuarios

### Modificar información del negocio y valores comerciales

**Para qué sirve:** mantener identidad, contactos y valores predeterminados del CRM.

**Quién puede hacerlo:** Admin autorizado; con consulta sin edición se muestra **Modo de solo lectura**.

**Dónde está:** **Administración → Configuración → General / Ventas y cotizaciones**.

**Antes de empezar:** acuerda el cambio. No todas las secciones del negocio están dentro de Configuración: Sedes, Categorías y Marcas y vehículos tienen entradas propias.

**Paso a paso:**

1. Abre **General**, revisa datos actuales y modifica sólo lo acordado.
2. Revisa Moneda y Zona horaria, que se presentan como configuración regional; la operación usa hora de Colombia.
3. Pulsa **Guardar cambios**, espera el mensaje y revisa última actualización/autor.
4. En **Ventas y cotizaciones**, modifica **Vigencia predeterminada de cotizaciones** o **Email para nuevas órdenes ecommerce** cuando corresponda.
5. Pulsa **Guardar cambios**, vuelve a consultar y comprueba persistencia. No cierres una pestaña con cambios pendientes esperando que se guarden solos.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Nombre comercial * | Identidad del negocio | Upgrade La 79 |
| Razón social / NIT | Datos legales del negocio | Datos autorizados del negocio |
| Teléfono / Email de contacto / WhatsApp | Canales de contacto configurados | Canales oficiales |
| Dirección / Ciudad | Datos del establecimiento | Ubicación real |
| Moneda / Zona horaria | Contexto regional mostrado | COP / Colombia |
| Vigencia predeterminada de cotizaciones | Días positivos aplicados a nuevas propuestas sin fecha explícita | Valor aprobado por administración, no un plazo fijo de este manual |
| Email para nuevas órdenes ecommerce | Destinatario interno de novedades de pedidos; puede quedar vacío | Correo operativo autorizado |

**Resultado esperado:** configuración guardada. Cambiar vigencia no reescribe fechas de propuestas existentes. Guardar datos generales no garantiza que todo texto promocional o cada sección pública cambie automáticamente.

**Qué hacer después:** comprueba una nueva cotización cuando haya trabajo legítimo que requiera crearla. Mantén los canales reales correctos; no envíes pedidos de prueba a clientes para verificar configuración.

**Problemas frecuentes:** vigencia cero/negativa o email inválido deben corregirse. Botón bloqueado puede indicar que no hay cambios o que no tienes edición. No existen aquí controles de claves de proveedores o mantenimiento técnico que el usuario deba inventar.

### Crear o editar una cuenta interna

**Para qué sirve:** administrar quién puede iniciar sesión.

**Quién puede hacerlo:** Admin con gestión de usuarios/roles según acción.

**Dónde está:** **Configuración → Usuarios**.

**Antes de empezar:** busca por nombre/email. Define si necesita Admin o Usuario; no confundir cuenta con empleado.

**Paso a paso:**

1. Filtra búsqueda, rol o estado y pulsa **Aplicar**.
2. Pulsa **Nuevo usuario** y completa Nombre, Email, Rol, Contraseña y Confirmar contraseña.
3. Revisa **Usuario activo** y pulsa **Crear usuario**.
4. Para modificar una cuenta, pulsa **Editar → Guardar cambios**. En edición no se ofrece aquí cambio de contraseña de otra persona.
5. Para impedir ingreso de una cuenta ajena cuando está autorizado, desmarca **Usuario activo** y guarda. No la confundas con desactivar empleado.
6. Vincula la cuenta al empleado desde **Empleados** si necesita espacio operativo personal.

**Qué significa cada campo:** nombre/email identifican acceso; Rol elige Administrador o Usuario; contraseña/confirmación son clave inicial; Usuario activo permite ingreso. No existe un tercer rol Super Admin ni un editor de permisos comerciales individuales en esta pantalla actual.

**Resultado esperado:** cuenta creada/actualizada; crear Usuario no concede por sí solo ventas/cotizaciones propias. Solicita al responsable autorizado revisar esos permisos mediante el proceso habilitado por el negocio, sin enseñar procedimientos técnicos al usuario.

**Qué hacer después:** pide a la persona entrar con su cuenta, revisar su sede y cambiar clave desde Mi perfil.

**Problemas frecuentes:** email duplicado: localiza la cuenta existente. Tu propio rol/estado están protegidos en esta edición: usa **Mi perfil** para datos personales. No existe un botón “activar todas las capacidades” que este manual pueda indicar.

<a id="perfil"></a>

## 31. Mi perfil y contraseña

### Actualizar datos personales o cambiar clave

**Para qué sirve:** mantener tu identidad de acceso sin cambiar tu rol/permisos.

**Quién puede hacerlo:** cualquier cuenta interna activa sobre su propio perfil.

**Dónde está:** acceso de cuenta → **Mi perfil**; en el menú personal aparece **Mi perfil**.

**Antes de empezar:** para clave, conoce la contraseña actual y elige una privada.

**Paso a paso:**

1. Abre **Mi perfil** y revisa **Información personal**.
2. Cambia **Nombre** o **Email**, si corresponde, y pulsa **Guardar perfil**. Verifica el mensaje.
3. En **Cambiar contraseña**, introduce Contraseña actual, Nueva contraseña y Confirmar nueva contraseña.
4. Pulsa **Cambiar contraseña** y espera la confirmación. La sesión permanece activa tras el cambio.
5. Para cerrar la jornada, pulsa **Salir**.

**Qué significa cada campo:** Nombre/Email son de tu cuenta; Rol es de consulta; Contraseña actual verifica identidad; Nueva y Confirmar deben coincidir.

**Resultado esperado:** datos o clave actualizados, sin cambiar sede, nombre operativo del empleado ni autorización comercial.

**Qué hacer después:** usa el nuevo correo/clave en el próximo ingreso; no los envíes por capturas o archivos compartidos.

**Problemas frecuentes:** correo usado por otra cuenta, clave actual incorrecta o confirmación diferente: corrige el campo y reintenta una vez. Si olvidaste la clave, contacta al administrador; este formulario necesita la actual.

<a id="colaborador"></a>

## 32. Jornada del colaborador

Este capítulo se puede seguir sin leer primero los procedimientos Admin. Utiliza tu cuenta Usuario vinculada a tu empleado activo y verifica tu sede. Ventas, cotizaciones y comisiones pueden no estar habilitadas para todos los colaboradores. No ver un módulo no significa que debas usar otra cuenta.

### 32.1 Empezar desde Inicio

**Para qué sirve:** identificar la siguiente cita, tarea, meta y actividad comercial propia.

**Quién puede hacerlo:** colaborador; una cuenta limitada verá sólo lo permitido.

**Dónde está:** **Mi espacio → Inicio**.

**Antes de empezar:** entra con **Email → Contraseña → Entrar al CRM**. Verifica identidad y sede; si faltan, pide revisión del vínculo.

**Paso a paso:**

1. Revisa **Prioridades → Lo siguiente en tu día**: cita próxima, tarea pendiente y meta activa.
2. Abre **Ver calendario** para preparar atención o **Ver tareas** para empezar el trabajo.
3. Revisa **Resumen comercial**: cotizaciones en borrador, ventas pendientes y comisiones del mes si tienes permiso.
4. Usa **Mis cotizaciones** o **Mis ventas** para actuar sobre esos registros; las tarjetas de Inicio no cambian sus estados.
5. Revisa **Notificaciones** y sus accesos relacionados. Una tarjeta vacía con explicación puede significar que estás al día.

**Qué significa cada dato:** próxima cita = compromiso dentro del horizonte mostrado; tarea vencida = trabajo pendiente pasado de fecha; meta activa = objetivo sin cerrar; resumen comercial = datos propios, no todas las ventas de tu sede.

**Resultado esperado:** prioridades reconocidas sin consultar todos los módulos.

**Qué hacer después:** abre el registro indicado y actúa allí. No empieces una venta nueva para “resolver” una venta pendiente ya existente.

**Problemas frecuentes:** un bloque que falla puede reintentarse sin repetir los demás. Si falta empleado/sede o permisos comerciales, pide revisión al administrador; Inicio no permite asignártelos.

### 32.2 Mi calendario y Resumen del negocio

**Para qué sirve:** preparar tu jornada y comprender actividad operativa permitida.

**Quién puede hacerlo:** Usuario autorizado; calendario personal requiere vínculo operativo.

**Dónde está:** **Mi espacio → Mi calendario / Resumen del negocio**.

**Antes de empezar:** conoce el periodo que vas a consultar. La sede deriva de tu empleado, no de un selector comercial libre.

**Paso a paso:**

1. En **Mi calendario**, elige **Semana** o **Agenda**; usa **Hoy**, **Anterior** y **Siguiente**.
2. Filtra fuentes cuando sea necesario y abre eventos para revisar horario, cita/tarea y contexto. No modificas aquí las citas de otros empleados.
3. En **Resumen del negocio**, selecciona **Desde / Hasta → Aplicar**, o **Mes actual**. Usa **Actualizar** para consultar otra vez.
4. Revisa contexto de empleado/sede/periodo, **Actividad de la compañía**, **Actividad de mi sede actual** y **Mi desempeño** disponible.
5. Interpreta ventas confirmadas, unidades, cotizaciones, conversión sobre resueltas y clientes atendidos. Estos agregados no dan acceso al detalle ajeno ni a ingresos/costos/márgenes globales.

**Qué significa cada campo:** fechas = periodo consultado; fuentes = tipos de agenda; sede actual = asignación de tu empleado; desempeño personal = datos propios autorizados. No hay campo para escoger una sede de venta diferente.

**Resultado esperado:** agenda propia y resumen operativo permitido, no Dashboard financiero de Admin.

**Qué hacer después:** prepara tu atención y consulta tus documentos comerciales.

**Problemas frecuentes:** rango invertido: corrige fechas. Sin vínculo operativo puede faltar información propia. Los totales de compañía no autorizan abrir ventas de otros colaboradores.

### 32.3 Crear, enviar y convertir mi cotización

**Para qué sirve:** preparar y cerrar una propuesta propia sin repetir datos en una venta.

**Quién puede hacerlo:** colaborador con permisos propios de consulta, creación, edición, envío y conversión; pueden concederse por separado.

**Dónde está:** **Mi espacio → Mis cotizaciones → Nueva cotización**.

**Antes de empezar:** empleado activo con sede vinculada y lista de conceptos acordados. Cotizar no reserva inventario.

**Paso a paso:**

1. Comprueba **Sede actual** y pulsa **Nueva cotización**.
2. Busca producto, variante o SKU con al menos dos caracteres, o limpia la búsqueda para explorar. Selecciona producto simple o la variante específica.
3. Busca y agrega servicios activos disponibles. Ajusta **Cantidad** y **Descuento** de cada línea; **Quitar** retira una línea del borrador.
4. En Cliente, elige **Cliente registrado** y busca por nombre, contacto, documento o placa; selecciona un resultado y **Vehículo (opcional)**. Usa **Cambiar** si seleccionaste otro cliente.
5. Si no hay registro reutilizable y corresponde, elige **Cliente ad hoc**, completa Nombre, Email, Teléfono y Ciudad. **Venta mostrador** deja el documento sin cliente persistente.
6. Completa **Válida hasta** y **Notas**; vacío aplica el valor comercial configurado. Revisa total aproximado y pulsa **Crear cotización**.
7. Busca número/cliente y usa **Estado / Desde / Hasta → Aplicar** para localizarla. Abre **Ver cotización**.
8. En **Borrador**, usa **Editar → Guardar cambios** para corregir. Después **Enviar cotización** y confirma: pasa a Enviada y queda congelada para la edición propia. Cambiar estado no garantiza entrega por correo/WhatsApp.
9. Cuando se acepte, pulsa **Convertir en venta** y confirma. También puede ofrecerse en Borrador; comprueba la decisión comercial antes de usarlo.
10. Verifica **Convertida** y **Venta generada**; abre **Mis ventas** para continuar. No vuelvas a crear las líneas del mismo negocio.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Buscar producto, variante o SKU | Selección de concepto comercial; disponibilidad en cotización es orientativa | Nombre del radio |
| Buscar servicio | Mano de obra disponible | Instalación |
| Cantidad / Descuento | Unidades y rebaja monetaria por línea | 1 / descuento autorizado |
| Cliente registrado / Vehículo (opcional) | Reutilizar datos existentes | Cliente habitual y automóvil |
| Nombre / Email / Teléfono / Ciudad | Datos ad hoc de este documento | Contacto proporcionado |
| Válida hasta / Notas | Vigencia explícita y alcance | Fecha acordada |
| Buscar / Estado / Desde / Hasta | Localizar cotizaciones propias | Buscar su número |

**Resultado esperado:** cotización propia con sede derivada de tu empleado. Convertir valida stock de esa sede y genera una venta confirmada con los datos de la propuesta.

**Qué hacer después:** registra pago real y completa la atención en la venta generada.

**Problemas frecuentes:** sin sede no puedes crear; producto cotizado sin stock puede fallar al convertir; propuesta vencida/convertida o servicio indisponible exige revisar el caso. No elijas otra sede por enlaces ni cambies una Enviada como si fuera Borrador editable.

### 32.4 Mi venta directa, confirmación, pago y terminación

**Para qué sirve:** registrar una venta propia y su atención, manteniendo separados dinero e inventario.

**Quién puede hacerlo:** colaborador con cada permiso comercial propio requerido.

**Dónde está:** **Mi espacio → Mis ventas → Nueva venta**; una venta convertida ya está allí.

**Antes de empezar:** verifica sede actual y que no exista otra venta por esa operación.

**Paso a paso:**

1. Pulsa **Nueva venta**.
2. Busca productos/variantes. La disponibilidad utiliza el stock exacto de tu sede; artículos agotados en ella no se habilitan por tener stock en otra.
3. Agrega servicios disponibles; ajusta Cantidad/Descuento y datos de Cliente registrado/vehículo, ad hoc o Venta mostrador como en el formulario propio de cotización.
4. Completa **Notas**, revisa total y pulsa **Crear venta pendiente**. Todavía no descuenta inventario; no se incluye pago inicial en este formulario propio.
5. Abre **Ver venta**, comprueba **Pendiente** y pulsa **Confirmar venta** cuando proceda. Acepta la confirmación: se vuelve a validar y descuenta stock de tu sede. Una venta convertida ya Confirmada no necesita esa confirmación otra vez.
6. Si recibiste dinero y tienes permiso, pulsa **Registrar pago**, completa **Monto**, **Método**, **Referencia** y **Notas**, y pulsa **Registrar pago** una vez.
7. Comprueba saldo y estado financiero. Puedes registrar abonos reales sucesivos sobre el saldo actualizado; no agregues dinero para cambiar el estado visual.
8. Cuando la atención haya terminado, pulsa **Completar venta** y acepta la confirmación. Revisa **Completada** y el estado de pago por separado.
9. Usa búsqueda, Estado/Desde/Hasta y **Aplicar** para encontrar tus ventas. No se ofrece aquí cancelar ventas de equipo ni gestión administrativa global.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Datos comerciales y cliente | Conceptos y contacto del formulario propio | Cliente registrado para reutilizar vehículo |
| Notas | Contexto del documento | Alcance de atención |
| Monto | Pago real de este momento, máximo saldo | Abono recibido |
| Método | Efectivo, Transferencia, Datáfono, Wompi u Otro | Medio efectivamente usado |
| Referencia / Notas del pago | Soporte y contexto del cobro | Comprobante verificado |
| Sede histórica / Saldo | Lugar de esa venta / dinero pendiente | No se modifica para usar otra sede |

**Resultado esperado:** Pendiente → Confirmada → Completada en operación; Sin pagar → Pago parcial → Pagada en dinero. Completar puede estar permitido aunque haya saldo; no afirma que esté pagada.

**Qué hacer después:** revisa comisión si el producto y asignación la generan; comunica saldo al proceso de cobro del negocio.

**Problemas frecuentes:** si la confirmación falla por stock, coordina reposición/traslado con Admin; no cambies sede ni hagas ajustes. Si el pago tiene respuesta incierta, revisa pagos de esa venta antes de repetir. Para cancelación o corrección administrativa, solicita revisión del Admin; no existe un botón propio nuevo de devolución/borrado.

### 32.5 Mis tareas, Mis metas y Mis comisiones

**Para qué sirve:** resolver trabajo pendiente, documentar objetivos y consultar comisión propia.

**Quién puede hacerlo:** colaborador vinculado, con los permisos aplicables.

**Dónde está:** **Mi espacio → Mis tareas / Mis metas / Mis comisiones**.

**Antes de empezar:** comprueba que el registro te corresponde; no compartas tu sesión para actualizar el trabajo de otro.

**Paso a paso:**

1. **Mis tareas:** filtra Estado/Prioridad/Vencen desde/hasta; abre **Ver detalle**, lee descripción y programación. Pulsa **Iniciar** al empezar y **Completar** al terminar. No puedes crear/reasignar tareas del equipo desde este módulo.
2. **Mis metas:** filtra **Asignada / Personal** y estado. En una activa, pulsa **Avance**, escribe **Nuevo avance** acumulado y **Registrar avance**. Para terminar, **Completar → Completar**.
3. Para objetivo propio, **Crear meta personal**, completa Título/Descripción/Meta numérica/Unidad/Inicia/Fecha límite y **Guardar meta**. Puedes editar/cancelar las personales activas; no redefinir o cancelar las asignadas por Admin.
4. **Mis comisiones:** revisa resumen mensual y lista; filtra Estado/Desde/Hasta. Pendiente deriva de venta confirmada; Ganada de venta completada; Anulada de cancelación antes de ganarse.
5. Si falta un resultado, consulta la venta propia y pide revisión: no hay botón para crear/editar una comisión.

**Qué significa cada campo:** prioridad ordena trabajo; vencimiento no reserva agenda; avance es total acumulado; meta numérica es objetivo opcional; comisión por unidad es tarifa histórica. Ejemplo $35.000 no establece tarifa de todas las ventas.

**Resultado esperado:** tarea/metas actualizadas y comisión consultada, sin acceso a registros ajenos ni liquidación automática al empleado.

**Qué hacer después:** vuelve a Inicio para reconocer la siguiente prioridad.

**Problemas frecuentes:** vacíos pueden indicar falta de asignación o filtros; vínculo ausente requiere Admin. Una comisión Ganada no significa que ya fue transferida al empleado.

### 32.6 Notificaciones, perfil y salida

**Para qué sirve:** atender novedades y mantener acceso personal seguro.

**Quién puede hacerlo:** cuenta interna sobre su propia información.

**Dónde está:** **Mi espacio → Notificaciones / Mi perfil** y **Salir**.

**Antes de empezar:** no publiques datos de tu cuenta ni información del cliente.

**Paso a paso:**

1. En Notificaciones, elige **No leídas**, lee cada novedad y usa **Marcar como leída** o su acción relacionada autorizada.
2. En Mi perfil, actualiza Nombre/Email con **Guardar perfil**.
3. Para clave, completa Contraseña actual/Nueva contraseña/Confirmar nueva contraseña y **Cambiar contraseña**.
4. Termina con **Salir**, especialmente en equipos compartidos.

**Qué significa cada campo:** correo/clave son de tu cuenta; rol es de consulta; lectura de una notificación no resuelve una tarea o pago.

**Resultado esperado:** novedades revisadas y sesión cerrada al salir.

**Qué hacer después:** usa sólo tu cuenta en la próxima jornada.

**Problemas frecuentes:** permisos denegados, sede distinta a la esperada o empleado no vinculado requieren revisión; no se resuelven abriendo módulos Admin o modificando enlaces.

<a id="administrador"></a>

## 33. Jornada del administrador

La siguiente secuencia es una recomendación de uso, no una nueva política del negocio.

1. Entra con tu cuenta; en **Dashboard**, revisa General/sede, por cobrar y stock crítico.
2. Abre **Notificaciones** y **Conciliaciones de pagos** para distinguir novedades de discrepancias financieras. No cierres casos sin evidencia.
3. Consulta **Calendario / Citas** y disponibilidad del equipo; incorpora Horarios/Ausencias cuando haya cambios aprobados.
4. Desde **Clientes**, registra o reutiliza cliente/vehículo y abre **Nueva cotización** o **Nueva venta**. Evita pedir otra vez datos existentes.
5. En **Órdenes**, revisa ventas confirmadas sin terminar y saldos. Registra únicamente pagos verificados y completa sólo atenciones terminadas.
6. En **Inventario**, comprueba stock bajo; registra recepciones reales o gestiona Transferencias hasta recepción.
7. Mantén fichas/fotos/publicación desde **Catálogo publicado**, y listas desde **Marcas y vehículos**. No confundas mantenimiento de catálogo con movimientos.
8. En **Tareas / Metas**, asigna trabajo y revisa avance. En **Empleados**, verifica acceso/sede sin compartir credenciales.
9. Consulta **Reportes** para la pregunta y periodo específicos; revisa Comisiones con su venta de origen.
10. Al cerrar jornada, comprueba resultados pendientes, comunica incidencias y pulsa **Salir**.

<a id="flujo-comercial"></a>

## 34. Cliente → vehículo → cotización → venta → pago

### Atender una operación conectada sin duplicar datos

**Para qué sirve:** conservar trazabilidad desde contacto hasta atención y cobro.

**Quién puede hacerlo:** Admin; colaborador realiza las partes propias autorizadas.

**Dónde está:** **Clientes → detalle → Vehículos → Nueva cotización → Cotizaciones → Órdenes**.

**Antes de empezar:** cliente/vehículo activos, sede correcta y disponibilidad validable para la venta.

**Paso a paso:**

1. Busca cliente; si no existe, **Nuevo cliente → Crear cliente**.
2. Abre detalle y, si falta, **Agregar vehículo → Guardar vehículo**.
3. Desde ese detalle, pulsa **Nueva cotización**. Verifica cliente y vehículo cargados, sede, conceptos, vigencia y total; **Crear cotización**.
4. Abre la propuesta; corrige con **Editar → Guardar cambios** mientras sea editable. Registra **Marcar como enviada** si ya la compartiste por el canal acordado.
5. Ante aceptación, **Convertir en venta → Confirmar**. Comprueba venta generada, cliente/vehículo y precios conservados.
6. Abre la venta en **Órdenes**, verifica Confirmada y stock de su sede; no agregues salida manual.
7. **Registrar pago → monto/método/soporte → Registrar pago** para cada abono real. Comprueba saldo actualizado.
8. Cuando termine atención/entrega, **Marcar completada**. Comprueba operación y pago de manera independiente.

**Qué significa cada campo:** cliente/vehículo son datos reutilizados; sede es el lugar operativo; cotización conserva condiciones; pago registra dinero; completar registra terminación. Los campos completos están en capítulos 13–17.

**Resultado esperado:** una cadena vinculada, no documentos independientes recreados. Convertir descuenta inventario validado y no registra dinero inexistente.

**Qué hacer después:** revisa historial, cartera y comisión generada si aplica.

**Problemas frecuentes:** si falla conversión, mantén la propuesta y revisa la causa. Si parece que una solicitud quedó incierta, consulta su venta generada antes de convertir otra vez.

<a id="flujo-producto"></a>

## 35. Producto → publicación → stock → traslado

### Habilitar un artículo en la operación y tienda

**Para qué sirve:** preparar la ficha y abastecimiento sin inventar disponibilidad.

**Quién puede hacerlo:** Admin con catálogo e inventario.

**Dónde está:** **Inventario / Catálogo publicado / Transferencias / Tienda**.

**Antes de empezar:** datos e imágenes comprobados y unidades físicas contadas.

**Paso a paso:**

1. Revisa o crea categoría y marcas/vehículos compartidos cuando falten.
2. **Inventario → Crear producto**: ficha, fotos, una principal, compatibilidad y precio; configura variantes si corresponden.
3. Revisa activo/visible; **Guardar y asignar inventario** guarda ficha y abre entrada.
4. Registra stock de BAQ con sede/artículo/cantidad/motivo y **Ajustar existencias**; registra por separado BOG si también recibió unidades.
5. Verifica **Existencias → sede** y **Movimientos** por cada ingreso.
6. En **Catálogo publicado → Configurar publicación → Guardar publicación**, comprueba visibilidad/destacado; fotos y stock son verificaciones separadas.
7. Si necesitas mover unidades ya existentes, **Transferencias → Nueva transferencia → Solicitar transferencia → Ver detalle → Despachar → Confirmar recepción** tras los hechos físicos.
8. En la tienda, busca ficha/versión y comprueba foto, precio, compatibilidad y disponibilidad. La red puede tener stock aunque tu sede de venta no.

**Qué significa cada campo:** imagen principal representa el artículo; publicación permite verlo; posición de inventario son unidades de sede/variante; traslado cambia lugar de unidades, no las fabrica.

**Resultado esperado:** ficha publicada elegible y stock trazable; las unidades en tránsito no figuran aún como recibidas en destino.

**Qué hacer después:** comprueba que una sede pueda abastecer un pedido completo antes de prometer recogida.

**Problemas frecuentes:** tienda por defecto filtra stock; un agotado publicado puede aparecer sólo al quitar el filtro. No publiques una ficha sin foto ni registres stock artificial para verla.

<a id="compra"></a>

## 36. Compra pública, entrega, pago y confirmación

El comprador utiliza la tienda como invitado. No necesita cuenta CRM. Filtrar, agregar al carrito y pagar requieren que el navegador tenga las funciones interactivas habilitadas. El dominio futuro no significa que el servicio ya esté publicado allí.

### 36.1 Conocer el negocio y solicitar contacto

**Para qué sirve:** explorar artículos o consultar una transformación/visita antes de decidir.

**Quién puede hacerlo:** cualquier visitante.

**Dónde está:** Inicio → **Explorar artículos / Cotizar transformación / Contacto**.

**Antes de empezar:** conoce tu vehículo y qué deseas mejorar.

**Paso a paso:**

1. En Inicio, revisa la propuesta y los artículos destacados.
2. Pulsa **Explorar artículos** o **Tienda** para comprar. **Cotizar transformación** abre el canal de WhatsApp para consulta.
3. Para visita, pulsa **Contacto**; abre la sección de Inicio aunque vengas de Tienda.
4. En el formulario de visita, selecciona fecha, **Horario preferido** y completa **Nombre**, **Teléfono**, **Vehículo** y **Motivo de la visita (opcional)**.
5. Pulsa **Solicitar visita por WhatsApp**. Revisa y envía el mensaje en WhatsApp si decides hacerlo; abrirlo no es enviar.
6. Espera confirmación del equipo. El horario es preferido/sujeto a confirmación: este formulario no crea por sí solo una cita confirmada del CRM.

**Qué significa cada campo:** fecha/hora = preferencia de visita; nombre/teléfono = contacto; vehículo = contexto; motivo = trabajo consultado.

**Resultado esperado:** solicitud preparada para WhatsApp, no una reserva o compra garantizada.

**Qué hacer después:** confirma condiciones con el equipo; para comprar utiliza tienda y checkout.

**Problemas frecuentes:** fecha pasada, datos faltantes o WhatsApp bloqueado requieren corregir/abrir el canal disponible. No interpretes una solicitud preparada como cita aceptada.

### 36.2 Encontrar producto y elegir versión

**Para qué sirve:** elegir un artículo compatible y disponible.

**Quién puede hacerlo:** visitante público.

**Dónde está:** **Inicio → Tienda** o **Explorar artículos**.

**Antes de empezar:** ten marca, modelo, generación/año y equipo original si condiciona la instalación. Si tienes dudas, consulta antes de pagar.

**Paso a paso:**

1. Escribe producto/marca en **Buscar**.
2. Filtra **Categoría**, **Marca producto** y, si corresponde, **Marca vehículo → Modelo → Versión / generación → Año**.
3. Revisa **Solo productos con stock** y **Solo destacados**. El filtro de stock está activo inicialmente; quítalo para explorar publicados agotados.
4. Ordena por Destacados primero, Más recientes, Menor precio, Mayor precio, Nombre A-Z o Mayor stock. Algunas categorías ofrecen características adicionales como filtros.
5. Usa **Limpiar** o **Limpiar filtros** para retirar restricciones si no hay coincidencias.
6. Abre una tarjeta. En el detalle, revisa título, galería, descripción, especificaciones y compatibilidad. Selecciona miniaturas para ver otras imágenes.
7. Si hay versiones, selecciona **Versión** antes de agregar; revisa su precio, SKU y stock. “Desde” en una tarjeta no significa que todas las versiones cuesten lo mismo.
8. Ajusta cantidad con los controles y pulsa **Agregar al carrito**. Espera el aviso; no repitas el clic suponiendo que no se agregó.

**Qué significa cada campo/control:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Buscar / Categoría / Marca producto | Artículo, familia y fabricante del artículo | Radio / Radios / marca del equipo |
| Marca vehículo / Modelo / Versión / generación / Año | Compatibilidad vehicular registrada | Datos reales de tu automóvil |
| Solo productos con stock / Solo destacados | Disponibilidad de red / promoción | Quitar destacados para ver todos |
| Versión | Variante concreta con precio/stock propios | Configuración que necesitas |
| Cantidad | Unidades a agregar | 1 |
| Miniaturas | Fotos del mismo artículo, no versiones distintas por sí solas | Vista lateral |

**Resultado esperado:** artículo y versión correctos en carrito. Agregar no completa ni paga un pedido.

**Qué hacer después:** abre **Carrito** y revisa el resumen.

**Problemas frecuentes:** sin versión no se puede agregar; versión agotada/cantidad excesiva requiere otra selección disponible. Un filtro de compatibilidad ayuda a explorar, pero no sustituye aclarar requisitos técnicos de montaje. No asumas instalación incluida si la ficha no lo dice.

### 36.3 Revisar carrito

**Para qué sirve:** comprobar qué comprarás y el subtotal antes de dar contacto/entrega.

**Quién puede hacerlo:** comprador invitado en su navegador.

**Dónde está:** navegación pública → **Carrito**.

**Antes de empezar:** agrega un producto/versión válido.

**Paso a paso:**

1. Revisa nombre, versión/SKU, precio y unidades de cada línea.
2. Usa **Reducir cantidad / Aumentar cantidad** para modificar unidades. Comprueba subtotal actualizado.
3. **Quitar** retira una línea; **Vaciar carrito** retira todas. No cancela una orden ya preparada ni revierte pagos.
4. **Seguir comprando** vuelve a Tienda; si está vacío, **Ir a tienda**.
5. Cuando esté correcto, pulsa **Continuar compra**.

**Qué significa cada dato:** subtotal = productos del carrito antes de cargos finales de entrega; cantidad no puede superar disponibilidad elegible; versión identifica exactamente qué equipo compras.

**Resultado esperado:** carrito correcto e inicio de checkout. El subtotal no es una promesa de envío gratuito ni incluye automáticamente todos los cargos del destino.

**Qué hacer después:** elige envío/recogida y contacto.

**Problemas frecuentes:** stock puede cambiar mientras compras. Si una cantidad no se admite, revisa disponibilidad; no abras varios carritos para forzarla.

### 36.4 Preparar orden y elegir forma de entrega

**Para qué sirve:** guardar el pedido y contacto antes de confirmar entrega/cargos.

**Quién puede hacerlo:** invitado con carrito.

**Dónde está:** **Carrito → Continuar compra → Finalizar compra**.

**Antes de empezar:** revisa artículos y proporciona contacto real para tu pedido; no datos de acceso CRM.

**Paso a paso:**

1. Elige **Envío** o **Recoger en sede** en **¿Cómo quieres recibir tu pedido?**.
2. Completa **Nombre completo**, **Correo electrónico** y **Celular / WhatsApp**.
3. Abre **Agregar una nota al pedido (opcional)** sólo si necesitas **Notas adicionales**.
4. Revisa productos/subtotal/total estimado y pulsa **Preparar orden** una vez.
5. Espera el pedido guardado y su número. Preparar no cobra; ahora debes completar entrega y el resumen final.
6. Para recogida sigue 36.5; para envío 36.6. Si cambias modalidad en **Forma de entrega**, confirma nuevamente la opción y valores correspondientes.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Envío / Recoger en sede | Forma de recibir, no método de pago | Recoger personalmente |
| Nombre completo | Contacto principal de la compra | Tu nombre |
| Correo electrónico | Contacto del pedido | Correo que puedes consultar |
| Celular / WhatsApp | Contacto telefónico | Número propio correcto |
| Notas adicionales | Contexto opcional del pedido | Aclaración pertinente, sin claves ni tarjeta |

**Resultado esperado:** orden preparada, no pagada. La pantalla informa qué falta para habilitar pago.

**Qué hacer después:** confirma sede o guarda dirección/calcula/aplica envío. Conserva el número de pedido y la sesión de compra; no compartas su enlace privado públicamente.

**Problemas frecuentes:** carrito vacío exige volver a tienda; datos inválidos deben corregirse. Un fallo de conexión no prueba que no se guardó: revisa si se recupera la orden antes de preparar otra compra. En tablet, si **Volver al carrito** queda tapado por el encabezado, el acceso Carrito del encabezado permite volver; no implica que se pierda automáticamente el pedido.

### 36.5 Recoger en sede

**Para qué sirve:** elegir un punto que pueda abastecer el pedido completo.

**Quién puede hacerlo:** comprador de orden pendiente habilitada.

**Dónde está:** checkout del pedido preparado → **Recoger en sede → Sede de recogida**.

**Antes de empezar:** una sola sede debe disponer de todas las líneas/cantidades. Stock agregado de red no garantiza esta condición.

**Paso a paso:**

1. Espera **Cargando sedes disponibles…**.
2. Revisa nombre y ciudad de las opciones; selecciona la sede correcta.
3. Pulsa **Recoger en esta sede**.
4. Espera **Sede de recogida aplicada** y comprueba resumen final, entrega y total.
5. Si cambias sede, selecciónala y aplícala otra vez; no basta con marcar la opción.
6. Cuando indique **Listo para pagar**, pulsa **Continuar al pago**.

**Qué significa cada control:** Selecciona una sede = punto elegible; Recoger en esta sede = aplicar selección y validar disponibilidad; Sede aplicada = selección guardada, no mercancía ya entregada.

**Resultado esperado:** sede y cargos confirmados. Recogida no exige llenar la dirección de envío ni calcular transportadora.

**Qué hacer después:** paga y coordina recogida siguiendo instrucciones del equipo. No inventes una fecha de entrega por el mero pago.

**Problemas frecuentes:** “No tenemos una sola sede con disponibilidad suficiente…” requiere revisar cantidades/productos o consultar al equipo. **Reintentar** actualiza opciones; no crea stock. Si cambió disponibilidad, reaplica sólo una opción realmente elegible.

### 36.6 Envío: dirección → cotizar → aplicar tarifa

**Para qué sirve:** calcular condiciones/cargos de entrega antes de pagar.

**Quién puede hacerlo:** comprador de orden pendiente habilitada.

**Dónde está:** checkout del pedido preparado → **Envío → Entrega**.

**Antes de empezar:** conoce dirección completa y código postal correcto del destino. No inventes un código para superar validaciones.

**Paso a paso:**

1. Revisa **¿Quién recibe?**. Se reutilizan nombre/teléfono del contacto.
2. Si recibirá otra persona, activa **Recibe otra persona** y completa su nombre/teléfono.
3. Completa País, Departamento/Estado, Ciudad, Código postal y Dirección.
4. Si es necesario, abre **Agregar complemento o indicaciones (opcional)** y completa apartamento/oficina e indicaciones.
5. Pulsa **Guardar dirección**; espera **Dirección guardada**. No se guardan automáticamente cambios mientras escribes.
6. En **Método de envío**, pulsa **Calcular envío** y espera las opciones.
7. Revisa costo y plazo mostrado por cada tarifa disponible, selecciona una y pulsa **Aplicar tarifa**.
8. Espera **Tarifa de envío aplicada** y revisa el **Resumen final**: subtotal, descuentos si existen, cargos y total actualizado.
9. Si cambias dirección, guarda otra vez, calcula nuevamente y aplica la tarifa del nuevo destino. Los valores anteriores no autorizan pago con cambios pendientes.
10. Cuando el resumen indique **Listo para pagar**, pulsa **Continuar al pago**.

**Qué significa cada campo:**

| Campo | Qué significa | Ejemplo |
|---|---|---|
| Nombre / Teléfono de quien recibe | Sólo se solicitan aparte si recibirá otra persona | Contacto autorizado del destinatario |
| País (código de dos letras) | Código del destino, en mayúsculas | CO para Colombia |
| Departamento / Estado | División del destino | Atlántico |
| Ciudad | Ciudad real de entrega | Barranquilla |
| Código postal | Código del destino | Código confirmado para esa dirección |
| Dirección | Calle/carrera y numeración principal | Dirección completa real |
| Apartamento, oficina o complemento | Información adicional para ubicar | Apartamento correspondiente |
| Indicaciones de entrega | Instrucciones útiles | Acceso al inmueble |
| Selecciona una tarifa | Opción de envío cotizada para ese destino | Transportadora/opción disponible |

**Resultado esperado:** dirección guardada, tarifa aplicada y cargos confirmados. Costos/plazos varían por pedido/destino; este manual no fija valores, gratuidad ni días. Los impuestos/aranceles que aparezcan son estimaciones del destino, no asesoría tributaria.

**Qué hacer después:** paga sólo con el total final visible y confirmado.

**Problemas frecuentes:** **Hay cambios pendientes** requiere terminar guardado/aplicación. Si no se calculan todos los impuestos/aranceles, el pago permanece bloqueado; corrige destino o calcula nuevamente como indique la pantalla. Si no hay tarifas/error de servicio, usa **Calcular nuevamente** o consulta al equipo; no cambies a una dirección falsa.

### 36.7 Pagar y entender el retorno

**Para qué sirve:** completar el pago seguro y conocer su resultado sin duplicarlo.

**Quién puede hacerlo:** comprador cuyo pedido esté listo para pagar.

**Dónde está:** **Resumen final → Continuar al pago → pasarela → retorno de pago**.

**Antes de empezar:** entrega/cargos aplicados y total correcto. No envíes tarjeta, clave o códigos bancarios por Notas o WhatsApp.

**Paso a paso:**

1. Comprueba **Listo para pagar** y total; pulsa **Continuar al pago** una vez.
2. Espera **Abriendo pago seguro**. Completa las instrucciones de la pasarela elegida; no se reproduce aquí su formulario bancario variable.
3. Al volver, lee el estado de la misma orden. Volver de la pasarela no prueba aprobación por sí solo.
4. Si indica **Estamos confirmando tu pago**, **Pago pendiente** o **Seguimos esperando la confirmación**, espera y usa **Consultar nuevamente**. No pagues otra vez mientras se confirma.
5. Si indica **Pago rechazado**, comprueba si ofrece **Intentar pago nuevamente**. Ese botón recupera pago sobre la misma orden cuando está habilitado; no prepares otra orden manual para reintentar.
6. Si indica **No pudimos confirmar el resultado** o error de consulta, actualiza y contacta al equipo si persiste, antes de otro cobro. Un error no equivale a rechazo ni aprobación.
7. Si indica **Pago confirmado**, pulsa **Ver mi orden** para revisar confirmación. El pago no significa que la entrega terminó.

**Qué significa cada estado/acción:**

| Mensaje / acción | Qué significa | Qué hacer |
|---|---|---|
| Estamos confirmando tu pago / Seguimos esperando la confirmación | Aún no hay resultado final fiable | Esperar/consultar, no duplicar |
| Pago rechazado | Intento rechazado; orden conserva su situación | Reintentar sólo si el botón está habilitado |
| Intentar pago nuevamente | Nuevo intento permitido en la misma orden | Usarlo una vez, sin recrear pedido |
| No pudimos confirmar el resultado | Incertidumbre, no fallo definitivo | Consultar/contactar antes de pagar |
| Intento de pago anulado | Intento anulado antes de confirmación | Consultar estado antes de continuar |
| Pago confirmado | Dinero confirmado | Ver mi orden y siguientes pasos |
| Pago parcial registrado | Abono, no pago total | Coordinar con equipo |
| Pago devuelto / Orden cancelada | Devolución o cancelación informada | Consultar al equipo si hay duda |

**Resultado esperado:** resultado financiero explícito en el pedido original. Un reintento habilitado no implica comprar dos veces; no compartas el enlace privado del pedido.

**Qué hacer después:** confirma atención/entrega con el equipo; conserva número y soporte. No se promete que la pasarela/proveedor real esté operativo por haber validado el flujo local.

**Problemas frecuentes:** si el botón de reintento no aparece, la orden/estado no lo habilita o sigue confirmándose. No fuerces otra compra para la misma transacción. Si ya te descontaron dinero pero no está confirmado, entrega número/soporte al equipo por canal privado, nunca claves.

### 36.8 Confirmación y seguimiento de la orden

**Para qué sirve:** reconocer número, artículos, entrega, cargos y estado de la compra.

**Quién puede hacerlo:** comprador que conserva su consulta privada del pedido.

**Dónde está:** retorno aprobado → **Ver mi orden**.

**Antes de empezar:** conserva la sesión/enlace privado y número del pedido.

**Paso a paso:**

1. Revisa **Número de orden**, **Estado**, productos/variantes/cantidades y **Total**.
2. Lee el resumen de pago/entrega y cargos cuando estén disponibles; distingue pago confirmado de entrega completada.
3. Pulsa **Consultar nuevamente** para actualizar.
4. **Contactar por WhatsApp** permite consultar al equipo usando el número; revisa el mensaje antes de enviarlo.
5. Si aún corresponde, usa **Reintentar pago** o **Volver al checkout** según las acciones ofrecidas. No toda confirmación muestra todos los botones.
6. Usa **Iniciar nueva compra** sólo para una compra diferente, no para resolver un pago pendiente de la anterior.

**Qué significa cada dato:** número identifica el pedido; estado describe operación; pago describe dinero; total incluye valores confirmados, no sólo subtotal del carrito.

**Resultado esperado:** pedido consultable con siguiente paso. Tras confirmación de pago, el carrito de la compra se limpia; eso no borra el pedido.

**Qué hacer después:** sigue coordinación del equipo para envío/recogida. No existe un portal de cliente autenticado ni seguimiento de transportadora inventado en este manual.

**Problemas frecuentes:** **No encontramos una orden reciente** no prueba que tu compra desapareció. Si ya hubo pago, contacta con número/soporte antes de iniciar otro. Un enlace privado no debe ponerse en redes ni capturas compartidas.

<a id="estados"></a>

## 37. Estados

El significado depende del módulo. No traduzcas “Completada” de una tarea como “Pagada” de una venta.

| Módulo | Estados reales | Interpretación |
|---|---|---|
| Sedes, clientes, empleados, servicios y listas | Activo / Inactivo (Activa/Inactiva según entidad) | Habilitación para uso nuevo; no borrado automático del historial |
| Publicación | Publicado / Oculto; destacado por separado | Exposición pública, no stock |
| Inventario | Disponible o Normal, Stock bajo, Agotado | Situación de unidades frente al mínimo en esa sede |
| Transferencia | Solicitada → En tránsito → Recibida; Cancelada si solicitud cancelada | Salida al despachar, entrada al recibir |
| Cotización | Borrador, Enviada, Rechazada, Vencida, Convertida | Propuesta, comunicación registrada y resultado comercial |
| Venta/orden | Pendiente, Confirmada, Completada, Cancelada | Ciclo operativo; confirmar valida/descuenta stock |
| Pago de la orden | Sin pagar, Pago parcial, Pagada, Reembolsada | Situación financiera separada de operación |
| Registro de pago | Pendiente, Completado, Fallido, Reembolsado | Situación de ese pago concreto |
| Retorno público | Pago pendiente/confirmando, Pago rechazado, Pago confirmado, resultado incierto, anulado, devuelto | Feedback de intento/dinero; no entrega física |
| Conciliación | Pendiente de revisión, En revisión, Resuelta | Investigación administrativa; escalar no equivale a resolver |
| Cita | Solicitada, Confirmada, En progreso, Completada, No asistió, Cancelada | Atención y disponibilidad |
| Ausencia | Aprobada / Cancelada | Periodo de no disponibilidad o retirada con historial |
| Tarea | Pendiente, En progreso, Completada, Cancelada | Trabajo operativo; vencimiento puede señalar retraso |
| Meta | Activa, Vencida, Completada, Cancelada; origen Asignada/Personal | Objetivo de avance/cierre manual |
| Comisión | Pendiente, Ganada, Anulada | Derivada de venta confirmada/completada/cancelada; no pago al empleado |
| Notificación | No leída / Leída | Lectura personal, no resolución de la operación |

Mientras se carga o guarda, espera. Vacío explicado no es lo mismo que error: revisa filtros y contexto. Ante error, lee el mensaje y corrige campo, alcance o disponibilidad; no repitas indiscriminadamente una acción que puede haber quedado guardada.

<a id="problemas"></a>

## 38. Problemas frecuentes y recuperación

| Problema observado o validación | Qué comprobar | Recuperación segura | Qué evitar |
|---|---|---|---|
| Producto no se publica sin imagen | Galería y una principal | Añadir foto válida y guardar, u ocultar la ficha | Foto falsa / publicado sin foto |
| Edición parece pedir cargar imágenes | Fotos ya presentes | Conservarlas; cambiar sólo el dato necesario | Reagregar todas y duplicarlas |
| Archivo supera 5 MB / formato inválido | Peso y formato real | Exportar JPEG/PNG/WebP válido y volver a seleccionar | Renombrar archivo ajeno como imagen |
| Producto guardado pero entrada cancelada | Ficha creada, stock no registrado | Buscar ficha → Ajustar existencias | Crear producto otra vez |
| Salida o venta con stock insuficiente | Sede y variante exactas | Reducir a unidades reales o coordinar traslado/recepción | Usar stock de otra sede sin moverlo |
| Ajuste dio saldo inesperado | Tipo y valor de Nueva existencia | Ver movimiento y conteo físico; registrar corrección justificada si corresponde | Hacer múltiples ajustes sin verificar |
| Transferencia en tránsito no aparece en destino | Etapa y recepción física | Recibir completa cuando haya llegado | Entrada manual duplicada |
| Cotización no convierte | Vigencia/estado/sede/producto/servicio/stock | Leer causa, comprobar venta existente y coordinar corrección permitida | Segunda venta duplicada |
| Servicio activo no aparece | Categoría también activa | Revisar ambos estados y permiso | Cambiar un documento histórico para forzar disponibilidad |
| Cita o tarea no disponible | Jornada, ausencia y solapamientos | Elegir horario/responsable válido; excepción sólo si se ofrece y autoriza | Excepción para saltar cualquier conflicto |
| Usuario puede entrar pero no vender | Empleado activo, sede y permiso propio | Solicitar revisión autorizada | Dar rol Admin o compartir login |
| Empleado desactivado todavía tiene cuenta | Estado empleado distinto de usuario | Revisar Usuario activo por separado | Suponer que se cerró el acceso |
| Checkout no deja pagar | Dirección guardada, sede/tarifa aplicada, cargos completos | Completar el paso anunciado y revisar total | Dirección falsa / pago con cambios pendientes |
| No hay sede que abastezca todo | Stock por línea en una sola sede | Revisar carrito o contactar al equipo | Prometer recogida por stock agregado |
| Pago rechazado | Reintento permitido y estado actualizado | Botón de reintento de la misma orden | Crear compra duplicada |
| Pago pendiente o incierto | Último estado y soporte | Consultar nuevamente/contactar antes de otro cobro | Interpretar timeout como rechazo |
| Pago interno pudo quedar guardado | Pagos y saldo de esa venta | Consultar antes de repetir | Doble pago por repetir clic |
| Conciliación no permite decidir | Estado/permiso/justificación/evidencia | Completar soporte o consultar historia actualizada | Resolver para cambiar dinero a mano |
| Reporte vacío o fechas inválidas | Sede, familia, periodo y filtros aplicados | Corregir fechas, aplicar/limpiar | Asumir que faltan registros |
| Acceso denegado | Tu cuenta y autorización | Pedir revisión con módulo/acción concretos | Cambiar enlaces para abrir registros ajenos |
| Consulta falla o muestra datos anteriores | Aviso de error/último estado | Reintentar lectura y esperar resultado estable | Mutar para “refrescar” información |

Al pedir ayuda, indica módulo, acción, mensaje visible, momento y número comercial del registro si existe. No incluyas contraseñas, códigos bancarios, sesiones, enlaces privados o datos completos de tarjetas. Describe el hecho; no afirmes que se cobró o perdió stock sin verificar.

<a id="practicas"></a>

## 39. Buenas prácticas

1. Busca clientes, productos y cuentas antes de crear; reutiliza sus registros.
2. Comprueba sede, SKU y variante antes de vender, mover o trasladar.
3. Cuenta unidades y registra motivos concretos; conserva soportes.
4. Acompaña publicación con foto principal correcta y compatibilidad comprobada.
5. Mantén listas compartidas coherentes; no inventes modelos, generaciones o OEM.
6. Comprueba servicio y categoría activos en nuevas operaciones.
7. Convierte la cotización aceptada y continúa su venta generada.
8. Registra dinero recibido, consulta saldo y termina operación por separado.
9. Sigue una transferencia hasta recepción física; revisa origen y destino.
10. Revisa pagos inciertos y casos de conciliación antes de otro cobro/cierre.
11. Utiliza fechas/hora Colombia y comprueba disponibilidad del responsable.
12. Cierra sesión y utiliza cuenta individual. Comparte reportes sólo con personas autorizadas.

<a id="no-hacer"></a>

## 40. Qué no hacer

- No creer que crear/publicar producto agrega inventario.
- No confundir stock de red con stock de una sede o una variante.
- No realizar salida manual por una venta que ya descontó unidades.
- No registrar entrada manual por una transferencia que recibirás con su propio botón.
- No cancelar un traslado recibido usando un ajuste ficticio.
- No crear otra venta por una cotización ya convertida o otro pedido por un pago pendiente.
- No marcar Pagada para completar atención, ni Completada para ocultar cartera.
- No usar conciliación como reparación financiera automática ni documentar evidencia inexistente.
- No borrar listas/historial sólo para hacer desaparecer un problema.
- No confundir desactivar empleado con cerrar su cuenta de acceso.
- No compartir credenciales ni trabajar como Admin para evitar permisos de colaborador.
- No prometer costos, plazos, instalación, garantía o devolución que no estén confirmados por el negocio.

<a id="glosario"></a>

## 41. Glosario

| Término | Significado práctico |
|---|---|
| CRM | Espacio interno de gestión del negocio |
| Ecommerce | Tienda pública y proceso de compra |
| Producto / artículo | Ficha comercial, no cantidad física |
| Variante / versión | Presentación concreta del artículo, seleccionada para vender |
| SKU / referencia | Código identificador comercial de producto o variante |
| Sede | Ubicación operativa; BAQ Barranquilla, BOG Bogotá |
| Stock / existencia | Unidades del artículo/variante en una sede |
| Mínimo | Umbral local que ayuda a detectar reposición |
| Movimiento | Cambio documentado de inventario con saldos y motivo |
| Transferencia / traslado | Proceso de mover unidades entre sedes |
| Cotización | Propuesta con vigencia, sin consumo de stock |
| Orden / venta | Documento comercial con ciclo operativo |
| Pago / abono | Dinero registrado; puede ser parcial |
| Saldo / cartera | Dinero pendiente de recibir en ventas |
| Conciliación | Investigación documentada de discrepancia de pago |
| Comisión | Historial de importe por venta/unidad, no pago bancario al empleado |
| Compatibilidad | Vehículos/equipos para los que aplica el artículo |
| Generación | Identificación y años de una familia de vehículos de un modelo |
| OEM | Equipo original del fabricante, por ejemplo multimedia del automóvil |
| Principal | Imagen representativa usada en tarjeta/vista previa |
| Galería | Imágenes del producto con orden; una es principal |
| Publicado / oculto | Visible/no visible para el comprador |
| Destacado | Artículo promovido en vitrinas |
| Ad hoc | Datos escritos sólo para ese documento, sin perfil reutilizable automático |
| Histórico / snapshot | Datos conservados del momento de la operación, aunque la ficha actual cambie |
| Override | Excepción administrativa permitida fuera de jornada, con motivo; no permiso para todos los conflictos |
| Revenue / COGS | Textos de reportes: ingresos / costo histórico de artículos vendidos; revisar cobertura antes de interpretar utilidad |

<a id="navegacion-manual"></a>

## 42. Cómo usar este manual y cobertura

Usa el índice inicial para la tarea completa. Las tablas explican campos; “Resultado esperado” y “Qué hacer después” ayudan a comprobar que terminaste el paso correcto. Los asteriscos reproducen campos obligatorios cuando el formulario los señala; los opcionales no deben llenarse con información inventada.

Para consulta rápida: [Administrador](admin-quick-guide.md), [Colaborador](collaborator-quick-guide.md), [Cliente público](customer-guide.md) y [Roles/permisos](roles-permissions.md). Este Markdown es el original preparado para lectura y futura conversión a PDF; no se generó PDF ni material de capacitación de la siguiente fase.

### Cobertura de pantallas administrativas: 25/25

| Pantalla del inventario aprobado | Capítulo |
|---|---|
| Dashboard | 5 |
| Inventario | 7, 10 |
| Movimientos | 11 |
| Transferencias | 12 |
| Categorías | 9 |
| Órdenes/ventas | 16–17 |
| Clientes | 13–14 |
| Cotizaciones | 15 |
| Citas | 20 |
| Calendario | 21 |
| Empleados | 22 |
| Horarios | 23 |
| Ausencias | 24 |
| Tareas | 25 |
| Metas | 26 |
| Catálogo/publicación | 7.3–7.4 |
| Servicios | 19 |
| Conciliaciones | 18 |
| Comisiones | 27 |
| Reportes | 28 |
| Notificaciones | 29 |
| Sedes | 6 |
| Configuración | 30 |
| Perfil | 31 |
| Marcas y vehículos | 8 |

### Cobertura del colaborador: 10/10

| Pantalla | Capítulo |
|---|---|
| Inicio | 32.1 |
| Mi calendario | 32.2 |
| Resumen del negocio | 32.2 |
| Mis cotizaciones | 32.3 |
| Mis ventas | 32.4 |
| Mis comisiones | 32.5 |
| Mis tareas | 32.5 |
| Mis metas | 32.5 |
| Notificaciones | 32.6 |
| Mi perfil | 32.6 |

### Cobertura pública: 8/8

| Pantalla del inventario | Capítulo |
|---|---|
| Home | 36.1 |
| Tienda | 36.2 |
| Producto | 36.2, 7.2 para mantenimiento interno |
| Carrito | 36.3 |
| Checkout | 36.4–36.6 |
| Retorno de pago | 36.7 |
| Confirmación | 36.8 |
| Login interno | 4; aparece en el inventario público por ser accesible sin sesión, no como login de comprador |

### Ocho flujos conectados documentados

| Flujo | Instrucción completa |
|---|---|
| Cliente → vehículo → cotización → venta → pago | 34, detalle 13–17 |
| Producto → stock BAQ → stock BOG → disponibilidad pública | 35, detalle 7 y 10 |
| Stock → transferencia → despacho → tránsito → recepción | 12 |
| Cotización → editar → convertir | 15 y 32.3 |
| Venta → pago → ciclo operativo | 16–17 y 32.4 |
| Pago público → retorno → recuperación | 36.7–36.8 |
| Cita → reprogramar → estado → cancelar | 20 |
| Conciliación → iniciar → decisión → historial | 18 |

### Nota de edición y contraste

La cobertura procede de [screen-inventory.md](screen-inventory.md) y del cierre de [functional-walkthrough.md](functional-walkthrough.md). Se consultó [seo.md](seo.md) sólo para respetar el estado de publicación/dominio; no es instrucción para compradores ni se reabre esa fase.

Los pasos se contrastaron con los formularios, menús, etiquetas y reglas actuales de la aplicación. Esta fase de documentación no repite la auditoría funcional ni certifica todas las combinaciones de permisos o proveedores reales. Las capturas privadas anteriores no se incluyen, para evitar datos de sesión/pedidos y mantener ejemplos genéricos. Los límites reales de interfaz se explican en el capítulo correspondiente, no se inventan botones para cubrirlos.

### Control documental de esta edición

| Comprobación | Resultado |
|---|---|
| Rutas del inventario frente a la aplicación actual | 41 canónicas, 43 contextos de perfil; todas representadas |
| Acciones y etiquetas prioritarias contrastadas con formularios actuales | 54 nombres comprobados, más controles específicos revisados por capítulo |
| Campos, estados, permisos y consecuencias | Revisión dirigida de formularios, presentación de estados y reglas de las operaciones, sin repetir flujos comerciales |
| Evidencia de interfaz | Baseline aprobado y consulta selectiva de registros de navegador conservados de catálogo, inventario, servicios, configuración, citas y conciliación; no se declara navegación nueva 43/43 |
| Correcciones del borrador | Guardar servicio/categoría; campos avanzados sólo en compatibilidad propia de variante; Principal de variante distinto de principal de imagen; límites de clientes/espacio propio; tareas Admin; búsquedas y acciones reales |
| Contenido de usuario | Sin credenciales, datos de clientes reales, instrucciones técnicas de despliegue ni reglas antiguas de imágenes/pago/vigencia |
| Alcance de cambios | Únicamente los cinco documentos de usuario; producto y cambios previos preservados |

No quedaron dudas de etiquetas o permisos que exigieran un nuevo recorrido de navegador. Se reutilizó evidencia existente y no se crearon productos, pagos, ventas, citas ni otros registros para escribir este manual. La siguiente fase de capacitación no está iniciada.
