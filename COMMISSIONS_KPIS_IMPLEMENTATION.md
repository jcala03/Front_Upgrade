# Comisiones y KPIs — cierre y recuperación local

Fecha: 30 de octubre de 2026, Colombia.

## Estado recuperado

Implementación guardada y funcional, lista para revisión manual local. Se recuperaron los 32 archivos de código y pruebas del alcance de comisiones: 19 en backend y 13 en frontend. No fue necesario restaurar, revertir ni reimplementar código. En esta reanudación solo se ejecutaron validaciones y se guardaron evidencias e informe.

Los cambios anteriores de PDF, WhatsApp manual, correo, configurador y PWA permanecen separados y conservados. Los logs, builds y capturas anteriores estaban en `/tmp` y no sobrevivieron al reinicio; por eso se repitieron las validaciones finales.

Servicios normales disponibles al cerrar: frontend `http://127.0.0.1:5173`, backend `http://127.0.0.1:8000`, MySQL local XAMPP. Los servidores auxiliares de QA se detuvieron.

## Reglas implementadas

- Se reutilizan `CommissionService`, `employee_commissions` y la generación de snapshots al confirmar una venta.
- Solo una comisión `pending` puede pasar a `earned`, bajo bloqueo de la orden y del ledger, cuando la orden está `completed`, su estado financiero es `paid`, los créditos `completed` válidos cubren el total positivo y no existen conciliaciones pendientes ni marcadores financieros abiertos.
- Se verifican moneda e importes positivos; se evita desbordamiento de enteros al comprobar la cobertura. No se multiplican importes mediante joins con pagos.
- Completar una venta impagada o parcialmente pagada mantiene la comisión pendiente. No se bloquea el flujo operativo de completar la venta.
- Un pago posterior admitido por `PaymentService` reevalúa la comisión dentro de la transacción existente.
- Resolver una conciliación terminal reevalúa la elegibilidad después de sincronizar sus marcadores. No concede créditos, no cambia el estado de pago y no altera las decisiones financieras existentes.
- Wompi conserva sus guardas. Un callback aprobado normal deja la venta confirmada y la comisión pendiente hasta completar la venta; un callback duplicado no cambia el snapshot ni `earned_at`.
- Se conserva el vendedor de la venta, `sales_employee_id`, distinto de `created_by`; los importes y tarifas históricas no se recalculan.
- Las anulaciones de comisiones pendientes conservan historial y fecha. No se ejecutó ningún backfill de comisiones históricas.

## Reembolsos y cifras históricas

Las comisiones ya ganadas no se borran, revierten ni recalculan automáticamente. `requires_review` y `review_amount` señalan las afectadas por estados financieros retirados, pagos reembolsados o discrepancias detectables.

`review_amount` es un subconjunto del importe histórico ganado, no un importe adicional ni una deducción aplicada. Las pantallas advierten que ganado no significa pagado al empleado ni saldo disponible. No se crearon liquidaciones ni pagos de comisiones.

El ajuste contable por devoluciones totales/parciales sigue pendiente de autorización. No se infiere un importe neto de devolución parcial cuando los datos existentes no lo permiten.

## Permisos

`commissions.view_own` forma parte del permiso base de `User::ROLE_USER`; no requiere insertar autorizaciones individuales. Se conserva la unión con capacidades adicionales existentes. No se concede `commissions.view` al Usuario.

El API personal fija el empleado desde el usuario autenticado y rechaza parámetros de identidad o sede manipulados. La lectura administrativa conserva `commissions.view` y filtra por la sede histórica del ledger, no por la sede actual del empleado.

Verificación adicional de solo lectura en la base local `upgrade`: Usuario ID 6 tiene `commissions.view_own = true`, `commissions.view = false`, y conserva sus capacidades adicionales existentes (ninguna en esta cuenta). No se escribió en esa base.

Una sesión abierta antes de incorporar el permiso puede conservar el payload anterior en `sessionStorage`; iniciar sesión de nuevo obtiene los permisos actuales. Se comprobó el login real de ambas cuentas QA, no solo valores simulados en storage.

## Dashboard, listado y fechas

- Usuario: se reutiliza su tarjeta existente, con ganadas del mes, pendientes del período, advertencia de revisión y enlace a Mis comisiones. La página existente permite filtrar por período/estado y abrir la venta propia.
- Administrador: resumen del equipo, pendientes, cantidad de ventas distintas, importes sujetos a revisión y desglose por vendedor. Los enlaces conservan período, vendedor y sede histórica.
- El listado administrativo y el personal usan `date_basis=event`: `earned_at` para ganadas, `created_at` para pendientes y `voided_at` para anuladas. Los límites de días de Bogotá se convierten a UTC con fin exclusivo.
- Los resúmenes se calculan en SQL sobre todos los resultados filtrados, nunca sumando páginas. El resumen administrativo y su desglose comparten una transacción de lectura.
- Se conserva el contrato histórico del listado con `created_at` cuando no se solicita `date_basis=event`. Los resúmenes mantienen `current_month` como alias compatible y agregan `totals` para períodos arbitrarios.
- Endpoint administrativo añadido: `GET /api/admin/commissions/summary`, declarado antes de la ruta de detalle.

