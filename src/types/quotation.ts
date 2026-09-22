import type { Customer, CustomerVehicle, LaravelPaginator } from "./customer";
import type { Order, OrderUser } from "./order";
import type { Product, ProductVariant, ProductVariantSpecs } from "./product";
import type { Service } from "./service";

export type QuotationStatus = "draft" | "sent" | "rejected" | "expired" | "converted";

export type QuotationItem = {
  id: number; quotation_id: number; product_id: number | null; product_variant_id: number | null;
  item_type: "product" | "service"; service_id: number | null; service_name: string | null; service_description: string | null;
  product_name: string | null; product_slug: string | null; product_sku: string | null;
  variant_name: string | null; variant_sku: string | null; variant_specs: ProductVariantSpecs | null;
  unit_price: number; unit_cost: number | null; quantity: number; subtotal: number;
  discount_amount: number; total: number; created_at: string; updated_at: string;
  product?: Product | null; product_variant?: ProductVariant | null; service?: Service | null;
};

export type QuotationStatusHistory = {
  id: number; quotation_id: number; from_status: QuotationStatus | null; to_status: QuotationStatus;
  changed_by: number | null; reason: string | null; created_at: string; updated_at: string;
  changed_by_user?: OrderUser | null; changedBy?: OrderUser | null;
};

export type Quotation = {
  id: number; quotation_number: string; status: QuotationStatus; valid_until: string | null;
  customer_id: number | null; customer_vehicle_id: number | null;
  customer_name: string | null; customer_email: string | null; customer_phone: string | null;
  customer_document: string | null; customer_city: string | null; customer_address: string | null;
  customer_notes: string | null; vehicle_brand_id: number | null; vehicle_model_id: number | null;
  vehicle_version_id: number | null; vehicle_year: number | null; vehicle_plate: string | null;
  vehicle_vin: string | null; vehicle_color: string | null; vehicle_notes: string | null;
  vehicle_brand_name: string | null; vehicle_model_name: string | null; vehicle_version_name: string | null;
  subtotal: number; discount_total: number; total: number; notes: string | null;
  created_by: number | null; updated_by: number | null; converted_by: number | null;
  converted_at: string | null; order_id: number | null; created_at: string; updated_at: string;
  items?: QuotationItem[]; customer?: Customer | null; customer_vehicle?: CustomerVehicle | null;
  customerVehicle?: CustomerVehicle | null; creator?: OrderUser | null; updater?: OrderUser | null;
  converter?: OrderUser | null; status_history?: QuotationStatusHistory[];
  statusHistory?: QuotationStatusHistory[]; order?: Order | null; items_count?: number;
};

export type QuotationItemPayload =
  | { product_id: number; product_variant_id?: number | null; quantity: number; discount_amount?: number }
  | { item_type: "service"; service_id: number; quantity: number; discount_amount?: number };
export type QuotationPayload = {
  valid_until?: string; customer_id?: number | null; customer_vehicle_id?: number | null;
  customer_name?: string; customer_email?: string; customer_phone?: string; customer_document?: string;
  customer_city?: string; customer_address?: string; customer_notes?: string;
  vehicle_brand_id?: number | null; vehicle_model_id?: number | null; vehicle_version_id?: number | null;
  vehicle_year?: number; vehicle_plate?: string; vehicle_vin?: string; vehicle_color?: string;
  vehicle_notes?: string; notes?: string; items: QuotationItemPayload[];
};
export type QuotationPaginator = LaravelPaginator<Quotation>;
export type QuotationFilters = { search?: string; status?: QuotationStatus; customer_id?: number; created_by?: number; page?: number; per_page?: number };
