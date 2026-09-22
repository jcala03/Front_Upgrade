import { apiRequest } from "./http";
import type { MyTask, TaskPaginator, TaskPriority, TaskStatus } from "../types/task";

type DataResponse<T> = { data: T; message?: string };
type MyTasksListData = {
  employee_linked: boolean;
  tasks: TaskPaginator<MyTask> | MyTask[];
};

export type MyTaskFilters = {
  status?: TaskStatus;
  priority?: TaskPriority;
  due_from?: string;
  due_to?: string;
  page?: number;
  per_page?: number;
};

export type MyTasksResult = {
  employee_linked: boolean;
  tasks: TaskPaginator<MyTask>;
};

export const getMyTasks = async (filters: MyTaskFilters = {}, signal?: AbortSignal): Promise<MyTasksResult> => {
  const response = await apiRequest<DataResponse<MyTasksListData>>("/api/my/tasks", { query: filters, signal });
  const tasks = Array.isArray(response.data.tasks)
    ? {
      current_page: 1,
      data: response.data.tasks,
      last_page: 1,
      per_page: Math.max(20, response.data.tasks.length),
      total: response.data.tasks.length,
    }
    : response.data.tasks;

  return { employee_linked: response.data.employee_linked, tasks };
};

export const getMyTask = async (id: number, signal?: AbortSignal) =>
  (await apiRequest<DataResponse<MyTask>>(`/api/my/tasks/${id}`, { signal })).data;

export const startMyTask = async (id: number) =>
  (await apiRequest<DataResponse<MyTask>>(`/api/my/tasks/${id}/start`, { method: "POST" })).data;

export const completeMyTask = async (id: number) =>
  (await apiRequest<DataResponse<MyTask>>(`/api/my/tasks/${id}/complete`, { method: "POST" })).data;
