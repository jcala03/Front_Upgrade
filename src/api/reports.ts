import type { AnyReport, ReportFilters, ReportKind, ReportResponseMap } from "../types/report";
import { ApiError, apiDownload, apiRequest } from "./http";

type Data<T> = { data: T };

const get = async <T,>(path: string, filters: ReportFilters, signal?: AbortSignal) =>
  (await apiRequest<Data<T>>(path, { query: filters, signal })).data;

export const getSalesReport = (filters: ReportFilters = {}, signal?: AbortSignal) => get<ReportResponseMap["sales"]>("/api/admin/reports/sales", filters, signal);
export const getProductsReport = (filters: ReportFilters = {}, signal?: AbortSignal) => get<ReportResponseMap["products"]>("/api/admin/reports/products", filters, signal);
export const getPaymentsReport = (filters: ReportFilters = {}, signal?: AbortSignal) => get<ReportResponseMap["payments"]>("/api/admin/reports/payments", filters, signal);
export const getReceivablesReport = (filters: ReportFilters = {}, signal?: AbortSignal) => get<ReportResponseMap["receivables"]>("/api/admin/reports/receivables", filters, signal);
export const getInventoryReport = (filters: ReportFilters = {}, signal?: AbortSignal) => get<ReportResponseMap["inventory"]>("/api/admin/reports/inventory", filters, signal);
export const getInventoryMovementsReport = (filters: ReportFilters = {}, signal?: AbortSignal) => get<ReportResponseMap["inventory-movements"]>("/api/admin/reports/inventory-movements", filters, signal);
export const getQuotationsReport = (filters: ReportFilters = {}, signal?: AbortSignal) => get<ReportResponseMap["quotations"]>("/api/admin/reports/quotations", filters, signal);
export const getCustomersReport = (filters: ReportFilters = {}, signal?: AbortSignal) => get<ReportResponseMap["customers"]>("/api/admin/reports/customers", filters, signal);

export const reportLoaders: Record<ReportKind, (filters?: ReportFilters, signal?: AbortSignal) => Promise<AnyReport>> = {
  sales: getSalesReport,
  products: getProductsReport,
  payments: getPaymentsReport,
  receivables: getReceivablesReport,
  inventory: getInventoryReport,
  "inventory-movements": getInventoryMovementsReport,
  quotations: getQuotationsReport,
  customers: getCustomersReport,
};

const exportPaths: Record<ReportKind, string> = {
  sales: "/api/admin/reports/sales/export",
  products: "/api/admin/reports/products/export",
  payments: "/api/admin/reports/payments/export",
  receivables: "/api/admin/reports/receivables/export",
  inventory: "/api/admin/reports/inventory/export",
  "inventory-movements": "/api/admin/reports/inventory-movements/export",
  quotations: "/api/admin/reports/quotations/export",
  customers: "/api/admin/reports/customers/export",
};

export const exportReport = async (kind: ReportKind, activeFilters: ReportFilters, signal?: AbortSignal) => {
  const filters: ReportFilters = { ...activeFilters };
  delete filters.page;
  delete filters.per_page;
  const result = await apiDownload(exportPaths[kind], filters, signal);
  if (result.contentType?.includes("application/json")) throw new ApiError("El servidor no devolvió un archivo Excel válido.", 500);
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.filename ?? `${kind}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
