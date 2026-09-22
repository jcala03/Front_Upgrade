import type { BranchSummary } from "./branch";

export type UserRole = "admin" | "user";

export type AuthEmployeeContext = {
  id: number;
  name: string;
  branch_id: number | null;
  branch: BranchSummary | null;
};

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  employee?: AuthEmployeeContext | null;
};

export type LoginResponse = {
  message: string;
  user: AuthUser;
};

export type MeResponse = {
  user: AuthUser;
};
