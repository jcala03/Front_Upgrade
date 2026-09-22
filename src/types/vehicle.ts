export type VehicleMultimediaSystem = {
  id: number;
  vehicle_brand_id: number;
  name: string;
  slug: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  vehicle_brand?: VehicleBrand | null;
  vehicle_versions?: VehicleVersion[];
  pivot?: VehicleMultimediaSystemPivot;
};

export type VehicleMultimediaSystemPivot = {
  year_from: number | null;
  year_to: number | null;
};

export type VehicleVersion = {
  id: number;
  vehicle_model_id: number;
  name: string | null;
  year_from: number;
  year_to: number | null;
  description: string | null;
  is_active: boolean;
  display_name: string;
  created_at: string;
  updated_at: string;
  model?: VehicleModel | null;
  multimedia_systems?: VehicleMultimediaSystem[];
};

export type VehicleModel = {
  id: number;
  vehicle_brand_id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  brand?: VehicleBrand | null;
  versions?: VehicleVersion[];
};

export type VehicleBrand = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  models?: VehicleModel[];
  multimedia_systems?: VehicleMultimediaSystem[];
};

export type VehicleBrandPayload = {
  name: string;
  description: string | null;
  is_active: boolean;
};

export type VehicleModelPayload = {
  vehicle_brand_id: number;
  name: string;
  description: string | null;
  is_active: boolean;
};

export type VehicleVersionPayload = {
  vehicle_model_id: number;
  name: string | null;
  year_from: number;
  year_to: number | null;
  description: string | null;
  is_active: boolean;
};

export type VehicleVersionMultimediaSystemSyncItem = {
  vehicle_multimedia_system_id: number;
  year_from: number | null;
  year_to: number | null;
};

export type VehicleVersionMultimediaSystemsSyncPayload = {
  multimedia_systems: VehicleVersionMultimediaSystemSyncItem[];
};

export type VehicleMultimediaSystemPayload = {
  vehicle_brand_id: number;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
};
