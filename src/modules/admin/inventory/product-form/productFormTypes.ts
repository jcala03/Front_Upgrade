import type { ProductBrand } from "../../../../types/productBrand";
import type { ProductCategory } from "../../../../types/productCategory";
import type {
  AdminProduct,
  ProductCompatibilityType,
  ProductPricingMode,
  ProductTechnicalSpecs,
  ProductVariantAttributes,
} from "../../../../types/product";
import type {
  VehicleBrand,
  VehicleModel,
  VehicleMultimediaSystem,
  VehicleVersion,
} from "../../../../types/vehicle";

export type ProductFormState = {
  name: string;
  description: string;
  category_id: string;
  product_brand_id: string;
  compatibility_type: ProductCompatibilityType | "";
  sku: string;
  price: string;
  cost_price: string;
  tax_amount: string;
  extra_charges: string;
  pricing_mode: ProductPricingMode;
  target_profit_percent: string;
  commission_enabled: boolean;
  commission_amount: string;
  is_active: boolean;
  is_visible: boolean;
  is_featured: boolean;
  image: File | null;
};

export type VariantSpecDraft = ProductTechnicalSpecs;

export type VariantCompatibilityDraft = {
  vehicle_brand_id: string;
  vehicle_model_id: string;
  vehicle_version_id: string;
  vehicle_multimedia_system_id: string;
  year_from: string;
  year_to: string;
  notes: string;
  is_advanced: boolean;
};

export type ProductVariantDraft = {
  id?: number;
  name: string;
  name_is_custom: boolean;
  sku: string;
  specs: VariantSpecDraft;
  legacy_attributes: ProductVariantAttributes | null;
  legacy_vehicle_multimedia_system_id: string;
  use_general_compatibility: boolean;
  compatibility_type: ProductCompatibilityType;
  vehicle_compatibilities: VariantCompatibilityDraft[];
  price: string;
  cost_price: string;
  tax_amount: string;
  extra_charges: string;
  pricing_mode: ProductPricingMode;
  target_profit_percent: string;
  is_default: boolean;
  is_active: boolean;
  is_visible: boolean;
  sort_order: string;
};

export type ProductFormErrors = Record<string, string>;

export type ProductFormCatalogs = {
  categories: ProductCategory[];
  productBrands: ProductBrand[];
  vehicleBrands: VehicleBrand[];
  vehicleModels: VehicleModel[];
  vehicleVersions: VehicleVersion[];
  vehicleMultimediaSystems: VehicleMultimediaSystem[];
};

export type ProductFormProps = ProductFormCatalogs & {
  product: AdminProduct | null;
  onCancel: () => void;
  onSaved: (message: string) => Promise<void> | void;
};

export type PricingDraft = Pick<
  ProductFormState,
  | "price"
  | "cost_price"
  | "tax_amount"
  | "extra_charges"
  | "pricing_mode"
  | "target_profit_percent"
>;

export type PricingPreview = {
  price: number;
  totalCost: number;
  profitAmount: number;
  profitMarginPercent: number;
  markupPercent: number;
};
