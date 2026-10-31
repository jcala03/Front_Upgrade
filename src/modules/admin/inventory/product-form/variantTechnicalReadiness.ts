import type { ProductTechnicalSpecs } from "../../../../types/product";
import { isValidMemoryGb } from "../../../../utils/memoryGb";
export { isValidMemoryGb } from "../../../../utils/memoryGb";

export const memoryCategorySlug = "pantallas-android";
export const memoryFields = { ram_gb: "RAM", almacenamiento_gb: "Almacenamiento" } as const;

export const memorySpecErrors = (specs: ProductTechnicalSpecs, complete = false): Record<string, string> => {
  const issues: Record<string, string> = {};
  for (const [key, label] of Object.entries(memoryFields)) {
    const value = specs[key];
    if (value == null || value === "") {
      if (complete) issues[key] = `Falta ${label} en GB.`;
    } else if (!isValidMemoryGb(value)) issues[key] = `${label} debe ser un entero positivo en GB.`;
  }
  return issues;
};

type Compatibility = {
  vehicle_brand_id: string | number;
  vehicle_model_id: string | number | null;
  vehicle_version_id: string | number | null;
  vehicle_multimedia_system_id: string | number | null;
};

/** Completeness only, not certification or permission to sell a configuration. */
export function assessVariantTechnicalReadiness(specs: ProductTechnicalSpecs, requiresOem: boolean,
  compatibilityType: string, rows: Compatibility[]) {
  const issues = memorySpecErrors(specs, true);
  if (requiresOem && (compatibilityType !== "vehicle_specific" || rows.length === 0 || rows.some(row =>
    [row.vehicle_brand_id, row.vehicle_model_id, row.vehicle_version_id, row.vehicle_multimedia_system_id]
      .some(id => !Number.isInteger(Number(id)) || Number(id) <= 0)))) {
    issues.compatibility = "Completa marca, modelo, generación y sistema OEM en cada fila.";
  }
  return { structurally_ready: Object.keys(issues).length === 0, issues, certifies_physical_compatibility: false };
}
