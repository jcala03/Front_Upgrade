import type { CatalogSnapshot, ConfiguratorProduct, Coverage } from "./types";

export const catalogSnapshot = (product: ConfiguratorProduct, requestKey: string, coverage: Coverage = "unknown"): CatalogSnapshot => ({
  status: "ready", requestKey, slug: product.slug, coverage, product,
});
export function beginCatalogLoad(slug: string, requestKey: string): CatalogSnapshot {
  return { status: "loading", requestKey, slug, coverage: "unknown", product: null };
}
/** Stale/out-of-order responses cannot replace the latest product/revision. */
export function acceptCatalogResponse(current: CatalogSnapshot, response: CatalogSnapshot): CatalogSnapshot {
  if (current.status !== "loading" || current.requestKey !== response.requestKey || current.slug !== response.slug || response.status !== "ready" || response.product?.slug !== current.slug) return current;
  return response; // Preserve provenance; a filtered response must remain filtered.
}
export function rejectCatalogResponse(current: CatalogSnapshot, requestKey: string): CatalogSnapshot {
  return current.status === "loading" && current.requestKey === requestKey ? { ...current, status: "error", product: null } : current;
}
