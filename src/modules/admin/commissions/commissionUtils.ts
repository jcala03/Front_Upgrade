import type { CommissionStatus } from "../../../types/commission";
import type { StatusBadgeTone } from "../../../components/crm/StatusBadge";

export const commissionLabels: Record<CommissionStatus, string> = {
  pending: "Pendiente",
  earned: "Ganada",
  voided: "Anulada",
};

export const commissionTones: Record<CommissionStatus, StatusBadgeTone> = {
  pending: "warning",
  earned: "success",
  voided: "neutral",
};

export const commissionDescriptions: Record<CommissionStatus, string> = {
  pending: "Venta confirmada, todavía no completada.",
  earned: "Venta completada.",
  voided: "Venta cancelada antes de quedar ganada.",
};

export const commissionItemName = (product: { name: string }, variant: { name: string | null } | null) =>
  variant?.name ? `${product.name} / ${variant.name}` : product.name;
