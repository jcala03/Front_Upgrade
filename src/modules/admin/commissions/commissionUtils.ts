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
  pending: "Pendiente de completar la venta, confirmar el pago total o resolver su conciliación.",
  earned: "Venta completada y pago total confirmado. No significa pagada al empleado.",
  voided: "Venta cancelada antes de quedar ganada.",
};

export const commissionItemName = (product: { name: string }, variant: { name: string | null } | null) =>
  variant?.name ? `${product.name} / ${variant.name}` : product.name;

export const commissionEventDate = (row: { status: CommissionStatus; created_at: string; earned_at: string | null; voided_at: string | null }) =>
  row.status === "earned" ? row.earned_at : row.status === "voided" ? row.voided_at : row.created_at;

export const commissionMonth = (offset = 0, now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit" }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")!.value);
  const month = Number(parts.find((part) => part.type === "month")!.value);
  const start = new Date(Date.UTC(year, month - 1 + offset, 1));
  const end = new Date(Date.UTC(year, month + offset, 0));
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
};

export const commissionQuery = () => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
