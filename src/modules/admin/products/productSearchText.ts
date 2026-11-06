import type { AdminProduct } from "../../../types/product";

/** Text index for the existing catalog filter; never changes product data. */
export const productSearchText = (product: AdminProduct): string => [
  product.name,
  product.sku,
  product.product_category?.name ?? product.category ?? "Sin categoría",
  product.product_brand?.name ?? "Sin marca",
  ...(product.vehicle_compatibilities ?? []).map(row => row.vehicle_label),
  ...(product.variants ?? []).flatMap(variant => [variant.name, variant.sku]),
].join(" ").toLowerCase();