## Archivos de comisiones

### Backend — `backendupgrade` (19)

1. `app/Models/User.php` — permiso base propio.
2. `app/Services/CommissionService.php` — elegibilidad, bloqueos, agregados, períodos y señales de revisión.
3. `app/Services/PaymentService.php` — reevaluación tras pagos admitidos.
4. `app/Services/PaymentReconciliationResolutionService.php` — reevaluación tras resolución terminal.
5. `app/Http/Controllers/Api/CommissionController.php` — resumen del equipo y fechas del listado.
6. `app/Http/Controllers/Api/MyCommissionController.php` — resumen personal filtrable.
7. `app/Http/Requests/ListAdminCommissionsRequest.php` — base temporal de eventos.
8. `app/Http/Requests/ListMyCommissionsRequest.php` — base temporal manteniendo aislamiento.
9. `app/Http/Requests/MyCommissionSummaryRequest.php` — reutiliza las validaciones personales.
10. `app/Http/Resources/AdminCommissionResource.php` — indicador de revisión.
11. `app/Http/Resources/MyCommissionResource.php` — indicador de revisión sin datos administrativos.
12. `routes/api.php` — solo la nueva ruta de resumen corresponde a comisiones; los endpoints de documentos y otros cambios previos se conservaron.
13. `tests/Feature/CommissionEarningKpiTest.php` — nuevas reglas, permisos, períodos, pagos, conciliaciones y webhook.
14. `tests/Feature/CommissionLifecyclePhaseFourTest.php` — expectativas actualizadas y transacciones sin vaciar QA.
15. `tests/Feature/CommissionLedgerApiPhaseFourTest.php` — permisos, ledger y resúmenes compatibles con QA persistente.
16. `tests/Feature/BusinessOverviewPhaseSixTest.php` — dos expectativas ajustadas al nuevo permiso base; no se ejecutó esta clase histórica con `RefreshDatabase`.
17. `tests/Support/CommercialAccess.php` — expectativa del permiso base.
18. `tests/Support/TracksCommissionQa.php` — acota conteos al caso de prueba, sin limpiar datos existentes.
19. `tests/Browser/commissions-fixtures.php` — fixtures exclusivamente de `upgrade_test`, con guardas y hashes de registros anteriores.

### Frontend — `upgrade79-web` (13)

1. `src/api/commissions.ts`.
2. `src/types/commission.ts`.
3. `src/modules/admin/commissions/AdminCommissionsPage.tsx`.
4. `src/modules/admin/commissions/Commissions.css`.
5. `src/modules/admin/commissions/commissionUtils.ts`.
6. `src/modules/admin/commissions/TeamCommissionKpis.tsx`.
7. `src/modules/admin/dashboard/AdminDashboardPage.tsx`.
8. `src/modules/admin/orders/AdminOrdersPage.tsx` — apertura protegida por `order_id` desde comisiones.
9. `src/modules/crm/home/UserHomePage.tsx`.
10. `src/modules/crm/my-commissions/MyCommissionsPage.tsx`.
11. `src/modules/crm/my-commerce/MySalesPage.tsx` — solo el efecto de apertura por `order_id` pertenece a comisiones; sus botones de documentos son del trabajo previo y permanecen intactos.
12. `scripts/verify-commissions.mjs`.
13. `tests/commissions.test.mjs`.

Este informe y `qa-artifacts/commissions/` son entregables de recuperación adicionales, no cambios de lógica.

## Validaciones repetidas después del reinicio

| Validación | Resultado |
| --- | --- |
| Conexión efectiva | `testing`, MySQL `127.0.0.1`, XAMPP `/opt/lampp`, `upgrade_test`, mailer `array` |
| Regresión backend ampliada y focalizada | **51/51 PASS, 583 aserciones** |
| Suite frontend completa | **179/179 PASS** |
| TypeScript `npx tsc -b` | PASS |
| Pint `--test`, archivos PHP del alcance | PASS |
| Build cliente | PASS |
| Build SSR | PASS |
| Prerender contra backend QA real | PASS, **34 páginas** |
| Navegador Chrome, login Usuario y Administrador | PASS, API Laravel real, sin respuestas comerciales simuladas |
| Navegación, filtros de período, totales y enlaces a ventas | PASS para ambos roles |
| Responsive | 1440, 1280, 1024, 768, 430, 390 y 360 px; dashboards y listados sin overflow horizontal |
| Solicitudes API del navegador | 52; todas dirigidas a `upgrade_test`, ninguna HTTP 500 |
| Consola del navegador | Sin errores de aplicación/Hooks/hidratación |
| Datos QA anteriores | Hashes y conteos de nueve tablas idénticos tras PHPUnit; el navegador también verifica que no cambia registros preexistentes |
| Service Worker | SHA-256 intacto: `43338314702133f01e4df46edf0e9640229a0da55f593d0773104e6bcbfa3482` |

