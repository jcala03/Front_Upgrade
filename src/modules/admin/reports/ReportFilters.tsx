import type { ReportFilters as Filters, ReportKind } from "../../../types/report";
import type { Branch } from "../../../types/branch";
import { methodLabels, movementLabels, quotationLabels } from "./reportUtils";

type Props = { kind: ReportKind; branches: Branch[]; draft: Filters; loading: boolean; error: string; onChange: (key: string, value: string) => void; onApply: () => void; onClear: () => void };
const selectOptions = (values: Record<string, string>) => Object.entries(values).map(([value, label]) => <option key={value} value={value}>{label}</option>);

const sortOptions: Record<ReportKind, Record<string, string>> = {
  sales: { confirmed_at: "Fecha", total: "Total" }, products: { quantity: "Cantidad", revenue: "Revenue", orders_count: "Órdenes" }, payments: { paid_at: "Fecha", amount: "Monto" },
  receivables: { outstanding: "Pendiente", confirmed_at: "Fecha de venta", days_outstanding: "Antigüedad" }, inventory: { name: "Nombre", sku: "SKU", stock: "Stock" },
  "inventory-movements": { created_at: "Fecha", quantity_delta: "Cambio" }, quotations: { created_at: "Creación", valid_until: "Vigencia", total: "Total", converted_at: "Conversión" },
  customers: { created_at: "Fecha de alta", orders_count: "Compras", total_spent: "Total comprado", last_purchase_at: "Última compra" },
};

export const ReportFilters = ({ kind, branches, draft, loading, error, onChange, onApply, onClear }: Props) => {
  const period = !["inventory", "receivables"].includes(kind);
  return <form className="report-filters" onSubmit={(event) => { event.preventDefault(); onApply(); }}>
    <div className="report-filters__grid">
      <label>Sede<select value={String(draft.branch_id ?? "")} onChange={(event) => onChange("branch_id", event.target.value)}><option value="">Todas las sedes</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.is_active ? "" : " (inactiva)"}</option>)}</select></label>
      {(period || kind === "receivables") ? <><label>Desde<input type="date" value={String(draft.date_from ?? "")} onChange={(e) => onChange("date_from", e.target.value)} /></label><label>Hasta<input type="date" value={String(draft.date_to ?? "")} onChange={(e) => onChange("date_to", e.target.value)} /></label></> : null}
      {["sales", "products"].includes(kind) ? <label>Origen<select value={String(draft.origin ?? "")} onChange={(e) => onChange("origin", e.target.value)}><option value="">Todos</option><option value="crm">CRM</option><option value="ecommerce">Ecommerce</option></select></label> : null}
      {kind === "sales" ? <label>Estado de pago<select value={String(draft.payment_status ?? "")} onChange={(e) => onChange("payment_status", e.target.value)}><option value="">Todos</option><option value="unpaid">Sin pago</option><option value="partial">Parcial</option><option value="paid">Pagada</option><option value="refunded">Reembolsada</option></select></label> : null}
      {kind === "products" ? <label>Agrupar por<select value={String(draft.group_by ?? "product")} onChange={(e) => onChange("group_by", e.target.value)}><option value="product">Producto</option><option value="sku">SKU / Variante</option></select></label> : null}
      {kind === "payments" ? <><label>Método<select value={String(draft.method ?? "")} onChange={(e) => onChange("method", e.target.value)}><option value="">Todos</option>{selectOptions(methodLabels)}</select></label><label>Estado<select value={String(draft.status ?? "")} onChange={(e) => onChange("status", e.target.value)}><option value="">Todos</option><option value="pending">Pendiente</option><option value="completed">Completado</option><option value="failed">Fallido</option><option value="refunded">Reembolsado</option></select></label></> : null}
      {kind === "receivables" ? <label>Estado<select value={String(draft.balance_status ?? "")} onChange={(e) => onChange("balance_status", e.target.value)}><option value="">Todos</option><option value="unpaid">Sin pago</option><option value="partial">Parcial</option></select></label> : null}
      {kind === "inventory" ? <label>Estado<select value={String(draft.status ?? "all")} onChange={(e) => onChange("status", e.target.value)}><option value="all">Todos</option><option value="normal">Normal</option><option value="low">Stock bajo</option><option value="out">Agotado</option></select></label> : null}
      {kind === "inventory-movements" ? <label>Tipo<select value={String(draft.type ?? "")} onChange={(e) => onChange("type", e.target.value)}><option value="">Todos</option>{selectOptions(movementLabels)}</select></label> : null}
      {kind === "quotations" ? <><label>Estado<select value={String(draft.status ?? "")} onChange={(e) => onChange("status", e.target.value)}><option value="">Todos</option>{selectOptions(quotationLabels)}</select></label><label>Conversión<select value={String(draft.conversion ?? "all")} onChange={(e) => onChange("conversion", e.target.value)}><option value="all">Todas</option><option value="converted">Convertidas</option><option value="not_converted">No convertidas</option></select></label></> : null}
      {kind === "customers" ? <><label>Estado<select value={String(draft.is_active ?? "")} onChange={(e) => onChange("is_active", e.target.value)}><option value="">Todos</option><option value="1">Activos</option><option value="0">Inactivos</option></select></label><label>Comprador<select value={String(draft.buyer ?? "all")} onChange={(e) => onChange("buyer", e.target.value)}><option value="all">Todos</option><option value="yes">Sí</option><option value="no">No</option></select></label></> : null}
      {kind !== "products" ? <label className="report-filters__search">Buscar<input type="search" value={String(draft.search ?? "")} placeholder="Buscar..." onChange={(e) => onChange("search", e.target.value)} /></label> : null}
      <label>Ordenar por<select value={String(draft.sort ?? "")} onChange={(e) => onChange("sort", e.target.value)}>{selectOptions(sortOptions[kind])}</select></label>
      <label>Dirección<select value={String(draft.direction ?? "desc")} onChange={(e) => onChange("direction", e.target.value)}><option value="desc">Descendente</option><option value="asc">Ascendente</option></select></label>
    </div>
    {error ? <p className="report-filters__error" role="alert">{error}</p> : null}
    <div className="report-filters__actions"><button type="submit" disabled={loading}>{loading ? "Consultando..." : "Aplicar filtros"}</button><button type="button" className="is-secondary" disabled={loading} onClick={onClear}>Limpiar filtros</button></div>
  </form>;
};
