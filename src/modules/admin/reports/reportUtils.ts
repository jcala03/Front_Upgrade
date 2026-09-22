import type { ReportFilters, ReportKind } from "../../../types/report";

export const reportLabels: Record<ReportKind, string> = { sales: "Ventas", products: "Productos", payments: "Pagos", receivables: "Cartera", inventory: "Inventario", "inventory-movements": "Movimientos", quotations: "Cotizaciones", customers: "Clientes" };
export const periodReports = new Set<ReportKind>(["sales", "products", "payments", "inventory-movements", "quotations", "customers"]);

export const defaultFilters = (kind: ReportKind): ReportFilters => ({
  page: 1, per_page: 25, direction: "desc",
  ...(kind === "sales" ? { sort: "confirmed_at" } : {}),
  ...(kind === "products" ? { sort: "quantity", group_by: "product" } : {}),
  ...(kind === "payments" ? { sort: "paid_at" } : {}),
  ...(kind === "receivables" ? { sort: "outstanding", balance_status: "" } : {}),
  ...(kind === "inventory" ? { sort: "name", direction: "asc", status: "all" } : {}),
  ...(kind === "inventory-movements" ? { sort: "created_at" } : {}),
  ...(kind === "quotations" ? { sort: "created_at", conversion: "all" } : {}),
  ...(kind === "customers" ? { sort: "total_spent", buyer: "all" } : {}),
});

export const formatDateOnly = (value: string | null | undefined) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return "—";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
};
export const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" }).format(date);
};
export const percent = (value: number | null | undefined) => value === null || value === undefined || !Number.isFinite(value) ? "—" : `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(value)}%`;

export const paymentLabels: Record<string, string> = { unpaid: "Sin pago", partial: "Parcial", paid: "Pagada", refunded: "Reembolsada", pending: "Pendiente", completed: "Completado", failed: "Fallido" };
export const methodLabels: Record<string, string> = { cash: "Efectivo", transfer: "Transferencia", card_terminal: "Tarjeta / datáfono", wompi: "Wompi", other: "Otro" };
export const movementLabels: Record<string, string> = { entry: "Entrada", exit: "Salida", adjustment: "Ajuste", sale: "Venta", sale_reversal: "Reversión de venta" };
export const quotationLabels: Record<string, string> = { draft: "Borrador", sent: "Enviada", rejected: "Rechazada", expired: "Vencida", converted: "Convertida" };
export const inventoryLabels: Record<string, string> = { normal: "Normal", low: "Stock bajo", out: "Agotado" };

export const paginatorOf = (report: unknown) => {
  if (!report || typeof report !== "object" || !("rows" in report)) return null;
  return (report as { rows: { current_page: number; last_page: number; total: number; data: unknown[] } }).rows;
};
