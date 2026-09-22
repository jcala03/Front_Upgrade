import { useEffect, useRef, useState, type FormEvent } from "react";
import { getPublicOrder, PublicCheckoutError, updateShippingAddress } from "../../api/orders";
import type { PublicOrder, PublicShippingAddress } from "../../types/order";
import { CheckoutPickupOptions } from "./CheckoutPickupOptions";
import { CheckoutShippingQuotes } from "./CheckoutShippingQuotes";

const fields: { key: keyof PublicShippingAddress; label: string; max: number; optional?: boolean; autoComplete?: string }[] = [
  { key: "recipient_name", label: "Nombre de quien recibe", max: 120, autoComplete: "shipping name" },
  { key: "recipient_phone", label: "Teléfono de quien recibe", max: 40, autoComplete: "shipping tel" },
  { key: "country_code", label: "País (código de dos letras)", max: 2, autoComplete: "shipping country" },
  { key: "state", label: "Departamento / Estado", max: 120, autoComplete: "shipping address-level1" },
  { key: "city", label: "Ciudad", max: 120, autoComplete: "shipping address-level2" },
  { key: "postal_code", label: "Código postal", max: 20, autoComplete: "shipping postal-code" },
  { key: "address_line1", label: "Dirección", max: 220, autoComplete: "shipping address-line1" },
  { key: "address_line2", label: "Apartamento, oficina o complemento (opcional)", max: 220, optional: true, autoComplete: "shipping address-line2" },
  { key: "delivery_notes", label: "Indicaciones de entrega (opcional)", max: 1000, optional: true },
];

const messages: Record<string, string> = {
  MISSING_SHIPPING_ADDRESS: "Completa los datos de entrega.",
  UNSUPPORTED_DESTINATION: "Aún no realizamos envíos a este destino.",
  ORDER_NOT_PENDING: "Este pedido ya no puede modificarse desde el checkout.",
};

type Props = {
  token: string;
  buyerName: string;
  buyerPhone: string;
  onOrderChange: (order: PublicOrder) => void;
  onCheckoutIssue: (code: string | null) => void;
};

