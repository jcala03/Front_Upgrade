# Configurador Android/Linux — implementación local

Implementación y QA: 6 de noviembre de 2026, Colombia. Preparación de commits locales: 7 de noviembre de 2026.

**Estado:** implementación local realizada y validada con fixtures aisladas; commits locales autorizados para preparar el release; activación productiva no ejecutada. Sin push, deploy ni migraciones sobre bases existentes. No se crearon productos, variantes, categorías, existencias ni órdenes comerciales.

## 1. Protección del trabajo y diagnóstico

Se inspeccionaron status/diffs, ramas, worktrees, HEAD/origin/main y SHA remotos de ambos repositorios. Los main locales originales estaban atrasados respecto al release publicado y tenían cambios ajenos; no se mezclaron ni descartaron.

Se trabajó en worktrees nuevos, rama `feature/multimedia-configurator`:

- Frontend: `feature-worktrees/multimedia-configurator-2026-11-06/upgrade79-web`, base `6930fb80689c8e8d7810cd05a8b6f7331092f5da`.
- Backend: `feature-worktrees/multimedia-configurator-2026-11-06/backendupgrade`, base `85d6a625e281d24042f1fbf5e94e46d78549bf66`.

Los repositorios originales y worktrees del release anterior se conservaron. No se reimplementaron las cuatro correcciones publicadas de imágenes, hidratación, búsqueda por variantes e intervalos OEM.

Existían resolvedor, selector OEM/memoria, lectura completa de variantes, carrito contextual, validación de checkout, snapshots de orden y stock compartido. Los límites eran:

1. Un único perfil exigía RAM/almacenamiento a cualquier equipo inscrito.
2. La ficha multivehículo no permitía resolverlo allí: remitía al catálogo.
3. Se podían omitir años en configuraciones con cobertura parcial registrada.
4. Producción tenía bloqueo absoluto en registro y preflight, incluso si se autorizaban productos concretos.
5. Una categoría OEM obligatoria sin inscripción podía terminar usando el selector tradicional.

El flujo técnico se mantiene real: ProductDetailPage → getCompleteConfiguratorCatalog → /api/products/:slug → resolvedor → CartContext/cartLines → DTO del checkout → ProductConfigurationValidator/CommercialItemResolver → order_items.configuration_context y reserva existente. No hay un configurador paralelo ni lógica simulada en código productivo.

## 2. Cambios y matriz funcional

| Área | Resultado local |
|---|---|
| Catálogo Marca → Modelo → Generación → OEM | Se reutilizan filtros existentes y contexto de URL, sin inventar relaciones |
| Ficha con vehículo inequívoco | Mantiene resolución interna segura; no repite selector completo |
| Ficha multivehículo | Selección explícita con tuplas reales del resolvedor; nunca el primer vehículo arbitrario |
| Año | Se solicita cuando cobertura comercial/técnica es parcial; una unión que cubre la generación no necesita año inventado |
| Cambio de año/vehículo/OEM | Descarta referencia dependiente; elimina OEM/memoria que dejan de corresponder |
| Android o equipo con memoria verificable | Perfil vehicle-oem-memory-v1: parejas reales por variante, sin parsear nombres |
| Linux/equipo por referencia | Perfil vehicle-oem-reference-v1: OEM y SKU/kit exacto; no fuerza ni fabrica RAM/ROM |
| Varios kits con misma selección visible | Referencia adicional obligatoria; no desempata por posición o stock |
| SKU, precio e imagen | Actualizados desde la variante resuelta; cantidad y compra sujetos a disponibilidad existente |
| Stock de red | Sigue siendo provisional; backend conserva comprobación de surtido por sede |
| Carrito y checkout | Conservan product_id + product_variant_id y contexto OEM; misma referencia física comparte stock |
| Snapshots/reintentos | Reutiliza contratos históricos e idempotencia; no reescribe órdenes |
| Categoría OEM obligatoria sin inscripción | Bloqueada tanto en metadata pública como al comprar, sin fallback tradicional |
| Productos simples/tradicionales sin obligación OEM | Conservan el flujo anterior |
| Producción | Solo opt-in explícito, catálogo exacto, producto reviewed, aprobación independiente y lista individual de variantes; compras siguen apagadas |

No se cambian categorías automáticamente por texto Android/Linux. El perfil adecuado depende de atributos y referencias reales, no del sistema operativo escrito en el nombre.

