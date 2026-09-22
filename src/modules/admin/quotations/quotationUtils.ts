import type { QuotationStatus } from "../../../types/quotation";

export const quotationStatusLabels: Record<QuotationStatus, string> = { draft: "Borrador", sent: "Enviada", rejected: "Rechazada", expired: "Vencida", converted: "Convertida" };
export const formatDate = (value: string | null, withTime = false) => {
  if (!value) return "Sin fecha";
  const date = !withTime && /^\d{4}-\d{2}-\d{2}/.test(value) ? new Date(`${value.slice(0, 10)}T00:00:00`) : new Date(value);
  return new Intl.DateTimeFormat("es-CO", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
};
export const vehicleSummary = (quotation: { vehicle_brand_name: string | null; vehicle_model_name: string | null; vehicle_version_name: string | null; vehicle_year: number | null; vehicle_plate: string | null }) => [quotation.vehicle_brand_name, quotation.vehicle_model_name, quotation.vehicle_version_name, quotation.vehicle_year, quotation.vehicle_plate].filter(Boolean).join(" · ") || "Sin vehículo";
