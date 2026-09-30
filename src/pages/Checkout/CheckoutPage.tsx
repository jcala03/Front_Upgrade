import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { createOrder } from "../../api/orders";
import type { PublicFulfillmentType, PublicOrder } from "../../types/order";
import { CheckoutDelivery } from "./CheckoutDelivery";
import { CheckoutOrderSummary } from "./CheckoutOrderSummary";
import { cartItemKey, cartItemPrice, useCart, type CartItem } from "../../context/CartContext";
import { CREATE_IDEMPOTENCY_KEY, finishActiveCheckout, readActiveCheckout, storeCheckoutFulfillment, storeCreatedCheckout } from "../../utils/checkoutStorage";
import "./CheckoutPage.css";

type CheckoutForm = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes: string;
};

const initialForm: CheckoutForm = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  customerNotes: "",
};

type CheckoutField = "fulfillment" | "customerName" | "customerEmail" | "customerPhone";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const getImageUrl = (imageUrl?: string | null) => {
  if (!imageUrl) {
    return "";
  }

  if (imageUrl.startsWith("http")) {
    return imageUrl;
  }

  return `${API_BASE_URL}${imageUrl}`;
};

const formatPrice = (value: number) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
};

export const CheckoutPage = () => {
  const { items, subtotal } = useCart();

  const [initialCheckout] = useState(() => readActiveCheckout());
  const [form, setForm] = useState<CheckoutForm>(initialForm);
  const [fulfillmentMode, setFulfillmentMode] = useState<PublicFulfillmentType | null>(initialCheckout?.fulfillment_mode ?? null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CheckoutField, string>>>({});
  const [publicToken, setPublicToken] = useState<string | null>(initialCheckout?.public_token ?? null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publicOrder, setPublicOrder] = useState<PublicOrder | null>(null);
  const [checkoutIssue, setCheckoutIssue] = useState<string | null>(null);
  const submitLock = useRef(false);
  const idempotencyKey = useRef<string | null>(sessionStorage.getItem(CREATE_IDEMPOTENCY_KEY));
  const fulfillmentRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const handleOrderChange = useCallback((order: PublicOrder) => {
    if (order.order_status !== "pending") {
      finishActiveCheckout(publicToken ?? undefined);
      setPublicToken(null);
      setPublicOrder(null);
      return;
    }
    setPublicOrder(order);
  }, [publicToken]);

  const totalItems = useMemo(() => {
    return items.reduce((total: number, item: CartItem) => {
      return total + item.quantity;
    }, 0);
  }, [items]);

  const canSubmit = items.length > 0 && !isSubmitting;

  const handleChange = (field: keyof CheckoutForm, value: string) => {
    setForm((currentForm: CheckoutForm) => ({
      ...currentForm,
      [field]: value,
    }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const selectFulfillment = (mode: PublicFulfillmentType) => {
    setFulfillmentMode(mode);
    setFieldErrors((current) => ({ ...current, fulfillment: undefined }));
    if (publicToken) storeCheckoutFulfillment(publicToken, mode);
  };

  const validate = () => {
    const errors: Partial<Record<CheckoutField, string>> = {};
    if (!fulfillmentMode) errors.fulfillment = "Elige cómo quieres recibir tu pedido.";
    if (form.customerName.trim().length < 3) errors.customerName = "Escribe tu nombre completo.";
    if (!form.customerEmail.trim().includes("@")) errors.customerEmail = "Escribe un correo electrónico válido.";
    if (form.customerPhone.trim().length < 7) errors.customerPhone = "Escribe un número de contacto válido.";
    setFieldErrors(errors);

    const firstInvalid = ([
      ["fulfillment", fulfillmentRef],
      ["customerName", nameRef],
      ["customerEmail", emailRef],
      ["customerPhone", phoneRef],
    ] as const).find(([field]) => errors[field]);
    firstInvalid?.[1].current?.focus();
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (publicToken || !canSubmit || submitLock.current || !validate() || !fulfillmentMode) {
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      idempotencyKey.current ??= crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      sessionStorage.setItem(CREATE_IDEMPOTENCY_KEY, idempotencyKey.current);
      const created = await createOrder({
        customer_name: form.customerName.trim(),
        customer_email: form.customerEmail.trim(),
        customer_phone: form.customerPhone.trim(),
        customer_notes: form.customerNotes.trim(),
        items: items.map((item: CartItem) => ({
          product_id: item.product.id,
          product_variant_id: item.variant?.id ?? null,
          quantity: item.quantity,
        })),
      }, idempotencyKey.current);

      if (!created.publicToken) throw new Error("No fue posible recuperar el token seguro de tu pedido.");
      storeCreatedCheckout({ public_token: created.publicToken, order_number: created.order.order_number, fulfillment_mode: fulfillmentMode }, items);

      setPublicToken(created.publicToken);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No se pudo crear la orden."
      );
      setIsSubmitting(false);
      submitLock.current = false;
    }
  };

  if (items.length === 0 && !publicToken) {
    return (
      <main className="checkout-page">
        <section className="checkout-empty">
          <span>Checkout</span>
          <h1>Tu carrito está vacío</h1>
          <p>Agrega primero los productos que quieres comprar o cotizar.</p>
          <a href="/tienda">Volver a tienda</a>
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <section className="checkout-hero">
        <div>
          <a href="/carrito">
            <ArrowLeft size={16} strokeWidth={1.8} />
            Volver al carrito
          </a>

          <span>Checkout invitado</span>
          <h1>Finalizar compra</h1>
          <p>
            No necesitas iniciar sesión. Déjanos tus datos y prepararemos la
            orden para continuar con el pago.
          </p>
        </div>
      </section>

      <section className="checkout-layout">
        {publicToken ? <CheckoutDelivery token={publicToken} buyerName={form.customerName} buyerPhone={form.customerPhone} initialMode={fulfillmentMode} onModeChange={selectFulfillment} onOrderChange={handleOrderChange} onCheckoutIssue={setCheckoutIssue} /> : <form className="checkout-form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
          <div className="checkout-form__heading">
            <span>Entrega y contacto</span>
            <h2>Prepara tu pedido</h2>
            <p>
              Elige cómo quieres recibirlo y déjanos únicamente los datos necesarios para preparar la orden.
            </p>
          </div>

          <fieldset className="checkout-fulfillment-selector" aria-describedby={fieldErrors.fulfillment ? "checkout-error-fulfillment" : undefined}>
            <legend>¿Cómo quieres recibir tu pedido?</legend>
            {([
              ["shipping", "Envío", "Lo enviamos a la dirección que indiques."],
              ["pickup", "Recoger en sede", "Recógelo en una de nuestras sedes disponibles."],
            ] as const).map(([value, label, description], index) => <label key={value} data-active={fulfillmentMode === value}>
              <input ref={index === 0 ? fulfillmentRef : undefined} type="radio" name="checkout-fulfillment" value={value} checked={fulfillmentMode === value} onChange={() => selectFulfillment(value)} aria-invalid={!!fieldErrors.fulfillment} />
              <span><strong>{label}</strong><small>{description}</small></span>
            </label>)}
          </fieldset>
          {fieldErrors.fulfillment && <p id="checkout-error-fulfillment" className="checkout-field-error">{fieldErrors.fulfillment}</p>}

          <h3 className="checkout-form__section-title">Información de contacto</h3>

          <div className="checkout-form__grid">
            <label>
              <span>Nombre completo</span>
              <input
                ref={nameRef}
                type="text"
                value={form.customerName}
                disabled={isSubmitting}
                onChange={(event) =>
                  handleChange("customerName", event.target.value)
                }
                placeholder="Ej: Juan Pérez"
                autoComplete="name"
                aria-invalid={!!fieldErrors.customerName}
                aria-describedby={fieldErrors.customerName ? "checkout-error-name" : undefined}
              />
              {fieldErrors.customerName && <small id="checkout-error-name" className="checkout-field-error">{fieldErrors.customerName}</small>}
            </label>

            <label>
              <span>Correo electrónico</span>
              <input
                ref={emailRef}
                type="email"
                value={form.customerEmail}
                disabled={isSubmitting}
                onChange={(event) =>
                  handleChange("customerEmail", event.target.value)
                }
                placeholder="correo@ejemplo.com"
                autoComplete="email"
                aria-invalid={!!fieldErrors.customerEmail}
                aria-describedby={fieldErrors.customerEmail ? "checkout-error-email" : undefined}
              />
              {fieldErrors.customerEmail && <small id="checkout-error-email" className="checkout-field-error">{fieldErrors.customerEmail}</small>}
            </label>

            <label>
              <span>Celular / WhatsApp</span>
              <input
                ref={phoneRef}
                type="tel"
                value={form.customerPhone}
                disabled={isSubmitting}
                onChange={(event) =>
                  handleChange("customerPhone", event.target.value)
                }
                placeholder="Ej: 323 000 0000"
                autoComplete="tel"
                aria-invalid={!!fieldErrors.customerPhone}
                aria-describedby={fieldErrors.customerPhone ? "checkout-error-phone" : undefined}
              />
              {fieldErrors.customerPhone && <small id="checkout-error-phone" className="checkout-field-error">{fieldErrors.customerPhone}</small>}
            </label>
          </div>

          <details className="checkout-optional" open={Boolean(form.customerNotes)}>
            <summary>Agregar una nota al pedido (opcional)</summary>
            <label className="checkout-form__full">
              <span>Notas adicionales</span>
              <textarea value={form.customerNotes} disabled={isSubmitting} onChange={(event) => handleChange("customerNotes", event.target.value)} placeholder="Ej: quiero instalación o confirmar compatibilidad" rows={4} />
            </label>
          </details>

          <div className="checkout-form__security">
            <ShieldCheck size={18} strokeWidth={1.8} />
            <p>
              Confirmaremos disponibilidad, entrega y total antes de habilitar el pago seguro.
            </p>
          </div>

          <button type="submit" disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2
                  className="checkout-form__loader"
                  size={17}
                  strokeWidth={1.9}
                />
                Creando orden
              </>
            ) : (
              "Preparar orden"
            )}
          </button>

          {submitError ? (
            <div className="checkout-form__error" role="alert">
              <strong>No se pudo crear la orden.</strong>
              <p>{submitError}</p>
            </div>
          ) : null}
        </form>}

        {publicToken ? <CheckoutOrderSummary order={publicOrder} blockingIssue={checkoutIssue} publicToken={publicToken} /> : <aside className="checkout-summary">
          <span>Resumen</span>

          <div className="checkout-summary__items">
            {items.map((item: CartItem) => {
              const imageUrl = getImageUrl(item.variant?.image_url ?? item.product.image_url);
              const unitPrice = cartItemPrice(item);

              return (
                <article
                  className="checkout-summary__item"
                  key={cartItemKey(item.product.id, item.variant?.id)}
                >
                  <div className="checkout-summary__image">
                    {imageUrl ? (
                      <img src={imageUrl} alt={item.product.name} />
                    ) : (
                      <span>Sin imagen</span>
                    )}
                  </div>

                  <div>
                    <h3>{item.product.name}</h3>
                    {item.variant ? <small>{item.variant.display_name || item.variant.name}</small> : null}
                    <p>
                      {item.quantity} x {formatPrice(unitPrice)}
                    </p>
                  </div>

                  <strong>
                    {formatPrice(unitPrice * item.quantity)}
                  </strong>
                </article>
              );
            })}
          </div>

          <div className="checkout-summary__line">
            <p>Productos</p>
            <strong>{totalItems}</strong>
          </div>

          <div className="checkout-summary__line">
            <p>Subtotal</p>
            <strong>{formatPrice(subtotal)}</strong>
          </div>

          <div className="checkout-summary__total">
            <p>Total estimado</p>
            <strong>{formatPrice(subtotal)}</strong>
          </div>

          <small>
            Instalación, envío o ajustes de compatibilidad pueden confirmarse
            antes del pago final.
          </small>
        </aside>}
      </section>
    </main>
  );
};
