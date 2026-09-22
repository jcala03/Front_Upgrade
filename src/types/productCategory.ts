export type ProductCategoryFieldType = "text" | "number" | "select" | "boolean";
export type ProductCategoryFieldScope = "product" | "variant";

export type ProductCategoryField = {
  id: number;
  product_category_id: number;
  name: string;
  field_key: string;
  type: ProductCategoryFieldType;
  scope: ProductCategoryFieldScope;
  options: string[] | null;
  is_required: boolean;
  is_active: boolean;
  is_filterable: boolean;
  filter_label: string | null;
  filter_unit: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProductCategoryFieldPayload = {
  id?: number;
  name: string;
  type: ProductCategoryFieldType;
  scope: ProductCategoryFieldScope;
  options: string[] | null;
  is_required: boolean;
  is_active: boolean;
  is_filterable: boolean;
  filter_label: string | null;
  filter_unit: string | null;
  sort_order: number;
};

export type ProductCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  fields: ProductCategoryField[];
  created_at: string;
  updated_at: string;
};

export type ProductCategoryPayload = {
  name: string;
  description: string | null;
  is_active: boolean;
  fields: ProductCategoryFieldPayload[];
};
