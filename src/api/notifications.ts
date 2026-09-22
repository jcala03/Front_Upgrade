import type { CrmNotification, CrmNotificationFilter, CrmNotificationsResult } from "../types/notification";
import { handleInactiveAccountResponse } from "../utils/authStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type DataResponse<T> = { message?: string; data: T };

export const NOTIFICATION_COUNT_EVENT = "crm:notification-count";
export const announceNotificationCount = (count: number) => window.dispatchEvent(new CustomEvent<number>(NOTIFICATION_COUNT_EVENT, { detail: Math.max(0, count) }));

export class NotificationsApiError extends Error {
  constructor(message: string, public status: number, public errors: Record<string, string[]> = {}) {
    super(message);
    this.name = "NotificationsApiError";
  }
}

const getCookie = (name: string) => {
  const value = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`))?.split("=")[1];
  return value ? decodeURIComponent(value) : "";
};

const getCsrfCookie = async () => {
  const response = await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, { credentials: "include" });
  if (!response.ok) throw new NotificationsApiError("No se pudo preparar la sesión segura.", response.status);
};

const parseResponse = async <T,>(response: Response): Promise<T> => {
  const result = await response.json().catch(() => null);
  handleInactiveAccountResponse(response.status, result);
  if (response.status === 401) {
    window.location.href = "/login";
    throw new NotificationsApiError("Tu sesión ha terminado.", 401);
  }
  if (!response.ok) {
    const errors = (result?.errors ?? {}) as Record<string, string[]>;
    const message = Object.values(errors).flat()[0]
      ?? (response.status === 403 ? "No tienes permiso para realizar esta acción." : null)
      ?? (response.status === 404 ? "La notificación ya no está disponible." : null)
      ?? result?.message
      ?? "No se pudo completar la solicitud.";
    throw new NotificationsApiError(message, response.status, errors);
  }
  return result as T;
};

const request = async <T,>(path: string, init: RequestInit = {}, write = false): Promise<T> => {
  try {
    if (write) await getCsrfCookie();
    const token = getCookie("XSRF-TOKEN");
    return await parseResponse<T>(await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { "X-XSRF-TOKEN": token } : {}),
        ...init.headers,
      },
    }));
  } catch (cause) {
    if (cause instanceof NotificationsApiError) throw cause;
    throw new NotificationsApiError("No fue posible conectarse con el servidor.", 0);
  }
};

export const getNotifications = async ({ filter = "all", page = 1, perPage = 20 }: { filter?: CrmNotificationFilter; page?: number; perPage?: number } = {}) => {
  const query = new URLSearchParams({ filter, page: String(page), per_page: String(Math.min(100, Math.max(1, perPage))) });
  return (await request<DataResponse<CrmNotificationsResult>>(`/api/admin/notifications?${query}`)).data;
};

export const getUnreadNotificationCount = async () => {
  const result = await request<DataResponse<{ unread_count?: number; count?: number }>>("/api/admin/notifications/unread-count");
  return Number(result.data.unread_count ?? result.data.count ?? 0);
};
export const markNotificationAsRead = async (id: number) => (await request<DataResponse<CrmNotification>>(`/api/admin/notifications/${id}/read`, { method: "POST" }, true)).data;
export const markAllNotificationsAsRead = async () => (await request<DataResponse<{ unread_count: number }>>("/api/admin/notifications/read-all", { method: "POST" }, true)).data;
