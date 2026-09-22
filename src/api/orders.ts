import type { CreateOrderPayload, PublicOrder, PublicShippingAddress, PublicShippingQuote, PublicWompiCheckout } from "../types/order";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type OrderResponse = {
  message: string;
  data: PublicOrder;
  public_token?: string | null;
};
export type CreatedPublicOrder = { order: PublicOrder; publicToken: string | null };

const getCookie = (name: string): string => {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  if (!cookie) {
    return "";
  }

  const value = cookie.split("=")[1];

  return value ? decodeURIComponent(value) : "";
};

const csrfHeaders = (): Record<string, string> => {
  const token = getCookie("XSRF-TOKEN");

  if (!token) {
    return {};
  }

  return {
    "X-XSRF-TOKEN": token,
  };
};

const getCsrfCookie = async (): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("No se pudo preparar la sesión segura.");
  }
};

export const createOrder = async (
  payload: CreateOrderPayload,
  idempotencyKey: string,
): Promise<CreatedPublicOrder> => {
  await getCsrfCookie();

  const response = await fetch(`${API_BASE_URL}/api/orders`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      ...csrfHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    throw new Error(
      error?.message ??
        error?.errors?.items?.[0] ??
        "No se pudo crear la orden. Revisa los datos."
    );
  }

  const result = (await response.json()) as OrderResponse;

  return { order: result.data, publicToken: result.public_token ?? null };
};

export class PublicCheckoutError extends Error {
  constructor(message: string, public code?: string, public fields: Record<string, string[]> = {}) {
    super(message);
  }
}

export class PaymentInitializationUncertainError extends Error {
  constructor() {
    super("No pudimos confirmar si el intento fue recibido. Vuelve a intentarlo para recuperar el mismo pago de forma segura.");
    this.name = "PaymentInitializationUncertainError";
  }
}

const publicRequest = async <T>(path: string, method = "GET", body?: unknown, signal?: AbortSignal): Promise<T> => {
  if (method !== "GET") {
    await getCsrfCookie();
  }

  const response = await fetch(`${API_BASE_URL}/api${path}`, { method, credentials: "include", headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...csrfHeaders() }, body: body ? JSON.stringify(body) : undefined, signal });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new PublicCheckoutError(result?.message ?? "No fue posible actualizar el checkout.", result?.code, result?.errors ?? {});
  return result.data as T;
};
export const getPublicOrder = async (token: string, options: { signal?: AbortSignal; timeoutMs?: number } = {}) => {
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  const timeout = window.setTimeout(() => controller.abort(new DOMException("Tiempo de espera agotado", "TimeoutError")), options.timeoutMs ?? 12_000);
  try {
    return await publicRequest<PublicOrder>(`/checkout/orders/${encodeURIComponent(token)}`, "GET", undefined, controller.signal);
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
};
export const updateShippingAddress = (token: string, address: PublicShippingAddress) => publicRequest<PublicOrder>(`/checkout/orders/${encodeURIComponent(token)}/shipping-address`, "PUT", address);
export const getShippingQuotes = async (token: string) => (await publicRequest<{ quotes: PublicShippingQuote[] }>(`/checkout/orders/${encodeURIComponent(token)}/shipping-quotes`, "POST")).quotes;
export const applyShippingQuote = (token: string, quoteToken: string) => publicRequest<PublicOrder>(`/checkout/orders/${encodeURIComponent(token)}/shipping-quotes/apply`, "POST", { quote_token: quoteToken });
export type PublicPickupBranch = { slug: string; name: string; city: string };
export const getPickupOptions = async (token: string) => (await publicRequest<{ branches: PublicPickupBranch[] }>(`/checkout/orders/${encodeURIComponent(token)}/pickup-branches`)).branches;
export const applyPickup = (token: string, slug: string) => publicRequest<PublicOrder>(`/checkout/orders/${encodeURIComponent(token)}/pickup`, "POST", { branch_slug: slug });

export const initializeWompiPayment = async (token: string, idempotencyKey: string): Promise<PublicWompiCheckout> => {
  await getCsrfCookie();
  let response: Response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    response = await fetch(`${API_BASE_URL}/api/checkout/orders/${encodeURIComponent(token)}/payments/wompi`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
        ...csrfHeaders(),
      },
      body: "{}",
      signal: controller.signal,
    });
  } catch {
    throw new PaymentInitializationUncertainError();
  } finally {
    window.clearTimeout(timeout);
  }
  let result: { message?: string; code?: string; errors?: Record<string, string[]>; data?: PublicWompiCheckout } | null;
  try {
    result = await response.json();
  } catch {
    if (response.ok) throw new PaymentInitializationUncertainError();
    result = null;
  }
  if (!response.ok) throw new PublicCheckoutError(result?.message ?? "No fue posible iniciar el pago.", result?.code, result?.errors ?? {});
  if (!result?.data) throw new PaymentInitializationUncertainError();
  return result.data;
};
