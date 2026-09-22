import { apiRequest } from "./http";
import type {
  AdminCommercialProductFilters,
  CommercialProductCatalog,
  CommercialProductCatalogResponse,
  CommercialProductFilters,
} from "../types/commercialProduct";

const cleanSearch = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const getAdminCommercialProducts = async (
  filters: AdminCommercialProductFilters,
  signal?: AbortSignal,
): Promise<CommercialProductCatalog> => (
  await apiRequest<CommercialProductCatalogResponse>("/api/admin/commercial-products", {
    query: {
      branch_id: filters.branch_id,
      search: cleanSearch(filters.search),
      limit: filters.limit,
    },
    signal,
  })
).data;

export const getMyCommercialProducts = async (
  filters: CommercialProductFilters = {},
  signal?: AbortSignal,
): Promise<CommercialProductCatalog> => (
  await apiRequest<CommercialProductCatalogResponse>("/api/my/commercial-products", {
    query: {
      search: cleanSearch(filters.search),
      limit: filters.limit,
    },
    signal,
  })
).data;
