import type {
  CreateAdminOrderPayload,
  Order,
  OrderPaymentPayload,
  Payment,
  UpdateOrderStatusPayload,
} from "../types/order";
import { handleInactiveAccountResponse } from "../utils/authStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type OrdersResponse = { data: Order[] };
type OrderResponse = { message?: string; data: Order };
type PaymentResponse = { message: string; data: Payment; order: Order };

export class AdminOrdersApiError extends Error {
  constructor(message: string, public status: number, public errors: Record<string, string[]> = {}) {
    super(message);
    this.name = "AdminOrdersApiError";
  }
}

const getCookie = (name: string) => {
  const value = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`))?.split("=")[1];
  return value ? decodeURIComponent(value) : "";
};

const getCsrfCookie = async () => {
  const response = await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, { credentials: "include" });
  if (!response.ok) throw new AdminOrdersApiError("No se pudo preparar la sesión segura.", response.status);
};

const parseResponse = async <T,>(response: Response): Promise<T> => {
  const result = await response.json().catch(() => null);
  handleInactiveAccountResponse(response.status, result);
  if (response.status === 401) {
    window.location.href = "/login";
    throw new AdminOrdersApiError("Tu sesión ha terminado.", 401);
  }
  if (!response.ok) {
    const errors = (result?.errors ?? {}) as Record<string, string[]>;
    const firstValidation = Object.values(errors).flat()[0];
    throw new AdminOrdersApiError(firstValidation ?? result?.message ?? "No se pudo completar la solicitud.", response.status, errors);
  }
  return result as T;
};

const request = async <T,>(path: string, init: RequestInit = {}, write = false): Promise<T> => {
  if (write) await getCsrfCookie();
  const token = getCookie("XSRF-TOKEN");
  return parseResponse<T>(await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { "X-XSRF-TOKEN": token } : {}),
      ...init.headers,
    },
  }));
};

export const getAdminOrders = async () => (await request<OrdersResponse>("/api/admin/orders")).data;
export const getAdminOrder = async (id: number) => (await request<OrderResponse>(`/api/admin/orders/${id}`)).data;
export const createAdminOrder = async (payload: CreateAdminOrderPayload) => (await request<OrderResponse>("/api/admin/orders", { method: "POST", body: JSON.stringify(payload) }, true)).data;
export const updateAdminOrderStatus = async (id: number, payload: UpdateOrderStatusPayload) => (await request<OrderResponse>(`/api/admin/orders/${id}/status`, { method: "POST", body: JSON.stringify(payload) }, true)).data;
export const createAdminOrderPayment = async (id: number, payload: OrderPaymentPayload) => (await request<PaymentResponse>(`/api/admin/orders/${id}/payments`, { method: "POST", body: JSON.stringify(payload) }, true)).order;
