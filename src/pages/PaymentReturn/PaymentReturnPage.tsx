import { CheckCircle2, Clock3, RefreshCw, RotateCcw, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getPublicOrder } from "../../api/orders";
import { useCart } from "../../context/CartContext";
import type { PublicOrder } from "../../types/order";
import { finishActiveCheckout, paymentAttemptStorage, preparePaymentRetry, readLastOrder, reconcilePaidCart, startNewPurchase } from "../../utils/checkoutStorage";
import { startWompiCheckout } from "../../utils/wompiCheckout";
import "./PaymentReturnPage.css";

const MAX_POLLS = 6;
const POLL_DELAY = 5000;

type QueryState = "idle" | "refreshing" | "error";

const statusCopy = (order: PublicOrder, awaitingConfirmation: boolean, pollingExhausted: boolean) => {
  if (order.payment_status === "paid") return { tone: "success", title: "Pago confirmado", message: "Confirmamos el pago de tu orden. Tu pedido continúa confirmado y te informaremos los siguientes pasos." };
  if (order.payment_status === "refunded") return { tone: "warning", title: "Pago devuelto", message: "El pago de esta orden fue devuelto. Si necesitas ayuda, comunícate con nuestro equipo." };
  if (order.payment_status === "partial") return { tone: "warning", title: "Pago parcial registrado", message: "Recibimos un pago parcial. Nuestro equipo te informará cómo continuar." };
  if (order.order_status === "cancelled") return { tone: "warning", title: "La reserva venció", message: "La reserva ya no está activa. Puedes iniciar una nueva compra desde la tienda." };
  if (pollingExhausted) return { tone: "pending", title: "Seguimos esperando la confirmación", message: "La confirmación puede tardar unos minutos. Puedes volver a consultar el estado en unos momentos." };
  if (awaitingConfirmation) return { tone: "pending", title: "Estamos confirmando tu pago", message: "No realices otro intento mientras confirmamos el resultado." };
  if (order.can_retry_payment) return { tone: "warning", title: "Puedes intentar el pago nuevamente", message: "Tu pedido sigue reservado y está habilitado para un nuevo intento de pago." };
  return { tone: "pending", title: "Pago pendiente", message: "Todavía no tenemos una confirmación final del pago." };
};

const paymentLabel = (order: PublicOrder) => {
  if (order.payment_status === "paid") return "Confirmado";
  if (order.payment_status === "refunded") return "Devuelto";
  if (order.payment_status === "partial") return "Parcial";
  return "Pendiente";
};

