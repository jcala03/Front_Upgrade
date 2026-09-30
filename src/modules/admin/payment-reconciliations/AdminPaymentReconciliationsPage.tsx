import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  History,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  decidePaymentReconciliation,
  getPaymentReconciliation,
  listPaymentReconciliations,
  startPaymentReconciliation,
} from "../../../api/paymentReconciliations";
import { ApiError, type ValidationErrors } from "../../../api/http";
import { CrmDialog } from "../../../components/crm/Dialog";
import { StatusBadge } from "../../../components/crm/StatusBadge";
import type {
  PaymentReconciliationDecision,
  PaymentReconciliationDecisionPayload,
  PaymentReconciliationReview,
  PaymentReconciliationState,
} from "../../../types/paymentReconciliation";
import { formatCrmTimestamp } from "../../../utils/crmDateTime";
import { getAuthUser, hasPermission } from "../../../utils/authStorage";
import {
  decisionsForReason,
  evidenceRequiredDecisions,
  nonTerminalDecisions,
  reconciliationActionLabels,
  reconciliationDecisionLabels,
  reconciliationDecisionResult,
  reconciliationFilterReasons,
  reconciliationReasonLabel,
  reconciliationStateLabels,
  reconciliationStateTones,
} from "./paymentReconciliationPresentation";
import "./AdminPaymentReconciliationsPage.css";

const createAttemptKey = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const emptyFieldErrors: ValidationErrors = {};

type Notice = { tone: "success" | "info" | "error"; text: string };
type DecisionAttempt = {
  key: string;
  reviewId: number;
  payload: PaymentReconciliationDecisionPayload;
};

const metadataValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
};

const fieldError = (errors: ValidationErrors, field: string) => errors[field]?.[0] ?? "";

