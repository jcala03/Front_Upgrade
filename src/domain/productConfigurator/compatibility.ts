import type { CompatibilityRow, ConfiguratorProduct, ConfiguratorVariant, Selection } from "./types";

export const positiveId = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
export const vehicleKeys = ["vehicle_brand_id", "vehicle_model_id", "vehicle_version_id"] as const;

/** Mirror PublicVehicleCompatibility / resolvedCompatibilityType, not presentation-label fallback. */
export function effectiveCompatibility(product: ConfiguratorProduct, variant: ConfiguratorVariant) {
  const type = variant.compatibility_type ?? product.compatibility_type;
  const inconsistent = variant.effective_compatibility_type != null && variant.effective_compatibility_type !== type;
  const ownRows = variant.vehicle_compatibilities ?? [];
  // Laravel permits general inheritance for null type even when old own rows exist.
  // General product rows contain NO OEM; only variant rows can prove an OEM match.
  const inherited = variant.compatibility_type == null ? product.vehicle_compatibilities ?? [] : [];
  return { type, inconsistent, rows: [...ownRows, ...inherited] };
}

/** Variant overrides take precedence; only absence of both uses the generation's natural range. */
export function rowYearRange(row: CompatibilityRow): { from: number | null; to: number | null; known: boolean } {
  if (row.year_from != null || row.year_to != null) {
    const from = row.year_from ?? null, to = row.year_to ?? null;
    return { from, to, known: (from === null || Number.isInteger(from)) && (to === null || Number.isInteger(to)) && (from === null || to === null || from <= to) };
  }
  const from = row.vehicle_version?.year_from ?? null, to = row.vehicle_version?.year_to ?? null;
  return { from, to, known: row.vehicle_version_id == null || (Number.isInteger(from) && (to === null || Number.isInteger(to)) && (to === null || from! <= to)) };
}

/** A selected ID must equal the same row's ID; null is NEVER an OEM wildcard. */
export function matchesRow(row: CompatibilityRow, selection: Selection): boolean | "unknown" {
  for (const key of [...vehicleKeys, "vehicle_multimedia_system_id"] as const) {
    if (selection[key] != null && row[key] !== selection[key]) return false;
  }
  if (selection.year != null) {
    const range = rowYearRange(row);
    if (!range.known) return "unknown";
    if (range.from !== null && selection.year < range.from || range.to !== null && selection.year > range.to) return false;
  }
  return true;
}

export function validVehicleRow(row: CompatibilityRow): boolean {
  if (!vehicleKeys.every(key => positiveId(row[key]))) return false;
  // Public metadata, when present, must agree with its row. No cross-generation repair.
  if (row.vehicle_brand && row.vehicle_brand.id !== row.vehicle_brand_id) return false;
  if (row.vehicle_model && (row.vehicle_model.id !== row.vehicle_model_id || row.vehicle_model.vehicle_brand_id !== row.vehicle_brand_id)) return false;
  if (row.vehicle_version && (row.vehicle_version.id !== row.vehicle_version_id || row.vehicle_version.vehicle_model_id !== row.vehicle_model_id)) return false;
  if (row.vehicle_multimedia_system && (row.vehicle_multimedia_system.id !== row.vehicle_multimedia_system_id || row.vehicle_multimedia_system.vehicle_brand_id !== row.vehicle_brand_id)) return false;
  if ([row.vehicle_brand, row.vehicle_model, row.vehicle_version].some(entity => entity?.is_active === false)) return false;
  return rowYearRange(row).known || row.year_from == null && row.year_to == null;
}
