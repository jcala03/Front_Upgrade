import type { Order } from "./order";
import type { VehicleBrand, VehicleModel, VehicleVersion } from "./vehicle";

export type LaravelPaginator<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
  first_page_url?: string;
  last_page_url?: string;
  next_page_url?: string | null;
  prev_page_url?: string | null;
};

export type Customer = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  city: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  vehicles?: CustomerVehicle[];
  recent_orders?: Order[];
  recentOrders?: Order[];
  vehicles_count?: number;
  orders_count?: number;
};

export type CustomerVehicle = {
  id: number;
  customer_id: number;
  vehicle_brand_id: number | null;
  vehicle_model_id: number | null;
  vehicle_version_id: number | null;
  year: number | null;
  plate: string | null;
  vin: string | null;
  color: string | null;
  nickname: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  vehicle_brand?: VehicleBrand | null;
  vehicleBrand?: VehicleBrand | null;
  vehicle_model?: VehicleModel | null;
  vehicleModel?: VehicleModel | null;
  vehicle_version?: VehicleVersion | null;
  vehicleVersion?: VehicleVersion | null;
};

export type CustomerPayload = {
  name: string;
  phone?: string | null;
  email?: string | null;
  document?: string | null;
  city?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
};

export type CustomerVehiclePayload = {
  vehicle_brand_id?: number | null;
  vehicle_model_id?: number | null;
  vehicle_version_id?: number | null;
  year?: number | null;
  plate?: string | null;
  vin?: string | null;
  color?: string | null;
  nickname?: string | null;
  notes?: string | null;
  is_active?: boolean;
};