La regresión backend ejecutada incluye `CommissionEarningKpiTest`, `CommissionLifecyclePhaseFourTest`, `CommissionLedgerApiPhaseFourTest`, `CommercialDocumentsTest`, `MimePatchSecurityTest` y `ProductConfiguratorStageFAuditTest`. No se afirma haber ejecutado toda la suite histórica: se evitó ejecutar clases con `RefreshDatabase` que pudieran vaciar los datos QA persistentes.

Cobertura: venta pagada/completada, impago, pago parcial, pago posterior, doble pago manual rechazado, callbacks duplicados, conciliaciones, vendedor distinto del creador, tarifa congelada, aislamiento propio, sede histórica, períodos por evento, múltiples filas/pagos sin duplicación y reembolso posterior señalado sin reescritura. También se preservan descarga de documentos, permisos de correo, cotizaciones, conversión a venta y regresiones del configurador.

En el navegador se crearon cuatro órdenes y un producto oculto sintéticos exclusivamente en `upgrade_test`, sin stock ni movimientos de inventario. El caso personal comprobó 28.000 COP históricos ganados, 14.000 COP pendientes y 14.000 COP de las ganadas sujetos a revisión. Son datos QA, no ventas o pagos reales. No se eliminó ninguna fixture persistente anterior.

### Comandos principales

Backend, con las variables siguientes explícitas antes de ejecutar pruebas:

```bash
APP_ENV=testing DB_CONNECTION=mysql DB_HOST=127.0.0.1 DB_PORT=3306 \
DB_DATABASE=upgrade_test DB_USERNAME=root DB_PASSWORD= DB_URL= \
TEST_DB_CONNECTION=mysql TEST_DB_DATABASE=upgrade_test MAIL_MAILER=array \
php artisan test --filter='CommissionEarningKpiTest|CommissionLifecyclePhaseFourTest|CommissionLedgerApiPhaseFourTest|CommercialDocumentsTest|MimePatchSecurityTest|ProductConfiguratorStageFAuditTest'
```

Frontend: `npm test`, `npx tsc -b`, builds cliente y SSR mediante Vite. Los builds se generaron fuera del `dist` existente, en `/tmp/upgrade79-commissions-recovery-build-MbHekA/client`, para preservar sus cambios previos. El prerender usó un servidor auxiliar protegido sobre `upgrade_test`.

## Evidencias conservadas en el proyecto

- [Usuario — escritorio](qa-artifacts/commissions/user-dashboard-1440.png).
- [Usuario — móvil](qa-artifacts/commissions/user-dashboard-390.png).
- [Administrador — escritorio](qa-artifacts/commissions/admin-dashboard-1440.png).
- [Administrador — móvil](qa-artifacts/commissions/admin-dashboard-390.png).
- [Reporte del navegador](qa-artifacts/commissions/report.json), con resultados de ambos roles y huellas de integridad; no contiene contraseñas.

Estas evidencias están fuera de `public/` y no se publican con el ecommerce. Las copias en el proyecto no dependen de que sobreviva `/tmp` a otro reinicio.

## Pendientes y revisión manual

No quedan bloqueos detectados para revisar este alcance localmente. Reembolsos parciales, ajustes contables y liquidación al empleado continúan siendo una fase futura no implementada ni autorizada.

El build conserva el warning conocido de chunks superiores a 500 kB. El `git diff --check` global del frontend sigue señalando un whitespace previo en `dist/index.html:10`; los archivos del alcance de comisiones pasan la comprobación. Ninguno de estos pendientes se alteró.

Para revisar: iniciar sesión en `http://127.0.0.1:5173`; Usuario → Inicio → Mis comisiones → filtrar período → abrir una venta propia. Administrador → Dashboard → seleccionar sede → Comisiones del equipo → abrir el desglose del vendedor y su venta. En `upgrade` se verán exclusivamente los datos comerciales ya existentes, no las cifras de las fixtures de `upgrade_test`.

No hubo migraciones, escrituras sobre `upgrade`, cambios de SMTP, reglas de Wompi, inventario, PWA o Service Worker. No se hicieron pagos ni envíos de correo reales. No se hizo commit, push, deploy ni acceso a Hostinger/producción.
