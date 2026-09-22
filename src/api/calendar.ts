import { apiRequest } from "./http";
import type { CalendarFilters, CalendarResponse } from "../types/calendar";

export const getAdminCalendar = async (filters: CalendarFilters, signal?: AbortSignal) =>
  apiRequest<CalendarResponse>("/api/admin/calendar", { query: filters, signal });

export const getMyCalendar = async (filters: Omit<CalendarFilters, "branch_id" | "employee_ids">, signal?: AbortSignal) =>
  apiRequest<CalendarResponse>("/api/my/calendar", { query: filters, signal });
