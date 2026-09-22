import type { AdminCommission, AdminCommissionFilters, AdminCommissionList, MyCommissionFilters, MyCommissionList, MyCommissionSummary } from "../types/commission";
import { apiRequest } from "./http";

type Data<T> = { data: T };

export const listAdminCommissions = async (filters: AdminCommissionFilters = {}, signal?: AbortSignal) =>
  (await apiRequest<Data<AdminCommissionList>>("/api/admin/commissions", { query: filters, signal })).data;

export const getAdminCommission = async (id: number, signal?: AbortSignal) =>
  (await apiRequest<Data<AdminCommission>>(`/api/admin/commissions/${id}`, { signal })).data;

export const listMyCommissions = async (filters: MyCommissionFilters = {}, signal?: AbortSignal) =>
  (await apiRequest<Data<MyCommissionList>>("/api/my/commissions", { query: filters, signal })).data;

export const getMyCommissionSummary = async (signal?: AbortSignal) =>
  (await apiRequest<Data<MyCommissionSummary>>("/api/my/commissions/summary", { signal })).data;
