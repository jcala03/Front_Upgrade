# Upgrade La 79 — Manual operativo del CRM

## Estado de este manual

Primera entrega: funcionamiento revisado en frontend, contratos/validaciones backend y respuestas GET del catálogo local. No se ha realizado un nuevo guardado, una compra ni un movimiento de inventario en esta sesión. La práctica guiada espera confirmación del administrador.

No se modifican el CRM, sus datos o sus reglas sin autorización específica. Este documento es el único archivo creado para esta primera entrega, conforme a la solicitud del manual.

## 1. Ubicación y conceptos básicos

Entrada local: `http://127.0.0.1:5173/crm/inventory` → **Inventario** → **Crear producto**.

| Apartado/control | Función comprobada |
| --- | --- |
| Información | Nombre, categoría, marca del fabricante, SKU/referencia y descripción opcional. La marca del producto no es la marca del vehículo. |
| Imágenes del producto | Agregar imágenes, elegir principal y ordenar galería. JPEG/PNG/WebP de hasta 5 MB por archivo. |
| Compatibilidad | Universal o Vehículos específicos. La compatibilidad general no contiene un selector OEM. |
| Precio | Valores comerciales base; no registra inventario. |
| Variantes | Cada referencia conserva nombre/SKU, detalles técnicos, precio, compatibilidades y estados propios. |
| Opciones comerciales avanzadas | Costos, modo de precio y comisión del producto. Las variantes heredan la comisión del producto. |
| Publicación / estado | Producto activo, Visible en ecommerce y Producto destacado. Publicar no activa por sí mismo el configurador ni sus compras. |

El formulario exige Nombre, Categoría y un tipo de compatibilidad. Si se eligen Vehículos específicos, exige al menos una marca en la compatibilidad general. Modelo y generación son necesarios para describir correctamente una pantalla concreta, aunque las compatibilidades generales permitan filas amplias.

Descripción, marca del producto y SKU son opcionales. Un SKU informado debe respetar las validaciones de unicidad; conviene identificar cada referencia física de forma inequívoca.

## 2. Estado comprobado de Pantallas Android en local

Categoría ID 6, slug `pantallas-android`. Campos activos:

| Control | Clave | Ubicación | Regla actual |
| --- | --- | --- | --- |
| RAM (GB) | `ram_gb` | Detalles de esta variante | Numérico, opcional; si se completa debe ser entero positivo. |
| Almacenamiento (GB) | `almacenamiento_gb` | Detalles de esta variante | Numérico, opcional; si se completa debe ser entero positivo. |

Se escriben números como `4` y `64`, no `4 GB` ni `4/64` en un solo campo. No se copian automáticamente especificaciones generales a todas las variantes. Para una configuración técnica inequívoca hay que completar ambos campos, aunque el guardado histórico permita omitirlos.

La categoría local tiene `requires_oem_compatibility=false`: no fuerza automáticamente la compatibilidad OEM propia. Eso no elimina el selector; hay que elegirla expresamente en cada variante de pantalla.

El catálogo público local contiene `QA BMW — sintético` → `QA Serie 3` → `QA F30 2012-2018`, con sistemas `QA CIC` y `QA NBT`. Son fixtures de aprendizaje, no certificaciones comerciales. No se deben renombrar ni presentar como datos comerciales reales. En esta sesión no se crea ningún registro.

## 3. Dónde seleccionar CIC o NBT

Ruta dentro del formulario:

1. Elegir Categoría → Pantallas Android.
2. Ir a Variantes → **+ Agregar variante**.
3. Desmarcar **Usar la compatibilidad general del producto**.
4. Elegir **Específica**.
5. Completar **Marca**, **Modelo** y **Versión / generación** dentro de esa variante.
6. Seleccionar **Sistema multimedia OEM**. El control permanece deshabilitado mientras falte generación.

El OEM se guarda mediante un identificador en la fila de compatibilidad, no escribiendo CIC en Nombre, SKU o Nota técnica. El botón **Opciones avanzadas** de esa fila muestra Desde, Hasta y Nota técnica; no es necesario abrirlo para encontrar el selector OEM.