export function CheckoutDelivery({ token, buyerName, buyerPhone, onOrderChange, onCheckoutIssue }: Props) {
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [mode, setMode] = useState<"shipping" | "pickup">("shipping");
  const [address, setAddress] = useState<PublicShippingAddress>({ recipient_name: buyerName, recipient_phone: buyerPhone, country_code: "CO", state: "", city: "", postal_code: "", address_line1: "", address_line2: "", delivery_notes: "" });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [dirty, setDirty] = useState(false);
  const [locked, setLocked] = useState(false);
  const [operationBusy, setOperationBusy] = useState(false);
  const saveLock = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    onCheckoutIssue(null);
    getPublicOrder(token).then((current) => {
      if (!active) return;
      setOrder(current);
      onOrderChange(current);
      setMode(current.fulfillment_type ?? "shipping");
      if (current.shipping_address) {
        setAddress(current.shipping_address);
        setStatus("saved");
      }
      setLocked(current.order_status !== "pending");
    }).catch(() => {
      if (active) setError("No pudimos recuperar tu pedido. Intenta nuevamente; no crearemos otro.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, retry, onOrderChange, onCheckoutIssue]);

  function change(key: keyof PublicShippingAddress, value: string) {
    setAddress((current) => ({ ...current, [key]: key === "country_code" ? value.toUpperCase() : value }));
    setDirty(true);
    setStatus("idle");
    setError("");
    onCheckoutIssue("ADDRESS_DIRTY");
    setFieldErrors((current) => ({ ...current, [key]: [] }));
  }

  function updateOrder(current: PublicOrder) {
    setOrder(current);
    onOrderChange(current);
    onCheckoutIssue(current.fulfillment_type === mode ? null : "FULFILLMENT_PENDING");
    setLocked(current.order_status !== "pending");
  }

  function changeMode(nextMode: "shipping" | "pickup") {
    setMode(nextMode);
    setError("");
    setFieldErrors({});
    onCheckoutIssue(nextMode === order?.fulfillment_type ? null : "FULFILLMENT_PENDING");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || locked || saveLock.current || mode !== "shipping") return;
    saveLock.current = true;
    setStatus("saving");
    setError("");
    setFieldErrors({});
    try {
      const payload = Object.fromEntries(fields.map(({ key }) => [key, address[key]?.trim() ?? ""])) as PublicShippingAddress;
      const current = await updateShippingAddress(token, payload);
      updateOrder(current);
      setAddress(current.shipping_address ?? payload);
      setDirty(false);
      setStatus("saved");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof PublicCheckoutError ? messages[cause.code ?? ""] ?? "No pudimos guardar la dirección. Revisa los datos e intenta nuevamente." : "No pudimos conectar. Tu dirección sigue aquí; intenta nuevamente.");
      if (cause instanceof PublicCheckoutError) {
        setFieldErrors(cause.fields);
        if (cause.code === "ORDER_NOT_PENDING") setLocked(true);
      }
    } finally {
      saveLock.current = false;
    }
  }

  return <section className="checkout-form checkout-delivery" aria-label="Entrega del pedido">
    <div className="checkout-form__heading"><span>Entrega</span><h2>¿Cómo lo recibes?</h2><p>{order ? `Pedido ${order.order_number}` : "Recuperando tu pedido"}</p></div>
    {loading ? <p role="status">Cargando datos de entrega…</p> : !order ? <><p role="alert">{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></> : <>
      <fieldset className="checkout-delivery__selector" disabled={status === "saving" || operationBusy || locked}>
        <legend>Forma de entrega</legend>
        {([['shipping', 'Envío'], ['pickup', 'Recoger en sede']] as const).map(([value, label]) => <label key={value} data-active={mode === value}>
          <input type="radio" name="fulfillment" value={value} checked={mode === value} onChange={() => changeMode(value)} />
          <span>{label}</span>
        </label>)}
      </fieldset>
      {locked && <p role="alert">{messages.ORDER_NOT_PENDING}</p>}
      {mode === "pickup" ? <CheckoutPickupOptions token={token} order={order} disabled={locked} onOrder={updateOrder} onBusy={setOperationBusy} onLocked={() => setLocked(true)} /> : <>
      <form onSubmit={save} aria-busy={status === "saving"}>
        <div className="checkout-form__grid">
          {fields.map(({ key, label, max, optional, autoComplete }) => <label key={key} className={key.startsWith("address_") || key === "delivery_notes" ? "checkout-delivery__wide" : undefined}>
            <span>{label}</span>
            {key === "delivery_notes" ? <textarea value={address[key] ?? ""} maxLength={max} disabled={status === "saving" || operationBusy || locked} onChange={(event) => change(key, event.target.value)} aria-invalid={!!fieldErrors[key]?.length} aria-describedby={fieldErrors[key]?.length ? `delivery-error-${key}` : undefined} /> : <input name={key} type={key === "recipient_phone" ? "tel" : "text"} value={address[key] ?? ""} required={!optional} maxLength={max} pattern={key === "country_code" ? "[A-Z]{2}" : !optional ? ".*\\S.*" : undefined} title={key === "country_code" ? "Código de dos letras, por ejemplo CO o US" : undefined} autoComplete={autoComplete} disabled={status === "saving" || operationBusy || locked} onChange={(event) => change(key, event.target.value)} aria-invalid={!!fieldErrors[key]?.length} aria-describedby={fieldErrors[key]?.length ? `delivery-error-${key}` : undefined} />}
            {fieldErrors[key]?.length > 0 && <small id={`delivery-error-${key}`} className="checkout-delivery__field-error">{fieldErrors[key].join(" ")}</small>}
          </label>)}
        </div>
        <div aria-live="polite" aria-atomic="true">
          {dirty && order.shipping_address && <p>Actualizamos tu destino. Debemos calcular nuevamente el envío.</p>}
          {status === "saved" && <p className="checkout-form__success">Dirección guardada</p>}
          {error && <p className="checkout-form__error">{error}</p>}
        </div>
        <button type="submit" disabled={status === "saving" || operationBusy || locked || (status === "saved" && !dirty)}>{status === "saving" ? "Guardando dirección…" : "Guardar dirección"}</button>
      </form>
      {status === "saved" && !dirty && <CheckoutShippingQuotes token={token} disabled={locked} onOrder={updateOrder} onBusy={setOperationBusy} onLocked={() => setLocked(true)} onIssue={onCheckoutIssue} />}
      </>}
    </>}
  </section>;
}
