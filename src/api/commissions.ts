import type { AdminCommission, AdminCommissionFilters, AdminCommissionList, MyCommissionFilters, MyCommissionList, MyCommissionSummary } from "../types/commission";
import { apiRequest } from "./http";
import type { AdminCommissionSummary } from "../types/commission";

type Data<T> = { data: T };

export const listAdminCommissions = async (filters: AdminCommissionFilters = {}, signal?: AbortSignal) =>
  (await apiRequest<Data<AdminCommissionList>>("/api/admin/commissions", { query: filters, signal })).data;

export const getAdminCommission = async (id: number, signal?: AbortSignal) =>
  (await apiRequest<Data<AdminCommission>>(`/api/admin/commissions/${id}`, { signal })).data;

export const listMyCommissions = async (filters: MyCommissionFilters = {}, signal?: AbortSignal) =>
  (await apiRequest<Data<MyCommissionList>>("/api/my/commissions", { query: filters, signal })).data;

export const getMyCommissionSummary = async (signal?: AbortSignal, filters: MyCommissionFilters = {}) =>
  (await apiRequest<Data<MyCommissionSummary>>("/api/my/commissions/summary", { signal, query: filters })).data;

export const getAdminCommissionSummary = async (filters: AdminCommissionFilters = {}, signal?: AbortSignal) =>
  (await apiRequest<Data<AdminCommissionSummary>>("/api/admin/commissions/summary", { signal, query: filters })).data;
