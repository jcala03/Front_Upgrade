# Ficha de producto y dirección de entrega — revisión local

Fecha: 18 de noviembre de 2026. Implementación original en rama `feat/product-checkout-ux-20261118`, worktree `/tmp/upgrade79-product-checkout-ux-20261118`, base publicada `c567be75ef5ec913cc2edcb823fd5b43a284efd2`. La preparación inicial no realizó commit, push ni deploy. Los repositorios originales y sus cambios anteriores se conservaron.

## Implementación

- Ficha: galería blanca contenida, miniaturas discretas, resumen comercial sin tarjeta de fondo/borde envolvente, más espacio entre bloques. Descripción abierta inicialmente; especificaciones, compatibilidad y recomendaciones permanecen accesibles. Orientación de entrega y pago sin prometer tarifas, garantías ni certificaciones inexistentes.
- Sin cambios en resolvedor OEM/memoria, selección de variantes, precio, stock, reglas de compra, carrito, Wompi o backend.
- Entrega: selector de país, departamento y municipio dependientes para Colombia. 249 países ISO; 33 divisiones departamentales y 1122 municipios/áreas DANE. Catálogo empaquetado localmente, sin enviar datos de clientes a terceros al completar el formulario.
- Dirección urbana: tipo de vía + número/nombre + `#` + vía generadora + `-` + placa/puerta. Ejemplo sintético: `Calle 20 # 15B - 10`. Se conserva el contrato actual `address_line1`. Complemento e indicaciones mantienen sus campos independientes.
- Direcciones guardadas no se escriben al abrir; abreviaturas, letras y ceros iniciales se conservan. Direcciones rurales/otros formatos admiten escritura completa. Para otros países, estado y ciudad conservan entrada manual. El código postal nunca se inventa ni se deduce automáticamente.
- Cambiar país/departamento limpia los campos geográficos dependientes. Se mantiene `ADDRESS_DIRTY`: desaparece la tarifa anterior hasta guardar y volver a cotizar. No se habilita el pago con una tarifa desactualizada.

## Archivos de funcionalidad y regresión

1. `src/pages/ProductDetail/ProductDetailPage.tsx`
2. `src/pages/ProductDetail/ProductDetailPage.css`
3. `src/pages/Checkout/CheckoutDelivery.tsx`
4. `src/pages/Checkout/CheckoutPage.css`
5. `src/pages/Checkout/CheckoutAddressFields.tsx`
6. `src/pages/Checkout/shippingAddress.ts`
7. `src/data/shippingGeography.json`
8. `src/data/SHIPPING_GEOGRAPHY.md`
9. `tests/checkout-address.test.mjs`
10. `tests/product-detail-presentation.test.mjs`
11. `tests/verify-product-checkout-ux-browser.mjs`

Los archivos `dist/` son artefactos generados por las comprobaciones, no cambios de fuente para publicar. El pin backend sigue en `f9fc4e2fa36608d7eba2e5e06adf45728adfe9d5`. No se modificó Service Worker, PWA, configuración GA4/legal ni credenciales.

## Evidencias

- Suite completa: **313/313 PASS**, sin pruebas omitidas.
- Navegador con fixtures y API interceptada: **31 escenarios PASS**: OEM/memoria, SKU exacto en carrito, galería, producto simple, listas dependientes, dirección compuesta, validación de campos vacíos, payload existente, herencia de datos guardados, dirección rural, error Laravel 422 visible y recogida en sede. Sin proveedor, base de datos, pedidos ni pagos reales.
- Responsive: 1440, 1280, 1024, 768, 430, 390 y 360 px; sin overflow en ficha y formulario.
- Vista local usando GET del producto público real `pantalla-android-bmw-serie-3-f30`: HTTP 200, CIC + 4/64 seleccionables y botón de compra disponible. Siete tamaños sin errores de consola/hidratación ni imágenes fallidas. No se pulsó comprar ni se creó orden. Las escrituras se bloquean en el servidor temporal de vista previa.
- TypeScript: PASS. **Última ejecución completa de `npm run build`: PASS, código de salida 0**, incluyendo cliente, SSR y prerender de cinco páginas públicas, robots, sitemap y reglas Apache. Registro: `/tmp/upgrade79-product-checkout-ux-build-final.log`. Las dos ejecuciones combinadas anteriores se rechazaron en prerender por fallos intermitentes de lectura del catálogo público, no por errores de compilación; sus reintentos separados también pasaron. Se conservaron todas las protecciones. El build mantiene el aviso no bloqueante sobre chunks mayores de 500 kB; no se cambió la arquitectura de empaquetado.
- `git diff --check -- src tests PRODUCT_CHECKOUT_UX_RESULTADOS.md`: PASS. La comprobación global señala un espacio final preexistente en la plantilla que el build reproduce en el artefacto generado `dist/index.html`; no se modificó la plantilla ni se deben incluir los artefactos `dist/` en el cambio de fuentes.
- Capturas: `/tmp/upgrade79-product-checkout-ux-evidence/`: `product-before-1440.png`, `product-before-390.png`, `product-after-1440.png`, `product-after-390.png`, `delivery-1440.png`, `delivery-390.png`, `real-product-1440.png`, `real-product-390.png`. Las capturas de fixtures contienen una ilustración de prueba; la ficha real conserva las fotografías existentes.
- Las primeras ejecuciones del nuevo test visual requirieron ajustar localizadores a los nombres accesibles y al prefijo `/storage` del resolver vigente; no se cambiaron reglas comerciales para pasar pruebas. La primera vista previa tuvo un WebSocket HMR local desconectado; se corrigió exclusivamente su servidor temporal, sin modificar el proyecto ni Service Worker.

