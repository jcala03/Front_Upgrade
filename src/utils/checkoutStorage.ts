import type { CartItem, CartLineQuantity } from "../context/CartContext";

const LAST_ORDER_KEY = "upgrade79_last_order";
const ACTIVE_CHECKOUT_KEY = "upgrade79_active_checkout";
const CHECKOUT_STORAGE_VERSION_KEY = "upgrade79_checkout_storage_v2";
export const CREATE_IDEMPOTENCY_KEY = "upgrade79_checkout_v1_idempotency_key";

export type CheckoutReference = { public_token: string; order_number?: string };

const parseReference = (raw: string | null): CheckoutReference | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CheckoutReference>;
    return typeof value.public_token === "string" && value.public_token
      ? { public_token: value.public_token, order_number: typeof value.order_number === "string" ? value.order_number : undefined }
      : null;
  } catch {
    return null;
  }
};

export const readLastOrder = () => parseReference(sessionStorage.getItem(LAST_ORDER_KEY));

export const readActiveCheckout = () => {
  const active = parseReference(sessionStorage.getItem(ACTIVE_CHECKOUT_KEY));
  if (active || sessionStorage.getItem(CHECKOUT_STORAGE_VERSION_KEY)) return active;

  // One-time compatibility for a checkout started before active and historical
  // order references were separated. Its status is revalidated by the API.
  sessionStorage.setItem(CHECKOUT_STORAGE_VERSION_KEY, "1");
  const legacy = readLastOrder();
  if (legacy) sessionStorage.setItem(ACTIVE_CHECKOUT_KEY, JSON.stringify(legacy));
  return legacy;
};

const cartSnapshotKey = (token: string) => `upgrade79_checkout_cart:${token}`;
export const paymentKeyStorage = (token: string) => `upgrade79_payment_init:${token}`;
export const paymentAttemptStorage = (token: string) => `upgrade79_payment_attempt:${token}`;
export const paymentUncertainStorage = (token: string) => `upgrade79_payment_uncertain:${token}`;
const cartReconciledStorage = (token: string) => `upgrade79_paid_cart_reconciled:${token}`;

export const storeCreatedCheckout = (reference: CheckoutReference, items: CartItem[]) => {
  const serialized = JSON.stringify(reference);
  sessionStorage.setItem(LAST_ORDER_KEY, serialized);
  sessionStorage.setItem(ACTIVE_CHECKOUT_KEY, serialized);
  sessionStorage.setItem(CHECKOUT_STORAGE_VERSION_KEY, "1");
  const lines: CartLineQuantity[] = items.map((item) => ({
    productId: item.product.id,
    variantId: item.variant?.id ?? null,
    quantity: item.quantity,
  }));
  sessionStorage.setItem(cartSnapshotKey(reference.public_token), JSON.stringify(lines));
};

export const finishActiveCheckout = (token?: string) => {
  const active = parseReference(sessionStorage.getItem(ACTIVE_CHECKOUT_KEY));
  if (!token || active?.public_token === token) sessionStorage.removeItem(ACTIVE_CHECKOUT_KEY);
  sessionStorage.removeItem(CREATE_IDEMPOTENCY_KEY);
  sessionStorage.setItem(CHECKOUT_STORAGE_VERSION_KEY, "1");
};

export const startNewPurchase = (token?: string) => {
  finishActiveCheckout(token);
  if (!token) return;
  clearKnownPaymentAttempt(token);
  sessionStorage.removeItem(cartSnapshotKey(token));
};

const readCartSnapshot = (token: string): CartLineQuantity[] => {
  try {
    const value = JSON.parse(sessionStorage.getItem(cartSnapshotKey(token)) ?? "null") as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((line): line is CartLineQuantity => Boolean(
      line && typeof line === "object"
      && typeof (line as CartLineQuantity).productId === "number"
      && ((line as CartLineQuantity).variantId === null || typeof (line as CartLineQuantity).variantId === "number")
      && typeof (line as CartLineQuantity).quantity === "number"
      && (line as CartLineQuantity).quantity > 0,
    ));
  } catch {
    return [];
  }
};

export const reconcilePaidCart = (token: string, consumeLines: (lines: CartLineQuantity[]) => void) => {
  if (sessionStorage.getItem(cartReconciledStorage(token))) return;
  const lines = readCartSnapshot(token);
  if (lines.length) consumeLines(lines);
  sessionStorage.setItem(cartReconciledStorage(token), "1");
  sessionStorage.removeItem(cartSnapshotKey(token));
};

export const clearKnownPaymentAttempt = (token: string) => {
  sessionStorage.removeItem(paymentKeyStorage(token));
  sessionStorage.removeItem(paymentAttemptStorage(token));
  sessionStorage.removeItem(paymentUncertainStorage(token));
};

export const preparePaymentRetry = (token: string) => {
  if (!sessionStorage.getItem(paymentUncertainStorage(token))) clearKnownPaymentAttempt(token);
};