## 3. Esquema y datos inspeccionados

La inspección inicial de datos existentes utilizó `upgrade`, entorno local, MySQL XAMPP/MariaDB 10.4.32, con identidad efectiva comprobada y transacción READ ONLY. Se revisaron columnas, nullability, índices y FK de productos, variantes, campos/valores de variante, compatibilidades, vínculo generación–OEM y order_items. No hubo escrituras sobre esa base. El QA final de persistencia utiliza exclusivamente SQLite en memoria, no vuelve a consultar MySQL.

La categoría Pantallas Android local, ID 6, tiene dos campos de variante numéricos GB activos: ram_gb y almacenamiento_gb. Se encontraron cuatro productos y nueve variantes Android, sin categoría Linux. No se cambió scope histórico ni se crearon datos para rellenar ese vacío.

El esquema existente basta. No hay endpoints ni migraciones nuevos. El backend usa el snapshot nullable ya existente. Véase [contrato backend y activación](../backendupgrade/MULTIMEDIA_CONFIGURATOR.md).

La base `u497825029_upgrade_ux_qa` es producción: no se conectó a ella para pruebas ni se modificó.

## 4. Pruebas ejecutadas

| Comprobación | Resultado |
|---|---|
| npm ci desde lock publicado | PASS, sin actualizar paquetes |
| Suite frontend completa, Node 22 | **235/235 PASS**, sin omitidas |
| Suite backend unitaria aislada | **154/154 PASS, 555 aserciones** |
| Integración HTTP/SQL real, Laravel + PDO SQLite :memory: | **36/36 PASS, 280 aserciones** |
| React → carrito → checkout → Laravel/SQL | **4/4 PASS**, dos perfiles en 1440 y 390 px; órdenes no simuladas |
| Preflight con casos de activación revisada y rechazo | **9/9 PASS** |
| Contratos de workflows, incluido bloqueo de migraciones ordinarias | **13/13 PASS** |
| TypeScript, cliente, SSR y prerender finales | **PASS**, seis páginas públicas |
| Build adicional con catálogo sintético aislado | PASS; cuatro páginas base por imágenes de fixture relativas/no indexables |
| Pint, sintaxis PHP y node --check | PASS |
| git diff --check final, sin artefactos generados | PASS |
| Service Worker y dependencias de seguridad | Fuentes/locks preservados respecto a los SHA publicados |

Backend: las 154 unidades se ejecutaron **sin phpunit.xml** y con DB_PORT=1, base ficticia y sin credenciales. Esa evidencia unitaria conserva dobles de persistencia y los casos SQL OEM de Python. Se añadieron **36 pruebas distintas de integración real** mediante PDO/Eloquent y el kernel HTTP Laravel sobre SQLite :memory:. El harness elimina las conexiones MySQL antes de los proveedores y no lee .env/caché. No se ejecutaron Feature con RefreshDatabase ni se utilizó upgrade_test; tampoco se abrieron conexiones con upgrade o producción durante este QA final. Las adaptaciones de dialecto de las migraciones se detallan en el documento backend; no se cambiaron las migraciones reales.

Navegador real Chrome, aplicación React real bajo StrictMode y SSR:

- Android y carrito/checkout: 1440, 1280, 1024, 768, 430, 390 y 360 px.
- Linux por referencia y carrito/checkout: 1440, 768, 430, 390 y 360 px.
- Multivehículo explícito, cobertura parcial y limpieza de dependencias.
- OEM incompatible, memorias inexistentes, agotados y kits ambiguos.
- Precio, SKU, imagen correcta y carga natural de imágenes de fixture.
- Reingreso desde filtros, recuperación de catálogo completo, respuestas obsoletas y errores 503.
- Productos simples/tradicionales y selección multi-OEM de un mismo SKU con stock compartido.
- Preparación de orden con 422 y reintento conservando Idempotency-Key/payload; confirmación pagada simulada y reconciliación del carrito una sola vez.
- Sin overflow ni errores de hidratación/Hooks o consola inesperados.

**Distinción entre runners:** verify-product-configurator.mjs conserva respuestas de órdenes simuladas para probar 422, recuperación y reconciliación pagada sin pagos. El nuevo verify-multimedia-sql.mjs ejecuta React/SSR real y dirige las solicitudes al kernel real Laravel por un puente de pruebas stdio, con PDO SQLite en memoria: **no simula respuestas de órdenes**. No es una prueba TCP de Hostinger ni del proveedor de pagos. Las imágenes de ambos runners son SVG sintéticos, no fotografías comerciales. No se certificaron compatibilidades físicas ni se presentó ningún fixture como mercancía. No hubo HTTP externo ni escrituras sobre bases existentes.

