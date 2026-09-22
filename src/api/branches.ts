import { apiRequest } from "./http";
import type { Branch, BranchPaginator, CreateBranchPayload, UpdateBranchPayload } from "../types/branch";

type DataResponse<T> = {
  data: T;
  message?: string;
};

export const listBranches = async (signal?: AbortSignal) =>
  (await apiRequest<DataResponse<BranchPaginator>>("/api/admin/branches", { signal })).data;

export const listAllBranches = async (signal?: AbortSignal) => {
  const first = (await apiRequest<DataResponse<BranchPaginator>>("/api/admin/branches", { query: { per_page: 100, page: 1 }, signal })).data;
  if ((first.last_page ?? 1) <= 1) return first.data;
  const remaining = await Promise.all(Array.from({ length: (first.last_page ?? 1) - 1 }, (_, index) =>
    apiRequest<DataResponse<BranchPaginator>>("/api/admin/branches", { query: { per_page: 100, page: index + 2 }, signal }).then((response) => response.data.data),
  ));
  return [first.data, ...remaining].flat();
};

export const getBranch = async (id: number, signal?: AbortSignal) =>
  (await apiRequest<DataResponse<Branch>>(`/api/admin/branches/${id}`, { signal })).data;

export const createBranch = async (payload: CreateBranchPayload) =>
  (await apiRequest<DataResponse<Branch>>("/api/admin/branches", {
    method: "POST",
    body: payload,
  })).data;

export const updateBranch = async (id: number, payload: UpdateBranchPayload) =>
  (await apiRequest<DataResponse<Branch>>(`/api/admin/branches/${id}`, {
    method: "PATCH",
    body: payload,
  })).data;
