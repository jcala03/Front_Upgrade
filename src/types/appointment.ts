import type { Customer } from "./customer";
import type { Service } from "./service";
import type { EmployeeSummary } from "./workforce";
import type { BranchSummary } from "./branch";

export type AppointmentStatus = "requested" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
export type AppointmentSource = "crm" | "public_web";
export type AppointmentBranch = Pick<BranchSummary, "id" | "code" | "name">;
export type AppointmentEmployee = EmployeeSummary & { branch_id?: number | null; branch?: BranchSummary | null };
export type AppointmentCustomer = Pick<Customer, "id" | "name" | "phone" | "email">;
export type AppointmentVehicle = {
  id: number;
  customer_id: number;
  nickname: string | null;
  year: number | null;
  plate: string | null;
};
export type AppointmentService = Pick<Service, "id" | "name" | "is_active" | "estimated_duration_minutes">;

type AppointmentBase = {
  id: number;
  source: AppointmentSource;
  status: AppointmentStatus;
  title: string;
  description: string | null;
  contact_name: string;
  vehicle_description: string | null;
  service_name: string | null;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
};

export type AdminAppointment = AppointmentBase & {
  customer_id: number | null;
  customer_vehicle_id: number | null;
  service_id: number | null;
  responsible_employee_id: number | null;
  branch_id: number | null;
  contact_phone: string;
  contact_email: string | null;
  branch?: AppointmentBranch | null;
  responsible_employee?: AppointmentEmployee | null;
  customer?: AppointmentCustomer | null;
  customer_vehicle?: AppointmentVehicle | null;
  service?: AppointmentService | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  availability_override: boolean;
  availability_override_reason: string | null;
  availability_overridden_at: string | null;
};

export type MyAppointment = AppointmentBase & {
  branch_id?: number | null;
  branch?: AppointmentBranch | null;
  responsible_employee?: AppointmentEmployee | null;
};

export type AppointmentPaginator = {
  current_page: number;
  data: AdminAppointment[];
  last_page: number;
  per_page: number;
  total: number;
  from?: number | null;
  to?: number | null;
};

export type AppointmentFilters = {
  status?: AppointmentStatus;
  source?: AppointmentSource;
  responsible_employee_id?: number;
  customer_id?: number;
  customer_vehicle_id?: number;
  service_id?: number;
  branch_id?: number;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  per_page?: number;
};

export type CreateAppointmentPayload = {
  customer_id?: number | null;
  customer_vehicle_id?: number | null;
  service_id?: number | null;
  responsible_employee_id?: number | null;
  status?: Extract<AppointmentStatus, "requested" | "confirmed">;
  title: string;
  description?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  vehicle_description?: string | null;
  starts_at: string;
  ends_at: string;
  availability_override?: true;
  availability_override_reason?: string;
};

export type UpdateAppointmentPayload = Partial<Pick<CreateAppointmentPayload,
  | "customer_id"
  | "customer_vehicle_id"
  | "service_id"
  | "responsible_employee_id"
  | "title"
  | "description"
  | "contact_name"
  | "contact_phone"
  | "contact_email"
  | "vehicle_description"
  | "availability_override"
  | "availability_override_reason"
>>;

export type RescheduleAppointmentPayload = {
  starts_at: string;
  ends_at: string;
  availability_override?: true;
  availability_override_reason?: string;
};
