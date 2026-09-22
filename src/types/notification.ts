export type CrmNotificationType =
  | "stock_low"
  | "stock_out"
  | "order_ecommerce_pending"
  | "payment_received"
  | "quotation_expiring"
  | "quotation_converted"
  | "commission_earned";

export type CrmNotificationSeverity = "info" | "success" | "warning" | "danger";
export type CrmNotificationFilter = "all" | "unread";
export type CrmNotificationReference = "order" | "payment" | "quotation" | "product" | "product_variant";

export type CrmNotification = {
  id: number;
  type: CrmNotificationType | string;
  severity: CrmNotificationSeverity | string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  reference_type: CrmNotificationReference | string | null;
  reference_id: number | null;
  read_at: string | null;
  created_at: string;
};

export type CrmNotificationPaginator = {
  current_page: number;
  data: CrmNotification[];
  last_page: number;
  per_page: number;
  total: number;
};

export type CrmNotificationsResult = {
  unread_count: number;
  notifications: CrmNotificationPaginator;
};