## Revisión pendiente

El propietario autorizó posteriormente commit, push y despliegue de este alcance. Safari/iPhone físico no estuvo disponible; se comprobó Chrome con anchos móviles, no se afirma una validación real de iOS. No se obtuvo una tarifa nueva de Envia ni se realizó un pago: no se presenta una respuesta simulada como resultado real de la cuenta comercial.

Vista de producto real, con GET y bloqueo de todas las escrituras: http://127.0.0.1:5174/tienda/pantalla-android-bmw-serie-3-f30. Servidor temporal fuera del repositorio: `/tmp/upgrade79-product-ux-preview.mjs`. No se debe intentar finalizar compras desde esta vista. La imagen del formulario de entrega se puede revisar en `delivery-390.png` o `delivery-1440.png`, sin crear un pedido.

## Validación del release autorizado

- Worktree limpio separado: `/tmp/upgrade79-product-checkout-ux-release-20261118`, rama `release/product-checkout-ux-20261118`, basado en el último `origin/main` (`c567be75ef5ec913cc2edcb823fd5b43a284efd2`). Se consultaron ambos repositorios y sus worktrees: sin commits remotos posteriores. Backend `f9fc4e2fa36608d7eba2e5e06adf45728adfe9d5`, último despliegue SUCCESS y pin intacto. No es necesario desplegar backend.
- Suite frontend repetida en el worktree de release: **313/313 PASS**. Registro `/tmp/upgrade79-ux-release-frontend-tests.log`.
- Navegador de producto/domicilio repetido: **31/31 PASS**, siete tamaños. Capturas `/tmp/upgrade79-ux-release-evidence`.
- Regresión adicional de login/inactividad en navegador aislado: **19/19 PASS**, incluyendo actividad real, polling que no renueva la sesión, aviso, expiración, dos pestañas e identidad de logout.
- Backend publicado, sin modificaciones: **230/230 pruebas unitarias/aisladas PASS, 1149 aserciones**. Solo SQLite `:memory:` donde se usa SQL, sin `.env` ni conexiones MySQL. Registro `/tmp/upgrade79-ux-release-backend-tests.log`.
- Contrato adicional React/helper → Laravel → SQL → adaptador Envia: **4/4 PASS, 95 aserciones**. Payloads sintéticos generados con el helper real del release y guardados en `/tmp/upgrade79-ux-release-address-cases.json`; sonda de pruebas temporal `/tmp/Upgrade79UxAddressContractTest.php`. Se verificó persistencia exacta urbana/rural/internacional, transformación `Atlantico`/`Soledad` a `AT`/`08758000` mediante el resolvedor existente, conservación de `CO`, CP `083002`, dirección, complemento e indicaciones, tarifa simulada de 25000 COP incorporada al total firmado por servidor, rechazo de tarifa manipulada o correspondiente a una dirección anterior, sede original e inventario intactos. Envia se intercepta con `Http::fake` y se impide tráfico no simulado; no se crearon guías, cargos, pedidos ni pagos productivos. El país internacional se probó en persistencia, no se afirmó una tarifa internacional real.
- Build completo del release: **PASS** (TypeScript, cliente, SSR y prerender), sin relajar timeouts ni comprobaciones. Registro `/tmp/upgrade79-ux-release-build.log`.
- Rutas API, DTO de orden, carro, Wompi, cotización/aplicación de tarifas, pin y workflow no se modifican. GA4 permanece desactivado y los borradores legales no se incorporan. Sin migraciones ni cambios de esquema/datos/configuración productiva.
- El workflow automático verifica SHA backend/receipt, preflight, tests y build antes de publicar; crea un respaldo privado del frontend anterior y no ejecuta migraciones. Se conserva tal cual.

La comprobación posterior al despliegue debe contrastar los recursos públicos con este build. Para inspeccionar el formulario publicado sin crear una orden, se deben interceptar en el navegador las respuestas de un token sintético exclusivamente; ninguna solicitud comercial simulada debe alcanzar producción. El resultado real de Actions y el SHA del commit se entregan al finalizar la publicación, no se anticipan como exitosos en este documento.
