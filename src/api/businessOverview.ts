import { apiRequest } from "./http";
import type { BusinessOverviewFilters, BusinessOverviewResponse } from "../types/businessOverview";

type BusinessOverviewEnvelope = {
  data: BusinessOverviewResponse;
};

export const getMyBusinessOverview = (
  filters: BusinessOverviewFilters = {},
  signal?: AbortSignal,
) => apiRequest<BusinessOverviewEnvelope>("/api/my/business-overview", {
  query: filters,
  signal,
}).then((response) => response.data);
