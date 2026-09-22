import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, Banknote, FileText, RefreshCw, ShoppingBag, UsersRound } from "lucide-react";
import { compareDashboardBranches, getDashboard } from "../../../api/dashboard";
import { listAllBranches } from "../../../api/branches";
import type { Branch } from "../../../types/branch";
import type { DashboardCompareData, DashboardData } from "../../../types/dashboard";
import { formatCurrency } from "../../../utils/formatCurrency";
import { hasPermission } from "../../../utils/authStorage";
import { originLabels, paymentStatusLabels } from "../orders/orderUtils";
import { SalesChart } from "./SalesChart";
import "./AdminDashboardPage.css";

const formatDateTime = (value: string | null) => value
  ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" }).format(new Date(value))
  : "Sin fecha";

const bogotaTodaySerial = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day));
};

const expiryLabel = (date: string) => {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  const difference = Math.round((Date.UTC(year, month - 1, day) - bogotaTodaySerial()) / 86_400_000);
  if (difference === 0) return "Vence hoy";
  if (difference === 1) return "Vence mañana";
  if (difference > 1 && difference <= 3) return `Vence en ${difference} días`;
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(`${date.slice(0, 10)}T00:00:00`));
};

const MetricCard = ({ label, value, detail, icon }: { label: string; value: ReactNode; detail: ReactNode; icon: ReactNode }) => (
  <article className="dashboard-metric">
    <div className="dashboard-metric__heading"><span>{label}</span>{icon}</div>
    <strong>{value}</strong>
    <small>{detail}</small>
  </article>
);

const SectionHeader = ({ eyebrow, title, href, linkLabel }: { eyebrow: string; title: string; href?: string; linkLabel?: string }) => (
  <header className="dashboard-section__header">
    <div><span>{eyebrow}</span><h2>{title}</h2></div>
    {href && linkLabel ? <a href={href}>{linkLabel}<ArrowRight size={16} aria-hidden="true" /></a> : null}
  </header>
);

const DashboardHeader = ({ title, subtitle, generatedAt, loading, onRefresh }: { title: string; subtitle: string; generatedAt: string | null; loading: boolean; onRefresh?: () => void }) => <header className="admin-dashboard__header"><div><span>Resumen operativo</span><h2>{title}</h2><p>{subtitle}</p>{generatedAt ? <small>Actualizado {formatDateTime(generatedAt)} · Hora Colombia</small> : null}</div>{onRefresh ? <button type="button" onClick={onRefresh} disabled={loading}><RefreshCw className={loading ? "is-spinning" : ""} size={17} aria-hidden="true" />{loading ? "Actualizando..." : "Actualizar"}</button> : null}</header>;

const DashboardError = ({ error, onRetry }: { error: string; onRetry: () => void }) => <p className="dashboard-inline-error" role="alert">{error} <button type="button" onClick={onRetry}>Reintentar</button></p>;

const CompareSelector = ({ branches, selected, onChange }: { branches: Branch[]; selected: number[]; onChange: (ids: number[]) => void }) => <fieldset className="dashboard-compare-selector"><legend>Sedes a comparar</legend><p>Selecciona entre 2 y 25 sedes.</p><div>{branches.map((branch) => { const checked = selected.includes(branch.id); return <label key={branch.id}><input type="checkbox" checked={checked} disabled={!checked && selected.length >= 25} onChange={(event) => onChange(event.target.checked ? [...selected, branch.id] : selected.filter((id) => id !== branch.id))} /><span>{branch.name}<small>{branch.code}{branch.is_active ? "" : " · Inactiva"}</small></span></label>; })}</div>{selected.length < 2 ? <strong role="alert">Selecciona al menos dos sedes para comparar.</strong> : null}</fieldset>;

const DashboardComparison = ({ comparison }: { comparison: DashboardCompareData }) => <section className="dashboard-comparison" aria-labelledby="dashboard-comparison-title"><header><div><span>Mes actual</span><h2 id="dashboard-comparison-title">Indicadores por sede</h2></div><small>{comparison.period.date_from} — {comparison.period.date_to}</small></header><div className="dashboard-comparison__grid">{comparison.branches.map((item) => <article key={item.branch.id}><header><span>{item.branch.code}</span><h3>{item.branch.name}</h3></header><dl><div><dt>Ventas</dt><dd>{formatCurrency(item.sales_total)}<small>{item.sales_count} ventas</small></dd></div><div><dt>Ticket promedio</dt><dd>{formatCurrency(item.average_ticket)}</dd></div><div><dt>Unidades</dt><dd>{item.product_units}</dd></div><div><dt>Cotizaciones</dt><dd>{item.quotations_count}</dd></div><div><dt>Conversión</dt><dd>{item.conversion_rate === null ? "—" : `${item.conversion_rate}%`}</dd></div><div><dt>Pagos recibidos</dt><dd>{formatCurrency(item.payments_received)}</dd></div><div><dt>Por cobrar</dt><dd>{formatCurrency(item.receivables)}</dd></div><div><dt>Clientes atendidos</dt><dd>{item.customers_served}</dd></div><div><dt>Posiciones críticas</dt><dd>{item.low_stock_positions}</dd></div></dl></article>)}</div></section>;

