import type {
  Service,
  ServiceCategory,
  ServiceCategoryFilters,
  ServiceCategoryPaginator,
  ServiceCategoryPayload,
  ServiceFilters,
  ServicePaginator,
  ServicePayload,
} from "../types/service";
import { handleInactiveAccountResponse } from "../utils/authStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ServicesApiError extends Error {
  constructor(message: string, public status: number, public errors: Record<string, string[]> = {}) {
    super(message);
    this.name = "ServicesApiError";
  }
}

const cookie = (name: string) => {
  const value = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`))?.split("=")[1];
  return value ? decodeURIComponent(value) : "";
};

const csrf = async () => {
  const response = await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, { credentials: "include" });
  if (!response.ok) throw new ServicesApiError("No se pudo preparar la sesión segura.", response.status);
};

const parse = async <T,>(response: Response): Promise<T> => {
  const result = await response.json().catch(() => null);
  handleInactiveAccountResponse(response.status, result);
  if (response.status === 401) {
    window.location.href = "/login";
    throw new ServicesApiError("Tu sesión ha terminado.", 401);
  }
  if (!response.ok) {
    const errors = (result?.errors ?? {}) as Record<string, string[]>;
    throw new ServicesApiError(Object.values(errors).flat()[0] ?? result?.message ?? "No se pudo completar la solicitud.", response.status, errors);
  }
  return result as T;
};

const request = async <T,>(path: string, init: RequestInit = {}, write = false) => {
  if (write) await csrf();
  const token = cookie("XSRF-TOKEN");
  return parse<T>(await fetch(`${API_BASE_URL}${path}`, {
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

const query = (params: Record<string, string | number | boolean | undefined>) => {
  const values = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") values.set(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  });
  return values.size ? `?${values}` : "";
};

type Data<T> = { message?: string; data: T };

export const getServices = async (params: ServiceFilters = {}) =>
  (await request<Data<ServicePaginator>>(`/api/admin/services${query(params)}`)).data;
export const getService = async (id: number) =>
  (await request<Data<Service>>(`/api/admin/services/${id}`)).data;
export const createService = async (payload: ServicePayload) =>
  (await request<Data<Service>>("/api/admin/services", { method: "POST", body: JSON.stringify(payload) }, true)).data;
export const updateService = async (id: number, payload: Partial<ServicePayload>) =>
  (await request<Data<Service>>(`/api/admin/services/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, true)).data;
export const deactivateService = async (id: number) =>
  (await request<Data<Service>>(`/api/admin/services/${id}`, { method: "DELETE" }, true)).data;

export const getServiceCategories = async (params: ServiceCategoryFilters = {}) =>
  (await request<Data<ServiceCategoryPaginator>>(`/api/admin/service-categories${query(params)}`)).data;
export const createServiceCategory = async (payload: ServiceCategoryPayload) =>
  (await request<Data<ServiceCategory>>("/api/admin/service-categories", { method: "POST", body: JSON.stringify(payload) }, true)).data;
export const updateServiceCategory = async (id: number, payload: Partial<ServiceCategoryPayload>) =>
  (await request<Data<ServiceCategory>>(`/api/admin/service-categories/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, true)).data;
export const deactivateServiceCategory = async (id: number) =>
  (await request<Data<ServiceCategory>>(`/api/admin/service-categories/${id}`, { method: "DELETE" }, true)).data;
