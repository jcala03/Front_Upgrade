import { apiRequest } from "./http";
import type {
  EmployeeLeave,
  EmployeeLeavePayload,
  EmployeeLeaveStatus,
  EmployeeLeaveType,
  WorkforcePaginator,
} from "../types/workforce";

type DataResponse<T> = { data: T; message?: string };

export type EmployeeLeaveFilters = {
  employee_id?: number;
  type?: EmployeeLeaveType;
  status?: EmployeeLeaveStatus;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
};

export const getEmployeeLeaves = async (filters: EmployeeLeaveFilters = {}, signal?: AbortSignal) =>
  (await apiRequest<DataResponse<WorkforcePaginator<EmployeeLeave>>>("/api/admin/employee-leaves", { query: filters, signal })).data;

export const getEmployeeLeave = async (id: number, signal?: AbortSignal) =>
  (await apiRequest<DataResponse<EmployeeLeave>>(`/api/admin/employee-leaves/${id}`, { signal })).data;

export const createEmployeeLeave = async (payload: EmployeeLeavePayload) =>
  (await apiRequest<DataResponse<EmployeeLeave>>("/api/admin/employee-leaves", { method: "POST", body: payload })).data;

export const updateEmployeeLeave = async (id: number, payload: EmployeeLeavePayload) =>
  (await apiRequest<DataResponse<EmployeeLeave>>(`/api/admin/employee-leaves/${id}`, { method: "PATCH", body: payload })).data;

export const cancelEmployeeLeave = async (id: number) =>
  (await apiRequest<DataResponse<EmployeeLeave>>(`/api/admin/employee-leaves/${id}/cancel`, { method: "POST" })).data;
