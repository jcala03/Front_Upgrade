import { apiRequest } from "./http";
import type {
  AdminAppointment,
  AppointmentFilters,
  AppointmentPaginator,
  AppointmentStatus,
  CreateAppointmentPayload,
  RescheduleAppointmentPayload,
  UpdateAppointmentPayload,
} from "../types/appointment";

type DataResponse<T> = { data: T; message?: string };

export const getAppointments = async (filters: AppointmentFilters = {}, signal?: AbortSignal) =>
  (await apiRequest<DataResponse<AppointmentPaginator>>("/api/admin/appointments", { query: filters, signal })).data;

export const getAppointment = async (id: number, signal?: AbortSignal) =>
  (await apiRequest<DataResponse<AdminAppointment>>(`/api/admin/appointments/${id}`, { signal })).data;

export const createAppointment = async (payload: CreateAppointmentPayload) =>
  (await apiRequest<DataResponse<AdminAppointment>>("/api/admin/appointments", { method: "POST", body: payload })).data;

export const updateAppointment = async (id: number, payload: UpdateAppointmentPayload) =>
  (await apiRequest<DataResponse<AdminAppointment>>(`/api/admin/appointments/${id}`, { method: "PATCH", body: payload })).data;

export const changeAppointmentStatus = async (id: number, status: AppointmentStatus, availabilityOverride?: { reason: string }) =>
  (await apiRequest<DataResponse<AdminAppointment>>(`/api/admin/appointments/${id}/status`, {
    method: "POST",
    body: {
      status,
      ...(availabilityOverride ? { availability_override: true, availability_override_reason: availabilityOverride.reason } : {}),
    },
  })).data;

export const rescheduleAppointment = async (id: number, payload: RescheduleAppointmentPayload) =>
  (await apiRequest<DataResponse<AdminAppointment>>(`/api/admin/appointments/${id}/reschedule`, { method: "POST", body: payload })).data;

export const cancelAppointment = async (id: number, cancellationReason: string) =>
  (await apiRequest<DataResponse<AdminAppointment>>(`/api/admin/appointments/${id}/cancel`, {
    method: "POST",
    body: { cancellation_reason: cancellationReason },
  })).data;
