export type BusinessOverviewPeriod = {
  from: string;
  to: string;
  timezone: string;
};

export type BusinessOverviewEmployee = {
  id: number;
  name: string | null;
};

export type BusinessOverviewBranch = {
  id: number;
  code: string | null;
  name: string | null;
  city: string | null;
  is_active: boolean;
};

export type BusinessOverviewTopProduct = {
  product_id?: number | null;
  product_name: string | null;
  sku?: string | null;
  units: number | string | null;
};

export type BusinessOverviewScope = {
  sales_count: number | string | null;
  product_units: number | string | null;
  quotations_count: number | string | null;
  quotation_conversion_rate: number | string | null;
  customers_served: number | string | null;
  top_products: BusinessOverviewTopProduct[];
};

export type BusinessOverviewPersonalSales = {
  available: boolean;
  sales_count?: number | string | null;
  product_units?: number | string | null;
  sales_total?: number | string | null;
};

export type BusinessOverviewPersonalQuotations = {
  available: boolean;
  quotation_count?: number | string | null;
  converted_count?: number | string | null;
  conversion_rate?: number | string | null;
};

export type BusinessOverviewPersonalCommissions = {
  available: boolean;
  pending_amount?: number | string | null;
  earned_amount?: number | string | null;
  voided_amount?: number | string | null;
  earned_units?: number | string | null;
};

export type BusinessOverviewPersonal = {
  sales: BusinessOverviewPersonalSales;
  quotations: BusinessOverviewPersonalQuotations;
  commissions: BusinessOverviewPersonalCommissions;
};

export type BusinessOverviewResponse = {
  employee_linked: boolean;
  period: BusinessOverviewPeriod;
  employee: BusinessOverviewEmployee | null;
  branch: BusinessOverviewBranch | null;
  company: BusinessOverviewScope | null;
  my_branch: BusinessOverviewScope | null;
  personal: BusinessOverviewPersonal;
};

export type BusinessOverviewFilters = {
  from?: string;
  to?: string;
};
