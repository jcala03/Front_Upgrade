export type ProductBrand = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductBrandPayload = {
  name: string;
  description: string | null;
  is_active: boolean;
};