La suite SQL guarda y lee realmente order_items.configuration_context, compara cada campo con la selección, lee el mismo snapshot desde checkout y CRM, verifica idempotencia y stock compartido entre OEM. Prueba Android con memoria y referencia sin memoria; el segundo usa marca Toyota y nombres OEM Touch/Touch 2 exclusivamente como fixtures, no como certificación por año. También verifica independencia de atributos de distintas variantes, inmutabilidad histórica y rechazo antes de reserva si cambia el catálogo. Correos capturados en Mail::fake, cero pagos y cero movimientos de inventario en los flujos comprobados.

### Defecto de seguridad encontrado en el cierre

La aprobación por producto podía heredarse por una variante añadida después. Se corrigió con approved_variant_ids en el registro privado y purchasable_variant_ids en la metadata pública. Producción exige lista explícita y válida; el validador rechaza referencias no incluidas, aunque pertenezcan al padre revisado. React deshabilita la compra y cartLines rechaza agregarlas. El preflight no admite compra activa sin la lista. No se agregó ninguna aprobación real ni se modificaron .env. La ausencia del campo conserva contratos antiguos solo cuando el servidor lo permite; el backend de producción es quien exige la lista.

Los conteos anteriores 234 frontend / 153 backend eran la evidencia inicial. El cierre agrega una regresión frontend de aprobación individual, una unitaria backend y 36 integraciones SQL: no se eliminó ninguna prueba.

Los primeros intentos detectaron problemas del entorno/runner: presión de memoria del equipo al ejecutar varias validaciones simultáneas, puerto de prueba y cliente WebSocket, y ruta de imagen sintética faltante bajo /storage. Se corrigió la preparación del runner, se verificó carga natural y se repitió satisfactoriamente. Solo se detuvieron procesos propios identificados por PID/cwd; no aplicaciones del usuario.

El cierre también detectó metadata compartida entre fixtures del runner al agregar el escenario SKU no aprobado. Se aisló cada escenario mediante structuredClone; no se cambió el bloqueo del producto para hacer pasar el test. La regresión verifica el botón deshabilitado ante una allowlist que excluye la variante y después vuelve a comprobar las compras permitidas únicamente en fixtures.

El primer build con API pública no pudo obtener el catálogo y el prerender se detuvo correctamente, sin omitir su guard. Se comprobó después HTTP 200 con Node y se repitió npm run build: TypeScript, cliente, SSR y prerender de seis páginas PASS. Esa lectura pública del catálogo no modificó producción. El warning de chunks >500 kB permanece deliberadamente.

## 5. Archivos modificados

Frontend:

- .github/required-backend-sha — pin exacto al commit backend del configurador
- src/domain/productConfigurator/types.ts
- src/domain/productConfigurator/compatibility.ts
- src/domain/productConfigurator/resolver.ts
- src/domain/productConfigurator/selection.ts
- src/pages/ProductDetail/ConfiguratorVehicleFields.tsx — nuevo, presentación del contexto
- src/pages/ProductDetail/useProductConfigurator.ts
- src/pages/ProductDetail/ProductConfigurator.tsx
- src/pages/ProductDetail/ProductDetailPage.tsx — texto comercial sin lenguaje de vista previa técnica
- src/pages/ProductDetail/ProductDetailPage.css
- src/types/productConfiguration.ts
- src/types/product.ts — allowlist pública aditiva
- src/domain/cartLines.ts — bloqueo de SKU no aprobado
- tests/multimedia-configurator.test.mjs — diez pruebas nuevas
- scripts/verify-product-configurator.mjs — runner existente ampliado
- scripts/verify-multimedia-sql.mjs — integración real React/Laravel/SQLite aislada
- Este informe

Backend:

