import type { EmployeeSummary, WorkforcePaginator } from "./workforce";

export type GoalSource = "personal" | "assigned";
export type GoalStatus = "active" | "completed" | "cancelled";
export type GoalEffectiveStatus = GoalStatus | "expired";
export type GoalMetricType = "manual";
export type DecimalValue = string | number;

export type GoalUserSummary = {
  id: number;
  name: string;
};

export type Goal = {
  id: number;
  employee_id?: number;
  employee?: EmployeeSummary | null;
  creator?: GoalUserSummary | null;
  updater?: GoalUserSummary | null;
  completer?: GoalUserSummary | null;
  canceller?: GoalUserSummary | null;
  source: GoalSource;
  title: string;
  description: string | null;
  metric_type: GoalMetricType;
  target_value: DecimalValue | null;
  current_value: DecimalValue;
  unit: string | null;
  progress_percentage: DecimalValue | null;
  starts_on: string | null;
  due_on: string | null;
  status: GoalStatus;
  effective_status: GoalEffectiveStatus;
  completed_at: string | null;
  completed_by?: number | null;
  cancelled_at: string | null;
  cancelled_by?: number | null;
  cancellation_reason?: string | null;
  is_overdue?: boolean;
  completed_after_due_date?: boolean;
  created_at: string;
  updated_at: string;
};

export type GoalPaginator<TGoal extends Goal = Goal> = WorkforcePaginator<TGoal>;

export type GoalFilters = {
  employee_id?: number;
  source?: GoalSource;
  status?: GoalEffectiveStatus;
  due_from?: string;
  due_to?: string;
  starts_from?: string;
  starts_to?: string;
  search?: string;
  page?: number;
  per_page?: number;
};

export type MyGoalsListData = {
  employee_linked: boolean;
  goals: GoalPaginator | Goal[];
};

export type MyGoalsResult = {
  employee_linked: boolean;
  goals: GoalPaginator;
};

export type GoalDefinitionPayload = {
  title: string;
  description: string | null;
  target_value: DecimalValue | null;
  unit: string | null;
  starts_on: string | null;
  due_on: string | null;
};

export type CreateAdminGoalPayload = GoalDefinitionPayload & {
  employee_id: number;
};

export type CreateMyGoalPayload = GoalDefinitionPayload;

export type UpdateAdminGoalPayload = Partial<GoalDefinitionPayload> & {
  employee_id?: number;
};

export type UpdateMyGoalPayload = Partial<GoalDefinitionPayload>;

export type GoalProgressPayload = {
  current_value: DecimalValue;
};

export type GoalCancelPayload = {
  cancellation_reason?: string | null;
};
