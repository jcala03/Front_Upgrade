import type { OrderOrigin, OrderPaymentStatus, OrderStatus } from "./order";
import type { QuotationStatus } from "./quotation";

export type DashboardPeriod = {
  timezone: string;
  generated_at: string;
  week_starts_on: "monday";
};

export type DashboardBranch = { id: number; code: string; name: string };
export type DashboardContext = { mode: "general" | "branch"; branch: DashboardBranch | null };

export type DashboardSalesPeriod = { total: number; orders_count: number };
export type DashboardSalesPoint = DashboardSalesPeriod & { date: string };

export type DashboardSales = {
  today: DashboardSalesPeriod;
  week: DashboardSalesPeriod;
  month: DashboardSalesPeriod;
  by_origin_month: { crm: number; ecommerce: number };
  last_30_days: DashboardSalesPoint[];
  product_units_month: number;
};

export type DashboardPayments = {
  received_today: number;
  received_month: number;
  outstanding: number;
  orders_with_balance: number;
};

export type DashboardQuotations = {
  open: number;
  expiring_soon: number;
  converted_month: number;
  conversion_rate: number | null;
  conversion_definition: string;
};

export type DashboardCustomers = {
  total: number;
  active: number;
  new_month: number;
  buyers_month: number;
};

export type DashboardInventory = {
  low_stock_count: number;
  out_of_stock_count: number;
};

export type DashboardRecentOrder = {
  id: number;
  order_number: string;
  customer_name: string;
  vehicle_summary: string | null;
  total: number;
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  origin: OrderOrigin;
  confirmed_at: string | null;
  items_count: number;
};

export type DashboardExpiringQuotation = {
  id: number;
  quotation_number: string;
  customer_name: string;
  vehicle_summary: string | null;
  total: number;
  status: QuotationStatus;
  valid_until: string;
};

export type DashboardStockItem = {
  type: "product" | "variant";
  product_id: number;
  product_variant_id: number | null;
  name: string;
  sku: string | null;
  variant_name: string | null;
  stock: number;
  minimum_stock: number;
  status: "low" | "out";
  branch: DashboardBranch;
};

export type DashboardTopProduct = {
  product_id: number | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  revenue: number;
};

export type DashboardFinancials = {
  revenue_month: number;
  known_cost_revenue_month: number;
  cogs_month: number;
  gross_profit_on_known_cost_month: number;
  gross_margin_percent: number | null;
  cost_coverage_percent: number;
};

export type DashboardData = {
  context: DashboardContext;
  period: DashboardPeriod;
  sales: DashboardSales;
  payments: DashboardPayments;
  quotations: DashboardQuotations;
  customers: DashboardCustomers;
  inventory: DashboardInventory;
  recent_orders: DashboardRecentOrder[];
  expiring_quotations: DashboardExpiringQuotation[];
  low_stock: DashboardStockItem[];
  top_products: DashboardTopProduct[];
  financials?: DashboardFinancials;
};

export type DashboardCompareBranch = {
  branch: DashboardBranch;
  sales_total: number;
  sales_count: number;
  average_ticket: number;
  product_units: number;
  quotations_count: number;
  conversion_rate: number | null;
  payments_received: number;
  receivables: number;
  customers_served: number;
  low_stock_positions: number;
};

export type DashboardCompareData = {
  period: { timezone: string; date_from: string; date_to: string; generated_at: string };
  branches: DashboardCompareBranch[];
};
