import { getProductBySlug } from "./products";
import { catalogSnapshot } from "../domain/productConfigurator/catalog";
import type { CatalogSnapshot } from "../domain/productConfigurator/types";
import type { Product } from "../types/product";

/** Separate unfiltered public read; no vehicle query, admin endpoints or added auth headers. */
export async function getCompleteConfiguratorCatalog(slug: string, requestKey: string, signal?: AbortSignal): Promise<CatalogSnapshot & { product: Product }> {
  const product = await getProductBySlug(slug, signal);
  if (product.slug !== slug) throw new Error("La respuesta del catálogo no corresponde al producto solicitado.");
  return { ...catalogSnapshot(product, requestKey, "complete_public"), product };
}
