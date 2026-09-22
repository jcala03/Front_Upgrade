import { useEffect, useRef, useState } from "react";
import { applyPickup, getPickupOptions, PublicCheckoutError, type PublicPickupBranch } from "../../api/orders";
import type { PublicOrder } from "../../types/order";

const errors: Record<string, string> = {
  NO_BRANCH_CAN_FULFILL: "No tenemos una sola sede con disponibilidad suficiente para todos los productos del pedido.",
  STALE_STOCK: "La disponibilidad cambió durante el checkout.",
  ORDER_NOT_PENDING: "Este pedido ya no puede modificarse desde el checkout.",
};

const errorMessage = (cause: unknown, fallback: string) =>
  cause instanceof PublicCheckoutError ? errors[cause.code ?? ""] ?? fallback : "No pudimos conectar. Intenta nuevamente.";

type Props = {
  token: string;
  order: PublicOrder;
  disabled: boolean;
  onOrder: (order: PublicOrder) => void;
  onBusy: (busy: boolean) => void;
  onLocked: () => void;
};

export function CheckoutPickupOptions({ token, order, disabled, onOrder, onBusy, onLocked }: Props) {
  const [options, setOptions] = useState<PublicPickupBranch[]>([]);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState<"loading" | "loaded" | "empty" | "error" | "applying" | "applied">("loading");
  const [message, setMessage] = useState("");
  const loadLock = useRef(false);
  const applyLock = useRef(false);

  async function load() {
    if (loadLock.current || applyLock.current) return;
    loadLock.current = true;
    onBusy(true);
    setStatus("loading");
    setMessage("");
    setSelected("");
    try {
      const branches = await getPickupOptions(token);
      setOptions(branches);
      setStatus(branches.length ? "loaded" : "empty");
      if (!branches.length) setMessage(errors.NO_BRANCH_CAN_FULFILL);
    } catch (cause) {
      if (cause instanceof PublicCheckoutError && cause.code === "ORDER_NOT_PENDING") onLocked();
      setOptions([]);
      setStatus("error");
      setMessage(errorMessage(cause, "No pudimos cargar las sedes disponibles."));
    } finally {
      loadLock.current = false;
      onBusy(false);
    }
  }

  useEffect(() => { void load(); }, [token]);

  async function apply() {
    if (!selected || disabled || applyLock.current || status !== "loaded") return;
    applyLock.current = true;
    onBusy(true);
    setStatus("applying");
    setMessage("");
    try {
      const current = await applyPickup(token, selected);
      onOrder(current);
      setStatus("applied");
    } catch (cause) {
      if (cause instanceof PublicCheckoutError && cause.code === "ORDER_NOT_PENDING") onLocked();
      setStatus("loaded");
      setMessage(errorMessage(cause, "No pudimos aplicar esta sede. Intenta nuevamente."));
    } finally {
      applyLock.current = false;
      onBusy(false);
    }
  }

  return <section className="checkout-options" aria-labelledby="pickup-options-title" aria-busy={status === "loading" || status === "applying"}>
    <div className="checkout-options__heading">
      <h3 id="pickup-options-title">Sede de recogida</h3>
      <p>{order.fulfillment_type === "pickup" ? "Tu pedido está configurado para recogida. Puedes confirmar o cambiar la sede." : "Elige una sede disponible para todos los productos del pedido."}</p>
    </div>

    {status === "loading" && <p role="status">Cargando sedes disponibles…</p>}
    {(status === "loaded" || status === "applying" || status === "applied") && <>
      <fieldset className="checkout-options__list" disabled={disabled || status === "applying"}>
        <legend>Selecciona una sede</legend>
        {options.map((branch) => <label className="checkout-option" data-active={selected === branch.slug} key={branch.slug}>
          <input type="radio" name="pickup-branch" value={branch.slug} checked={selected === branch.slug} onChange={() => { setSelected(branch.slug); setStatus("loaded"); setMessage(""); }} />
          <span className="checkout-option__content"><strong>{branch.name}</strong><span>{branch.city}</span></span>
        </label>)}
      </fieldset>
      <button type="button" disabled={disabled || status === "applying" || status === "applied" || !selected} onClick={apply}>{status === "applying" ? "Aplicando sede…" : status === "applied" ? "Sede aplicada" : "Recoger en esta sede"}</button>
    </>}
    {(status === "empty" || status === "error") && <button type="button" disabled={disabled} onClick={load}>Reintentar</button>}

    <div className="checkout-options__feedback" aria-live="polite" aria-atomic="true">
      {status === "applied" && <p className="checkout-form__success">Sede de recogida aplicada</p>}
      {message && <p className="checkout-form__error">{message}</p>}
    </div>
  </section>;
}
