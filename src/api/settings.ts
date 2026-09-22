import type { SettingsData, UpdateSettingsPayload } from "../types/settings";
import { handleInactiveAccountResponse } from "../utils/authStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class SettingsApiError extends Error {
  constructor(message: string, public status: number, public errors: Record<string, string[]> = {}) {
    super(message);
    this.name = "SettingsApiError";
  }
}

const cookie = (name: string) => {
  const value = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`))?.split("=")[1];
  return value ? decodeURIComponent(value) : "";
};

const request = async <T,>(path: string, init: RequestInit = {}, write = false): Promise<T> => {
  try {
    if (write) {
      const csrf = await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, { credentials: "include" });
      if (!csrf.ok) throw new SettingsApiError("No se pudo preparar la sesión segura.", csrf.status);
    }
    const token = cookie("XSRF-TOKEN");
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...(token ? { "X-XSRF-TOKEN": token } : {}), ...init.headers },
    });
    const result = await response.json().catch(() => null);
    handleInactiveAccountResponse(response.status, result);
    if (response.status === 401) {
      window.location.href = "/login";
      throw new SettingsApiError("Tu sesión ha terminado.", 401);
    }
    if (!response.ok) {
      const errors = (result?.errors ?? {}) as Record<string, string[]>;
      throw new SettingsApiError(Object.values(errors).flat()[0] ?? (response.status === 403 ? "No tienes permiso para realizar esta acción." : null) ?? result?.message ?? "No se pudo completar la solicitud.", response.status, errors);
    }
    return result as T;
  } catch (cause) {
    if (cause instanceof SettingsApiError) throw cause;
    throw new SettingsApiError("No pudimos conectar con el servidor. Intenta nuevamente.", 0);
  }
};

type Data<T> = { data: T; message?: string };

export const getSettings = async () => (await request<Data<SettingsData>>("/api/admin/settings")).data;
export const updateSettings = async (payload: UpdateSettingsPayload) => (await request<Data<SettingsData>>("/api/admin/settings", {
  method: "PATCH",
  body: JSON.stringify({ ...payload.business, ...payload.sales }),
}, true)).data;
