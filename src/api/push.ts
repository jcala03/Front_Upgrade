import { API_BASE_URL } from "./apiConfig";
import { getCsrfCookie } from "./auth";
import { handleInactiveAccountResponse } from "../utils/authStorage";

export type DeviceSubscription = { id: number; endpoint_hash: string; is_active: boolean; expires_at: string | null };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (init.method && init.method !== "GET") {
    if (!navigator.onLine) throw new Error("Necesitas conexión para cambiar las notificaciones.");
    await getCsrfCookie();
  }
  const cookie = document.cookie.split("; ").find((item) => item.startsWith("XSRF-TOKEN="))?.slice("XSRF-TOKEN=".length);
  const response = await fetch(`${API_BASE_URL}/api/push${path}`, {
    ...init, credentials: "include", cache: "no-store",
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(cookie ? { "X-XSRF-TOKEN": decodeURIComponent(cookie) } : {}) },
  });
  const result = await response.json().catch(() => null);
  handleInactiveAccountResponse(response.status, result);
  if (!response.ok) throw new Error(response.status === 401 ? "Tu sesión terminó. Inicia sesión nuevamente." : result?.message ?? "No se pudo cambiar la suscripción del dispositivo.");
  return result.data as T;
}

export const pushConfig = () => request<{ enabled: boolean; public_key: string | null }>("/config");
export const deviceSubscriptions = () => request<DeviceSubscription[]>("/subscriptions");
export const saveSubscription = (subscription: PushSubscription) => request<DeviceSubscription>("/subscriptions", { method: "POST", body: JSON.stringify(subscription.toJSON()) });
export const removeSubscription = (id: number) => request<void>(`/subscriptions/${id}`, { method: "DELETE" });
