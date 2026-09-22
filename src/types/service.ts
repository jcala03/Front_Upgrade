import type { LaravelPaginator } from "./customer";

export type ServiceCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Service = {
  id: number;
  service_category_id: number;
  category?: ServiceCategory | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  cost: number | null;
  estimated_duration_minutes: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ServiceCategoryPayload = {
  name: string;
  description?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

export type ServicePayload = {
  service_category_id: number;
  name: string;
  description?: string | null;
  price: number;
  cost?: number | null;
  estimated_duration_minutes: number;
  is_active?: boolean;
  sort_order?: number;
};

export type ServiceFilters = {
  search?: string;
  service_category_id?: number;
  is_active?: boolean;
  sort?: "sort_order" | "name" | "price" | "estimated_duration_minutes" | "created_at";
  direction?: "asc" | "desc";
  page?: number;
  per_page?: number;
};

export type ServiceCategoryFilters = {
  search?: string;
  is_active?: boolean;
  sort?: "sort_order" | "name" | "created_at";
  direction?: "asc" | "desc";
  page?: number;
  per_page?: number;
};

export type ServicePaginator = LaravelPaginator<Service>;
export type ServiceCategoryPaginator = LaravelPaginator<ServiceCategory>;
