import { BadgeDollarSign, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { listAllBranches } from "../../../api/branches";
import { getAdminCommission, listAdminCommissions } from "../../../api/commissions";
import { CrmDialog } from "../../../components/crm/Dialog";
import { StatusBadge } from "../../../components/crm/StatusBadge";
import type { Branch } from "../../../types/branch";
import type { AdminCommission, CommissionStatus } from "../../../types/commission";
import { formatCrmTimestamp } from "../../../utils/crmDateTime";
import { formatCurrency } from "../../../utils/formatCurrency";
import { commissionDescriptions, commissionItemName, commissionLabels, commissionTones } from "./commissionUtils";
import "./Commissions.css";

const errorMessage = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;

export const AdminCommissionsPage = () => {
  const [rows, setRows] = useState<AdminCommission[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesError, setBranchesError] = useState("");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [status, setStatus] = useState<CommissionStatus | "">("");
  const [branchId, setBranchId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetailState] = useState<AdminCommission | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const requestId = useRef(0);
  const detailRequestId = useRef(0);
  const detailController = useRef<AbortController | null>(null);
  const setDetail = (value: AdminCommission | null) => {
    if (value === null) {
      detailRequestId.current += 1;
      detailController.current?.abort();
      detailController.current = null;
      setDetailLoading(false);
      setDetailError("");
    }
    setDetailState(value);
  };

  const load = useCallback(async (signal?: AbortSignal) => {
    const current = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const result = await listAdminCommissions({ search: submittedSearch || undefined, status: status || undefined, branch_id: branchId ? Number(branchId) : undefined, date_from: from || undefined, date_to: to || undefined, page, per_page: 25 }, signal);
      if (current !== requestId.current) return;
      setRows(result.commissions.data);
      setPages(Math.max(1, result.commissions.last_page));
      setTotal(result.commissions.total);
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError") && current === requestId.current) setError(errorMessage(cause, "No se pudieron cargar las comisiones."));
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [branchId, from, page, status, submittedSearch, to]);

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => { requestId.current += 1; controller.abort(); }; }, [load]);
  useEffect(() => {
    const controller = new AbortController();
    setBranchesLoading(true);
    setBranchesError("");
    listAllBranches(controller.signal)
      .then(setBranches)
      .catch((cause) => { if (!(cause instanceof DOMException && cause.name === "AbortError")) setBranchesError(errorMessage(cause, "No se pudieron cargar las sedes.")); })
      .finally(() => { if (!controller.signal.aborted) setBranchesLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => () => { detailRequestId.current += 1; detailController.current?.abort(); }, []);

  const submitFilters = (event: FormEvent) => { event.preventDefault(); setPage(1); setSubmittedSearch(search.trim()); };
  const openDetail = async (commission: AdminCommission) => {
    detailController.current?.abort();
    const controller = new AbortController();
    detailController.current = controller;
    const current = ++detailRequestId.current;
    setDetail(commission);
    setDetailLoading(true);
    setDetailError("");
    try {
      const result = await getAdminCommission(commission.id, controller.signal);
      if (current === detailRequestId.current) setDetail(result);
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError") && current === detailRequestId.current) setDetailError(errorMessage(cause, "No se pudo cargar el detalle."));
    } finally {
      if (current === detailRequestId.current) {
        detailController.current = null;
        setDetailLoading(false);
      }
    }
  };

  return <section className="commissions-page" aria-labelledby="admin-commissions-title">
    <header className="commissions-heading"><div><span>Ledger comercial</span><h2 id="admin-commissions-title">Comisiones</h2><p>Historial trazable generado por el ciclo de vida de las ventas.</p></div><div><strong>{total}</strong><small>registros</small></div></header>
    <form className="commissions-filters" onSubmit={submitFilters}>
      <label className="is-grow"><span>Buscar</span><div className="commissions-search"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Colaborador, venta, producto o SKU" /><button type="submit" aria-label="Buscar comisiones"><Search size={17} /></button></div></label>
      <label><span>Estado</span><select value={status} onChange={(event) => { setStatus(event.target.value as CommissionStatus | ""); setPage(1); }}><option value="">Todos</option>{Object.entries(commissionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label><span>Sede histórica</span><select value={branchId} disabled={branchesLoading || Boolean(branchesError)} onChange={(event) => { setBranchId(event.target.value); setPage(1); }}><option value="">{branchesLoading ? "Cargando sedes..." : branchesError ? "Sedes no disponibles" : "Todas"}</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
      <label><span>Desde</span><input type="date" value={from} max={to || undefined} onChange={(event) => { setFrom(event.target.value); setPage(1); }} /></label>
      <label><span>Hasta</span><input type="date" value={to} min={from || undefined} onChange={(event) => { setTo(event.target.value); setPage(1); }} /></label>
    </form>
    {branchesError ? <div className="commissions-feedback is-error" role="alert"><span>{branchesError}</span></div> : null}
    {error ? <div className="commissions-feedback is-error" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Reintentar</button></div> : null}
    {loading && !rows.length ? <div className="commissions-state" role="status"><BadgeDollarSign size={25} /><p>Cargando comisiones...</p></div> : null}
    {!loading && !rows.length && !error ? <div className="commissions-state"><BadgeDollarSign size={25} /><p>No hay comisiones registradas.</p></div> : null}
    {rows.length ? <div className="commissions-table-wrap" aria-busy={loading}><table className="commissions-table"><thead><tr><th>Colaborador</th><th>Sede</th><th>Venta</th><th>Producto / variante</th><th>Cantidad</th><th>Por unidad</th><th>Total</th><th>Estado</th><th>Fecha</th><th></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td data-label="Colaborador"><strong>{row.employee?.name ?? "Colaborador no disponible"}</strong></td><td data-label="Sede"><strong>{row.branch?.name ?? "Sede no disponible"}</strong><small>{row.branch?.code ?? "Histórica"}</small></td><td data-label="Venta">{row.order?.order_number ?? "Venta no disponible"}</td><td data-label="Producto"><strong>{commissionItemName(row.product, row.variant)}</strong><small>{row.sku_snapshot ?? "Sin SKU"}</small></td><td data-label="Cantidad">{row.quantity}</td><td data-label="Por unidad">{formatCurrency(row.unit_commission)}</td><td data-label="Total"><strong>{formatCurrency(row.amount)}</strong></td><td data-label="Estado"><StatusBadge label={commissionLabels[row.status]} tone={commissionTones[row.status]} /></td><td data-label="Fecha"><time dateTime={row.created_at}>{formatCrmTimestamp(row.created_at)}</time></td><td data-label="Detalle"><button type="button" onClick={() => void openDetail(row)}>Ver detalle</button></td></tr>)}</tbody></table></div> : null}
    {pages > 1 ? <nav className="commissions-pagination" aria-label="Paginación de comisiones"><button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} />Anterior</button><span>Página {page} de {pages}</span><button type="button" disabled={loading || page >= pages} onClick={() => setPage((value) => value + 1)}>Siguiente<ChevronRight size={16} /></button></nav> : null}
    <CrmDialog open={detail !== null} titleId="commission-detail-title" onClose={() => setDetail(null)} busy={detailLoading}>{detail ? <article className="commission-detail"><header><div><span>Registro histórico</span><h2 id="commission-detail-title">Detalle de comisión</h2></div><button type="button" aria-label="Cerrar detalle" disabled={detailLoading} onClick={() => setDetail(null)}><X size={20} /></button></header><div className="commission-detail__body">{detailLoading ? <p role="status">Actualizando detalle...</p> : null}<div className="commission-detail__status"><StatusBadge label={commissionLabels[detail.status]} tone={commissionTones[detail.status]} /><span>{commissionDescriptions[detail.status]}</span></div><dl><div><dt>Colaborador</dt><dd>{detail.employee?.name ?? "No disponible"}</dd></div><div><dt>Sede histórica</dt><dd>{detail.branch ? `${detail.branch.name} · ${detail.branch.code}` : "No disponible"}</dd></div><div><dt>Venta</dt><dd>{detail.order?.order_number ?? "No disponible"}</dd></div><div><dt>Producto / variante</dt><dd>{commissionItemName(detail.product, detail.variant)}</dd></div><div><dt>SKU histórico</dt><dd>{detail.sku_snapshot ?? "Sin SKU"}</dd></div><div><dt>Cantidad</dt><dd>{detail.quantity}</dd></div><div><dt>Comisión por unidad</dt><dd>{formatCurrency(detail.unit_commission)}</dd></div><div><dt>Monto total</dt><dd>{formatCurrency(detail.amount)}</dd></div><div><dt>Creada</dt><dd>{formatCrmTimestamp(detail.created_at)}</dd></div><div><dt>Ganada</dt><dd>{formatCrmTimestamp(detail.earned_at)}</dd></div><div><dt>Anulada</dt><dd>{formatCrmTimestamp(detail.voided_at)}</dd></div>{detail.void_reason ? <div className="is-wide"><dt>Motivo de anulación</dt><dd>{detail.void_reason}</dd></div> : null}</dl>{detailError ? <p className="commissions-feedback is-error" role="alert">{detailError}</p> : null}</div><footer><button type="button" onClick={() => setDetail(null)}>Cerrar</button></footer></article> : null}</CrmDialog>
  </section>;
};
