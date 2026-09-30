import type {
  PaymentReconciliationDecision,
  PaymentReconciliationState,
} from "../../../types/paymentReconciliation";

export const reconciliationStateLabels: Record<PaymentReconciliationState, string> = {
  detected: "Pendiente de revisión",
  under_review: "En revisión",
  resolved: "Resuelta",
};

export const reconciliationStateTones = {
  detected: "warning",
  under_review: "info",
  resolved: "success",
} as const;

export const reconciliationReasonLabels: Record<string, string> = {
  LATE_APPROVAL: "Pago aprobado después de cancelación o reversión",
  DUPLICATE_APPROVAL: "Aprobación duplicada",
  VOID_AFTER_APPROVAL: "Anulación posterior a aprobación",
  TRANSACTION_CONFLICT: "Conflicto de transacción",
  WOMPI_AMOUNT_MISMATCH: "Diferencia de monto",
  WOMPI_CURRENCY_MISMATCH: "Diferencia de moneda",
  WOMPI_REFERENCE_MISMATCH: "Diferencia de referencia",
  WOMPI_ORDER_MISMATCH: "Inconsistencia con la orden",
  WOMPI_PAYMENT_NOT_FOUND: "Pago local no encontrado",
  WOMPI_TRANSACTION_NOT_FOUND: "Transacción Wompi no encontrada",
};

export const reconciliationReasonLabel = (reason: string) => {
  if (reconciliationReasonLabels[reason]) return reconciliationReasonLabels[reason];
  if (reason.startsWith("WOMPI_EVENT_") && reason.endsWith("_MISMATCH")) {
    return "Inconsistencia entre el evento y el proveedor";
  }
  return reason.replaceAll("_", " ").toLocaleLowerCase("es-CO");
};

export const reconciliationDecisionLabels: Record<PaymentReconciliationDecision, string> = {
  refund_required: "Marcar devolución requerida",
  refund_confirmed_externally: "Confirmar devolución realizada externamente",
  escalated: "Escalar revisión",
  provider_void_verified: "Confirmar anulación verificada",
  conflict_ownership_verified: "Confirmar propiedad de transacción verificada",
  invalid_event_confirmed: "Confirmar evento o integridad inválida",
  local_payment_absence_confirmed: "Confirmar ausencia de pago local",
  provider_transaction_absence_confirmed: "Confirmar ausencia de transacción en proveedor",
};

export const reconciliationDecisionResult: Record<PaymentReconciliationDecision, string> = {
  refund_required: "Se requiere una devolución externa. Registrar esta decisión no cierra el caso.",
  refund_confirmed_externally: "Se confirmó que la devolución fue realizada fuera de Upgrade.",
  escalated: "La revisión queda escalada y continúa abierta.",
  provider_void_verified: "La anulación del proveedor quedó verificada.",
  conflict_ownership_verified: "La propiedad de la transacción quedó verificada.",
  invalid_event_confirmed: "El evento o su integridad quedó confirmado como inválido.",
  local_payment_absence_confirmed: "Se confirmó que el pago local no existe.",
  provider_transaction_absence_confirmed: "Se confirmó que la transacción no existe en el proveedor.",
};

const integrityDecisions: PaymentReconciliationDecision[] = ["invalid_event_confirmed", "escalated"];

export const decisionsForReason = (reason: string): PaymentReconciliationDecision[] => {
  if (reason.startsWith("WOMPI_EVENT_") && reason.endsWith("_MISMATCH")) return integrityDecisions;

  const matrix: Record<string, PaymentReconciliationDecision[]> = {
    LATE_APPROVAL: ["refund_required", "refund_confirmed_externally", "escalated"],
    DUPLICATE_APPROVAL: ["refund_required", "refund_confirmed_externally", "escalated"],
    VOID_AFTER_APPROVAL: ["provider_void_verified", "escalated"],
    TRANSACTION_CONFLICT: ["conflict_ownership_verified", "escalated"],
    WOMPI_AMOUNT_MISMATCH: integrityDecisions,
    WOMPI_CURRENCY_MISMATCH: integrityDecisions,
    WOMPI_REFERENCE_MISMATCH: integrityDecisions,
    WOMPI_ORDER_MISMATCH: integrityDecisions,
    WOMPI_PAYMENT_NOT_FOUND: ["local_payment_absence_confirmed", "invalid_event_confirmed", "escalated"],
    WOMPI_TRANSACTION_NOT_FOUND: ["provider_transaction_absence_confirmed", "escalated"],
  };

  return matrix[reason] ?? [];
};

export const evidenceRequiredDecisions = new Set<PaymentReconciliationDecision>([
  "refund_confirmed_externally",
  "provider_void_verified",
  "conflict_ownership_verified",
  "invalid_event_confirmed",
  "local_payment_absence_confirmed",
  "provider_transaction_absence_confirmed",
]);

export const nonTerminalDecisions = new Set<PaymentReconciliationDecision>([
  "refund_required",
  "escalated",
]);

export const reconciliationActionLabels: Record<string, string> = {
  detected: "Discrepancia detectada",
  review_started: "Revisión iniciada",
  decision_recorded: "Decisión registrada",
  resolved: "Revisión resuelta",
};

export const reconciliationFilterReasons = Object.keys(reconciliationReasonLabels);
