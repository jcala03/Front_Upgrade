import type { AppointmentStatus } from "./appointment";
import type { BranchSummary } from "./branch";
import type { TaskStatus } from "./task";

export type CalendarEventType = "appointment" | "task" | "leave" | "work_schedule" | "schedule_override";
export type CalendarEventStatus = AppointmentStatus | TaskStatus;

export type CalendarBranch = Pick<BranchSummary, "id" | "code" | "name"> & Partial<Pick<BranchSummary, "city" | "is_active">>;
export type CalendarEmployee = {
  id: number;
  name: string;
};

export type CalendarEventMetaValue = string | number | boolean | null;
export type CalendarEventMeta = Record<string, CalendarEventMetaValue | CalendarEventMetaValue[]>;

export type CalendarEvent = {
  id: string | number;
  type: CalendarEventType;
  source_id: number;
  title: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  status: CalendarEventStatus | string | null;
  employee: CalendarEmployee | null;
  branch: CalendarBranch | null;
  meta: CalendarEventMeta;
};

export type CalendarRange = {
  from: string;
  to: string;
};

export type CalendarFilters = CalendarRange & {
  branch_id?: number;
  employee_ids?: number[];
  types?: CalendarEventType[];
  statuses?: CalendarEventStatus[];
};

export type CalendarMeta = CalendarRange & {
  timezone: "America/Bogota" | string;
  event_count: number;
  employee_linked?: boolean;
};

export type CalendarResponse = {
  data: CalendarEvent[];
  meta: CalendarMeta;
};