export const AdminPaymentReconciliationsPage = () => {
  const canReconcile = getAuthUser()?.role === "admin" && hasPermission("payments.reconcile");
  const [rows, setRows] = useState<PaymentReconciliationReview[]>([]);
  const [stateFilter, setStateFilter] = useState<PaymentReconciliationState | "">("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [detail, setDetail] = useState<PaymentReconciliationReview | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [decision, setDecision] = useState<PaymentReconciliationDecision | "">("");
  const [justification, setJustification] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [canonicalPaymentId, setCanonicalPaymentId] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>(emptyFieldErrors);
  const [startBusy, setStartBusy] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [startUnknown, setStartUnknown] = useState(false);
  const [decisionUnknown, setDecisionUnknown] = useState(false);
  const listRequestId = useRef(0);
  const detailRequestId = useRef(0);
  const detailController = useRef<AbortController | null>(null);
  const startLock = useRef(false);
  const decisionLock = useRef(false);
  const startAttempt = useRef<{ key: string; reviewId: number } | null>(null);
  const decisionAttempt = useRef<DecisionAttempt | null>(null);
  const decisionForm = useRef<HTMLFormElement>(null);

  const loadList = useCallback(async (signal?: AbortSignal) => {
    const request = ++listRequestId.current;
    setLoading(true);
    setListError("");
    try {
      const result = await listPaymentReconciliations({
        state: stateFilter || undefined,
        reason: reasonFilter || undefined,
        page,
        per_page: 25,
      }, signal);
      if (request !== listRequestId.current) return;
      setRows(result.data);
      setPages(Math.max(1, result.last_page));
      setTotal(result.total);
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError") && request === listRequestId.current) {
        setListError(cause instanceof Error ? cause.message : "No se pudieron cargar las conciliaciones.");
      }
    } finally {
      if (request === listRequestId.current) setLoading(false);
    }
  }, [page, reasonFilter, stateFilter]);

  useEffect(() => {
    const controller = new AbortController();
    void loadList(controller.signal);
    return () => { listRequestId.current += 1; controller.abort(); };
  }, [loadList]);

  const loadDetail = useCallback(async (id: number, announce = false) => {
    detailController.current?.abort();
    const controller = new AbortController();
    detailController.current = controller;
    const request = ++detailRequestId.current;
    setDetailLoading(true);
    setDetailError("");
    try {
      const result = await getPaymentReconciliation(id, controller.signal);
      if (request !== detailRequestId.current) return null;
      setDetail(result);
      if (announce) setNotice({ tone: "info", text: "Los datos de la revisión fueron actualizados." });
      return result;
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError") && request === detailRequestId.current) {
        setDetailError(cause instanceof Error ? cause.message : "No se pudo cargar el detalle de la revisión.");
      }
      return null;
    } finally {
      if (request === detailRequestId.current) {
        detailController.current = null;
        setDetailLoading(false);
      }
    }
  }, []);

  useEffect(() => () => {
    detailRequestId.current += 1;
    detailController.current?.abort();
  }, []);

  useEffect(() => {
    if (!detail || detail.state !== "under_review") {
      setDecision("");
      return;
    }
    const allowed = decisionsForReason(detail.reason);
    setDecision((current) => allowed.includes(current as PaymentReconciliationDecision) ? current : (allowed[0] ?? ""));
  }, [detail]);

  const openDetail = (review: PaymentReconciliationReview) => {
    setDetail(review);
    setNotice(null);
    setErrors(emptyFieldErrors);
    setJustification("");
    setEvidenceReference("");
    setCanonicalPaymentId("");
    setStartUnknown(false);
    setDecisionUnknown(false);
    startAttempt.current = null;
    decisionAttempt.current = null;
    void loadDetail(review.id);
  };

  const closeDetail = () => {
    if (startBusy || decisionBusy || startUnknown || decisionUnknown) return;
    detailRequestId.current += 1;
    detailController.current?.abort();
    detailController.current = null;
    setDetail(null);
    setDetailError("");
    setNotice(null);
    setErrors(emptyFieldErrors);
    startAttempt.current = null;
    decisionAttempt.current = null;
  };

  const refreshAfterConflict = async (reviewId: number) => {
    setNotice({ tone: "info", text: "El estado de esta revisión cambió. Se actualizarán los datos." });
    await Promise.all([loadDetail(reviewId), loadList()]);
  };

  const runStart = async () => {
    if (!detail || detail.state !== "detected" || !canReconcile || startLock.current) return;
    startLock.current = true;
    setStartBusy(true);
    setDetailError("");
    setNotice(null);
    const attempt = startAttempt.current?.reviewId === detail.id
      ? startAttempt.current
      : { key: createAttemptKey(), reviewId: detail.id };
    startAttempt.current = attempt;
    try {
      await startPaymentReconciliation(attempt.reviewId, attempt.key);
      startAttempt.current = null;
      setStartUnknown(false);
      setNotice({ tone: "success", text: "La revisión quedó iniciada y asignada a tu usuario." });
      await Promise.all([loadDetail(attempt.reviewId), loadList()]);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        startAttempt.current = null;
        setStartUnknown(false);
        await refreshAfterConflict(attempt.reviewId);
      } else if (cause instanceof ApiError && cause.status === 0) {
        setStartUnknown(true);
        setNotice({ tone: "error", text: "No se confirmó el resultado. Reintenta con la misma solicitud para evitar duplicados." });
      } else {
        startAttempt.current = null;
        setStartUnknown(false);
        setDetailError(cause instanceof Error ? cause.message : "No se pudo iniciar la revisión.");
      }
    } finally {
      startLock.current = false;
      setStartBusy(false);
    }
  };

  const focusFirstError = (fieldErrors: ValidationErrors) => {
    const order = ["decision", "justification", "evidence_reference", "canonical_payment_id"];
    const first = order.find((field) => fieldErrors[field]?.length);
    if (!first) return;
    window.setTimeout(() => {
      decisionForm.current?.querySelector<HTMLElement>(`[data-error-key="${first}"]`)?.focus();
    });
  };

  const validateDecision = (): PaymentReconciliationDecisionPayload | null => {
    if (!detail || !decision) return null;
    const nextErrors: ValidationErrors = {};
    const cleanJustification = justification.trim();
    const cleanEvidence = evidenceReference.trim();
    const canonicalId = Number(canonicalPaymentId);
    if (!decisionsForReason(detail.reason).includes(decision)) {
      nextErrors.decision = ["Selecciona una decisión válida para esta discrepancia."];
    }
    if (cleanJustification.length < 10 || cleanJustification.length > 2000) {
      nextErrors.justification = ["La justificación debe contener entre 10 y 2000 caracteres."];
    }
    if (cleanEvidence.length > 255) {
      nextErrors.evidence_reference = ["La referencia de evidencia no puede superar 255 caracteres."];
    }
    if (evidenceRequiredDecisions.has(decision) && !cleanEvidence) {
      nextErrors.evidence_reference = ["La referencia de evidencia es obligatoria para esta decisión."];
    }
    if (detail.reason === "DUPLICATE_APPROVAL" && (!Number.isInteger(canonicalId) || canonicalId <= 0)) {
      nextErrors.canonical_payment_id = ["Debes identificar el pago canónico con un ID válido."];
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      focusFirstError(nextErrors);
      return null;
    }
    return {
      decision,
      justification: cleanJustification,
      ...(cleanEvidence ? { evidence_reference: cleanEvidence } : {}),
      ...(detail.reason === "DUPLICATE_APPROVAL" ? { canonical_payment_id: canonicalId } : {}),
    };
  };

  const runDecision = async (payload: PaymentReconciliationDecisionPayload, attemptOverride?: DecisionAttempt) => {
    if (!detail || detail.state !== "under_review" || !canReconcile || decisionLock.current) return;
    decisionLock.current = true;
    setDecisionBusy(true);
    setDetailError("");
    setNotice(null);
    const attempt = attemptOverride ?? {
      key: createAttemptKey(),
      reviewId: detail.id,
      payload,
    };
    decisionAttempt.current = attempt;
    try {
      const result = await decidePaymentReconciliation(attempt.reviewId, attempt.payload, attempt.key);
      decisionAttempt.current = null;
      setDecisionUnknown(false);
      setErrors(emptyFieldErrors);
      setJustification("");
      setEvidenceReference("");
      setCanonicalPaymentId("");
      setNotice({
        tone: "success",
        text: result.data.state === "resolved"
          ? "Revisión resuelta. La decisión y su evidencia quedaron registradas."
          : `${reconciliationDecisionResult[attempt.payload.decision]} El caso permanece en revisión.`,
      });
      await Promise.all([loadDetail(attempt.reviewId), loadList()]);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        decisionAttempt.current = null;
        setDecisionUnknown(false);
        await refreshAfterConflict(attempt.reviewId);
      } else if (cause instanceof ApiError && cause.status === 422) {
        decisionAttempt.current = null;
        setDecisionUnknown(false);
        setErrors(cause.errors);
        setDetailError(cause.message);
        focusFirstError(cause.errors);
      } else if (cause instanceof ApiError && cause.status === 0) {
        setDecisionUnknown(true);
        setNotice({ tone: "error", text: "No se confirmó el resultado. Reintenta la misma decisión; no cambies los datos mientras se confirma." });
      } else {
        decisionAttempt.current = null;
        setDecisionUnknown(false);
        setDetailError(cause instanceof Error ? cause.message : "No se pudo registrar la decisión.");
      }
    } finally {
      decisionLock.current = false;
      setDecisionBusy(false);
    }
  };

  const submitDecision = (event: FormEvent) => {
    event.preventDefault();
    if (decisionUnknown) return;
    const payload = validateDecision();
    if (payload) void runDecision(payload);
  };

  const retryDecision = () => {
    const attempt = decisionAttempt.current;
    if (attempt) void runDecision(attempt.payload, attempt);
  };

  const clearFieldError = (field: string) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const emptyMessage = stateFilter === "resolved"
    ? "No hay conciliaciones resueltas con estos filtros."
    : stateFilter === "under_review"
      ? "No hay discrepancias de pago en revisión."
      : "No hay discrepancias de pago pendientes.";
  const allowedDecisions = detail ? decisionsForReason(detail.reason) : [];
  const evidenceRequired = decision ? evidenceRequiredDecisions.has(decision) : false;
  const nonTerminal = decision ? nonTerminalDecisions.has(decision) : false;
  const mutationBusy = startBusy || decisionBusy;
  const uncertainResult = startUnknown || decisionUnknown;

  return (
    <section className="reconciliations-page" aria-labelledby="reconciliations-title">
      <header className="reconciliations-heading">
        <div>
          <span>Control de pagos</span>
          <h2 id="reconciliations-title">Conciliaciones de pagos</h2>
          <p>Consulta y documenta discrepancias Wompi sin modificar el estado financiero.</p>
        </div>
        <div><strong>{total}</strong><small>casos</small></div>
      </header>

      <div className="reconciliations-filters" aria-label="Filtros de conciliaciones">
        <label>
          <span>Estado</span>
          <select value={stateFilter} onChange={(event) => { setStateFilter(event.target.value as PaymentReconciliationState | ""); setPage(1); }}>
            <option value="">Todos</option>
            <option value="detected">Pendiente de revisión</option>
            <option value="under_review">En revisión</option>
            <option value="resolved">Resuelta</option>
          </select>
        </label>
        <label>
          <span>Motivo</span>
          <select value={reasonFilter} onChange={(event) => { setReasonFilter(event.target.value); setPage(1); }}>
            <option value="">Todos</option>
            {reconciliationFilterReasons.map((reason) => <option key={reason} value={reason}>{reconciliationReasonLabel(reason)}</option>)}
          </select>
        </label>
        {loading && rows.length ? <span className="reconciliations-updating" role="status">Actualizando...</span> : null}
      </div>

      {listError ? <div className="reconciliations-feedback is-error" role="alert"><span>{listError}</span><button type="button" onClick={() => void loadList()}>Reintentar</button></div> : null}
      {loading && !rows.length && !listError ? <div className="reconciliations-state" role="status"><RefreshCw size={24} aria-hidden="true" /><p>Cargando conciliaciones...</p></div> : null}
      {!loading && !rows.length && !listError ? <div className="reconciliations-state"><ShieldCheck size={25} aria-hidden="true" /><p>{emptyMessage}</p></div> : null}

      {rows.length ? <div className="reconciliations-table-wrap" aria-busy={loading}>
        <table className="reconciliations-table">
          <caption className="sr-only">Casos de conciliación de pagos</caption>
          <thead><tr><th>Caso</th><th>Estado</th><th>Motivo</th><th>Pago / Orden</th><th>Detectada</th><th>Responsable</th><th>Última decisión</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>{rows.map((review) => <tr key={review.id}>
            <td data-label="Caso"><strong>#{review.id}</strong>{review.parent_review_id ? <small>Sucesora de #{review.parent_review_id}</small> : null}</td>
            <td data-label="Estado"><StatusBadge label={reconciliationStateLabels[review.state]} tone={reconciliationStateTones[review.state]} /></td>
            <td data-label="Motivo"><strong>{reconciliationReasonLabel(review.reason)}</strong><small>{review.reason}</small></td>
            <td data-label="Pago / Orden"><span>Pago {review.payment_id ? `#${review.payment_id}` : "no localizado"}</span><small>Orden {review.order_id ? `#${review.order_id}` : "no localizada"}</small></td>
            <td data-label="Detectada"><time dateTime={review.detected_at}>{formatCrmTimestamp(review.detected_at)}</time>{review.resolved_at ? <small>Resuelta {formatCrmTimestamp(review.resolved_at)}</small> : null}</td>
            <td data-label="Responsable">{review.assigned_to?.name ?? "Sin asignar"}</td>
            <td data-label="Última decisión">{review.latest_decision ? reconciliationDecisionLabels[review.latest_decision] : "Sin decisión"}</td>
            <td data-label="Detalle"><button type="button" onClick={() => openDetail(review)}>Ver caso</button></td>
          </tr>)}</tbody>
        </table>
      </div> : null}

      {pages > 1 ? <nav className="reconciliations-pagination" aria-label="Paginación de conciliaciones">
        <button type="button" disabled={loading || page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={16} aria-hidden="true" />Anterior</button>
        <span>Página {page} de {pages}</span>
        <button type="button" disabled={loading || page >= pages} onClick={() => setPage((current) => current + 1)}>Siguiente<ChevronRight size={16} aria-hidden="true" /></button>
      </nav> : null}

      <CrmDialog open={detail !== null} titleId="reconciliation-detail-title" onClose={closeDetail} busy={mutationBusy || uncertainResult} className="reconciliation-dialog">
        {detail ? <article className="reconciliation-detail">
          <header>
            <div><span>Caso #{detail.id}</span><h2 id="reconciliation-detail-title" data-dialog-initial tabIndex={-1}>{reconciliationReasonLabel(detail.reason)}</h2><small>{detail.reason}</small></div>
            <button type="button" aria-label="Cerrar detalle" disabled={mutationBusy || uncertainResult} onClick={closeDetail}><X size={20} aria-hidden="true" /></button>
          </header>
          <div className="reconciliation-detail__body" aria-busy={detailLoading}>
            {detailLoading ? <p className="reconciliations-updating" role="status">Actualizando detalle...</p> : null}
            {notice ? <p className={`reconciliations-notice is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p> : null}
            {detailError ? <p className="reconciliations-notice is-error" role="alert">{detailError}</p> : null}

            <section className="reconciliation-summary" aria-labelledby="reconciliation-summary-title">
              <div className="reconciliation-section-title"><ShieldCheck size={19} aria-hidden="true" /><h3 id="reconciliation-summary-title">Resumen del caso</h3></div>
              <div className="reconciliation-status-line"><StatusBadge label={reconciliationStateLabels[detail.state]} tone={reconciliationStateTones[detail.state]} /><span>{detail.assigned_to ? `Asignada a ${detail.assigned_to.name}` : "Sin responsable asignado"}</span></div>
              <dl>
                <div><dt>Pago</dt><dd>{detail.payment_id ? `#${detail.payment_id}` : "No localizado"}</dd></div>
                <div><dt>Orden</dt><dd>{detail.order_id ? `#${detail.order_id}` : "No localizada"}</dd></div>
                <div><dt>Detectada</dt><dd>{formatCrmTimestamp(detail.detected_at)}</dd></div>
                <div><dt>Revisión iniciada</dt><dd>{formatCrmTimestamp(detail.review_started_at)}</dd></div>
                <div><dt>Resuelta</dt><dd>{formatCrmTimestamp(detail.resolved_at)}</dd></div>
                <div><dt>Resuelta por</dt><dd>{detail.resolved_by?.name ?? "—"}</dd></div>
                <div className="is-wide"><dt>Última decisión</dt><dd>{detail.latest_decision ? reconciliationDecisionLabels[detail.latest_decision] : "Sin decisión registrada"}</dd></div>
              </dl>
              <p className="reconciliation-readonly"><ShieldCheck size={17} aria-hidden="true" />Información de sólo lectura. Esta interfaz no cambia montos, moneda, referencias, transacciones ni estados de pagos u órdenes.</p>
            </section>

            {detail.webhook_event ? <section aria-labelledby="reconciliation-event-title">
              <div className="reconciliation-section-title"><AlertTriangle size={19} aria-hidden="true" /><h3 id="reconciliation-event-title">Evento Wompi sanitizado</h3></div>
              <dl>
                <div><dt>Evento</dt><dd>#{detail.webhook_event.id}</dd></div>
                <div><dt>Proveedor</dt><dd>{detail.webhook_event.provider}</dd></div>
                <div><dt>Tipo</dt><dd>{detail.webhook_event.event_type ?? "—"}</dd></div>
                <div><dt>Estado de procesamiento</dt><dd>{detail.webhook_event.status}</dd></div>
                <div><dt>Transacción del proveedor</dt><dd>{detail.webhook_event.provider_transaction_id ?? "—"}</dd></div>
                <div><dt>Recibido</dt><dd>{formatCrmTimestamp(detail.webhook_event.received_at)}</dd></div>
                <div><dt>Procesado</dt><dd>{formatCrmTimestamp(detail.webhook_event.processed_at)}</dd></div>
                <div><dt>Entorno</dt><dd>{metadataValue(detail.webhook_event.metadata.environment)}</dd></div>
                <div><dt>Estado informado</dt><dd>{metadataValue(detail.webhook_event.metadata.provider_status)}</dd></div>
                <div><dt>Reintentable</dt><dd>{metadataValue(detail.webhook_event.metadata.retryable)}</dd></div>
                {detail.webhook_event.last_error ? <div className="is-wide"><dt>Observación de procesamiento</dt><dd>{detail.webhook_event.last_error}</dd></div> : null}
              </dl>
            </section> : null}

            <section aria-labelledby="reconciliation-history-title">
              <div className="reconciliation-section-title"><History size={19} aria-hidden="true" /><h3 id="reconciliation-history-title">Historial inmutable</h3></div>
              {detail.actions?.length ? <ol className="reconciliation-history">{detail.actions.map((action) => <li key={action.id}>
                <div><strong>{reconciliationActionLabels[action.action] ?? action.action}</strong><time dateTime={action.created_at}>{formatCrmTimestamp(action.created_at)}</time></div>
                <p>{action.previous_state ? reconciliationStateLabels[action.previous_state] : "Inicio"} → {reconciliationStateLabels[action.new_state]}</p>
                {action.decision ? <p><span>Decisión:</span> {reconciliationDecisionLabels[action.decision]}</p> : null}
                {action.justification ? <p><span>Justificación:</span> {action.justification}</p> : null}
                {action.evidence_reference ? <p><span>Evidencia:</span> {action.evidence_reference}</p> : null}
                {action.canonical_payment_id ? <p><span>Pago canónico:</span> #{action.canonical_payment_id}</p> : null}
                <small>{action.actor?.name ?? "Sistema"}</small>
              </li>)}</ol> : <p className="reconciliation-empty-history">Sin acciones registradas.</p>}
            </section>

            {detail.state === "detected" && canReconcile ? <section className="reconciliation-action-panel" aria-labelledby="start-review-title">
              <div><h3 id="start-review-title">Iniciar revisión</h3><p>El caso quedará asignado a tu usuario y pasará a estado En revisión.</p></div>
              <button className="is-primary" type="button" disabled={startBusy} onClick={() => void runStart()}>{startBusy ? "Iniciando..." : startUnknown ? "Reintentar misma solicitud" : "Iniciar revisión"}</button>
            </section> : null}

            {detail.state === "under_review" && canReconcile && allowedDecisions.length ? <form ref={decisionForm} className="reconciliation-decision-form" onSubmit={submitDecision} noValidate>
              <div className="reconciliation-section-title"><ClipboardCheck size={19} aria-hidden="true" /><h3>Registrar decisión</h3></div>
              <fieldset disabled={decisionBusy || decisionUnknown}>
                <label>
                  <span>Decisión *</span>
                  <select data-error-key="decision" value={decision} aria-invalid={Boolean(fieldError(errors, "decision"))} aria-describedby={fieldError(errors, "decision") ? "decision-error" : undefined} onChange={(event) => { setDecision(event.target.value as PaymentReconciliationDecision); clearFieldError("decision"); }}>
                    {allowedDecisions.map((value) => <option value={value} key={value}>{reconciliationDecisionLabels[value]}</option>)}
                  </select>
                  {fieldError(errors, "decision") ? <small id="decision-error" className="field-error" role="alert">{fieldError(errors, "decision")}</small> : null}
                </label>
                <label>
                  <span>Justificación *</span>
                  <textarea data-error-key="justification" minLength={10} maxLength={2000} required value={justification} aria-invalid={Boolean(fieldError(errors, "justification"))} aria-describedby="justification-help" onChange={(event) => { setJustification(event.target.value); clearFieldError("justification"); }} />
                  <small id="justification-help" className={fieldError(errors, "justification") ? "field-error" : ""}>{fieldError(errors, "justification") || `${justification.length}/2000 · mínimo 10 caracteres.`}</small>
                </label>
                <label>
                  <span>Referencia de evidencia {evidenceRequired ? "*" : "(opcional)"}</span>
                  <input data-error-key="evidence_reference" maxLength={255} required={evidenceRequired} value={evidenceReference} aria-invalid={Boolean(fieldError(errors, "evidence_reference"))} aria-describedby="evidence-help" onChange={(event) => { setEvidenceReference(event.target.value); clearFieldError("evidence_reference"); }} />
                  <small id="evidence-help" className={fieldError(errors, "evidence_reference") ? "field-error" : ""}>{fieldError(errors, "evidence_reference") || "Ej. caso Wompi, ticket interno o referencia documental. No pegues claves, tokens ni credenciales."}</small>
                </label>
                {detail.reason === "DUPLICATE_APPROVAL" ? <label>
                  <span>ID del pago canónico *</span>
                  <input data-error-key="canonical_payment_id" type="number" inputMode="numeric" min="1" step="1" required value={canonicalPaymentId} aria-invalid={Boolean(fieldError(errors, "canonical_payment_id"))} aria-describedby="canonical-payment-help" onChange={(event) => { setCanonicalPaymentId(event.target.value); clearFieldError("canonical_payment_id"); }} />
                  <small id="canonical-payment-help" className={fieldError(errors, "canonical_payment_id") ? "field-error" : ""}>{fieldError(errors, "canonical_payment_id") || "Consulta la orden y registra manualmente el otro pago válido. No se selecciona automáticamente."}</small>
                </label> : null}
                <div className={`reconciliation-decision-impact ${nonTerminal ? "is-open" : "is-terminal"}`} role="status">
                  <strong>{nonTerminal ? "El caso seguirá abierto" : "Esta decisión cerrará el caso"}</strong>
                  <p>{decision ? reconciliationDecisionResult[decision] : "Selecciona una decisión."}</p>
                </div>
                <button className="is-primary" type="submit" disabled={decisionBusy}>{decisionBusy ? "Registrando..." : "Registrar decisión"}</button>
              </fieldset>
              {decisionUnknown ? <div className="reconciliation-uncertain" role="alert"><p>El resultado de la solicitud es incierto. El reintento conservará la misma clave de idempotencia y los mismos datos.</p><button type="button" disabled={decisionBusy} onClick={retryDecision}>{decisionBusy ? "Reintentando..." : "Reintentar misma decisión"}</button></div> : null}
            </form> : null}

            {detail.state === "resolved" ? <section className="reconciliation-resolved" aria-labelledby="resolved-review-title"><ShieldCheck size={22} aria-hidden="true" /><div><h3 id="resolved-review-title">Revisión resuelta</h3><p>{detail.latest_decision ? reconciliationDecisionResult[detail.latest_decision] : "El caso quedó cerrado."}</p><small>{detail.resolved_by?.name ?? "Actor no disponible"} · {formatCrmTimestamp(detail.resolved_at)}</small></div></section> : null}
            {!canReconcile && detail.state !== "resolved" ? <p className="reconciliation-readonly">Tienes acceso de consulta. Para iniciar o decidir una revisión se requiere el permiso de conciliación de pagos.</p> : null}
          </div>
          <footer><button type="button" disabled={mutationBusy || uncertainResult} onClick={closeDetail}>Cerrar</button></footer>
        </article> : null}
      </CrmDialog>
    </section>
  );
};
