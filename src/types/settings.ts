import type { AuthUser, UserRole } from "./auth";

export type BusinessSettings = {
  business_name: string;
  legal_name: string | null;
  tax_id: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
};

export type SalesSettings = {
  quotation_validity_days: number;
  order_notification_email: string | null;
};

export type SettingsData = {
  business: BusinessSettings;
  sales: SalesSettings;
  regional: { currency: "COP"; timezone: "America/Bogota" };
  updated_at: string | null;
  updated_by: Pick<AuthUser, "id" | "name"> | null;
};

export type UpdateSettingsPayload = {
  business: BusinessSettings;
  sales: SalesSettings;
};

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
};

export type UserPaginator = {
  current_page: number;
  data: AdminUser[];
  last_page: number;
  per_page: number;
  total: number;
};

export type UserFilters = {
  search?: string;
  role?: UserRole | "";
  is_active?: "" | "1" | "0";
  page?: number;
  per_page?: number;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: UserRole;
  is_active: boolean;
};

export type UpdateUserPayload = Partial<Pick<AdminUser, "name" | "email" | "role" | "is_active">>;
