import type { AdminUser, CreateUserPayload, UpdateUserPayload, UserFilters, UserPaginator } from "../types/settings";
import { SettingsApiError } from "./settings";
import { handleInactiveAccountResponse } from "../utils/authStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const cookie = (name: string) => decodeURIComponent(document.cookie.split("; ").find((row) => row.startsWith(`${name}=`))?.split("=")[1] ?? "");

const request = async <T,>(path: string, init: RequestInit = {}, write = false, signal?: AbortSignal): Promise<T> => {
  try {
    if (write) {
      const csrf = await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, { credentials: "include", signal });
      if (!csrf.ok) throw new SettingsApiError("No se pudo preparar la sesión segura.", csrf.status);
    }
    const token = cookie("XSRF-TOKEN");
    const response = await fetch(`${API_BASE_URL}${path}`, { ...init, signal, credentials: "include", headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...(token ? { "X-XSRF-TOKEN": token } : {}), ...init.headers } });
    const result = await response.json().catch(() => null);
    handleInactiveAccountResponse(response.status, result);
    if (response.status === 401) { window.location.href = "/login"; throw new SettingsApiError("Tu sesión ha terminado.", 401); }
    if (!response.ok) {
      const errors = (result?.errors ?? {}) as Record<string, string[]>;
      throw new SettingsApiError(Object.values(errors).flat()[0] ?? (response.status === 403 ? "No tienes permiso para gestionar usuarios." : null) ?? result?.message ?? "No se pudo completar la solicitud.", response.status, errors);
    }
    return result as T;
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    if (cause instanceof SettingsApiError) throw cause;
    throw new SettingsApiError("No pudimos conectar con el servidor. Intenta nuevamente.", 0);
  }
};

type Data<T> = { data: T; message?: string };
const query = (filters: UserFilters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  return params.size ? `?${params}` : "";
};

export const getUsers = async (filters: UserFilters = {}, signal?: AbortSignal) => (await request<Data<UserPaginator>>(`/api/admin/users${query(filters)}`, {}, false, signal)).data;
export const createUser = async (payload: CreateUserPayload) => (await request<Data<AdminUser>>("/api/admin/users", { method: "POST", body: JSON.stringify(payload) }, true)).data;
export const updateUser = async (id: number, payload: UpdateUserPayload) => (await request<Data<AdminUser>>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, true)).data;
