import type {
  CustomerOption,
  CustomerOptionsResponse,
  ServiceOption,
  ServiceOptionsResponse,
} from "../types/commercialDiscovery";
import { apiRequest } from "./http";

export const searchMyCustomerOptions = async (
  search: string,
  signal?: AbortSignal,
): Promise<CustomerOption[]> => {
  const response = await apiRequest<CustomerOptionsResponse>("/api/my/customer-options", {
    query: { search: search.trim() },
    signal,
  });

  return response.data;
};

export const listMyServiceOptions = async (
  search?: string,
  signal?: AbortSignal,
): Promise<ServiceOption[]> => {
  const response = await apiRequest<ServiceOptionsResponse>("/api/my/service-options", {
    query: { search: search?.trim() || undefined },
    signal,
  });

  return response.data;
};
