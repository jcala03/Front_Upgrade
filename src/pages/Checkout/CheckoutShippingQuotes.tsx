import { useRef, useState } from "react";
import { applyShippingQuote, getShippingQuotes, PublicCheckoutError } from "../../api/orders";
import type { PublicOrder, PublicShippingQuote } from "../../types/order";

const errors: Record<string, string> = {
  NO_BRANCH_CAN_FULFILL: "No tenemos una sola sede con disponibilidad suficiente para todos los productos del pedido.",
  NO_QUOTES_AVAILABLE: "No encontramos opciones de envío para este destino.",
  QUOTE_EXPIRED: "Esta tarifa venció. Calcula nuevamente el envío.",
  INVALID_QUOTE: "Esta tarifa ya no es válida. Calcula nuevamente el envío.",
  STALE_STOCK: "La disponibilidad cambió durante el checkout.",
  ORDER_NOT_PENDING: "Este pedido ya no puede modificarse desde el checkout.",
  LANDED_COST_UNAVAILABLE: "No pudimos calcular todos los impuestos y aranceles para este destino. Todavía no es posible continuar al pago.",
};

const errorMessage = (cause: unknown, fallback: string) =>
  cause instanceof PublicCheckoutError ? errors[cause.code ?? ""] ?? fallback : "No pudimos conectar. Intenta nuevamente.";

const money = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
};

const estimate = (quote: PublicShippingQuote) => {
  if (quote.estimated_days_min === null && quote.estimated_days_max === null) return null;
  if (quote.estimated_days_min === quote.estimated_days_max) return `${quote.estimated_days_min} días estimados`;
  return `${quote.estimated_days_min ?? 1}–${quote.estimated_days_max ?? quote.estimated_days_min} días estimados`;
};

type Props = {
  token: string;
  disabled: boolean;
  onOrder: (order: PublicOrder) => void;
  onBusy: (busy: boolean) => void;
  onLocked: () => void;
  onIssue: (code: string | null) => void;
};

export function CheckoutShippingQuotes({ token, disabled, onOrder, onBusy, onLocked, onIssue }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "empty" | "error">("idle");
  const [quotes, setQuotes] = useState<PublicShippingQuote[]>([]);
  const [selected, setSelected] = useState("");
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [message, setMessage] = useState("");
  const requestLock = useRef(false);
  const applyLock = useRef(false);

  async function calculate() {
    if (disabled || requestLock.current || applying) return;
    requestLock.current = true;
    onBusy(true);
    setStatus("loading");
    setQuotes([]);
    setSelected("");
    setApplied(false);
    setMessage("");
    onIssue("SHIPPING_PENDING");
    try {
      const available = await getShippingQuotes(token);
      setQuotes(available);
      setStatus(available.length ? "loaded" : "empty");
      if (!available.length) setMessage(errors.NO_QUOTES_AVAILABLE);
    } catch (cause) {
      if (cause instanceof PublicCheckoutError && cause.code === "ORDER_NOT_PENDING") onLocked();
      setStatus("error");
      setMessage(errorMessage(cause, "No pudimos calcular el envío. Intenta nuevamente."));
    } finally {
      requestLock.current = false;
      onBusy(false);
    }
  }

  async function apply() {
    if (!selected || disabled || applyLock.current || status !== "loaded") return;
    applyLock.current = true;
    onBusy(true);
    setApplying(true);
    setMessage("");
    try {
      const current = await applyShippingQuote(token, selected);
      onOrder(current);
      setApplied(true);
    } catch (cause) {
      const code = cause instanceof PublicCheckoutError ? cause.code : undefined;
      if (code === "ORDER_NOT_PENDING") onLocked();
      if (code === "LANDED_COST_UNAVAILABLE") onIssue(code);
      setMessage(errorMessage(cause, "No pudimos aplicar esta tarifa. Intenta nuevamente."));
      if (code === "QUOTE_EXPIRED" || code === "INVALID_QUOTE") {
        setQuotes([]);
        setSelected("");
        setApplied(false);
        setStatus("error");
      }
    } finally {
      applyLock.current = false;
      setApplying(false);
      onBusy(false);
    }
  }

  return <section className="checkout-options" aria-labelledby="shipping-options-title" aria-busy={status === "loading" || applying}>
    <div className="checkout-options__heading">
      <h3 id="shipping-options-title">Método de envío</h3>
      <p>Las tarifas y su disponibilidad son confirmadas por nuestro sistema.</p>
    </div>

    {(status === "idle" || status === "empty" || status === "error") && <button type="button" disabled={disabled} onClick={calculate}>Calcular envío</button>}
    {status === "loading" && <p role="status">Calculando opciones de envío…</p>}

    {status === "loaded" && <>
      <fieldset className="checkout-options__list" disabled={disabled || applying}>
        <legend>Selecciona una tarifa</legend>
        {quotes.map((quote) => <label className="checkout-option" data-active={selected === quote.quote_token} key={quote.quote_token}>
          <input type="radio" name="shipping-quote" value={quote.quote_token} checked={selected === quote.quote_token} onChange={() => { setSelected(quote.quote_token); setApplied(false); setMessage(""); }} />
          <span className="checkout-option__content">
            <strong>{quote.carrier || "Transportadora por confirmar"}</strong>
            <span>{quote.service}</span>
            {estimate(quote) && <small>{estimate(quote)}</small>}
          </span>
          <strong className="checkout-option__price">{money(quote.amount, quote.currency)}</strong>
        </label>)}
      </fieldset>
      <button type="button" disabled={disabled || applying || !selected || applied} onClick={apply}>{applying ? "Aplicando tarifa…" : applied ? "Tarifa aplicada" : "Aplicar tarifa"}</button>
      <button className="checkout-options__secondary" type="button" disabled={disabled || applying} onClick={calculate}>Calcular nuevamente</button>
    </>}

    <div className="checkout-options__feedback" aria-live="polite" aria-atomic="true">
      {applied && <p className="checkout-form__success">Tarifa de envío aplicada</p>}
      {message && <p className="checkout-form__error">{message}</p>}
    </div>
  </section>;
}