Para una misma referencia física compatible con varios OEM, **+ Agregar vehículo** permite añadir otra fila con el mismo vehículo y otro OEM dentro de la misma variante. Solo hacerlo con compatibilidad verificada. Si hay kits físicos diferentes, usar variantes y SKU separados. No duplicar stock por cada fila OEM.

## 4. Qué significa compatibilidad general

**Usará 0 compatibilidades del producto** cuenta las filas generales con marca seleccionada; no significa que el stock sea cero ni que falten capacidades RAM.

Con el checkbox marcado, el formulario actual envía a la variante las filas generales y su tipo. En compatibilidad específica esas filas quedan almacenadas como filas propias. No debe asumirse que se mantenga una vinculación automática ante cambios posteriores del producto; al reabrir pueden aparecer como compatibilidad propia.

Usar la misma compatibilidad es adecuado cuando todas las referencias comparten exactamente la cobertura general y no se necesita identificar OEM. Para pantallas CIC/NBT, registrar filas específicas de variante para conservar el sistema original estructurado.

## 5. Precio e inventario: diferencias esenciales

- El precio base pertenece al producto. Cada variante tiene su propio precio; no basta con completar únicamente el del producto padre.
- **Manual** permite indicar Precio de venta directamente.
- Costo total = Costo + Impuestos + Cargos extra. Estos campos representan importes, no porcentajes.
- **Ganancia sobre costo** calcula venta sobre ese costo total; **Margen real** calcula la rentabilidad sobre la venta. No son porcentajes equivalentes. Se explicarán con importes autorizados antes de practicar.
- El SKU del producto identifica el artículo principal; el SKU de variante identifica la referencia física concreta.
- Guardar producto no crea existencias. El flujo ofrece **Guardar y asignar inventario** cuando se tienen permisos; después se eligen referencia, sede y cantidad en el módulo de Existencias.
- No pulsar acciones de inventario durante esta primera práctica. No inventar precios ni cantidades para poder avanzar.
- Para publicar desde el editor se necesita al menos una imagen y exactamente una principal. El módulo de publicación además comprueba activo, precio válido y versiones activas/visibles con precio cuando hay variantes. Sus validaciones no son idénticas a las del editor.
- Publicación y stock son conceptos separados: una publicación puede estar agotada. Para vender hacen falta disponibilidad real y las protecciones de compra correspondientes.

## 6. Práctica guiada: etapa 1, sin guardar

1. Abrir el Inventario local e iniciar sesión si se solicita. No compartir la contraseña por chat.
2. Pulsar **Crear producto**.
3. En **Categoría**, seleccionar **Pantallas Android**.
4. En **Variantes**, pulsar **+ Agregar variante** una sola vez.
5. Buscar **Detalles de esta variante** y comprobar que se muestran **RAM (GB)** y **Almacenamiento (GB)**.

Pausa: confirmar el resultado antes de continuar. No pulsar Guardar producto, Guardar y asignar inventario ni ajustar existencias. No crear otra categoría ni campos duplicados si no aparecen: comunicar en qué apartado se ve el mensaje y revisarlo.

## 7. Temas que ampliaremos después de tu confirmación

- Primera pantalla CIC, con dos variantes y datos comerciales verificados o práctica aislada autorizada.
- Comprobación de guardado y edición, sin sobrescribir otras variantes.
- Pantallas NBT y referencias multi-OEM.
- Productos simples, imágenes y publicación.
- Precios, márgenes e inventario por sede.

## Fuentes de verificación

- `src/modules/admin/inventory/product-form/ProductForm.tsx`
- `src/modules/admin/inventory/product-form/ProductDynamicFields.tsx`
- `src/modules/admin/inventory/product-form/productFormUtils.ts`
- `src/modules/admin/inventory/product-form/ProductImagesEditor.tsx`
- `src/modules/admin/inventory/AdminInventoryPage.tsx`
- `src/modules/admin/products/AdminProductsPage.tsx`
- Backend: `ProductController`, `ProductVariantCompatibilityService`, `ProductVariantSpecValueService`, `ProductPricingService` y relaciones de `ProductVariant`.
- API local: categorías y catálogos vehiculares, mediante consultas GET únicamente.