- .env.example — solo plantilla de flags apagados
- config/product_configurator.php
- app/Services/ProductConfiguratorRegistry.php
- app/Services/ProductConfigurationValidator.php
- app/Services/VehicleYearCoverage.php — nuevo helper puro
- app/Http/Requests/StorePublicOrderRequest.php
- ops/ReleaseConfiguratorPolicy.php — gate de activación revisada
- ops/release-preflight.php
- ops/test_release_preflight.py
- tests/Unit/MultimediaConfiguratorPolicyTest.php
- tests/Unit/MultimediaPurchaseValidationTest.php
- tests/Isolated/MultimediaPersistenceTest.php — integración opt-in, no hereda Tests/TestCase.php
- tests/Support/MultimediaSqliteApplication.php — bootstrap y esquema solo en memoria
- tests/Support/MultimediaFixture.php — fixtures Eloquent solo para este harness
- tests/Support/multimedia-http-bridge.php — puente CLI de pruebas, no endpoint
- MULTIMEDIA_CONFIGURATOR.md

No se cambian Wompi, lógica de inventario/reservas, proveedores, PWA/SW, autenticación, editor CRM, precios ni migraciones. Los dist históricos versionados se restituyeron desde la base del worktree después de conservar el build generado en qa-artifacts; no forman parte de los cambios propuestos.

## 6. Evidencia visual

Capturas exclusivamente de pruebas aisladas, no de productos comerciales:

- [Android escritorio](qa-artifacts/multimedia/browser/configurator-1440.png)
- [Android móvil](qa-artifacts/multimedia/browser/configurator-390.png)
- [Linux escritorio](qa-artifacts/multimedia/browser/linux-1440.png)
- [Linux móvil 390](qa-artifacts/multimedia/browser/linux-390.png)
- [Linux móvil 360](qa-artifacts/multimedia/browser/linux-360.png)
- [Checkout contextual](qa-artifacts/multimedia/browser/checkout-configured-390.png)

Logs, report.json y build de verificación: qa-artifacts/multimedia/, ignorados por Git.

Evidencia del cierre: qa-artifacts/multimedia/final-qa/ (logs, navegador de regresión y navegador con SQL real) y qa-artifacts/multimedia/final-qa-build/ (cliente, SSR, prerender). Es material local ignorado, no herramientas publicadas en la aplicación.

## 7. Pendientes reales antes de vender

1. Cargar/revisar catálogo Linux real, si se ofrecerá, sin inventar categoría, memoria, SKU, compatibilidad, fotografía, precio o stock.
2. Revisar por referencia física las relaciones y coberturas OEM; una coincidencia de filtro no es certificación de instalación.
3. QA de persistencia SQL cerrado con SQLite en memoria. Si se requiere certificar concurrencia/bloqueos o dialecto MySQL/MariaDB, será necesaria una base **nueva, aislada y previamente autorizada**. No ejecutar los Feature actuales contra upgrade, upgrade_test ni producción. No se han validado pagos reales ni notificaciones de proveedor.
4. Preparación de commits locales autorizada y realizada: backend a6788599fad2b159dbc1dacb2d2a026e70e687b9 y pin frontend correspondiente. Publicación pendiente de autorización distinta; no se ha hecho push.
5. Activar únicamente productos y sus IDs de variantes revisados conforme a MULTIMEDIA_CONFIGURATOR.md, después de publicar ese código y de otra autorización. No hay activación productiva ni de compras en este trabajo.

## 8. Cierre del QA final

El código puede prepararse para publicación **manteniendo desactivadas las compras del configurador**. No se activó ninguna referencia. Durante el QA no se crearon commits; en la preparación posterior autorizada se creó primero el commit backend y .github/required-backend-sha se fijó a su SHA real a6788599fad2b159dbc1dacb2d2a026e70e687b9. No hay migraciones nuevas ni cambios a Wompi, PWA o Service Worker. La excepción de vista previa local preexistente para producto 6 en upgrade se conserva: no es activación de compras ni aplica a producción.

El SHA-256 de public/sw.js sigue siendo `43338314702133f01e4df46edf0e9640229a0da55f593d0773104e6bcbfa3482`. No se inspeccionó ni cambió configuración efectiva de Hostinger en esta fase; el estado seguro aquí acreditado corresponde al código, sus defaults y sus controles.

Comando del navegador integrado, desde este worktree frontend, con PHP pdo_sqlite disponible:

```bash
PLAYWRIGHT_MODULE=/tmp/nexo-browser-qa/node_modules/playwright/index.mjs \
MULTIMEDIA_QA_SQLITE_EXTENSION=/tmp/upgrade79-sqlite-runtime.AXBDLt/runtime/usr/lib/php/20230831/pdo_sqlite.so \
node scripts/verify-multimedia-sql.mjs
```

