import type { QueryValue } from "../api/http";

export type CommissionStatus = "pending" | "earned" | "voided";

export type CommissionBranch = { id: number; code: string; name: string };
export type CommissionOrder = { id: number; order_number: string };
export type CommissionProductSnapshot = { id: number | null; name: string };
export type CommissionVariantSnapshot = { id: number | null; name: string | null };

type CommissionBase = {
  id: number;
  status: CommissionStatus;
  requires_review: boolean;
  branch: CommissionBranch | null;
  order: CommissionOrder | null;
  product: CommissionProductSnapshot;
  variant: CommissionVariantSnapshot | null;
  sku_snapshot: string | null;
  quantity: number;
  unit_commission: number;
  amount: number;
  earned_at: string | null;
  voided_at: string | null;
  created_at: string;
};

export type AdminCommission = CommissionBase & {
  employee: { id: number; name: string } | null;
  void_reason: string | null;
};

export type MyCommission = CommissionBase;

export type CommissionPaginator<T> = {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
};

export type AdminCommissionList = {
  commissions: CommissionPaginator<AdminCommission>;
  date_basis: "created_at" | "event";
};

export type MyCommissionList = {
  employee_linked: boolean;
  commissions: CommissionPaginator<MyCommission> | [];
  date_basis: "created_at" | "event";
};

export type MyCommissionSummary = {
  employee_linked: boolean;
  period: { from: string; to: string; timezone: "America/Bogota" };
  current_month: {
    pending_amount: number;
    earned_amount: number;
    voided_amount: number;
    total_rows: number;
    total_units: number;
  };
  totals: CommissionTotals;
  date_basis: { pending: "created_at"; earned: "earned_at"; voided: "voided_at" };
};

export type CommissionTotals = {
  earned_amount: number;
  pending_amount: number;
  voided_amount: number;
  review_amount: number;
  total_rows: number;
  total_units: number;
  earned_units: number;
  sales_count: number;
};

export type AdminCommissionSummary = Omit<MyCommissionSummary, "employee_linked"> & {
  by_employee: (CommissionTotals & { employee: { id: number; name: string } })[];
};

export type AdminCommissionFilters = {
  [key: string]: QueryValue;
  employee_id?: number;
  date_basis?: "event" | "created_at";
  branch_id?: number;
  status?: CommissionStatus;
  order_id?: number;
  product_id?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
};

export type MyCommissionFilters = {
  [key: string]: QueryValue;
  status?: CommissionStatus;
  date_basis?: "event" | "created_at";
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
};
