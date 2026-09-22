import type { DashboardCompareData, DashboardData } from "../types/dashboard";
import { apiRequest } from "./http";

type Data<T> = { data: T };

export const getDashboard = async (branchId?: number, signal?: AbortSignal) =>
  (await apiRequest<Data<DashboardData>>("/api/admin/dashboard", { query: { branch_id: branchId }, signal })).data;

export const compareDashboardBranches = async (branchIds: number[], signal?: AbortSignal) =>
  (await apiRequest<Data<DashboardCompareData>>("/api/admin/dashboard/compare", { query: { branch_ids: branchIds }, signal })).data;
