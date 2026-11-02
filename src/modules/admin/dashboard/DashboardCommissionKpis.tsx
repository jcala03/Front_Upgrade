import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgeDollarSign, Clock3, ShoppingBag, TriangleAlert } from "lucide-react";
import { getAdminCommissionSummary } from "../../../api/commissions";
import type { AdminCommissionSummary } from "../../../types/commission";
import { hasPermission } from "../../../utils/authStorage";
import { formatCurrency } from "../../../utils/formatCurrency";
import { commissionMonth } from "../commissions/commissionUtils";
import { DashboardMetricCard } from "./DashboardMetricCard";

// Dashboard presentation only. Filters, seller breakdown and ledger stay in Commissions.
export const DashboardCommissionKpisView = ({ summary, error, href, onRetry }: {
  summary: AdminCommissionSummary | null;
  error: string;
  href: string;
  onRetry: () => void;
}) => <section className="dashboard-panel dashboard-commission-kpis" aria-label="Comisiones del equipo" aria-busy={!summary && !error}>
  <header className="dashboard-section__header">
    <div><span>Indicadores del mes</span><h2>Comisiones del equipo</h2></div>
    <a href={href}>Ver comisiones<ArrowRight size={16} aria-hidden="true" /></a>
  </header>
  {error ? <p className="dashboard-inline-error" role="alert">{error} <button type="button" onClick={onRetry}>Reintentar</button></p>
    : !summary ? <p className="dashboard-help" role="status">Cargando indicadores de comisiones…</p>
      : <>
        <div className="dashboard-metrics" aria-label="Indicadores de comisiones">
          <DashboardMetricCard label="Ganadas del mes" value={formatCurrency(summary.totals.earned_amount)} detail="Venta completada y pago total confirmado" icon={<BadgeDollarSign size={19} aria-hidden="true" />} />
          <DashboardMetricCard label="Pendientes del mes" value={formatCurrency(summary.totals.pending_amount)} detail="Todavía no son comisiones ganadas" icon={<Clock3 size={19} aria-hidden="true" />} />
          <DashboardMetricCard label="Ventas con comisión" value={summary.totals.sales_count} detail="Ventas distintas del período" icon={<ShoppingBag size={19} aria-hidden="true" />} />
          <DashboardMetricCard label="Sujetas a revisión" value={formatCurrency(summary.totals.review_amount)} detail="Incluidas en ganadas; no son saldo disponible" icon={<TriangleAlert size={19} aria-hidden="true" />} />
        </div>
        <p className="dashboard-help">{summary.period.from} — {summary.period.to} · Hora Colombia. Ganadas no significa pagadas al vendedor.</p>
      </>}
</section>;

export const DashboardCommissionKpis = ({ branchId }: { branchId?: number }) => {
  const canView = hasPermission("commissions.view");
  const month = useMemo(() => commissionMonth(), []);
  const [summary, setSummary] = useState<AdminCommissionSummary | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!canView) return;
    const controller = new AbortController();
    setSummary(null);
    setError("");
    getAdminCommissionSummary({ branch_id: branchId, date_from: month.from, date_to: month.to, date_basis: "event" }, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setSummary(data); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los indicadores de comisiones."); });
    return () => controller.abort();
  }, [branchId, canView, month.from, month.to, retry]);

  if (!canView) return null;
  const params = new URLSearchParams({ date_from: month.from, date_to: month.to, date_basis: "event" });
  if (branchId !== undefined) params.set("branch_id", String(branchId));
  return <DashboardCommissionKpisView summary={summary} error={error} href={"/crm/commissions?" + params.toString()} onRetry={() => setRetry((value) => value + 1)} />;
};
