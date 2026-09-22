import { BadgeDollarSign, ChevronLeft, ChevronRight, CircleDollarSign } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getMyCommissionSummary, listMyCommissions } from "../../../api/commissions";
import { StatusBadge } from "../../../components/crm/StatusBadge";
import type { CommissionStatus, MyCommission, MyCommissionSummary } from "../../../types/commission";
import { formatDateOnly, formatCrmTimestamp } from "../../../utils/crmDateTime";
import { formatCurrency } from "../../../utils/formatCurrency";
import { commissionItemName, commissionLabels, commissionTones } from "../../admin/commissions/commissionUtils";
import "../../admin/commissions/Commissions.css";

const errorMessage = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;

export const MyCommissionsPage = () => {
  const [rows, setRows] = useState<MyCommission[]>([]);
  const [summary, setSummary] = useState<MyCommissionSummary | null>(null);
  const [linked, setLinked] = useState(true);
  const [status, setStatus] = useState<CommissionStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const requestId = useRef(0);
  const summaryRequestId = useRef(0);

  const loadList = useCallback(async (signal?: AbortSignal) => {
    const current = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const list = await listMyCommissions({ status: status || undefined, date_from: from || undefined, date_to: to || undefined, page, per_page: 20 }, signal);
      if (current !== requestId.current) return;
      if (!list.employee_linked) setLinked(false);
      if (Array.isArray(list.commissions)) { setRows([]); setPages(1); setTotal(0); }
      else { setRows(list.commissions.data); setPages(Math.max(1, list.commissions.last_page)); setTotal(list.commissions.total); }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError") && current === requestId.current) setError(errorMessage(cause, "No se pudieron cargar tus comisiones."));
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [from, page, status, to]);

  const loadSummary = useCallback(async (signal?: AbortSignal) => {
    const current = ++summaryRequestId.current;
    setSummaryError("");
    try {
      const totals = await getMyCommissionSummary(signal);
      if (current !== summaryRequestId.current) return;
      setLinked(totals.employee_linked);
      setSummary(totals);
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError") && current === summaryRequestId.current) setSummaryError(errorMessage(cause, "No se pudo cargar el resumen mensual."));
    }
  }, []);

  useEffect(() => { const controller = new AbortController(); void loadList(controller.signal); return () => { requestId.current += 1; controller.abort(); }; }, [loadList]);
  useEffect(() => { const controller = new AbortController(); void loadSummary(controller.signal); return () => { summaryRequestId.current += 1; controller.abort(); }; }, [loadSummary]);

  if (!loading && !linked && !error) return <section className="commissions-state is-personal"><BadgeDollarSign size={28} /><h2>Tu perfil no está vinculado a un empleado</h2><p>Cuando se complete ese vínculo podrás consultar aquí tus comisiones personales.</p></section>;

  return <section className="commissions-page my-commissions" aria-labelledby="my-commissions-title">
    <header className="commissions-heading"><div><span>Mi espacio comercial</span><h2 id="my-commissions-title">Mis comisiones</h2><p>Consulta únicamente comisiones reales generadas por tus ventas.</p></div>{summary ? <small>{formatDateOnly(summary.period.from)} — {formatDateOnly(summary.period.to)} · Hora Colombia</small> : null}</header>
    {summaryError ? <div className="commissions-feedback is-error" role="alert"><span>{summaryError}</span><button type="button" onClick={() => void loadSummary()}>Reintentar resumen</button></div> : null}
    {summary ? <section className="commission-summary" aria-label="Resumen de comisiones de este mes"><article className="is-primary"><CircleDollarSign size={23} /><span>Ganadas este mes</span><strong>{formatCurrency(summary.current_month.earned_amount)}</strong></article><article><span>Pendientes</span><strong>{formatCurrency(summary.current_month.pending_amount)}</strong></article><article><span>Anuladas</span><strong>{formatCurrency(summary.current_month.voided_amount)}</strong></article><article><span>Unidades</span><strong>{summary.current_month.total_units}</strong></article></section> : null}
    <div className="commissions-my-toolbar"><label><span>Estado</span><select value={status} onChange={(event) => { setStatus(event.target.value as CommissionStatus | ""); setPage(1); }}><option value="">Todos</option>{Object.entries(commissionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Desde</span><input type="date" value={from} max={to || undefined} onChange={(event) => { setFrom(event.target.value); setPage(1); }} /></label><label><span>Hasta</span><input type="date" value={to} min={from || undefined} onChange={(event) => { setTo(event.target.value); setPage(1); }} /></label><span>{total} registros</span></div>
    {error ? <div className="commissions-feedback is-error" role="alert"><span>{error}</span><button type="button" onClick={() => void loadList()}>Reintentar</button></div> : null}
    {loading && !rows.length ? <div className="commissions-state" role="status"><BadgeDollarSign size={25} /><p>Cargando tus comisiones...</p></div> : null}
    {!loading && !rows.length && !error ? <div className="commissions-state"><BadgeDollarSign size={25} /><p>Aún no tienes comisiones registradas.</p></div> : null}
    {rows.length ? <ul className="my-commission-list" aria-busy={loading}>{rows.map((row) => <li key={row.id}><div className="my-commission-list__top"><div><small>{row.order?.order_number ?? "Venta no disponible"}</small><h3>{commissionItemName(row.product, row.variant)}</h3><span>{row.sku_snapshot ?? "Sin SKU"}</span></div><StatusBadge label={commissionLabels[row.status]} tone={commissionTones[row.status]} /></div><dl><div><dt>Cantidad</dt><dd>{row.quantity}</dd></div><div><dt>Por unidad</dt><dd>{formatCurrency(row.unit_commission)}</dd></div><div className="is-total"><dt>Total</dt><dd>{formatCurrency(row.amount)}</dd></div><div><dt>Fecha</dt><dd><time dateTime={row.created_at}>{formatCrmTimestamp(row.created_at)}</time></dd></div></dl></li>)}</ul> : null}
    {pages > 1 ? <nav className="commissions-pagination" aria-label="Paginación de mis comisiones"><button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} />Anterior</button><span>Página {page} de {pages}</span><button type="button" disabled={loading || page >= pages} onClick={() => setPage((value) => value + 1)}>Siguiente<ChevronRight size={16} /></button></nav> : null}
  </section>;
};
