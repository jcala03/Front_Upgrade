import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { createOrder } from "../../api/orders";
import type { PublicOrder } from "../../types/order";
import { CheckoutDelivery } from "./CheckoutDelivery";
import { CheckoutOrderSummary } from "./CheckoutOrderSummary";
import { cartItemKey, cartItemPrice, useCart, type CartItem } from "../../context/CartContext";
import { CREATE_IDEMPOTENCY_KEY, finishActiveCheckout, readActiveCheckout, storeCreatedCheckout } from "../../utils/checkoutStorage";
import "./CheckoutPage.css";

type CheckoutForm = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  customerNotes: string;
};

const initialForm: CheckoutForm = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  customerCity: "",
  customerAddress: "",
  customerNotes: "",
};

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

  const [form, setForm] = useState<CheckoutForm>(initialForm);
  const [publicToken, setPublicToken] = useState<string | null>(() => readActiveCheckout()?.public_token ?? null);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publicOrder, setPublicOrder] = useState<PublicOrder | null>(null);
  const [checkoutIssue, setCheckoutIssue] = useState<string | null>(null);
  const submitLock = useRef(false);
  const idempotencyKey = useRef<string | null>(sessionStorage.getItem(CREATE_IDEMPOTENCY_KEY));

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

  const canSubmit =
    form.customerName.trim().length >= 3 &&
    form.customerEmail.trim().includes("@") &&
    form.customerPhone.trim().length >= 7 &&
    form.customerCity.trim().length >= 2 &&
    items.length > 0 &&
    !isSubmitting;

  const handleChange = (field: keyof CheckoutForm, value: string) => {
    setForm((currentForm: CheckoutForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (publicToken || !canSubmit || submitLock.current) {
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
        customer_city: form.customerCity.trim(),
        customer_address: form.customerAddress.trim(),
        customer_notes: form.customerNotes.trim(),
        items: items.map((item: CartItem) => ({
          product_id: item.product.id,
          product_variant_id: item.variant?.id ?? null,
          quantity: item.quantity,
        })),
      }, idempotencyKey.current);

      if (!created.publicToken) throw new Error("No fue posible recuperar el token seguro de tu pedido.");
      storeCreatedCheckout({ public_token: created.publicToken, order_number: created.order.order_number }, items);

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
        {publicToken ? <CheckoutDelivery token={publicToken} buyerName={form.customerName} buyerPhone={form.customerPhone} onOrderChange={handleOrderChange} onCheckoutIssue={setCheckoutIssue} /> : <form className="checkout-form" onSubmit={handleSubmit}>
          <div className="checkout-form__heading">
            <span>Datos del cliente</span>
            <h2>Información de contacto</h2>
            <p>
              Usaremos estos datos para confirmar disponibilidad, entrega,
              instalación o recogida.
            </p>
          </div>

          <div className="checkout-form__grid">
            <label>
              <span>Nombre completo</span>
              <input
                type="text"
                value={form.customerName}
                disabled={isSubmitting}
                onChange={(event) =>
                  handleChange("customerName", event.target.value)
                }
                placeholder="Ej: Juan Pérez"
              />
            </label>

            <label>
              <span>Correo electrónico</span>
              <input
                type="email"
                value={form.customerEmail}
                disabled={isSubmitting}
                onChange={(event) =>
                  handleChange("customerEmail", event.target.value)
                }
                placeholder="correo@ejemplo.com"
              />
            </label>

            <label>
              <span>Celular / WhatsApp</span>
              <input
                type="tel"
                value={form.customerPhone}
                disabled={isSubmitting}
                onChange={(event) =>
                  handleChange("customerPhone", event.target.value)
                }
                placeholder="Ej: 323 000 0000"
              />
            </label>

            <label>
              <span>Ciudad</span>
              <input
                type="text"
                value={form.customerCity}
                disabled={isSubmitting}
                onChange={(event) =>
                  handleChange("customerCity", event.target.value)
                }
                placeholder="Ej: Barranquilla"
              />
            </label>
          </div>

          <label className="checkout-form__full">
            <span>Dirección o punto de entrega</span>
            <input
              type="text"
              value={form.customerAddress}
              disabled={isSubmitting}
              onChange={(event) =>
                handleChange("customerAddress", event.target.value)
              }
              placeholder="Dirección, taller, local o nota de recogida"
            />
          </label>

          <label className="checkout-form__full">
            <span>Notas adicionales</span>
            <textarea
              value={form.customerNotes}
              disabled={isSubmitting}
              onChange={(event) =>
                handleChange("customerNotes", event.target.value)
              }
              placeholder="Ej: quiero instalación, confirmar compatibilidad, recoger en tienda..."
              rows={5}
            />
          </label>

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
            <div className="checkout-form__error">
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
