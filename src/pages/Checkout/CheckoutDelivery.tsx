import { useEffect, useRef, useState, type FormEvent } from "react";
import { getPublicOrder, PublicCheckoutError, updateShippingAddress } from "../../api/orders";
import type { PublicFulfillmentType, PublicOrder, PublicShippingAddress } from "../../types/order";
import { CheckoutPickupOptions } from "./CheckoutPickupOptions";
import { CheckoutShippingQuotes } from "./CheckoutShippingQuotes";

const requiredAddressFields: { key: keyof PublicShippingAddress; label: string; max: number; autoComplete?: string }[] = [
  { key: "country_code", label: "País (código de dos letras)", max: 2, autoComplete: "shipping country" },
  { key: "state", label: "Departamento / Estado", max: 120, autoComplete: "shipping address-level1" },
  { key: "city", label: "Ciudad", max: 120, autoComplete: "shipping address-level2" },
  { key: "postal_code", label: "Código postal", max: 20, autoComplete: "shipping postal-code" },
  { key: "address_line1", label: "Dirección", max: 220, autoComplete: "shipping address-line1" },
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
  initialMode: PublicFulfillmentType | null;
  onModeChange: (mode: PublicFulfillmentType) => void;
  onOrderChange: (order: PublicOrder) => void;
  onCheckoutIssue: (code: string | null) => void;
};

