import type { Product, ProductVariant, ProductVariantCompatibility, ProductVehicleCompatibility } from "../../types/product";
import type { ProductCategoryField } from "../../types/productCategory";

// Narrow structural public contracts: no costs, margins, commissions or admin stock.
export type CompatibilityRow = Pick<ProductVariantCompatibility,
  "vehicle_brand_id" | "vehicle_model_id" | "vehicle_version_id"> &
  Partial<Pick<ProductVariantCompatibility, "vehicle_multimedia_system_id" | "year_from" | "year_to" |
    "vehicle_brand" | "vehicle_model" | "vehicle_version" | "vehicle_multimedia_system">>;
export type FieldDefinition = Pick<ProductCategoryField, "field_key" | "type" | "scope" | "filter_unit" | "is_active">;
export type ConfiguratorVariant = Pick<ProductVariant, "id" | "product_id" | "name" | "sku" | "price" | "stock" |
  "is_active" | "is_visible" | "compatibility_type" | "effective_compatibility_type" | "specs" | "image_url"> & {
    vehicle_compatibilities?: readonly CompatibilityRow[];
    spec_values?: readonly { field?: FieldDefinition | null }[];
  };
export type ConfiguratorProduct = Pick<Product, "id" | "slug" | "is_active" | "is_visible" |
  "has_variants" | "compatibility_type"> & {
    product_category?: { requires_oem_compatibility?: boolean; fields: readonly FieldDefinition[] } | null;
    vehicle_compatibilities?: readonly (Pick<ProductVehicleCompatibility,
      "vehicle_brand_id" | "vehicle_model_id" | "vehicle_version_id"> & Partial<CompatibilityRow>)[];
    variants?: readonly ConfiguratorVariant[];
  };

/** Passed explicitly by a future opt-in registration, never inferred from category/name/brand. */
export type ConfiguratorProfile = {
  id: string;
  compatibility: "vehicle_oem" | "vehicle" | "universal";
  ramKey: string;
  storageKey: string;
  unit: "GB";
  requireYear?: boolean;
};
export const MEMORY_OEM_PROFILE: Readonly<ConfiguratorProfile> = Object.freeze({
  id: "vehicle-oem-memory-v1", compatibility: "vehicle_oem", ramKey: "ram_gb", storageKey: "almacenamiento_gb", unit: "GB",
});
export type Selection = {
  vehicle_brand_id?: number | null;
  vehicle_model_id?: number | null;
  vehicle_version_id?: number | null;
  vehicle_multimedia_system_id?: number | null;
  year?: number | null;
  ram_gb?: number | string | null;
  almacenamiento_gb?: number | string | null;
  variant_id?: number | null;
};
export type Coverage = "unknown" | "filtered" | "complete_public";
export type CatalogSnapshot = {
  status: "idle" | "loading" | "ready" | "error";
  requestKey: string;
  slug: string;
  coverage: Coverage;
  product: ConfiguratorProduct | null;
};
export type Issue = { code: string; variant_id?: number; field?: string };
export type Availability = {
  stock: number | null;
  state: "available" | "out_of_stock" | "unavailable" | "unknown";
  source: "public_aggregate";
  provisional: true;
  requiresFulfillmentValidation: true;
};
export type Candidate = {
  product_id: number;
  variant_id: number;
  name: string;
  sku: string | null;
  price: number;
  image_url: string | null;
  ram_gb: number | null;
  almacenamiento_gb: number | null;
  availability: Availability;
};
export type OptionAvailability = { variant_ids: number[]; available_variant_ids: number[] };
export type VehicleOption = OptionAvailability & {
  vehicle_brand_id: number;
  vehicle_model_id: number;
  vehicle_version_id: number;
  year_from: number | null;
  year_to: number | null;
  year_range_known: boolean;
};
export type OemOption = OptionAvailability & { vehicle_multimedia_system_id: number; name: string | null };
export type MemoryOption = OptionAvailability & { ram_gb: number; almacenamiento_gb: number };
export type ResolutionStatus = "not_applicable" | "incomplete" | "nonexistent" | "out_of_stock" |
  "unavailable" | "insufficient_data" | "ambiguous" | "valid";
export type Resolution = {
  status: ResolutionStatus;
  reasons: Issue[];
  candidates: Candidate[];
  variant: Candidate | null;
  canSelectForPurchase: boolean;
  options: { vehicles: VehicleOption[]; oems: OemOption[]; memories: MemoryOption[] };
  // Always return IDs/SKU/name/price/image for an explicit extra selector; never pick the first.
  differentiators: Candidate[];
  coverage: Coverage;
};
export type ResolverInput = {
  profile: ConfiguratorProfile | null;
  snapshot: CatalogSnapshot;
  expectedRequestKey: string;
  selection: Selection;
};