export const PaymentReturnPage = () => {
  const token = readLastOrder()?.public_token ?? null;
  const { consumeLines } = useCart();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [queryState, setQueryState] = useState<QueryState>(token ? "refreshing" : "idle");
  const [queryError, setQueryError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [polls, setPolls] = useState(0);
  const [startedPayment, setStartedPayment] = useState(Boolean(token && sessionStorage.getItem(paymentAttemptStorage(token))));
  const [startingPayment, setStartingPayment] = useState(false);
  const inFlight = useRef(false);
  const paymentLock = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!token || inFlight.current) return false;
    const controller = new AbortController();
    activeRequest.current = controller;
    inFlight.current = true;
    if (mounted.current) {
      setQueryState("refreshing");
      setQueryError("");
    }
    try {
      const current = await getPublicOrder(token, { signal: controller.signal, timeoutMs: 12_000 });
      if (!mounted.current) return;
      setOrder(current);
      setQueryState("idle");
      return true;
    } catch {
      if (!mounted.current || controller.signal.aborted) return false;
      setQueryError("No pudimos actualizar el estado en este momento.");
      setQueryState("error");
      return true;
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
      inFlight.current = false;
    }
  }, [token]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
      activeRequest.current?.abort();
      inFlight.current = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!token || !order) return;
    if (order.payment_status === "paid") {
      reconcilePaidCart(token, consumeLines);
      sessionStorage.removeItem(paymentAttemptStorage(token));
      finishActiveCheckout(token);
    } else if (order.order_status === "cancelled" || order.payment_status === "refunded") {
      finishActiveCheckout(token);
    }
  }, [consumeLines, order, token]);

  const awaitingPayment = startedPayment && order?.payment_status !== "paid" && order?.payment_status !== "partial" && order?.payment_status !== "refunded" && order?.order_status !== "cancelled";
  const polling = awaitingPayment && polls < MAX_POLLS;
  const pollingExhausted = awaitingPayment && polls >= MAX_POLLS;

  useEffect(() => {
    if (!polling) return;
    const timer = window.setTimeout(() => {
      void refresh().then((attempted) => {
        if (mounted.current && attempted) setPolls((current) => current + 1);
      });
    }, POLL_DELAY);
    return () => window.clearTimeout(timer);
  }, [polling, polls, refresh]);

  const retryPayment = async () => {
    if (!token || !order?.can_retry_payment || paymentLock.current) return;
    paymentLock.current = true;
    setStartingPayment(true);
    setPaymentError("");
    try {
      preparePaymentRetry(token);
      await startWompiCheckout(token);
      setStartedPayment(true);
      setPolls(0);
    } catch (cause) {
      setPaymentError(cause instanceof Error ? cause.message : "No fue posible iniciar el pago. Intenta nuevamente.");
      setStartingPayment(false);
      paymentLock.current = false;
    }
  };

  if (!token) return <main className="payment-return-page"><section className="payment-return-card"><TriangleAlert size={30} /><span>Pago</span><h1>No encontramos una orden reciente</h1><p>Vuelve al checkout para iniciar el proceso de pago.</p><a href="/checkout">Volver al checkout</a></section></main>;

  const copy = order ? statusCopy(order, awaitingPayment && !pollingExhausted, pollingExhausted) : null;
  return <main className="payment-return-page"><section className={`payment-return-card ${copy ? `is-${copy.tone}` : ""}`} aria-live="polite" aria-busy={queryState === "refreshing" || startingPayment}>
    {copy?.tone === "success" ? <CheckCircle2 size={34} /> : copy?.tone === "warning" ? <TriangleAlert size={34} /> : <Clock3 size={34} />}
    <span>Estado del pago</span>
    <h1>{queryState === "refreshing" && !order ? "Consultando tu pago" : copy?.title ?? "No pudimos recuperar el pago"}</h1>
    <p>{copy?.message ?? queryError}</p>
    {order ? <dl><div><dt>Orden</dt><dd>{order.order_number}</dd></div><div><dt>Pago</dt><dd>{paymentLabel(order)}</dd></div></dl> : null}
    {queryError && order ? <p className="payment-return-card__notice" role="alert">Mostramos el último estado disponible. {queryError}</p> : null}
    {paymentError ? <p className="payment-return-card__notice" role="alert">{paymentError}</p> : null}
    <div className="payment-return-card__actions">
      {order?.can_retry_payment && !polling ? <button type="button" onClick={() => void retryPayment()} disabled={startingPayment}><RotateCcw size={16} />{startingPayment ? "Abriendo pago seguro" : "Intentar pago nuevamente"}</button> : null}
      {order?.order_status === "cancelled" || order?.payment_status === "paid" || order?.payment_status === "refunded" ? <a href="/tienda" onClick={() => startNewPurchase(token)}>Iniciar nueva compra</a> : null}
      {(order || queryError) ? <button type="button" onClick={() => { setPolls(0); void refresh(); }} disabled={queryState === "refreshing"}><RefreshCw size={16} />{queryState === "refreshing" ? "Consultando" : "Consultar nuevamente"}</button> : null}
      {order?.payment_status === "paid" || order?.payment_status === "refunded" ? <a href="/orden-confirmada">Ver mi orden</a> : null}
    </div>
  </section></main>;
};
