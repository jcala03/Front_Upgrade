import type { BranchSummary } from "./branch";

export type MyQuotationStatus = "draft" | "sent" | "rejected" | "expired" | "converted";
export type MySaleStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type MyPaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type MyPaymentMethod = "cash" | "transfer" | "card_terminal" | "wompi" | "other";
export type MyPaymentState = "unpaid" | "partial" | "paid" | "refunded";

export type MyCommercialCustomer = { id: number | null; name: string | null; email: string | null; phone: string | null; city: string | null };
export type MyCommercialVehicle = { customer_vehicle_id: number | null; brand_id: number | null; brand_name: string | null; model_id: number | null; model_name: string | null; version_id: number | null; version_name: string | null; year: number | null; plate: string | null; color: string | null };
export type MyCommercialSeller = { id: number; name: string };
export type MyLinkedOrder = { id: number; order_number: string; status: MySaleStatus };

export type MyCommercialItem = {
  id: number; item_type: "product" | "service"; product_id: number | null; product_variant_id: number | null; service_id: number | null;
  product_name: string | null; product_slug: string | null; product_sku: string | null; variant_name: string | null; variant_sku: string | null;
  variant_specs: Record<string, string | number | boolean | null> | null; service_name: string | null; service_description: string | null;
  unit_price: number; quantity: number; subtotal: number; discount_amount: number; total: number;
};

export type MyQuotation = {
  id: number; quotation_number: string; status: MyQuotationStatus; valid_until: string | null; branch: BranchSummary | null;
  sales_employee: MyCommercialSeller | null; customer: MyCommercialCustomer; vehicle: MyCommercialVehicle;
  subtotal: number; discount_total: number; total: number; notes: string | null; items_count: number | null;
  items?: MyCommercialItem[]; order: MyLinkedOrder | null; converted_at: string | null; created_at: string; updated_at: string;
};

export type MyPayment = { id: number; amount: number; method: MyPaymentMethod; status: MyPaymentStatus; provider: string | null; reference: string | null; paid_at: string | null; created_at: string };
export type MySale = {
  id: number; order_number: string; origin: "crm" | "ecommerce"; status: MySaleStatus; payment_status: MyPaymentState;
  branch: BranchSummary | null; sales_employee: MyCommercialSeller | null; customer: MyCommercialCustomer; vehicle: MyCommercialVehicle;
  subtotal: number; discount_total: number; total: number; items_count: number | null; payments_count: number | null;
  items?: MyCommercialItem[]; payments?: MyPayment[]; confirmed_at: string | null; completed_at: string | null; created_at: string; updated_at: string;
};

export type MyPaginator<T> = { current_page: number; data: T[]; last_page: number; per_page: number; total: number; from?: number | null; to?: number | null };
export type MyQuotationList = { employee_linked: boolean; quotations: MyPaginator<MyQuotation> | [] };
export type MySaleList = { employee_linked: boolean; sales: MyPaginator<MySale> | [] };
export type MyQuotationFilters = { search?: string; status?: MyQuotationStatus; date_from?: string; date_to?: string; page?: number; per_page?: number };
export type MySaleFilters = { search?: string; status?: MySaleStatus; date_from?: string; date_to?: string; page?: number; per_page?: number };

export type MyCommercialItemPayload = { item_type?: "product"; product_id: number; product_variant_id?: number | null; quantity: number; discount_amount?: number } | { item_type: "service"; service_id: number; quantity: number; discount_amount?: number };
export type MyCommercialDocumentPayload = {
  customer_id?: number | null;
  customer_vehicle_id?: number | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_city?: string | null;
  notes?: string | null;
  items: MyCommercialItemPayload[];
};
export type CreateMyQuotationPayload = MyCommercialDocumentPayload & { valid_until?: string | null };
export type UpdateMyQuotationPayload = CreateMyQuotationPayload;
export type CreateMySalePayload = MyCommercialDocumentPayload;
export type CreateOwnPaymentPayload = { amount: number; method: MyPaymentMethod; provider?: string | null; reference?: string | null; transaction_id?: string | null; notes?: string | null; paid_at?: string | null };
