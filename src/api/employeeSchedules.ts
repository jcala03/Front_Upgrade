import { apiRequest } from "./http";
import type {
  EmployeeScheduleOverride,
  EmployeeScheduleOverridePayload,
  EmployeeSchedulePayload,
  EmployeeWorkSchedule,
  AvailabilityResult,
  WorkforcePaginator,
} from "../types/workforce";

type DataResponse<T> = { data: T; message?: string };

export type EmployeeScheduleFilters = {
  employee_id?: number;
  day_of_week?: number;
  effective_on?: string;
  page?: number;
  per_page?: number;
};

export type EmployeeScheduleOverrideFilters = {
  employee_id?: number;
  date?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
};

export type EmployeeAvailabilityFilters = {
  starts_at: string;
  ends_at: string;
  employee_ids?: readonly number[];
};

export const getEmployeeAvailability = async (filters: EmployeeAvailabilityFilters, signal?: AbortSignal) =>
  (await apiRequest<DataResponse<AvailabilityResult[]>>("/api/admin/employees/availability", { query: filters, signal })).data;

export const getEmployeeSchedules = async (filters: EmployeeScheduleFilters = {}, signal?: AbortSignal) =>
  (await apiRequest<DataResponse<WorkforcePaginator<EmployeeWorkSchedule>>>("/api/admin/employee-schedules", { query: filters, signal })).data;

export const createEmployeeSchedule = async (payload: EmployeeSchedulePayload) =>
  (await apiRequest<DataResponse<EmployeeWorkSchedule>>("/api/admin/employee-schedules", { method: "POST", body: payload })).data;

export const updateEmployeeSchedule = async (id: number, payload: Omit<EmployeeSchedulePayload, "employee_id">) =>
  (await apiRequest<DataResponse<EmployeeWorkSchedule>>(`/api/admin/employee-schedules/${id}`, { method: "PATCH", body: payload })).data;

export const deleteEmployeeSchedule = (id: number) =>
  apiRequest<unknown>(`/api/admin/employee-schedules/${id}`, { method: "DELETE" });

export const getEmployeeScheduleOverrides = async (filters: EmployeeScheduleOverrideFilters = {}, signal?: AbortSignal) =>
  (await apiRequest<DataResponse<WorkforcePaginator<EmployeeScheduleOverride>>>("/api/admin/employee-schedule-overrides", { query: filters, signal })).data;

export const createEmployeeScheduleOverride = async (payload: EmployeeScheduleOverridePayload) =>
  (await apiRequest<DataResponse<EmployeeScheduleOverride>>("/api/admin/employee-schedule-overrides", { method: "POST", body: payload })).data;

export const updateEmployeeScheduleOverride = async (id: number, payload: Omit<EmployeeScheduleOverridePayload, "employee_id">) =>
  (await apiRequest<DataResponse<EmployeeScheduleOverride>>(`/api/admin/employee-schedule-overrides/${id}`, { method: "PATCH", body: payload })).data;

export const deleteEmployeeScheduleOverride = (id: number) =>
  apiRequest<unknown>(`/api/admin/employee-schedule-overrides/${id}`, { method: "DELETE" });
