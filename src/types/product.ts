import type { ProductBrand } from "./productBrand";
import type {
  ProductCategory,
  ProductCategoryField,
} from "./productCategory";
import type {
  VehicleBrand,
  VehicleModel,
  VehicleMultimediaSystem,
  VehicleVersion,
} from "./vehicle";

export type ProductStockStatus =
  | "available"
  | "low_stock"
  | "out_of_stock";

export type ProductPricingMode =
  | "manual"
  | "markup"
  | "margin";

export type ProductCompatibilityType =
  | "universal"
  | "vehicle_specific";

export type ProductTechnicalSpecs = Record<
  string,
  string | number | boolean | null
>;

export type ProductVariantAttributes = Record<
  string,
  string | number | boolean | null
>;

export type ProductVariantSpecs = ProductTechnicalSpecs;

export type ProductSpecValue = {
  id: number;
  product_id: number;
  product_category_field_id: number;
  value_text: string | null;
  value_number: string | number | null;
  value_boolean: boolean | null;
  created_at: string;
  updated_at: string;
  field?: ProductCategoryField | null;
};

export type ProductVehicleCompatibility = {
  id: number;
  product_id: number;
  vehicle_brand_id: number;
  vehicle_model_id: number | null;
  vehicle_version_id: number | null;
  notes: string | null;
  vehicle_label: string;
  created_at: string;
  updated_at: string;
  vehicle_brand?: VehicleBrand | null;
  vehicle_model?: VehicleModel | null;
  vehicle_version?: VehicleVersion | null;
};

export type ProductVehicleCompatibilityPayload = {
  vehicle_brand_id: number;
  vehicle_model_id: number | null;
  vehicle_version_id: number | null;
  notes: string | null;
};

export type ProductVariantSpecValue = {
  id: number;
  product_variant_id: number;
  product_category_field_id: number;
  value_text: string | null;
  value_number: string | number | null;
  value_boolean: boolean | null;
  created_at: string;
  updated_at: string;
  field?: ProductCategoryField | null;
};

export type ProductVariantCompatibility = {
  id: number;
  product_variant_id: number;
  vehicle_brand_id: number;
  vehicle_model_id: number | null;
  vehicle_version_id: number | null;
  vehicle_multimedia_system_id: number | null;
  year_from: number | null;
  year_to: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vehicle_brand?: VehicleBrand | null;
  vehicle_model?: VehicleModel | null;
  vehicle_version?: VehicleVersion | null;
  vehicle_multimedia_system?: VehicleMultimediaSystem | null;
};

export type ProductVariantCompatibilityPayload = {
  vehicle_brand_id: number;
  vehicle_model_id: number | null;
  vehicle_version_id: number | null;
  vehicle_multimedia_system_id: number | null;
  year_from: number | null;
  year_to: number | null;
  notes: string | null;
};

export type ProductVariant = {
  id: number;
  product_id: number;
  vehicle_multimedia_system_id: number | null;
  compatibility_type: ProductCompatibilityType | null;
  effective_compatibility_type: ProductCompatibilityType | null;

  name: string;
  normalized_name: string;
  display_name: string;
  sku: string | null;
  attributes: ProductVariantAttributes | null;
  specs: ProductVariantSpecs;
  spec_values?: ProductVariantSpecValue[];
  vehicle_compatibilities?: ProductVariantCompatibility[];

  cost_price: number;
  tax_amount: number;
  extra_charges: number;
  total_cost: number;

  price: number;
  profit_amount: number;
  profit_margin_percent: string | number;
  markup_percent: string | number;
  pricing_mode: ProductPricingMode;
  target_profit_percent: string | number | null;

  stock: number;
  initial_stock: number;
  minimum_stock: number;

  main_image: string | null;
  image_url: string | null;

  is_default: boolean;
  is_active: boolean;
  is_visible: boolean;
  sort_order: number;

  stock_status: ProductStockStatus;
  is_low_stock: boolean;

  created_at: string;
  updated_at: string;

  vehicle_multimedia_system?: VehicleMultimediaSystem | null;
};

