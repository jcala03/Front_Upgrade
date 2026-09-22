import { CheckCircle2, Clock3, RefreshCw, ShoppingBag, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getPublicOrder } from "../../api/orders";
import { useCart } from "../../context/CartContext";
import type { PublicOrder, PublicOrderItem } from "../../types/order";
import { finishActiveCheckout, readLastOrder, reconcilePaidCart, startNewPurchase } from "../../utils/checkoutStorage";
import "./OrderConfirmationPage.css";

const formatPrice = (value: number, currency: string) => new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency,
}).format(value);

const orderStatusLabel = (order: PublicOrder) => {
  if (order.payment_status === "refunded") return "Pago devuelto";
  if (order.order_status === "cancelled") return "Cancelada";
  if (order.order_status === "completed") return "Completada";
  if (order.order_status === "confirmed") return "Confirmada";
  return "En preparación";
};

const confirmationCopy = (order: PublicOrder) => {
  if (order.payment_status === "refunded") return { tone: "warning", eyebrow: "Pago devuelto", title: "El pago fue devuelto", message: "La devolución está registrada. Si necesitas más información, comunícate con nuestro equipo." };
  if (order.order_status === "cancelled") return { tone: "warning", eyebrow: "Orden cancelada", title: "Esta orden ya no está activa", message: "La reserva venció o fue cancelada. Puedes iniciar una nueva compra cuando quieras." };
  if (order.payment_status === "paid") return { tone: "success", eyebrow: "Pago confirmado", title: "Tu pago fue confirmado", message: "Recibimos el pago. Tu pedido sigue su proceso y te informaremos los siguientes pasos." };
  if (order.payment_status === "partial") return { tone: "warning", eyebrow: "Pago parcial", title: "Registramos un pago parcial", message: "Tu orden sigue activa. Nuestro equipo te informará cómo completar el proceso." };
  if (order.can_retry_payment) return { tone: "warning", eyebrow: "Pago pendiente", title: "Puedes intentar el pago nuevamente", message: "Tu orden continúa reservada y está habilitada para un nuevo intento de pago." };
  if (order.ready_for_payment === true) return { tone: "ready", eyebrow: "Pedido preparado", title: "Tu pedido está listo para pagar", message: "La entrega y el total están confirmados. Puedes continuar con el pago seguro." };
  if (order.order_status === "completed") return { tone: "success", eyebrow: "Pedido completado", title: "Tu pedido fue completado", message: "La orden figura como completada. Si necesitas ayuda con el estado del pago, comunícate con nuestro equipo." };
  if (order.order_status === "confirmed") return { tone: "pending", eyebrow: "Pago pendiente", title: "Esperamos la confirmación del pago", message: "Tu orden está confirmada, pero el pago todavía no tiene un resultado final." };
  return { tone: "pending", eyebrow: "Pedido recibido", title: "Tu pedido sigue en preparación", message: "Tu pedido está guardado. Completa la entrega para continuar con el pago." };
};

export const OrderConfirmationPage = () => {
  const persisted = readLastOrder();
  const { consumeLines } = useCart();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(Boolean(persisted));
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const load = useCallback(async (signal: AbortSignal) => {
    if (!persisted?.public_token) return;
    setLoading(true);
    setError("");
    try {
      setOrder(await getPublicOrder(persisted.public_token, { signal, timeoutMs: 12_000 }));
    } catch {
      if (!signal.aborted) setError("No pudimos actualizar la orden en este momento.");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [persisted?.public_token]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, retry]);

  useEffect(() => {
    if (!persisted?.public_token || !order) return;
    if (order.payment_status === "paid") reconcilePaidCart(persisted.public_token, consumeLines);
    if (order.payment_status === "paid" || order.payment_status === "refunded" || order.order_status === "cancelled") {
      finishActiveCheckout(persisted.public_token);
    }
  }, [consumeLines, order, persisted?.public_token]);

  if (!persisted) return <main className="order-confirmation-page"><section className="order-confirmation-empty"><span>Orden</span><h1>No encontramos una orden reciente</h1><p>Crea una orden desde el checkout para consultar su estado aquí.</p><a href="/tienda">Volver a tienda</a></section></main>;

  if (!order) return <main className="order-confirmation-page"><section className="order-confirmation-empty" aria-live="polite" aria-busy={loading}><span>Pedido</span><h1>{loading ? "Recuperando tu pedido" : "No pudimos recuperar la orden"}</h1><p>{error || "Estamos consultando el estado actualizado."}</p>{error ? <button type="button" onClick={() => setRetry((value) => value + 1)}><RefreshCw size={16} />Consultar nuevamente</button> : null}</section></main>;

  const copy = confirmationCopy(order);
  const terminal = order.payment_status === "paid" || order.payment_status === "refunded" || order.order_status === "cancelled";

  return <main className="order-confirmation-page">
    <section className={`order-confirmation-hero is-${copy.tone}`} aria-live="polite" aria-busy={loading}>
      <div className="order-confirmation-hero__icon">
        {copy.tone === "success" ? <CheckCircle2 size={34} strokeWidth={1.7} /> : copy.tone === "warning" ? <TriangleAlert size={34} strokeWidth={1.7} /> : <Clock3 size={34} strokeWidth={1.7} />}
      </div>
      <span>{copy.eyebrow}</span>
      <h1>{copy.title}</h1>
      <p>{copy.message}</p>
      {error ? <p role="alert">Mostramos el último estado disponible. {error}</p> : null}
    </section>

    <section className="order-confirmation-layout">
      <article className="order-confirmation-card">
        <div className="order-confirmation-card__header">
          <div><span>Número de orden</span><h2>{order.order_number}</h2></div>
          <div className="order-confirmation-status"><small>Estado</small><strong>{orderStatusLabel(order)}</strong></div>
        </div>
        <div className="order-confirmation-products">
          <div className="order-confirmation-products__title"><ShoppingBag size={18} strokeWidth={1.8} /><h3>Productos</h3></div>
          {order.items.map((item: PublicOrderItem) => <article className="order-confirmation-product" key={item.id}>
            <div><h4>{item.product_name}</h4><p>{item.quantity} x {formatPrice(item.unit_price, order.currency)}</p></div>
            <strong>{formatPrice(item.total, order.currency)}</strong>
          </article>)}
        </div>
        <div className="order-confirmation-total"><p>Total</p><strong>{formatPrice(order.total, order.currency)}</strong></div>
        <div className="order-confirmation-actions">
          {terminal ? <a href="/tienda" onClick={() => startNewPurchase(persisted.public_token)}>Iniciar nueva compra</a> : order.can_retry_payment ? <a href="/checkout/payment/return">Reintentar pago</a> : <a href="/checkout">Volver al checkout</a>}
          <button type="button" onClick={() => setRetry((value) => value + 1)} disabled={loading}><RefreshCw size={16} />{loading ? "Consultando" : "Actualizar estado"}</button>
          <a className="order-confirmation-actions__primary" href={`https://wa.me/573236293543?text=Hola%20UP%20GRADE%2079%2C%20quiero%20consultar%20la%20orden%20${encodeURIComponent(order.order_number)}.`} target="_blank" rel="noreferrer">Contactar por WhatsApp</a>
        </div>
      </article>
    </section>
  </main>;
};
