import type { Order } from "../types/order";
import type { Customer, CustomerPayload, CustomerVehicle, CustomerVehiclePayload, LaravelPaginator } from "../types/customer";
import { handleInactiveAccountResponse } from "../utils/authStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class CustomersApiError extends Error {
  constructor(message: string, public status: number, public errors: Record<string, string[]> = {}) {
    super(message);
    this.name = "CustomersApiError";
  }
}

const cookie = (name: string) => {
  const value = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`))?.split("=")[1];
  return value ? decodeURIComponent(value) : "";
};

const csrf = async () => {
  const response = await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, { credentials: "include" });
  if (!response.ok) throw new CustomersApiError("No se pudo preparar la sesión segura.", response.status);
};

const parse = async <T,>(response: Response): Promise<T> => {
  const result = await response.json().catch(() => null);
  handleInactiveAccountResponse(response.status, result);
  if (response.status === 401) {
    window.location.href = "/login";
    throw new CustomersApiError("Tu sesión ha terminado.", 401);
  }
  if (!response.ok) {
    const errors = (result?.errors ?? {}) as Record<string, string[]>;
    throw new CustomersApiError(Object.values(errors).flat()[0] ?? result?.message ?? "No se pudo completar la solicitud.", response.status, errors);
  }
  return result as T;
};

const request = async <T,>(path: string, init: RequestInit = {}, write = false) => {
  if (write) await csrf();
  const token = cookie("XSRF-TOKEN");
  return parse<T>(await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...(token ? { "X-XSRF-TOKEN": token } : {}), ...init.headers },
  }));
};

const query = (params: Record<string, string | number | undefined>) => {
  const values = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") values.set(key, String(value)); });
  return values.size ? `?${values}` : "";
};

type Data<T> = { data: T };
export const getCustomers = async (params: { search?: string; page?: number; per_page?: number } = {}) => (await request<Data<LaravelPaginator<Customer>>>(`/api/admin/customers${query(params)}`)).data;
export const getCustomer = async (id: number) => (await request<Data<Customer>>(`/api/admin/customers/${id}`)).data;
export const createCustomer = async (payload: CustomerPayload) => (await request<Data<Customer>>("/api/admin/customers", { method: "POST", body: JSON.stringify(payload) }, true)).data;
export const updateCustomer = async (id: number, payload: CustomerPayload) => (await request<Data<Customer>>(`/api/admin/customers/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, true)).data;
export const getCustomerVehicles = async (customerId: number) => (await request<Data<CustomerVehicle[]>>(`/api/admin/customers/${customerId}/vehicles`)).data;
export const getCustomerVehicle = async (customerId: number, vehicleId: number) => (await request<Data<CustomerVehicle>>(`/api/admin/customers/${customerId}/vehicles/${vehicleId}`)).data;
export const createCustomerVehicle = async (customerId: number, payload: CustomerVehiclePayload) => (await request<Data<CustomerVehicle>>(`/api/admin/customers/${customerId}/vehicles`, { method: "POST", body: JSON.stringify(payload) }, true)).data;
export const updateCustomerVehicle = async (customerId: number, vehicleId: number, payload: CustomerVehiclePayload) => (await request<Data<CustomerVehicle>>(`/api/admin/customers/${customerId}/vehicles/${vehicleId}`, { method: "PATCH", body: JSON.stringify(payload) }, true)).data;
export const getCustomerOrders = async (customerId: number, page = 1) => (await request<Data<LaravelPaginator<Order>>>(`/api/admin/customers/${customerId}/orders${query({ page })}`)).data;
export const getCustomerVehicleOrders = async (customerId: number, vehicleId: number, page = 1) => (await request<Data<LaravelPaginator<Order>>>(`/api/admin/customers/${customerId}/vehicles/${vehicleId}/orders${query({ page })}`)).data;
