export type CommercialProductBranch = {
  id: number;
  code: string | null;
  name: string;
};

export type CommercialProductVariant = {
  id: number;
  product_id: number;
  name: string | null;
  display_name: string;
  sku: string | null;
  price: number;
  branch_stock: number;
  specs: Record<string, string | number | boolean | null>;
};

export type CommercialProduct = {
  id: number;
  name: string;
  sku: string | null;
  price: number;
  has_variants: boolean;
  branch_stock: number;
  variants: CommercialProductVariant[];
};

export type CommercialProductCatalog = {
  branch: CommercialProductBranch;
  products: CommercialProduct[];
};

export type CommercialProductCatalogResponse = {
  data: CommercialProductCatalog;
};

export type CommercialProductFilters = {
  search?: string;
  limit?: number;
};

export type AdminCommercialProductFilters = CommercialProductFilters & {
  branch_id: number;
};
