import type { BranchSummary } from "./branch";

export type EmployeeUser = {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
};

export type Employee = {
  id: number;
  user_id: number | null;
  branch_id: number | null;
  branch: BranchSummary | null;
  name: string;
  phone: string | null;
  job_title: string;
  specialty: string | null;
  notes: string | null;
  is_active: boolean;
  hire_date: string | null;
  created_at: string;
  updated_at: string;
  user: EmployeeUser | null;
};

export type EmployeePayload = {
  user_id: number | null;
  branch_id: number | null;
  name: string;
  phone: string | null;
  job_title: string;
  specialty: string | null;
  notes: string | null;
  is_active: boolean;
  hire_date: string | null;
};

export type GrantEmployeeCrmAccessPayload = {
  email: string;
  password: string;
  password_confirmation: string;
};

export type EmployeeFilters = {
  search?: string;
  is_active?: "" | "1" | "0";
  job_title?: string;
  specialty?: string;
  linked_user?: "" | "1" | "0";
  branch_id?: number;
  sort?: "name" | "job_title" | "hire_date" | "created_at";
  direction?: "asc" | "desc";
  page?: number;
  per_page?: number;
};

export type EmployeePaginator = {
  current_page: number;
  data: Employee[];
  last_page: number;
  per_page: number;
  total: number;
};
