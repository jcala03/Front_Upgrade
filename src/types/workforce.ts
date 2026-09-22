export type EmployeeSummary = {
  id: number;
  name: string;
  is_active: boolean;
  job_title?: string;
  specialty?: string | null;
};

export type WorkforceUserSummary = { id: number; name: string };

export type EmployeeWorkSchedule = {
  id: number;
  employee_id: number;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  effective_from: string;
  effective_until: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  employee?: EmployeeSummary;
};

export type EmployeeScheduleOverrideType = "working" | "non_working";

export type EmployeeScheduleOverride = {
  id: number;
  employee_id: number;
  date: string;
  type: EmployeeScheduleOverrideType;
  starts_at: string | null;
  ends_at: string | null;
  reason: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  employee?: EmployeeSummary;
};

export type EmployeeLeaveType = "vacation" | "permission" | "sick_leave" | "absence" | "other";
export type EmployeeLeaveStatus = "approved" | "cancelled";

export type EmployeeLeave = {
  id: number;
  employee_id: number;
  type: EmployeeLeaveType;
  starts_at: string;
  ends_at: string;
  status: EmployeeLeaveStatus;
  reason: string | null;
  notes?: string | null;
  approved_by: number | null;
  approved_at: string | null;
  cancelled_by: number | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  employee?: EmployeeSummary;
  approver?: WorkforceUserSummary | null;
  canceller?: WorkforceUserSummary | null;
};

export type WorkforcePaginator<T> = {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
};

export type EmployeeSchedulePayload = {
  employee_id: number;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  effective_from: string;
  effective_until: string | null;
};

export type EmployeeScheduleOverridePayload = {
  employee_id: number;
  date: string;
  type: EmployeeScheduleOverrideType;
  starts_at: string | null;
  ends_at: string | null;
  reason: string | null;
};

export type EmployeeLeavePayload = {
  employee_id: number;
  type: EmployeeLeaveType;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  notes: string | null;
};

export type AvailabilityReasonCode =
  | "inactive_employee"
  | "outside_work_schedule"
  | "no_work_schedule"
  | "approved_leave"
  | "task_overlap"
  | "appointment_overlap";

export type AvailabilityResult = {
  employee: Pick<EmployeeSummary, "id" | "name"> & Partial<Omit<EmployeeSummary, "id" | "name">>;
  available: boolean;
  reason_codes: AvailabilityReasonCode[];
};
