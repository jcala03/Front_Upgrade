import type { QueryValue } from "../api/http";

export type PaymentReconciliationState = "detected" | "under_review" | "resolved";

export type PaymentReconciliationDecision =
  | "refund_required"
  | "refund_confirmed_externally"
  | "escalated"
  | "provider_void_verified"
  | "conflict_ownership_verified"
  | "invalid_event_confirmed"
  | "local_payment_absence_confirmed"
  | "provider_transaction_absence_confirmed";

export type ReconciliationActor = { id: number; name: string };

export type PaymentReconciliationAction = {
  id: number;
  actor: ReconciliationActor | null;
  action: "detected" | "review_started" | "decision_recorded" | "resolved";
  previous_state: PaymentReconciliationState | null;
  new_state: PaymentReconciliationState;
  decision: PaymentReconciliationDecision | null;
  justification: string | null;
  evidence_reference: string | null;
  canonical_payment_id: number | null;
  created_at: string;
};

export type PaymentReconciliationWebhookEvent = {
  id: number;
  provider: string;
  event_type: string | null;
  provider_transaction_id: string | null;
  status: string;
  received_at: string | null;
  processed_at: string | null;
  last_error: string | null;
  metadata: {
    environment?: unknown;
    provider_status?: unknown;
    retryable?: unknown;
  };
};

export type PaymentReconciliationReview = {
  id: number;
  payment_id: number | null;
  order_id: number | null;
  parent_review_id: number | null;
  reason: string;
  state: PaymentReconciliationState;
  latest_decision: PaymentReconciliationDecision | null;
  assigned_to: ReconciliationActor | null;
  resolved_by: ReconciliationActor | null;
  detected_at: string;
  review_started_at: string | null;
  resolved_at: string | null;
  webhook_event?: PaymentReconciliationWebhookEvent | null;
  actions?: PaymentReconciliationAction[];
};

export type PaymentReconciliationPaginator = {
  current_page: number;
  data: PaymentReconciliationReview[];
  last_page: number;
  per_page: number;
  total: number;
};

export type PaymentReconciliationFilters = {
  [key: string]: QueryValue;
  state?: PaymentReconciliationState;
  reason?: string;
  payment_id?: number;
  order_id?: number;
  page?: number;
  per_page?: number;
};

export type PaymentReconciliationDecisionPayload = {
  decision: PaymentReconciliationDecision;
  justification: string;
  evidence_reference?: string;
  canonical_payment_id?: number;
};

export type PaymentReconciliationMutationResult = {
  data: PaymentReconciliationReview;
  action: PaymentReconciliationAction;
  replayed: boolean;
};
