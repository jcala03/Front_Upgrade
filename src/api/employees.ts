import type { Employee, EmployeeFilters, EmployeePaginator, EmployeePayload, GrantEmployeeCrmAccessPayload } from "../types/employee";
import { handleInactiveAccountResponse } from "../utils/authStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class EmployeesApiError extends Error {
  constructor(message: string, public status: number, public errors: Record<string, string[]> = {}) {
    super(message);
    this.name = "EmployeesApiError";
  }
}

const cookie = (name: string) => decodeURIComponent(document.cookie.split("; ").find((row) => row.startsWith(`${name}=`))?.split("=")[1] ?? "");

const request = async <T,>(path: string, init: RequestInit = {}, write = false, signal?: AbortSignal): Promise<T> => {
  try {
    if (write) {
      const csrf = await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, { credentials: "include", signal });
      if (!csrf.ok) throw new EmployeesApiError("No se pudo preparar la sesión segura.", csrf.status);
    }
    const token = cookie("XSRF-TOKEN");
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { "X-XSRF-TOKEN": token } : {}),
        ...init.headers,
      },
    });
    const result = await response.json().catch(() => null);
    handleInactiveAccountResponse(response.status, result);
    if (response.status === 401) {
      window.location.href = "/login";
      throw new EmployeesApiError("Tu sesión ha terminado.", 401);
    }
    if (!response.ok) {
      const errors = (result?.errors ?? {}) as Record<string, string[]>;
      const message = Object.values(errors).flat()[0]
        ?? (response.status === 403 ? "No tienes permiso para realizar esta acción." : null)
        ?? (response.status === 404 ? "El empleado ya no está disponible." : null)
        ?? result?.message
        ?? "No se pudo completar la solicitud.";
      throw new EmployeesApiError(message, response.status, errors);
    }
    return result as T;
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    if (cause instanceof EmployeesApiError) throw cause;
    throw new EmployeesApiError("No pudimos conectar con el servidor. Intenta nuevamente.", 0);
  }
};

type Data<T> = { data: T; message?: string };

const query = (filters: EmployeeFilters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return params.size ? `?${params}` : "";
};

export const getEmployees = async (filters: EmployeeFilters = {}, signal?: AbortSignal) =>
  (await request<Data<EmployeePaginator>>(`/api/admin/employees${query(filters)}`, {}, false, signal)).data;

export const listAllEmployees = async (signal?: AbortSignal) => {
  const first = await getEmployees({ page: 1, per_page: 100, sort: "name", direction: "asc" }, signal);
  if (first.last_page <= 1) return first.data;
  const remaining = await Promise.all(Array.from({ length: first.last_page - 1 }, (_, index) =>
    getEmployees({ page: index + 2, per_page: 100, sort: "name", direction: "asc" }, signal).then((response) => response.data),
  ));
  return [first.data, ...remaining].flat();
};

export const getEmployee = async (id: number, signal?: AbortSignal) =>
  (await request<Data<Employee>>(`/api/admin/employees/${id}`, {}, false, signal)).data;

export const createEmployee = async (payload: EmployeePayload) =>
  (await request<Data<Employee>>("/api/admin/employees", { method: "POST", body: JSON.stringify(payload) }, true)).data;

export const updateEmployee = async (id: number, payload: Partial<EmployeePayload>) =>
  (await request<Data<Employee>>(`/api/admin/employees/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, true)).data;

export const deactivateEmployee = async (id: number) =>
  (await request<Data<Employee>>(`/api/admin/employees/${id}`, { method: "DELETE" }, true)).data;

export const grantEmployeeCrmAccess = async (id: number, payload: GrantEmployeeCrmAccessPayload) =>
  (await request<Data<Employee>>(`/api/admin/employees/${id}/crm-access`, { method: "POST", body: JSON.stringify(payload) }, true)).data;