export const AdminDashboardPage = () => {
  const canView = hasPermission("dashboard.view");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [mode, setMode] = useState<"general" | "branch" | "compare">("general");
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [compareBranchIds, setCompareBranchIds] = useState<number[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [comparison, setComparison] = useState<DashboardCompareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!canView) return;
    const controller = new AbortController();
    listAllBranches(controller.signal).then(setBranches).catch((cause) => {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las sedes.");
    });
    return () => controller.abort();
  }, [canView]);

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    if (mode === "branch" && selectedBranchId === null) { setLoading(false); return; }
    if (mode === "compare" && compareBranchIds.length < 2) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError("");
    if (mode === "compare") setComparison(null); else setDashboard(null);
    const request = mode === "compare"
      ? compareDashboardBranches(compareBranchIds, controller.signal).then(setComparison)
      : getDashboard(mode === "branch" ? selectedBranchId ?? undefined : undefined, controller.signal).then(setDashboard);
    request.catch((cause) => { if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(cause instanceof Error ? cause.message : "No se pudo cargar el dashboard."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [canView, compareBranchIds, mode, retry, selectedBranchId]);

  const selectMode = (nextMode: "general" | "branch" | "compare", branchId?: number) => {
    setError("");
    if (nextMode === "branch") setSelectedBranchId(branchId ?? branches[0]?.id ?? null);
    if (nextMode === "compare" && compareBranchIds.length < 2) setCompareBranchIds(branches.slice(0, 2).map((branch) => branch.id));
    setMode(nextMode);
  };

  const scopeControls = <section className="dashboard-scope" aria-labelledby="dashboard-scope-title"><div><span id="dashboard-scope-title">Vista</span><div className="dashboard-scope__tabs"><button type="button" aria-pressed={mode === "general"} onClick={() => selectMode("general")}>General</button>{branches.map((branch) => <button type="button" aria-pressed={mode === "branch" && selectedBranchId === branch.id} key={branch.id} onClick={() => selectMode("branch", branch.id)}>{branch.name}</button>)}<button type="button" aria-pressed={mode === "compare"} disabled={branches.length < 2} onClick={() => selectMode("compare")}>Comparar</button></div></div><label>Vista del dashboard<select value={mode === "general" ? "general" : mode === "compare" ? "compare" : String(selectedBranchId ?? "")} onChange={(event) => event.target.value === "general" || event.target.value === "compare" ? selectMode(event.target.value) : selectMode("branch", Number(event.target.value))}><option value="general">General</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}<option value="compare" disabled={branches.length < 2}>Comparar sedes</option></select></label></section>;

  if (!canView) return <section className="dashboard-state dashboard-state--error"><strong>Acceso restringido</strong><p>No tienes permiso para consultar el dashboard.</p></section>;
  if (loading && !(mode === "compare" ? comparison : dashboard)) return <section className="dashboard-state" role="status"><RefreshCw className="is-spinning" size={22} aria-hidden="true" /><strong>Cargando dashboard...</strong></section>;
  if (mode === "compare" && compareBranchIds.length < 2) return <section className="admin-dashboard" aria-label="Comparación de sedes"><DashboardHeader title="Comparación de sedes" subtitle="Selecciona las sedes que deseas comparar." generatedAt={null} loading={false} />{scopeControls}<CompareSelector branches={branches} selected={compareBranchIds} onChange={setCompareBranchIds} /></section>;
  if (mode === "compare" && comparison) return <section className="admin-dashboard" aria-label="Comparación de sedes"><DashboardHeader title="Comparación de sedes" subtitle="Compara indicadores del mes actual usando una sola consulta agregada." generatedAt={comparison.period.generated_at} loading={loading} onRefresh={() => setRetry((value) => value + 1)} />{scopeControls}<CompareSelector branches={branches} selected={compareBranchIds} onChange={setCompareBranchIds} /><DashboardComparison comparison={comparison} />{error ? <DashboardError error={error} onRetry={() => setRetry((value) => value + 1)} /> : null}</section>;
  if (!dashboard) return <section className="dashboard-state dashboard-state--error" role="alert"><strong>No pudimos cargar el dashboard</strong><p>{error || (mode === "compare" ? "Selecciona al menos dos sedes." : "No hay información disponible.")}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></section>;

  const { sales, payments, quotations, customers, inventory } = dashboard;

  return (
    <section className="admin-dashboard" aria-label="Resumen operativo del negocio">
      <DashboardHeader title={dashboard.context.branch?.name ?? "Dashboard general"} subtitle={dashboard.context.mode === "branch" ? `Operación de ${dashboard.context.branch?.name}.` : "Ventas, cartera, cotizaciones e inventario de todas las sedes."} generatedAt={dashboard.period.generated_at} loading={loading} onRefresh={() => setRetry((value) => value + 1)} />
      {scopeControls}
      {error ? <DashboardError error={error} onRetry={() => setRetry((value) => value + 1)} /> : null}

      <section className="dashboard-metrics" aria-label="Indicadores principales">
        <MetricCard label="Ventas hoy" value={formatCurrency(sales.today.total)} detail={`${sales.today.orders_count} ${sales.today.orders_count === 1 ? "venta" : "ventas"}`} icon={<ShoppingBag size={19} aria-hidden="true" />} />
        <MetricCard label="Ventas este mes" value={formatCurrency(sales.month.total)} detail={`${sales.month.orders_count} ventas · ${sales.product_units_month} unidades`} icon={<Banknote size={19} aria-hidden="true" />} />
        <MetricCard label="Por cobrar" value={formatCurrency(payments.outstanding)} detail={`${payments.orders_with_balance} ${payments.orders_with_balance === 1 ? "orden con saldo" : "órdenes con saldo"}`} icon={<FileText size={19} aria-hidden="true" />} />
        <MetricCard label="Stock crítico" value={`${inventory.low_stock_count} bajo`} detail={`${inventory.out_of_stock_count} ${inventory.out_of_stock_count === 1 ? "agotado" : "agotados"}`} icon={<AlertTriangle size={19} aria-hidden="true" />} />
      </section>

      <div className="dashboard-grid dashboard-grid--hero">
        <section className="dashboard-panel dashboard-panel--chart">
          <SectionHeader eyebrow="Rendimiento comercial" title="Ventas · últimos 30 días" />
          <div className="dashboard-sales-periods"><div><span>Hoy</span><strong>{formatCurrency(sales.today.total)}</strong><small>{sales.today.orders_count} ventas</small></div><div><span>Semana</span><strong>{formatCurrency(sales.week.total)}</strong><small>{sales.week.orders_count} ventas</small></div><div><span>Mes</span><strong>{formatCurrency(sales.month.total)}</strong><small>{sales.month.orders_count} ventas</small></div></div>
          <SalesChart points={sales.last_30_days} />
          <div className="dashboard-origin"><div><span>CRM</span><strong>{formatCurrency(sales.by_origin_month.crm)}</strong></div><div><span>Ecommerce</span><strong>{formatCurrency(sales.by_origin_month.ecommerce)}</strong></div></div>
        </section>

        <section className="dashboard-panel">
          <SectionHeader eyebrow="Seguimiento" title="Cotizaciones" href="/crm/quotations" linkLabel="Ver cotizaciones" />
          <dl className="dashboard-stat-list"><div><dt>Abiertas</dt><dd>{quotations.open}</dd></div><div><dt>Por vencer</dt><dd>{quotations.expiring_soon}</dd></div><div><dt>Convertidas este mes</dt><dd>{quotations.converted_month}</dd></div><div><dt>Conversión</dt><dd>{quotations.conversion_rate === null ? "—" : `${quotations.conversion_rate}%`}</dd></div></dl>
          <p className="dashboard-help">Conversión calculada sobre cotizaciones resueltas.</p>
          <div className="dashboard-divider" />
          <h3>Próximas a vencer</h3>
          {dashboard.expiring_quotations.length ? <ul className="dashboard-compact-list">{dashboard.expiring_quotations.map((quotation) => <li key={quotation.id}><div><strong>{quotation.quotation_number}</strong><span>{quotation.customer_name}</span>{quotation.vehicle_summary ? <small>{quotation.vehicle_summary}</small> : null}</div><div><strong>{formatCurrency(quotation.total)}</strong><span className="dashboard-status is-warning">{expiryLabel(quotation.valid_until)}</span></div></li>)}</ul> : <p className="dashboard-empty">No hay cotizaciones próximas a vencer.</p>}
        </section>
      </div>

      <section className="dashboard-panel dashboard-panel--payments">
        <SectionHeader eyebrow="Flujo de caja" title="Pagos / cartera" />
        <div className="dashboard-payment-grid"><div><span>Pagos recibidos hoy</span><strong>{formatCurrency(payments.received_today)}</strong></div><div><span>Pagos recibidos este mes</span><strong>{formatCurrency(payments.received_month)}</strong></div><div><span>Por cobrar</span><strong>{formatCurrency(payments.outstanding)}</strong><small>{payments.orders_with_balance} órdenes con saldo</small></div></div>
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-panel">
          <SectionHeader eyebrow="Operación" title="Ventas recientes" href="/crm/orders" linkLabel="Ver órdenes" />
          {dashboard.recent_orders.length ? <ul className="dashboard-record-list">{dashboard.recent_orders.map((order) => <li key={order.id}><div><strong>{order.order_number}</strong><span>{order.customer_name}</span>{order.vehicle_summary ? <small>{order.vehicle_summary}</small> : null}</div><div><strong>{formatCurrency(order.total)}</strong><span>{originLabels[order.origin]} · {paymentStatusLabels[order.payment_status]}</span><small>{formatDateTime(order.confirmed_at)}</small></div></li>)}</ul> : <p className="dashboard-empty">Todavía no hay ventas confirmadas.</p>}
        </section>
        <section className="dashboard-panel">
          <SectionHeader eyebrow="Disponibilidad" title="Alertas de inventario" href="/crm/inventory" linkLabel="Ver inventario" />
          {dashboard.low_stock.length ? <ul className="dashboard-record-list">{dashboard.low_stock.map((item) => <li key={`${item.branch.id}-${item.type}-${item.product_id}-${item.product_variant_id ?? "base"}`}><div><strong>{item.name}</strong>{item.variant_name ? <span>{item.variant_name}</span> : null}<small>{item.sku || "Sin SKU"}{dashboard.context.mode === "general" ? ` · ${item.branch.name}` : ""}</small></div><div><span>Stock: {item.stock} · Mínimo: {item.minimum_stock}</span><strong className={`dashboard-status ${item.status === "out" ? "is-danger" : "is-warning"}`}>{item.status === "out" ? "Agotado" : "Stock bajo"}</strong></div></li>)}</ul> : <p className="dashboard-empty">No hay alertas de inventario.</p>}
        </section>
        <section className="dashboard-panel">
          <SectionHeader eyebrow="Demanda" title="Productos más vendidos" />
          {dashboard.top_products.length ? <ol className="dashboard-ranking">{dashboard.top_products.map((product) => <li key={`${product.product_id ?? "snapshot"}-${product.product_sku ?? product.product_name}`}><span>{product.product_name}<small>{product.product_sku || "Sin SKU"}</small></span><strong>{product.quantity} unidades<small>{formatCurrency(product.revenue)}</small></strong></li>)}</ol> : <p className="dashboard-empty">Todavía no hay productos vendidos este mes.</p>}
        </section>
        <section className="dashboard-panel">
          <SectionHeader eyebrow="Relaciones comerciales" title="Clientes" href="/crm/customers" linkLabel="Ver clientes" />
          <div className="dashboard-customer-total"><UsersRound size={22} aria-hidden="true" /><div><strong>{customers.active}</strong><span>clientes activos</span></div></div>
          <dl className="dashboard-stat-list dashboard-stat-list--compact"><div><dt>Nuevos este mes</dt><dd>{customers.new_month}</dd></div><div><dt>Compradores este mes</dt><dd>{customers.buyers_month}</dd></div><div><dt>Total registrado</dt><dd>{customers.total}</dd></div></dl>
        </section>
      </div>

      {dashboard.financials ? <section className="dashboard-panel dashboard-financials">
        <SectionHeader eyebrow="Administración" title="Resumen financiero" />
        <div className="dashboard-financial-grid"><div><span>Revenue del mes</span><strong>{formatCurrency(dashboard.financials.revenue_month)}</strong></div><div><span>Costo histórico conocido</span><strong>{formatCurrency(dashboard.financials.cogs_month)}</strong></div><div><span>Utilidad bruta (costo conocido)</span><strong>{formatCurrency(dashboard.financials.gross_profit_on_known_cost_month)}</strong></div><div><span>Margen bruto</span><strong>{dashboard.financials.gross_margin_percent === null ? "—" : `${dashboard.financials.gross_margin_percent}%`}</strong></div></div>
        <div className="dashboard-coverage"><div><span>Cobertura de costos</span><strong>{dashboard.financials.cost_coverage_percent}%</strong></div><div className="dashboard-coverage__track" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, dashboard.financials.cost_coverage_percent))}%` }} /></div>{dashboard.financials.cost_coverage_percent < 100 ? <p>El margen se calcula únicamente sobre ventas con costo histórico disponible ({formatCurrency(dashboard.financials.known_cost_revenue_month)} cubiertos).</p> : null}</div>
      </section> : null}
    </section>
  );
};
