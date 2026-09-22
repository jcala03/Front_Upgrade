import { apiRequest } from "./http";
import type { CreateMyQuotationPayload, MyQuotation, MyQuotationFilters, MyQuotationList, UpdateMyQuotationPayload } from "../types/myCommerce";

type Data<T> = { data: T; message?: string };
export const listMyQuotations = async (filters: MyQuotationFilters = {}, signal?: AbortSignal) => (await apiRequest<Data<MyQuotationList>>("/api/my/quotations", { query: filters, signal })).data;
export const getMyQuotation = async (id: number, signal?: AbortSignal) => (await apiRequest<Data<MyQuotation>>(`/api/my/quotations/${id}`, { signal })).data;
export const createMyQuotation = async (payload: CreateMyQuotationPayload) => (await apiRequest<Data<MyQuotation>>("/api/my/quotations", { method: "POST", body: payload })).data;
export const updateMyQuotation = async (id: number, payload: UpdateMyQuotationPayload) => (await apiRequest<Data<MyQuotation>>(`/api/my/quotations/${id}`, { method: "PATCH", body: payload })).data;
export const sendMyQuotation = async (id: number) => (await apiRequest<Data<MyQuotation>>(`/api/my/quotations/${id}/send`, { method: "POST" })).data;
export const convertMyQuotation = async (id: number) => (await apiRequest<Data<MyQuotation>>(`/api/my/quotations/${id}/convert`, { method: "POST" })).data;
