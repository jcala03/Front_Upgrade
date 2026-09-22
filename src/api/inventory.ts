import { apiRequest } from "./http";
import type { CreateInventoryTransferPayload, InventoryCatalog, InventoryMovement, InventoryMovementFilters, InventoryMovementPayload, InventoryStock, InventoryStockFilters, InventoryTransfer, InventoryTransferFilters, LaravelPaginator, UpdateInventoryMinimumPayload } from "../types/inventory";

type DataResponse<T> = { data: T; message?: string };

export const getInventoryCatalog = async (signal?: AbortSignal) =>
  (await apiRequest<DataResponse<InventoryCatalog>>("/api/admin/inventory", { signal })).data;
export const getInventoryStocks = async (filters: InventoryStockFilters = {}, signal?: AbortSignal) =>
  (await apiRequest<DataResponse<LaravelPaginator<InventoryStock>>>("/api/admin/inventory/stocks", { query: filters, signal })).data;
export const updateInventoryMinimum = async (payload: UpdateInventoryMinimumPayload) =>
  (await apiRequest<DataResponse<InventoryStock>>("/api/admin/inventory/stocks/minimum", { method: "PATCH", body: payload })).data;
export const getInventoryMovements = async (filters: InventoryMovementFilters = {}, signal?: AbortSignal) =>
  (await apiRequest<DataResponse<InventoryMovement[]>>("/api/admin/inventory/movements", { query: filters, signal })).data;
export const createInventoryMovement = async (payload: InventoryMovementPayload) =>
  (await apiRequest<DataResponse<InventoryMovement>>("/api/admin/inventory/movements", { method: "POST", body: payload })).data;
export const getInventoryTransfers = async (filters: InventoryTransferFilters = {}, signal?: AbortSignal) =>
  (await apiRequest<DataResponse<LaravelPaginator<InventoryTransfer>>>("/api/admin/inventory/transfers", { query: filters, signal })).data;
export const getInventoryTransfer = async (id: number, signal?: AbortSignal) =>
  (await apiRequest<DataResponse<InventoryTransfer>>(`/api/admin/inventory/transfers/${id}`, { signal })).data;
export const createInventoryTransfer = async (payload: CreateInventoryTransferPayload) =>
  apiRequest<DataResponse<InventoryTransfer>>("/api/admin/inventory/transfers", { method: "POST", body: payload });
export const dispatchInventoryTransfer = async (id: number) => apiRequest<DataResponse<InventoryTransfer>>(`/api/admin/inventory/transfers/${id}/dispatch`, { method: "POST" });
export const receiveInventoryTransfer = async (id: number) => apiRequest<DataResponse<InventoryTransfer>>(`/api/admin/inventory/transfers/${id}/receive`, { method: "POST" });
export const cancelInventoryTransfer = async (id: number, reason: string) => apiRequest<DataResponse<InventoryTransfer>>(`/api/admin/inventory/transfers/${id}/cancel`, { method: "POST", body: { reason } });
