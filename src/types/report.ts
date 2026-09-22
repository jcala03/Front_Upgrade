export type ReportKind = "sales" | "products" | "payments" | "receivables" | "inventory" | "inventory-movements" | "quotations" | "customers";
export type ReportDirection = "asc" | "desc";
export type ReportFilterValue = string | number | undefined;
export type ReportFilters = Record<string, ReportFilterValue> & { page?: number; per_page?: number; sort?: string; direction?: ReportDirection };

export type ReportPeriod = { timezone: "America/Bogota" | string; date_from: string; date_to: string };
export type ReportBranch = { id: number; code: string; name: string };
export type ReportContext = { mode: "general" | "branch"; branch: ReportBranch | null };
export type ReportPaginator<T> = { current_page: number; data: T[]; last_page: number; per_page: number; total: number; from?: number | null; to?: number | null };
export type ReportFinancials = { revenue: number; known_cost_revenue: number; cogs: number; gross_profit_on_known_cost: number; gross_margin_percent: number | null; cost_coverage_percent: number };

export type SalesPoint = { date: string; orders_count: number; total: number };
export type SalesRow = { id: number; order_number: string; confirmed_at: string | null; origin: "crm" | "ecommerce"; status: string; payment_status: string; customer_id: number | null; customer_name: string; vehicle_summary: string | null; items_count: number; subtotal: number; discount_total: number; total: number; created_by: number | null; operator_name: string | null; quotation_id: number | null; branch: ReportBranch | null };
export type SalesReport = { context: ReportContext; period: ReportPeriod; summary: { orders_count: number; sales_total: number; average_ticket: number; discount_total: number }; breakdown: { crm: { orders_count: number; total: number }; ecommerce: { orders_count: number; total: number } }; by_day: SalesPoint[]; rows: ReportPaginator<SalesRow>; financials?: ReportFinancials };

export type ProductReportRow = { product_id: number | null; product_variant_id?: number | null; product_name: string; product_sku: string | null; variant_name?: string | null; variant_sku?: string | null; quantity: number; orders_count: number; revenue: number; discount_total: number; financials?: ReportFinancials };
export type ProductsReport = { context: ReportContext; period: ReportPeriod; group_by: "product" | "sku"; summary: { units_sold: number; revenue: number; discount_total: number; distinct_orders: number }; rows: ReportPaginator<ProductReportRow>; financials?: ReportFinancials };

export type PaymentMethod = "cash" | "transfer" | "card_terminal" | "wompi" | "other";
export type PaymentReportRow = { id: number; paid_at: string | null; order_id: number; order_number: string; amount: number; method: PaymentMethod | string; status: string; provider: string | null; reference: string | null; created_by: number | null; operator_name: string | null; branch_id: number | null; branch_code: string | null; branch_name: string | null };
export type PaymentsReport = { context: ReportContext; period: ReportPeriod; summary: { completed_amount: number; completed_count: number; by_method: Record<string, { amount: number; count: number }> }; rows: ReportPaginator<PaymentReportRow> };

export type ReceivableRow = { order_id: number; order_number: string; customer_id: number | null; customer_name: string; total: number; paid: number; outstanding: number; payment_status: string; confirmed_at: string | null; days_outstanding: number; created_by: number | null; operator_name: string | null; branch: ReportBranch | null };
export type ReceivablesReport = { context: ReportContext; period?: ReportPeriod; summary: { outstanding_total: number; orders_with_balance: number }; rows: ReportPaginator<ReceivableRow> };

export type InventoryRow = { type: "product" | "variant"; product_id: number; product_variant_id: number | null; name: string; sku: string | null; variant_name: string | null; stock: number; minimum_stock: number; status: "normal" | "low" | "out"; sale_price?: number; current_cost?: number; branch: ReportBranch };
export type InventoryReport = { context: ReportContext; summary: { units_count: number; normal_count: number; low_count: number; out_count: number; total_quantity: number; low_stock_branch_count: number }; rows: ReportPaginator<InventoryRow>; historical_reconciliation: boolean; stock_authority: "inventory_stocks" };

export type InventoryMovementRow = { id: number; created_at: string; type: string; product_id: number; product_variant_id: number | null; product_name: string; sku: string | null; variant_name: string | null; quantity_delta: number; stock_before: number; stock_after: number; created_by: number | null; operator_name: string | null; reference_type: string | null; reference_id: number | null; branch_id: number | null; branch_code: string | null; branch_name: string | null };
export type InventoryMovementsReport = { context: ReportContext; period: ReportPeriod; summary: { movements_count: number; units_in: number; units_out: number; by_type: Record<string, number> }; rows: ReportPaginator<InventoryMovementRow>; historical_reconciliation: boolean };

export type QuotationReportRow = { id: number; quotation_number: string; created_at: string; valid_until: string | null; status: string; customer_id: number | null; customer_name: string; vehicle_summary: string | null; total: number; created_by: number | null; operator_name: string | null; converted_at: string | null; converted_by: number | null; order_id: number | null; order_number: string | null; branch: ReportBranch | null };
export type QuotationsReport = { context: ReportContext; period: ReportPeriod; summary: { created_in_period: number; sent_in_period: number; converted_in_period: number; rejected_in_period: number; expired_in_period: number; resolved_in_period: number; conversion_rate_resolved: number | null; total_quoted_created_in_period: number; total_converted_in_period: number }; rows: ReportPaginator<QuotationReportRow> };

export type CustomerReportRow = { customer_id: number; name: string; is_active: boolean; created_at: string; orders_count: number; total_spent: number; average_ticket: number; last_purchase_at: string | null; vehicles_count: number };
export type CustomersReport = { context: ReportContext; period: ReportPeriod; summary: { registered_total: number; active_total: number; new_in_period: number; buyers_in_period: number; customers_served: number; registration_scope: "global" }; rows: ReportPaginator<CustomerReportRow>; purchase_metrics_scope: string; branch_semantics: "customers_with_commercial_activity" | "global_customer_registry" };

export type ReportResponseMap = { sales: SalesReport; products: ProductsReport; payments: PaymentsReport; receivables: ReceivablesReport; inventory: InventoryReport; "inventory-movements": InventoryMovementsReport; quotations: QuotationsReport; customers: CustomersReport };
export type AnyReport = ReportResponseMap[ReportKind];
