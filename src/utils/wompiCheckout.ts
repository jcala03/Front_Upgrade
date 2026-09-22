import { initializeWompiPayment, PaymentInitializationUncertainError } from "../api/orders";
import type { PublicWompiCheckout } from "../types/order";
import { clearKnownPaymentAttempt, paymentAttemptStorage, paymentKeyStorage, paymentUncertainStorage } from "./checkoutStorage";

const newKey = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export const submitWompiCheckout = (checkout: PublicWompiCheckout) => {
  const form = document.createElement("form");
  form.method = "GET";
  form.action = checkout.checkout_url;
  const fields: Record<string, string> = {
    "public-key": checkout.public_key,
    currency: checkout.currency,
    "amount-in-cents": String(checkout.amount_in_cents),
    reference: checkout.reference,
    "signature:integrity": checkout.integrity_signature,
    "redirect-url": checkout.redirect_url,
    "expiration-time": checkout.expiration_time,
  };
  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.append(input);
  });
  document.body.append(form);
  form.submit();
};

export const startWompiCheckout = async (token: string) => {
  const storageKey = paymentKeyStorage(token);
  const key = sessionStorage.getItem(storageKey) ?? newKey();
  sessionStorage.setItem(storageKey, key);
  try {
    const checkout = await initializeWompiPayment(token, key);
    sessionStorage.removeItem(paymentUncertainStorage(token));
    sessionStorage.setItem(paymentAttemptStorage(token), "1");
    submitWompiCheckout(checkout);
  } catch (cause) {
    if (cause instanceof PaymentInitializationUncertainError) {
      sessionStorage.setItem(paymentUncertainStorage(token), "1");
    } else {
      clearKnownPaymentAttempt(token);
    }
    throw cause;
  }
};
