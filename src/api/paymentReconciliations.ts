import type {
  PaymentReconciliationDecisionPayload,
  PaymentReconciliationFilters,
  PaymentReconciliationMutationResult,
  PaymentReconciliationPaginator,
  PaymentReconciliationReview,
} from "../types/paymentReconciliation";
import { apiRequest } from "./http";

type Data<T> = { data: T };

export const listPaymentReconciliations = async (
  filters: PaymentReconciliationFilters = {},
  signal?: AbortSignal,
) => (await apiRequest<Data<PaymentReconciliationPaginator>>(
  "/api/admin/payment-reconciliations",
  { query: filters, signal },
)).data;

export const getPaymentReconciliation = async (id: number, signal?: AbortSignal) =>
  (await apiRequest<Data<PaymentReconciliationReview>>(
    `/api/admin/payment-reconciliations/${id}`,
    { signal },
  )).data;

export const startPaymentReconciliation = async (id: number, idempotencyKey: string) =>
  apiRequest<PaymentReconciliationMutationResult>(
    `/api/admin/payment-reconciliations/${id}/start`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
    },
  );

export const decidePaymentReconciliation = async (
  id: number,
  payload: PaymentReconciliationDecisionPayload,
  idempotencyKey: string,
) => apiRequest<PaymentReconciliationMutationResult>(
  `/api/admin/payment-reconciliations/${id}/decisions`,
  {
    method: "POST",
    body: payload,
    headers: { "Idempotency-Key": idempotencyKey },
  },
);
