import { apiRequest } from "./http";
import type {
  CreateAdminGoalPayload,
  CreateMyGoalPayload,
  Goal,
  GoalCancelPayload,
  GoalFilters,
  GoalPaginator,
  GoalProgressPayload,
  MyGoalsListData,
  MyGoalsResult,
  UpdateAdminGoalPayload,
  UpdateMyGoalPayload,
} from "../types/goal";

type DataResponse<T> = { data: T; message?: string };

const normalizePaginator = (goals: GoalPaginator | Goal[], perPage = 25): GoalPaginator => Array.isArray(goals)
  ? {
    current_page: 1,
    data: goals,
    last_page: 1,
    per_page: Math.max(perPage, goals.length),
    total: goals.length,
  }
  : goals;

export const getGoals = async (filters: GoalFilters = {}, signal?: AbortSignal) =>
  (await apiRequest<DataResponse<GoalPaginator>>("/api/admin/goals", { query: filters, signal })).data;

export const createGoal = async (payload: CreateAdminGoalPayload) =>
  (await apiRequest<DataResponse<Goal>>("/api/admin/goals", { method: "POST", body: payload })).data;

export const getGoal = async (id: number, signal?: AbortSignal) =>
  (await apiRequest<DataResponse<Goal>>(`/api/admin/goals/${id}`, { signal })).data;

export const updateGoal = async (id: number, payload: UpdateAdminGoalPayload) =>
  (await apiRequest<DataResponse<Goal>>(`/api/admin/goals/${id}`, { method: "PATCH", body: payload })).data;

export const updateGoalProgress = async (id: number, payload: GoalProgressPayload) =>
  (await apiRequest<DataResponse<Goal>>(`/api/admin/goals/${id}/progress`, { method: "POST", body: payload })).data;

export const completeGoal = async (id: number) =>
  (await apiRequest<DataResponse<Goal>>(`/api/admin/goals/${id}/complete`, { method: "POST" })).data;

export const cancelGoal = async (id: number, payload: GoalCancelPayload) =>
  (await apiRequest<DataResponse<Goal>>(`/api/admin/goals/${id}/cancel`, { method: "POST", body: payload })).data;

export const getMyGoals = async (filters: Omit<GoalFilters, "employee_id" | "starts_from" | "starts_to"> = {}, signal?: AbortSignal): Promise<MyGoalsResult> => {
  const response = await apiRequest<DataResponse<MyGoalsListData>>("/api/my/goals", { query: filters, signal });
  return {
    employee_linked: response.data.employee_linked,
    goals: normalizePaginator(response.data.goals, filters.per_page ?? 25),
  };
};

export const createMyGoal = async (payload: CreateMyGoalPayload) =>
  (await apiRequest<DataResponse<Goal>>("/api/my/goals", { method: "POST", body: payload })).data;

export const getMyGoal = async (id: number, signal?: AbortSignal) =>
  (await apiRequest<DataResponse<Goal>>(`/api/my/goals/${id}`, { signal })).data;

export const updateMyGoal = async (id: number, payload: UpdateMyGoalPayload) =>
  (await apiRequest<DataResponse<Goal>>(`/api/my/goals/${id}`, { method: "PATCH", body: payload })).data;

export const updateMyGoalProgress = async (id: number, payload: GoalProgressPayload) =>
  (await apiRequest<DataResponse<Goal>>(`/api/my/goals/${id}/progress`, { method: "POST", body: payload })).data;

export const completeMyGoal = async (id: number) =>
  (await apiRequest<DataResponse<Goal>>(`/api/my/goals/${id}/complete`, { method: "POST" })).data;

export const cancelMyGoal = async (id: number, payload: GoalCancelPayload = {}) =>
  (await apiRequest<DataResponse<Goal>>(`/api/my/goals/${id}/cancel`, { method: "POST", body: payload })).data;
