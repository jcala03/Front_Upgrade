import type { Quotation, QuotationFilters, QuotationPaginator, QuotationPayload, QuotationStatus } from "../types/quotation";
import { handleInactiveAccountResponse } from "../utils/authStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
export class QuotationsApiError extends Error {
  constructor(message: string, public status: number, public errors: Record<string, string[]> = {}) { super(message); this.name = "QuotationsApiError"; }
}
const cookie = (name: string) => { const value = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`))?.split("=")[1]; return value ? decodeURIComponent(value) : ""; };
const csrf = async () => { const response = await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, { credentials: "include" }); if (!response.ok) throw new QuotationsApiError("No se pudo preparar la sesión segura.", response.status); };
const parse = async <T,>(response: Response): Promise<T> => {
  const result = await response.json().catch(() => null);
  handleInactiveAccountResponse(response.status, result);
  if (response.status === 401) { window.location.href = "/login"; throw new QuotationsApiError("Tu sesión ha terminado.", 401); }
  if (!response.ok) { const errors = (result?.errors ?? {}) as Record<string, string[]>; throw new QuotationsApiError(Object.values(errors).flat()[0] ?? result?.message ?? "No se pudo completar la solicitud.", response.status, errors); }
  return result as T;
};
const request = async <T,>(path: string, init: RequestInit = {}, write = false) => {
  if (write) await csrf(); const token = cookie("XSRF-TOKEN");
  return parse<T>(await fetch(`${API_BASE_URL}${path}`, { ...init, credentials: "include", headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...(token ? { "X-XSRF-TOKEN": token } : {}), ...init.headers } }));
};
const query = (params: QuotationFilters) => { const values = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") values.set(key, String(value)); }); return values.size ? `?${values}` : ""; };
type Data<T> = { message?: string; data: T };
export const getQuotations = async (params: QuotationFilters = {}) => (await request<Data<QuotationPaginator>>(`/api/admin/quotations${query(params)}`)).data;
export const getQuotation = async (id: number) => (await request<Data<Quotation>>(`/api/admin/quotations/${id}`)).data;
export const createQuotation = async (payload: QuotationPayload) => (await request<Data<Quotation>>("/api/admin/quotations", { method: "POST", body: JSON.stringify(payload) }, true)).data;
export const updateQuotation = async (id: number, payload: QuotationPayload) => (await request<Data<Quotation>>(`/api/admin/quotations/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, true)).data;
export const updateQuotationStatus = async (id: number, payload: { status: QuotationStatus; reason?: string }) => (await request<Data<Quotation>>(`/api/admin/quotations/${id}/status`, { method: "POST", body: JSON.stringify(payload) }, true)).data;
export const convertQuotation = async (id: number) => (await request<Data<Quotation>>(`/api/admin/quotations/${id}/convert`, { method: "POST" }, true)).data;