export function CheckoutDelivery({ token, buyerName, buyerPhone, initialMode, onModeChange, onOrderChange, onCheckoutIssue }: Props) {
  const initialModeRef = useRef(initialMode);
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [mode, setMode] = useState<PublicFulfillmentType>(initialModeRef.current ?? "shipping");
  const [contactDefaults, setContactDefaults] = useState({ name: buyerName, phone: buyerPhone });
  const [address, setAddress] = useState<PublicShippingAddress>({ recipient_name: buyerName, recipient_phone: buyerPhone, country_code: "CO", state: "", city: "", postal_code: "", address_line1: "", address_line2: "", delivery_notes: "" });
  const [differentRecipient, setDifferentRecipient] = useState(false);
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
      const resolvedMode = initialModeRef.current ?? current.fulfillment_type ?? "shipping";
      setMode(resolvedMode);
      onCheckoutIssue(resolvedMode === current.fulfillment_type ? null : "FULFILLMENT_PENDING");
      const defaults = {
        name: buyerName.trim() || current.customer_name?.trim() || "",
        phone: buyerPhone.trim() || current.customer_phone?.trim() || "",
      };
      setContactDefaults(defaults);
      if (current.shipping_address) {
        setAddress(current.shipping_address);
        setDifferentRecipient(
          current.shipping_address.recipient_name.trim() !== defaults.name
          || current.shipping_address.recipient_phone.trim() !== defaults.phone,
        );
        setStatus("saved");
      } else {
        setAddress((existing) => ({ ...existing, recipient_name: defaults.name, recipient_phone: defaults.phone }));
      }
      setLocked(current.order_status !== "pending");
    }).catch(() => {
      if (active) setError("No pudimos recuperar tu pedido. Intenta nuevamente; no crearemos otro.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, retry, buyerName, buyerPhone, onOrderChange, onCheckoutIssue]);

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

  function changeMode(nextMode: PublicFulfillmentType) {
    setMode(nextMode);
    onModeChange(nextMode);
    setError("");
    setFieldErrors({});
    onCheckoutIssue(nextMode === order?.fulfillment_type ? null : "FULFILLMENT_PENDING");
  }

  function toggleDifferentRecipient(enabled: boolean) {
    setDifferentRecipient(enabled);
    setError("");
    setFieldErrors((current) => ({ ...current, recipient_name: [], recipient_phone: [] }));
    if (!enabled) {
      setAddress((current) => ({ ...current, recipient_name: contactDefaults.name, recipient_phone: contactDefaults.phone }));
      setDirty(true);
      setStatus("idle");
      onCheckoutIssue("ADDRESS_DIRTY");
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || locked || saveLock.current || mode !== "shipping") return;
    saveLock.current = true;
    setStatus("saving");
    setError("");
    setFieldErrors({});
    try {
      const payload: PublicShippingAddress = {
        recipient_name: (differentRecipient ? address.recipient_name : contactDefaults.name).trim(),
        recipient_phone: (differentRecipient ? address.recipient_phone : contactDefaults.phone).trim(),
        country_code: address.country_code.trim(),
        state: address.state.trim(),
        city: address.city.trim(),
        postal_code: address.postal_code.trim(),
        address_line1: address.address_line1.trim(),
        address_line2: address.address_line2?.trim() ?? "",
        delivery_notes: address.delivery_notes?.trim() ?? "",
      };
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
        const firstField = Object.keys(cause.fields)[0];
        window.requestAnimationFrame(() => document.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus());
        if (cause.code === "ORDER_NOT_PENDING") setLocked(true);
      }
    } finally {
      saveLock.current = false;
    }
  }

  return <section className="checkout-form checkout-delivery" aria-label="Entrega del pedido">
    <div className="checkout-form__heading"><span>Entrega</span><h2>¿Cómo lo recibes?</h2><p>{order ? `Pedido ${order.order_number}` : "Recuperando tu pedido"}</p></div>
    {loading ? <p role="status">Cargando datos de entrega…</p> : !order ? <><p role="alert">{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></> : <>
      <fieldset className="checkout-fulfillment-selector" disabled={status === "saving" || operationBusy || locked}>
        <legend>Forma de entrega</legend>
        {([['shipping', 'Envío', 'Lo enviamos a la dirección que indiques.'], ['pickup', 'Recoger en sede', 'Recógelo en una sede disponible.']] as const).map(([value, label, description]) => <label key={value} data-active={mode === value}>
          <input type="radio" name="fulfillment" value={value} checked={mode === value} onChange={() => changeMode(value)} />
          <span><strong>{label}</strong><small>{description}</small></span>
        </label>)}
      </fieldset>
      {locked && <p role="alert">{messages.ORDER_NOT_PENDING}</p>}
      {mode === "pickup" ? <CheckoutPickupOptions token={token} order={order} disabled={locked} onOrder={updateOrder} onBusy={setOperationBusy} onLocked={() => setLocked(true)} /> : <>
      <form onSubmit={save} aria-busy={status === "saving"}>
        <div className="checkout-delivery__recipient">
          <p><strong>¿Quién recibe?</strong><br /><span>{contactDefaults.name} · {contactDefaults.phone}</span></p>
          <label className="checkout-delivery__recipient-toggle">
            <input type="checkbox" checked={differentRecipient} disabled={status === "saving" || operationBusy || locked} onChange={(event) => toggleDifferentRecipient(event.target.checked)} />
            <span>Recibe otra persona</span>
          </label>
        </div>
        <div className="checkout-form__grid">
          {differentRecipient && <>
            <label><span>Nombre de quien recibe</span><input name="recipient_name" type="text" value={address.recipient_name} required maxLength={120} autoComplete="shipping name" disabled={status === "saving" || operationBusy || locked} onChange={(event) => change("recipient_name", event.target.value)} aria-invalid={!!fieldErrors.recipient_name?.length} aria-describedby={fieldErrors.recipient_name?.length ? "delivery-error-recipient_name" : undefined} />{fieldErrors.recipient_name?.length > 0 && <small id="delivery-error-recipient_name" className="checkout-delivery__field-error">{fieldErrors.recipient_name.join(" ")}</small>}</label>
            <label><span>Teléfono de quien recibe</span><input name="recipient_phone" type="tel" value={address.recipient_phone} required maxLength={40} autoComplete="shipping tel" disabled={status === "saving" || operationBusy || locked} onChange={(event) => change("recipient_phone", event.target.value)} aria-invalid={!!fieldErrors.recipient_phone?.length} aria-describedby={fieldErrors.recipient_phone?.length ? "delivery-error-recipient_phone" : undefined} />{fieldErrors.recipient_phone?.length > 0 && <small id="delivery-error-recipient_phone" className="checkout-delivery__field-error">{fieldErrors.recipient_phone.join(" ")}</small>}</label>
          </>}
          {requiredAddressFields.map(({ key, label, max, autoComplete }) => <label key={key} className={key === "address_line1" ? "checkout-delivery__wide" : undefined}>
            <span>{label}</span>
            <input name={key} type="text" value={address[key] ?? ""} required maxLength={max} pattern={key === "country_code" ? "[A-Z]{2}" : ".*\\S.*"} title={key === "country_code" ? "Código de dos letras, por ejemplo CO o US" : undefined} autoComplete={autoComplete} disabled={status === "saving" || operationBusy || locked} onChange={(event) => change(key, event.target.value)} aria-invalid={!!fieldErrors[key]?.length} aria-describedby={fieldErrors[key]?.length ? `delivery-error-${key}` : undefined} />
            {fieldErrors[key]?.length > 0 && <small id={`delivery-error-${key}`} className="checkout-delivery__field-error">{fieldErrors[key].join(" ")}</small>}
          </label>)}
        </div>
        <details className="checkout-optional" open={Boolean(address.address_line2 || address.delivery_notes)}>
          <summary>Agregar complemento o indicaciones (opcional)</summary>
          <div className="checkout-form__grid checkout-optional__content">
            <label><span>Apartamento, oficina o complemento</span><input name="address_line2" type="text" value={address.address_line2 ?? ""} maxLength={220} autoComplete="shipping address-line2" disabled={status === "saving" || operationBusy || locked} onChange={(event) => change("address_line2", event.target.value)} /></label>
            <label><span>Indicaciones de entrega</span><textarea name="delivery_notes" value={address.delivery_notes ?? ""} maxLength={1000} disabled={status === "saving" || operationBusy || locked} onChange={(event) => change("delivery_notes", event.target.value)} /></label>
          </div>
        </details>
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