El bridge solo permite catálogo público, creación de órdenes aisladas y lectura de checkout. Sin puertos backend públicos, sin SQL arbitrario, sin pagos, sin SMTP y sin conexiones MySQL. Los cambios de estado de prueba existen únicamente en la aplicación en memoria y desaparecen al finalizar cada caso.

Los servicios originales en localhost y sus worktrees no se sustituyeron: abrir el frontend original no muestra necesariamente estos cambios. La evidencia nueva se ejecutó en el worktree feature con runner aislado; no copiar .env locales a producción ni publicar indiscriminadamente los cambios originales pendientes.

## 9. Release local preparado, NO publicado

Tras fetch de ambos origin/main no había cambios remotos posteriores a los SHA base del 6 de noviembre. La rama feature no contenía commits propios: se prepara uno por repositorio, sin duplicar el release anterior:

- Backend: `a6788599fad2b159dbc1dacb2d2a026e70e687b9` — `feat(multimedia): enforce approved OEM configurations and variants`.
- Frontend: este commit — `feat(multimedia): complete vehicle OEM and variant configurator`; obtener su SHA con git rev-parse HEAD desde este worktree.
- Pin backend: .github/required-backend-sha debe coincidir exactamente con el SHA anterior.
- Archivos: los 16 backend enumerados arriba y los 17 frontend, incluido el pin. No se incluyen los cambios pendientes de los repositorios originales.

En la preparación se repitieron 235 pruebas frontend, 154 unidades backend, 36 SQL en memoria, preflight 9 y workflows 13; Composer validate/audit, Pint y sintaxis PHP pasaron. TypeScript, build cliente/SSR y prerender también se validaron. No se cambiaron locks, dependencias, workflows, migraciones, .env privados ni configuraciones remotas.

### Publicación futura, solo después de autorización

No usar el main local atrasado ni hacer force push. Desde el worktree backend:

```bash
set -euo pipefail
git fetch --no-tags origin main
test "$(git rev-parse origin/main)" = 85d6a625e281d24042f1fbf5e94e46d78549bf66
test "$(git rev-parse HEAD)" = a6788599fad2b159dbc1dacb2d2a026e70e687b9
git merge-base --is-ancestor origin/main HEAD
git push origin a6788599fad2b159dbc1dacb2d2a026e70e687b9:refs/heads/main
```

Esperar GitHub Actions backend en SUCCESS para ese SHA exacto. Verificar por lectura el SHA instalado, el receipt privado y preflight --require-current; conservar flags productivos PREVIEW_ENABLED=false, PURCHASE_ENABLED=false y PRODUCTION_APPROVED=false, sin productos/variantes inscritos ni aprobados para venta. Si cualquier comprobación falla, detenerse. No lanzar migraciones ni regularizar cambios del servidor sin su procedimiento autorizado.

Solo entonces, desde el worktree frontend:

```bash
set -euo pipefail
git fetch --no-tags origin main
test "$(git rev-parse origin/main)" = 6930fb80689c8e8d7810cd05a8b6f7331092f5da
test "$(cat .github/required-backend-sha)" = a6788599fad2b159dbc1dacb2d2a026e70e687b9
git merge-base --is-ancestor origin/main HEAD
git push origin HEAD:refs/heads/main
```

Antes de ejecutar el último push, HEAD debe ser el SHA frontend aprobado, no commits posteriores. Ambos workflows siguen automáticos con push a main y conservan workflow_dispatch. El frontend verifica SHA backend instalado **y receipt coincidentes** bajo el lock compartido antes de copiar archivos públicos; no se limita a flock. Empujar ambos a la vez puede provocar un rechazo seguro del frontend: seguir el orden y esperar la verificación backend.

Bloqueos posibles, no defectos para saltarse: configuración productiva o caché incompatibles, JSON de inscripción inválido, migraciones/esquema no actuales, código servidor modificado/divergente, plataforma incompatible, fallos de pruebas/auditoría o receipt/SHA backend diferente del pin. No se verificó Hostinger en esta preparación. No existe ninguna migración nueva que aplicar para este release.

Las compras configurables permanecen bloqueadas por defecto y no se aprueba ninguna referencia en este commit. La validación física/comercial de cada SKU y la activación son posteriores y requieren autorización independiente. Las limitaciones de concurrencia MySQL e iOS real no se presentan como verificadas por los tests SQLite/Chrome.
