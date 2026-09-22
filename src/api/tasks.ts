import { apiRequest } from "./http";
import type { Task, TaskPaginator, TaskPayload, TaskPriority, TaskStatus, TaskUpdatePayload } from "../types/task";

type DataResponse<T> = { data: T; message?: string };

export type AdminTaskFilters = {
  employee_id?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_from?: string;
  due_to?: string;
  scheduled_from?: string;
  scheduled_to?: string;
  search?: string;
  page?: number;
  per_page?: number;
};

export const getTasks = async (filters: AdminTaskFilters = {}, signal?: AbortSignal) =>
  (await apiRequest<DataResponse<TaskPaginator>>("/api/admin/tasks", { query: filters, signal })).data;

export const createTask = async (payload: TaskPayload) =>
  (await apiRequest<DataResponse<Task>>("/api/admin/tasks", { method: "POST", body: payload })).data;

export const getTask = async (id: number, signal?: AbortSignal) =>
  (await apiRequest<DataResponse<Task>>(`/api/admin/tasks/${id}`, { signal })).data;

export const updateTask = async (id: number, payload: TaskUpdatePayload) =>
  (await apiRequest<DataResponse<Task>>(`/api/admin/tasks/${id}`, { method: "PATCH", body: payload })).data;

export const startTask = async (id: number) =>
  (await apiRequest<DataResponse<Task>>(`/api/admin/tasks/${id}/start`, { method: "POST" })).data;

export const completeTask = async (id: number) =>
  (await apiRequest<DataResponse<Task>>(`/api/admin/tasks/${id}/complete`, { method: "POST" })).data;

export const cancelTask = async (id: number, cancellationReason: string) =>
  (await apiRequest<DataResponse<Task>>(`/api/admin/tasks/${id}/cancel`, {
    method: "POST",
    body: { reason: cancellationReason },
  })).data;
