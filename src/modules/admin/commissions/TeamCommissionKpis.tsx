import { useEffect, useMemo, useState } from "react";
import { getAdminCommissionSummary } from "../../../api/commissions";
import type { AdminCommissionFilters, AdminCommissionSummary } from "../../../types/commission";
import { formatCurrency } from "../../../utils/formatCurrency";
import { commissionMonth } from "./commissionUtils";
import "./Commissions.css";

export const TeamCommissionKpis = ({ branchId, filters }: { branchId?: number; filters?: AdminCommissionFilters }) => {
  const [from, setFrom] = useState(() => commissionMonth().from);
  const [to, setTo] = useState(() => commissionMonth().to);
  const [summary, setSummary] = useState<AdminCommissionSummary | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const query = useMemo(() => filters ?? { branch_id: branchId, date_from: from, date_to: to, date_basis: "event" as const }, [filters, branchId, from, to]);
  useEffect(() => {
    const controller = new AbortController();
    setSummary(null); setError("");
    getAdminCommissionSummary(query, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setSummary(data); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las comisiones."); });
    return () => controller.abort();
  }, [query, retry]);
  const href = (employeeId?: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
    params.set("date_basis", "event");
    if (employeeId) params.set("employee_id", String(employeeId));
    return "/crm/commissions?" + params.toString();
  };
  return <section className="team-commission-kpis" aria-labelledby="team-commission-title" aria-busy={!summary && !error}>
    <header><div><span>Comisiones comerciales</span><h2 id="team-commission-title">Comisiones del equipo</h2><p>Ganadas no significa liquidadas ni pagadas al vendedor.</p></div><a href={href()}>Ver ventas y detalle</a></header>
    {!filters ? <div className="commissions-my-toolbar"><label><span>Desde · Colombia</span><input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label><label><span>Hasta · Colombia</span><input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></label><button type="button" onClick={() => { const month = commissionMonth(); setFrom(month.from); setTo(month.to); }}>Este mes</button><small>{branchId ? "Sede histórica seleccionada" : "Todas las sedes autorizadas"}</small></div> : null}
    {error ? <p className="commissions-feedback is-error" role="alert">{error}<button type="button" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></p> : !summary ? <p role="status">Cargando comisiones del período…</p> : <>
      <div className="commission-summary"><article><span>Ganadas del período</span><strong>{formatCurrency(summary.totals.earned_amount)}</strong></article><article><span>Pendientes del período</span><strong>{formatCurrency(summary.totals.pending_amount)}</strong></article><article><span>Ventas distintas con comisión</span><strong>{summary.totals.sales_count}</strong></article><article><span>Ganadas sujetas a revisión</span><strong>{formatCurrency(summary.totals.review_amount)}</strong></article></div>
      {summary.totals.review_amount > 0 ? <p className="commission-review" role="status">Hay importes históricos afectados por reembolsos o discrepancias. Están incluidos en las ganadas, no son saldo disponible y requieren un ajuste posterior autorizado.</p> : null}
      <p className="commission-period-note">{summary.period.from} — {summary.period.to} · Ganadas: fecha de obtención; pendientes: creación; anuladas: anulación. Hora Colombia.</p>
      {summary.by_employee.length ? <ul className="team-commission-sellers" aria-label="Comisiones por vendedor">{summary.by_employee.map((row) => <li key={row.employee.id}><div><strong>{row.employee.name}</strong><small>{row.sales_count} ventas distintas{row.review_amount > 0 ? " · Requiere revisión" : ""}</small></div><dl><div><dt>Ganadas</dt><dd>{formatCurrency(row.earned_amount)}</dd></div><div><dt>Pendientes</dt><dd>{formatCurrency(row.pending_amount)}</dd></div></dl><a href={href(row.employee.id)}>Ver ventas de {row.employee.name}</a></li>)}</ul> : <p>No hay comisiones en este período.</p>}
    </>}
  </section>;
};
