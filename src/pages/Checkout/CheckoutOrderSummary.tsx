import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PublicOrder, PublicOrderCharge } from "../../types/order";
import { startWompiCheckout } from "../../utils/wompiCheckout";

export const formatPublicMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
};

const chargeLabel = (charge: PublicOrderCharge) => {
  if (charge.label.trim()) return charge.label;
  if (charge.type === "tax") return "Impuestos de importación estimados";
  if (charge.type === "duty") return "Aranceles estimados";
  return "Cargo adicional";
};

type Props = {
  order: PublicOrder | null;
  blockingIssue: string | null;
  publicToken: string;
};

export function CheckoutOrderSummary({ order, blockingIssue, publicToken }: Props) {
  const [paymentError, setPaymentError] = useState("");
  const [startingPayment, setStartingPayment] = useState(false);
  const paymentLock = useRef(false);

  if (!order) {
    return <aside className="checkout-summary checkout-final-summary" aria-busy="true">
      <span>Resumen final</span>
      <p className="checkout-final-summary__loading" role="status">Consultando valores actualizados del pedido…</p>
    </aside>;
  }

  const landedCostUnavailable = blockingIssue === "LANDED_COST_UNAVAILABLE";
  const workflowPending = blockingIssue === "ADDRESS_DIRTY" || blockingIssue === "FULFILLMENT_PENDING" || blockingIssue === "SHIPPING_PENDING";
  const ready = order.ready_for_payment === true && !landedCostUnavailable && !workflowPending;
  const internationalEstimate = Boolean(order.shipping_address && order.shipping_address.country_code !== "CO")
    && order.charges.some((charge) => charge.type === "tax" || charge.type === "duty");

  return <aside className="checkout-summary checkout-final-summary" aria-labelledby="final-summary-title">
    <span>Resumen final</span>
    <div className="checkout-final-summary__heading">
      <h2 id="final-summary-title">Total del pedido</h2>
      <small>{order.order_number}</small>
    </div>

    <dl className="checkout-final-summary__breakdown">
      <div><dt>Subtotal</dt><dd>{formatPublicMoney(order.subtotal, order.currency)}</dd></div>
      {order.discount_total > 0 && <div className="checkout-final-summary__discount"><dt>Descuento</dt><dd>− {formatPublicMoney(order.discount_total, order.currency)}</dd></div>}
      {order.charges.map((charge, index) => <div key={`${charge.type}-${charge.label}-${index}`}>
        <dt>{chargeLabel(charge)}</dt>
        <dd>{formatPublicMoney(charge.amount, charge.currency)}</dd>
      </div>)}
      <div className="checkout-final-summary__total"><dt>Total</dt><dd>{formatPublicMoney(order.total, order.currency)}</dd></div>
    </dl>

    {internationalEstimate && <p className="checkout-final-summary__notice">Los impuestos y aranceles mostrados son una estimación calculada para este destino.</p>}

    <div className="checkout-final-summary__status" aria-live="polite" aria-atomic="true">
      {landedCostUnavailable ? <div className="checkout-final-summary__blocked" role="alert">
        <strong>No está listo para pagar</strong>
        <p>No pudimos calcular todos los impuestos y aranceles para este destino. Todavía no es posible continuar al pago.</p>
        <small>Tu pedido sigue guardado. Corrige el destino o intenta calcular el envío nuevamente.</small>
      </div> : workflowPending ? <div className="checkout-final-summary__pending">
        <strong>Hay cambios pendientes</strong>
        <p>{blockingIssue === "ADDRESS_DIRTY" ? "Guarda nuevamente la dirección y calcula el envío." : blockingIssue === "FULFILLMENT_PENDING" ? "Aplica el método de entrega seleccionado." : "Selecciona y aplica una nueva tarifa de envío."}</p>
      </div> : ready ? <div className="checkout-final-summary__ready">
        <strong>Listo para pagar</strong>
        <p>La entrega y el total de este pedido están confirmados.</p>
      </div> : <div className="checkout-final-summary__pending">
        <strong>Pedido aún no preparado para pago</strong>
        <p>Completa la entrega para continuar con el pago.</p>
      </div>}
    </div>

    <button type="button" className="checkout-final-summary__payment" disabled={!ready || startingPayment} aria-busy={startingPayment} onClick={async () => {
      if (!ready || paymentLock.current) return;
      paymentLock.current = true;
      setStartingPayment(true);
      setPaymentError("");
      try {
        await startWompiCheckout(publicToken);
      } catch (cause) {
        setPaymentError(cause instanceof Error ? cause.message : "No fue posible iniciar el pago. Intenta nuevamente.");
        setStartingPayment(false);
        paymentLock.current = false;
      }
    }}>{startingPayment ? <><Loader2 className="checkout-form__loader" size={17} />Abriendo pago seguro</> : "Continuar al pago"}</button>
    {paymentError && <p className="checkout-final-summary__placeholder is-error" role="alert">{paymentError}</p>}
  </aside>;
}