/** Variante del catálogo administrativo, sin stock operacional. */
export type AdminProductVariant = Omit<
  ProductVariant,
  | "stock"
  | "initial_stock"
  | "minimum_stock"
  | "stock_status"
  | "is_low_stock"
>;

export type ProductVariantPayload = {
  id?: number;
  vehicle_multimedia_system_id: number | null;
  compatibility_type?: ProductCompatibilityType | null;

  name: string;
  sku: string | null;
  attributes: ProductVariantAttributes | null;
  specs?: ProductVariantSpecs;
  vehicle_compatibilities?: ProductVariantCompatibilityPayload[];

  cost_price: number;
  tax_amount: number;
  extra_charges: number;
  price: number;
  pricing_mode: ProductPricingMode;
  target_profit_percent: number | null;

  main_image: string | null;

  is_default: boolean;
  is_active: boolean;
  is_visible: boolean;
  sort_order: number;
};

export type Product = {
  id: number;

  name: string;
  normalized_name: string;
  slug: string;
  description: string | null;

  category: string | null;
  category_id: number | null;
  product_category: ProductCategory | null;

  product_brand_id: number | null;
  product_brand: ProductBrand | null;

  compatibility_type: ProductCompatibilityType | null;
  is_universal: boolean;

  sku: string | null;

  price: number;
  cost_price: number;
  tax_amount: number;
  extra_charges: number;
  total_cost: number;
  profit_amount: number;
  profit_margin_percent: string | number;
  markup_percent: string | number;
  pricing_mode: ProductPricingMode;
  target_profit_percent: string | number | null;

  stock: number;
  initial_stock: number;
  minimum_stock: number;

  technical_specs: ProductTechnicalSpecs | null;
  spec_values?: ProductSpecValue[];

  vehicle_compatibilities?: ProductVehicleCompatibility[];
  variants?: ProductVariant[];

  main_image: string | null;
  image_url: string | null;

  is_visible: boolean;
  is_featured: boolean;
  is_active: boolean;

  stock_status: ProductStockStatus;
  is_low_stock: boolean;

  has_variants: boolean;
  lowest_variant_price: number | null;
  total_variant_stock: number | null;
  variants_count?: number;

  created_at: string;
  updated_at: string;
};

/** Contrato del catálogo administrativo, separado del stock público. */
export type AdminProduct = Omit<
  Product,
  | "stock"
  | "initial_stock"
  | "minimum_stock"
  | "stock_status"
  | "is_low_stock"
  | "total_variant_stock"
  | "variants"
> & {
  variants?: AdminProductVariant[];
  commission_enabled: boolean;
  commission_amount: number | null;
};

export type ProductCommissionPayload = {
  commission_enabled: boolean;
  commission_amount: number | null;
};

export type ProductPayload = {
  name: string;
  description: string | null;

  category: string | null;
  category_id: number | null;
  product_brand_id: number | null;

  /**
   * Se mantiene opcional porque las actualizaciones parciales del API
   * pueden omitir este campo. El formulario de Inventario sí lo enviará
   * explícitamente al crear o editar un artículo.
   */
  compatibility_type?: ProductCompatibilityType | null;

  sku: string | null;

  price: number;
  cost_price: number;
  tax_amount: number;
  extra_charges: number;
  pricing_mode: ProductPricingMode;
  target_profit_percent: number | null;

  technical_specs: ProductTechnicalSpecs;

  vehicle_compatibilities: ProductVehicleCompatibilityPayload[];
  variants: ProductVariantPayload[];

  main_image: string | null;

  is_visible: boolean;
  is_featured: boolean;
  is_active: boolean;
  commission_enabled: boolean;
  commission_amount: number | null;
};
