import type { Product, ProductVariant, ProductVariantSpecs } from "./product";
import type { VehicleBrand, VehicleModel, VehicleVersion } from "./vehicle";
import type { Service } from "./service";

export type OrderStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type OrderPaymentStatus = "unpaid" | "partial" | "paid" | "refunded";
export type OrderOrigin = "ecommerce" | "crm";
export type PaymentMethod = "cash" | "transfer" | "card_terminal" | "wompi" | "other";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export type OrderUser = { id: number; name: string; email: string };

export type OrderItem = {
  id: number;
  order_id: number;
  product_id: number | null;
  product_variant_id: number | null;
  item_type: "product" | "service";
  service_id: number | null;
  service_name: string | null;
  service_description: string | null;
  product_name: string | null;
  product_slug: string | null;
  product_sku: string | null;
  variant_name: string | null;
  variant_sku: string | null;
  variant_specs: ProductVariantSpecs | null;
  unit_price: number;
  unit_cost: number | null;
  quantity: number;
  subtotal: number | null;
  discount_amount: number;
  total: number;
  created_at: string;
  updated_at: string;
  product?: Product | null;
  product_variant?: ProductVariant | null;
  service?: Service | null;
};

export type Payment = {
  id: number;
  order_id: number;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: string | null;
  reference: string | null;
  transaction_id: string | null;
  notes: string | null;
  paid_at: string | null;
  created_by: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  creator?: OrderUser | null;
};

export type OrderStatusHistory = {
  id: number;
  order_id: number;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: number | OrderUser | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
  changed_by_user?: OrderUser | null;
  changedBy?: OrderUser | null;
};

export type Order = {
  id: number;
  order_number: string;
  origin: OrderOrigin;
  user_id: number | null;
  created_by: number | null;
  cancelled_by: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_document: string | null;
  customer_city: string | null;
  customer_address: string | null;
  customer_notes: string | null;
  subtotal: number;
  discount_total: number;
  total: number;
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  payment_provider: string | null;
  payment_reference: string | null;
  payment_transaction_id: string | null;
  vehicle_brand_id: number | null;
  vehicle_model_id: number | null;
  vehicle_version_id: number | null;
  vehicle_year: number | null;
  vehicle_plate: string | null;
  vehicle_vin: string | null;
  vehicle_color: string | null;
  vehicle_notes: string | null;
  vehicle_brand_name: string | null;
  vehicle_model_name: string | null;
  vehicle_version_name: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  stock_committed_at: string | null;
  stock_reverted_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  payments?: Payment[];
  status_history?: OrderStatusHistory[];
  statusHistory?: OrderStatusHistory[];
  user?: OrderUser | null;
  creator?: OrderUser | null;
  canceller?: OrderUser | null;
  vehicle_brand?: VehicleBrand | null;
  vehicle_model?: VehicleModel | null;
  vehicle_version?: VehicleVersion | null;
};

export type CreateOrderPayload = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_city?: string;
  customer_address?: string;
  customer_notes?: string;
  items: { product_id: number; product_variant_id?: number | null; quantity: number }[];
};

export type PublicOrderItem = Pick<OrderItem, "id" | "item_type" | "product_id" | "product_variant_id" | "product_name" | "product_slug" | "product_sku" | "variant_name" | "variant_sku" | "variant_specs" | "quantity" | "unit_price" | "subtotal" | "discount_amount" | "total">;
export type PublicOrderCharge = { type: string; label: string; amount: number; currency: string };
export type PublicShippingAddress = { recipient_name: string; recipient_phone: string; country_code: string; state: string; city: string; postal_code: string; address_line1: string; address_line2?: string | null; delivery_notes?: string | null };
export type PublicShippingQuote = { quote_token: string; carrier: string | null; service: string; amount: number; currency: string; estimated_days_min: number | null; estimated_days_max: number | null; expires_at: string | null };
export type PublicOrder = { id: number; order_number: string; order_status: OrderStatus; payment_status: OrderPaymentStatus; fulfillment_type: "shipping" | "pickup"; currency: string; subtotal: number; discount_total: number; charges_total: number; total: number; items: PublicOrderItem[]; charges: PublicOrderCharge[]; shipping_address: PublicShippingAddress | null; created_at: string; stock_reservation_expires_at?: string | null; can_retry_payment?: boolean; ready_for_payment?: boolean };
export type PublicCheckoutStatus = { data: PublicOrder };
export type PublicWompiCheckout = { provider: "wompi"; checkout_url: string; public_key: string; amount_in_cents: number; currency: string; reference: string; integrity_signature: string; redirect_url: string; expiration_time: string };

export type AdminProductOrderItemPayload = {
  product_id: number;
  product_variant_id?: number | null;
  quantity: number;
  discount_amount?: number;
};

export type AdminServiceOrderItemPayload = {
  item_type: "service";
  service_id: number;
  quantity: number;
  discount_amount?: number;
};

export type AdminOrderItemPayload = AdminProductOrderItemPayload | AdminServiceOrderItemPayload;

export type OrderPaymentPayload = {
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
};

export type CreateAdminOrderPayload = {
  branch_id: number;
  sales_employee_id?: number | null;
  customer_id?: number | null;
  customer_vehicle_id?: number | null;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_document?: string;
  customer_city?: string;
  customer_address?: string;
  customer_notes?: string;
  vehicle_brand_id?: number | null;
  vehicle_model_id?: number | null;
  vehicle_version_id?: number | null;
  vehicle_year?: number;
  vehicle_plate?: string;
  vehicle_vin?: string;
  vehicle_color?: string;
  vehicle_notes?: string;
  items: AdminOrderItemPayload[];
  payment?: OrderPaymentPayload;
};

export type UpdateOrderStatusPayload = { status: OrderStatus; reason?: string };
