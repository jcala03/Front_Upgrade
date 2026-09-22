import type { EmployeeSummary } from "./workforce";

export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type Task = {
  id: number;
  assigned_employee_id: number;
  employee?: EmployeeSummary;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_at: string | null;
  scheduled_starts_at: string | null;
  scheduled_ends_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason?: string | null;
  availability_override?: boolean;
  availability_override_reason?: string | null;
  availability_overridden_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type MyTask = Omit<Task,
  | "assigned_employee_id"
  | "employee"
  | "availability_override"
  | "availability_override_reason"
  | "availability_overridden_at"
  | "cancellation_reason"
>;

export type TaskPayload = {
  assigned_employee_id: number;
  title: string;
  description: string | null;
  priority: TaskPriority;
  due_at: string | null;
  scheduled_starts_at: string | null;
  scheduled_ends_at: string | null;
  availability_override?: true;
  availability_override_reason?: string;
};

export type TaskUpdatePayload = Partial<TaskPayload>;

export type TaskPaginator<TTask extends Task | MyTask = Task> = {
  current_page: number;
  data: TTask[];
  last_page: number;
  per_page: number;
  total: number;
};
