import { apiRequest } from "./http";
import type { CreateMySalePayload, CreateOwnPaymentPayload, MyPayment, MySale, MySaleFilters, MySaleList } from "../types/myCommerce";

type Data<T> = { data: T; message?: string };
type PaymentResponse = { data: MyPayment; sale: MySale; message: string };
export const listMySales = async (filters: MySaleFilters = {}, signal?: AbortSignal) => (await apiRequest<Data<MySaleList>>("/api/my/sales", { query: filters, signal })).data;
export const getMySale = async (id: number, signal?: AbortSignal) => (await apiRequest<Data<MySale>>(`/api/my/sales/${id}`, { signal })).data;
export const createMySale = async (payload: CreateMySalePayload) => (await apiRequest<Data<MySale>>("/api/my/sales", { method: "POST", body: payload })).data;
export const confirmMySale = async (id: number) => (await apiRequest<Data<MySale>>(`/api/my/sales/${id}/confirm`, { method: "POST" })).data;
export const completeMySale = async (id: number) => (await apiRequest<Data<MySale>>(`/api/my/sales/${id}/complete`, { method: "POST" })).data;
export const createMySalePayment = async (id: number, payload: CreateOwnPaymentPayload) => apiRequest<PaymentResponse>(`/api/my/sales/${id}/payments`, { method: "POST", body: payload });
