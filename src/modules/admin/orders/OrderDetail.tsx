import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createAdminOrderPayment, updateAdminOrderStatus } from "../../../api/adminOrders";
import type { Order, PaymentMethod } from "../../../types/order";
import { formatCurrency } from "../../../utils/formatCurrency";
import { hasPermission } from "../../../utils/authStorage";
import { formatOrderDate, orderCustomerLabel, orderStatusLabels, originLabels, paymentMethodLabels, paymentRecordStatusLabels, paymentStatusLabels } from "./orderUtils";
import { useDialogFocus } from "./useDialogFocus";

type Props = { order: Order | null; loading: boolean; onClose: () => void; onChanged: (order: Order) => void };
const methods: PaymentMethod[] = ["cash", "transfer", "card_terminal", "wompi", "other"];

export const OrderDetail = ({ order, loading, onClose, onChanged }: Props) => {
  const [action, setAction] = useState<"confirm" | "complete" | "cancel" | "payment" | null>(null);
  const [reason, setReason] = useState("");
  const [payment, setPayment] = useState({ amount: "", method: "cash" as PaymentMethod, reference: "", notes: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const mutationLockRef = useRef(false);
  const actionHeadingRef = useRef<HTMLHeadingElement>(null);
  const actionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const restoreActionFocusRef = useRef(false);
  const focusedOrderIdRef = useRef<number | null>(null);
  const finishAction = () => {
    setAction(null);
    restoreActionFocusRef.current = true;
  };
  const closeAction = () => {
    if (mutationLockRef.current) return;
    finishAction();
  };
  const closeDetail = () => {
    if (mutationLockRef.current) return;
    if (action) closeAction();
    else onClose();
  };
  const dialogRef = useDialogFocus<HTMLDivElement>({
    open: Boolean(order || loading),
    onEscape: closeDetail,
    canClose: !saving,
  });
  const paid = useMemo(() => order?.payments?.filter((item) => item.status === "completed").reduce((sum, item) => sum + Number(item.amount), 0) ?? 0, [order]);
  const balance = Math.max(0, Number(order?.total ?? 0) - paid);
  useEffect(() => {
    if (!order && !loading) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [loading, order]);
  useEffect(() => {
    if (action) actionHeadingRef.current?.focus({ preventScroll: true });
  }, [action]);
  useEffect(() => {
    if (!order) {
      focusedOrderIdRef.current = null;
      return;
    }
    if (focusedOrderIdRef.current !== order.id) {
      focusedOrderIdRef.current = order.id;
      dialogRef.current?.querySelector<HTMLElement>("[data-dialog-initial]")?.focus({ preventScroll: true });
    }
  }, [dialogRef, order]);
  useEffect(() => {
    if (!action && !saving && restoreActionFocusRef.current) {
      restoreActionFocusRef.current = false;
      actionTriggerRef.current?.focus({ preventScroll: true });
      actionTriggerRef.current = null;
    }
  }, [action, saving]);
  if (!order && !loading) return null;

  const transition = async (status: "confirmed" | "completed" | "cancelled") => {
    if (!order || mutationLockRef.current) return;
    mutationLockRef.current = true;
    try { setSaving(true); setError(""); const updated = await updateAdminOrderStatus(order.id, { status, ...(status === "cancelled" && reason.trim() ? { reason: reason.trim() } : {}) }); finishAction(); setReason(""); onChanged(updated); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "No se pudo cambiar el estado."); }
    finally { mutationLockRef.current = false; setSaving(false); }
  };
  const submitPayment = async (event: FormEvent) => {
    event.preventDefault(); if (!order || mutationLockRef.current) return;
    const amount = Number(payment.amount);
    if (amount <= 0 || amount > balance) { setError("El monto debe ser mayor a cero y no superar el saldo pendiente."); return; }
    mutationLockRef.current = true;
    try { setSaving(true); setError(""); const updated = await createAdminOrderPayment(order.id, { amount, method: payment.method, reference: payment.reference.trim() || undefined, notes: payment.notes.trim() || undefined }); finishAction(); setPayment({ amount: "", method: "cash", reference: "", notes: "" }); onChanged(updated); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "No se pudo registrar el pago."); }
    finally { mutationLockRef.current = false; setSaving(false); }
  };
  const openAction = (nextAction: "cancel" | "payment", trigger: HTMLButtonElement) => {
    if (mutationLockRef.current) return;
    actionTriggerRef.current = trigger;
    setAction(nextAction);
  };
  const history = order?.status_history ?? order?.statusHistory ?? [];
  const vehicleLabel = [order?.vehicle_brand_name, order?.vehicle_model_name, order?.vehicle_version_name].filter(Boolean).join(" · ");

  return (
    <div ref={dialogRef} className="orders-sheet" role="dialog" aria-modal="true" aria-labelledby="order-detail-title" tabIndex={-1}>
      <button className="orders-sheet__backdrop" type="button" tabIndex={-1} aria-label="Cerrar orden" disabled={saving} onClick={closeDetail} />
      <section className="orders-sheet__panel orders-detail">
        {loading || !order ? <div id="order-detail-title" className="orders-empty" tabIndex={-1} data-dialog-initial>Cargando detalle...</div> : <>
          <header className="orders-sheet__header"><div><span>{originLabels[order.origin]} · {formatOrderDate(order.created_at)}</span><h2 id="order-detail-title" tabIndex={-1} data-dialog-initial>#{order.order_number}</h2><div className="orders-detail__badges"><span className={`orders-badge is-${order.status}`}>{orderStatusLabels[order.status]}</span><span className={`orders-badge is-payment-${order.payment_status}`}>{paymentStatusLabels[order.payment_status]}</span></div></div><button type="button" disabled={saving} onClick={closeDetail}>Cerrar</button></header>
          <div className="orders-sheet__body">
            <section className="orders-detail__summary"><article><span>Total</span><strong>{formatCurrency(order.total)}</strong></article><article><span>Pagado</span><strong>{formatCurrency(paid)}</strong></article><article><span>Pendiente</span><strong>{formatCurrency(balance)}</strong></article></section>
            <section className="orders-detail__section"><h3>Artículos y servicios</h3>{order.items.map((item) => { const isService = item.item_type === "service"; return <article className="order-item" key={item.id}><div><span className="commercial-line-type">{isService ? "Servicio" : "Producto"}</span><strong>{isService ? item.service_name || "Servicio" : item.product_name || "Producto histórico"}</strong>{isService ? item.service_description ? <span>{item.service_description}</span> : null : <><span>{item.variant_name || "Artículo simple"}</span><small>{item.variant_sku || item.product_sku || "Sin SKU"}</small>{item.variant_specs ? <div className="order-item__specs">{Object.entries(item.variant_specs).slice(0, 4).map(([key,value]) => <small key={key}>{key}: {String(value)}</small>)}</div> : null}</>}</div><div><span>{item.quantity} × {formatCurrency(item.unit_price)}</span>{item.discount_amount > 0 ? <small>Descuento: {formatCurrency(item.discount_amount)}</small> : null}<strong>{formatCurrency(item.total)}</strong></div></article>; })}</section>
            <div className="orders-detail__grid"><section className="orders-detail__section"><h3>Cliente</h3><strong>{orderCustomerLabel(order.customer_name)}</strong>{order.customer_document ? <p>Documento: {order.customer_document}</p> : null}{order.customer_phone ? <a href={`https://wa.me/${order.customer_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{order.customer_phone}</a> : null}{order.customer_email ? <a href={`mailto:${order.customer_email}`}>{order.customer_email}</a> : null}{order.customer_city || order.customer_address ? <p>{[order.customer_city, order.customer_address].filter(Boolean).join(" · ")}</p> : null}{order.customer_notes ? <p>{order.customer_notes}</p> : null}</section><section className="orders-detail__section"><h3>Vehículo</h3>{vehicleLabel ? <><strong>{vehicleLabel}</strong><p>{[order.vehicle_year, order.vehicle_plate, order.vehicle_color].filter(Boolean).join(" · ")}</p>{order.vehicle_vin ? <p>VIN: {order.vehicle_vin}</p> : null}{order.vehicle_notes ? <p>{order.vehicle_notes}</p> : null}</> : <p>Sin vehículo asociado.</p>}</section></div>
            <div className="orders-detail__grid"><section className="orders-detail__section"><h3>Pagos</h3>{order.payments?.length ? order.payments.map((item) => <article className="order-record" key={item.id}><div><strong>{formatCurrency(item.amount)}</strong><span>{paymentMethodLabels[item.method]} · {paymentRecordStatusLabels[item.status]}</span></div><small>{item.reference || "Sin referencia"} · {formatOrderDate(item.paid_at || item.created_at)}</small></article>) : <p>Sin pagos registrados.</p>}</section><section className="orders-detail__section"><h3>Historial</h3>{history.length ? history.map((item) => { const changedUser = typeof item.changed_by === "object" ? item.changed_by : item.changedBy ?? item.changed_by_user; return <article className="order-record" key={item.id}><div><strong>{orderStatusLabels[item.to_status]}</strong><span>{item.from_status ? `Desde ${orderStatusLabels[item.from_status]}` : "Creación"}</span></div><small>{formatOrderDate(item.created_at)}{changedUser ? ` · ${changedUser.name}` : ""}</small>{item.reason ? <p>{item.reason}</p> : null}</article>; }) : <p>Sin historial disponible.</p>}</section></div>
            {error ? <p className="orders-error" role="alert">{error}</p> : null}
            {action === "cancel" ? <section className="orders-confirm" aria-labelledby="cancel-order-title"><h3 ref={actionHeadingRef} id="cancel-order-title" tabIndex={-1}>Cancelar venta</h3><p>El backend decidirá si corresponde revertir inventario.</p><label className="orders-field"><span>Razón opcional</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label><div><button type="button" disabled={saving} onClick={closeAction}>Volver</button><button className="is-danger" type="button" disabled={saving} onClick={() => void transition("cancelled")}>{saving ? "Cancelando..." : "Confirmar cancelación"}</button></div></section> : null}
            {action === "payment" ? <form className="orders-confirm" aria-labelledby="payment-order-title" onSubmit={submitPayment}><h3 ref={actionHeadingRef} id="payment-order-title" tabIndex={-1}>Registrar pago</h3><p>Saldo pendiente: {formatCurrency(balance)}</p><div className="orders-form-grid"><label className="orders-field"><span>Monto</span><input type="number" min="1" max={balance} value={payment.amount} onChange={(event) => setPayment((current) => ({ ...current, amount: event.target.value }))} /></label><label className="orders-field"><span>Método</span><select value={payment.method} onChange={(event) => setPayment((current) => ({ ...current, method: event.target.value as PaymentMethod }))}>{methods.map((method) => <option value={method} key={method}>{paymentMethodLabels[method]}</option>)}</select></label><label className="orders-field"><span>Referencia</span><input value={payment.reference} onChange={(event) => setPayment((current) => ({ ...current, reference: event.target.value }))} /></label><label className="orders-field orders-field--full"><span>Notas</span><textarea value={payment.notes} onChange={(event) => setPayment((current) => ({ ...current, notes: event.target.value }))} /></label></div><div><button type="button" disabled={saving} onClick={closeAction}>Volver</button><button type="submit" disabled={saving}>{saving ? "Guardando pago..." : "Registrar pago"}</button></div></form> : null}
          </div>
          <footer className="orders-sheet__footer orders-detail__actions"><div>{order.status === "pending" && hasPermission("orders.update") ? <button type="button" disabled={saving} onClick={() => void transition("confirmed")}>{saving ? "Confirmando..." : "Confirmar venta"}</button> : null}{order.status === "confirmed" && hasPermission("orders.update") ? <button type="button" disabled={saving} onClick={() => void transition("completed")}>{saving ? "Actualizando..." : "Marcar completada"}</button> : null}{["pending","confirmed"].includes(order.status) && hasPermission("orders.cancel") ? <button className="is-danger" type="button" disabled={saving} onClick={(event) => openAction("cancel", event.currentTarget)}>Cancelar</button> : null}</div>{balance > 0 && hasPermission("payments.create") ? <button type="button" disabled={saving} onClick={(event) => openAction("payment", event.currentTarget)}>Registrar pago</button> : null}</footer>
        </>}
      </section>
    </div>
  );
};
