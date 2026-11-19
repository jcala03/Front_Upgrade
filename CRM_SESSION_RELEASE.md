# Release: inactividad CRM y validación de envíos

## Cambios publicados por este release

- Se mantiene la autenticación Laravel/Sanctum con cookies y CSRF.
- El servidor aplica `CRM_SESSION_IDLE_MINUTES`, 30 minutos por defecto.
- El CRM comunica interacción real; las peticiones automáticas no la renuevan.
- Las pestañas comparten vencimiento y cierre. Una respuesta tardía no reemplaza
  una actividad más reciente y una pestaña vieja no revoca una sesión nueva.
- Un aviso previo permite guardar formularios. No se guardan borradores privados
  automáticamente. Al vencer se limpia el perfil y se explica el motivo en login.
- Solo se inicia el observador dentro del CRM autenticado. La tienda pública,
  carrito y checkout conservan su comportamiento.
- El pin backend es `f9fc4e2fa36608d7eba2e5e06adf45728adfe9d5`, descendiente del
  hotfix `dad6dc87079e89b589920d790d1ac9d5abb8c98c`.

Los cambios de `dist/` generados al compilar son artefactos locales: no forman
parte del commit. GitHub Actions genera y verifica el paquete productivo.
No hay cambios en Service Worker, Wompi, inventario, productos, precios, Envia,
Analytics, documentos legales ni perfiles de compra del configurador.

## Evidencias

- Pruebas backend: 230, 1.149 aserciones; todas las escrituras SQL son `:memory:`.
- Incluyen 51 casos SQL del configurador y checkout, y pruebas del adaptador de
  Envia con HTTP simulado: no son una cotización comercial real.
- Pruebas frontend, TypeScript, cliente, SSR y prerender ejecutados antes del push.
- Navegador local: 19 comprobaciones, dos pestañas, cinco anchos, APIs simuladas,
  reloj acelerado, componentes CRM/login y React StrictMode.
- El módulo de SQLite utilizado localmente se extrae en `/tmp`, sin instalación
  global ni modificación de conexiones existentes.

## Verificación manual tras publicar

1. Esperar SUCCESS del backend y confirmar su SHA/receipt.
2. Esperar SUCCESS frontend; el workflow exige el backend exacto antes de copiar.
3. Entrar desde `/login` con una cuenta autorizada. Navegar por el CRM y comprobar
   que el inicio y cierre manual conservan su comportamiento.
4. Abrir una segunda pestaña. La interacción en una comparte el plazo con ambas.
5. Guardar el formulario antes de dejar de interactuar. El polling por sí solo
   no mantiene la sesión: hay aviso previo y cierre a los 30 minutos.
6. Al volver de una suspensión posterior al vencimiento, autenticar de nuevo.
7. Comprobar inicio, tienda, carrito y checkout sin crear órdenes ni pagos.

## Envia.com: pendiente independiente

La lectura SSH ejecutada por el propietario confirma BAQ ID 1 como origen para
una unidad de las variantes 64 y 65, con stock 3 y 12, respectivamente. BOG no
las tiene; CAL no aparece. Los dos orígenes informados están completos.

El peso y las dimensiones del producto 40 y ambas variantes estaban NULL en esa
lectura. Deben guardarse desde el editor usando las medidas reales confirmadas.
No se rellenan registros desde scripts de QA ni se sustituye el origen.

Se preparó una sonda privada de consulta que usa los servicios actuales, toma
medidas y precios persistidos y restringe HTTP a geografía/tarifas oficiales. La
base se abre con transacción de solo lectura. No crea órdenes, guías ni cargos
y no imprime token ni destinatario. No forma parte del release.

No declarar Envia operativo hasta recibir una tarifa válida de esa consulta.
Una pantalla correcta, una credencial presente o pruebas HTTP simuladas no
constituyen evidencia de aceptación por el proveedor.
