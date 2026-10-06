import type {
  PublicProductFilters,
  ProductSortOption,
} from "../../api/products";

export type ShopFilters = {
  search: string;
  category_id: string;
  product_brand_id: string;
  vehicle_brand_id: string;
  vehicle_model_id: string;
  vehicle_version_id: string;
  year: string;
  min_price: string;
  max_price: string;
  in_stock: boolean;
  featured: boolean;
  sort: ProductSortOption;
  specs: Record<string, string>;
};
export const defaultShopFilters = (): ShopFilters => ({
  search: "",
  category_id: "",
  product_brand_id: "",
  vehicle_brand_id: "",
  vehicle_model_id: "",
  vehicle_version_id: "",
  year: "",
  min_price: "",
  max_price: "",
  in_stock: true,
  featured: false,
  sort: "featured",
  specs: {},
});
const ids = [
  "category_id",
  "product_brand_id",
  "vehicle_brand_id",
  "vehicle_model_id",
  "vehicle_version_id",
] as const;
const textFields = [
  "search",
  ...ids,
  "year",
  "min_price",
  "max_price",
] as const;
const sorts: ProductSortOption[] = [
  "featured",
  "newest",
  "price_asc",
  "price_desc",
  "name",
  "stock",
];

export function parseShopFilters(query: string): ShopFilters {
  const params = new URLSearchParams(query);
  const filters = defaultShopFilters();
  filters.search = (params.get("search") ?? "").slice(0, 200);
  for (const key of ids) {
    const value = params.get(key) ?? "";
    if (/^[1-9]\d*$/.test(value)) filters[key] = value;
  }
  const year = params.get("year") ?? "";
  if (/^\d{4}$/.test(year) && +year >= 1900 && +year <= 2100)
    filters.year = year;
  for (const key of ["min_price", "max_price"] as const) {
    const value = params.get(key) ?? "";
    if (/^\d+(?:\.\d+)?$/.test(value)) filters[key] = value;
  }
  filters.in_stock = params.get("in_stock") !== "0";
  filters.featured = params.get("featured") === "1";
  const sort = params.get("sort") as ProductSortOption;
  if (sorts.includes(sort)) filters.sort = sort;
  for (const [key, value] of params) {
    const match = key.match(/^specs\[([a-zA-Z0-9_-]+)\]$/);
    if (
      match &&
      value &&
      !["__proto__", "constructor", "prototype"].includes(match[1])
    )
      filters.specs[match[1]] = value.slice(0, 200);
  }
  // A model/version without its parent cannot be a meaningful vehicle selection.
  if (!filters.vehicle_brand_id)
    filters.vehicle_model_id = filters.vehicle_version_id = "";
  if (!filters.vehicle_model_id) filters.vehicle_version_id = "";
  return filters;
}

export function activeShopFilterCount(filters: ShopFilters): number {
  return [
    ...textFields.map((key) => filters[key].trim()),
    ...Object.values(filters.specs).map((value) => value.trim()),
    filters.featured ? "1" : "",
    !filters.in_stock ? "all-stock" : "",
  ].filter(Boolean).length;
}

export function serializeShopFilters(filters: ShopFilters): string {
  const params = new URLSearchParams();
  for (const key of textFields)
    if (filters[key].trim()) params.set(key, filters[key].trim());
  if (!filters.in_stock) params.set("in_stock", "0");
  if (filters.featured) params.set("featured", "1");
  if (filters.sort !== "featured") params.set("sort", filters.sort);
  for (const [key, value] of Object.entries(filters.specs))
    if (value.trim()) params.set(`specs[${key}]`, value.trim());
  return params.toString();
}

export function shopApiFilters(filters: ShopFilters): PublicProductFilters {
  return {
    ...filters,
    search: filters.search.trim(),
    featured: filters.featured || undefined,
  };
}

export function shopApiQuery(filters: ShopFilters): string {
  const params = new URLSearchParams(serializeShopFilters(filters));
  params.set("in_stock", filters.in_stock ? "1" : "0");
  params.set("sort", filters.sort);
  return params.toString();
}

export function shopUrl(filters: ShopFilters, currentSearch = ""): string {
  // Preserve marketing attribution, never retain stale filters after Clear.
  const params = new URLSearchParams(serializeShopFilters(filters));
  for (const [key, value] of new URLSearchParams(currentSearch))
    if (/^(utm_.+|gclid|fbclid|msclkid)$/.test(key)) params.append(key, value);
  return `/tienda${params.size ? `?${params}` : ""}`;
}
