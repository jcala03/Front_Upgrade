/** Purchase DTO: prices, labels, SKU and stock are deliberately not accepted here. */
export type PurchaseConfiguration = {
  schema_version: 1;
  profile_id: "vehicle-oem-memory-v1";
  profile_version: 1;
  vehicle_brand_id: number;
  vehicle_model_id: number;
  vehicle_version_id: number;
  vehicle_multimedia_system_id: number;
  year: number | null;
  ram_gb: number;
  almacenamiento_gb: number;
};

/** Labels in the cart are presentation only; the backend rebuilds its own snapshot. */
export type ConfigurationContext = PurchaseConfiguration & {
  vehicle_brand_name?: string;
  vehicle_model_name?: string;
  vehicle_version_name?: string;
  vehicle_multimedia_system_name?: string;
  variant_id?: number;
  variant_sku?: string | null;
  variant_name?: string;
};

export const purchaseConfiguration = (context: ConfigurationContext): PurchaseConfiguration => ({
  schema_version: context.schema_version, profile_id: context.profile_id, profile_version: context.profile_version,
  vehicle_brand_id: context.vehicle_brand_id, vehicle_model_id: context.vehicle_model_id,
  vehicle_version_id: context.vehicle_version_id, vehicle_multimedia_system_id: context.vehicle_multimedia_system_id,
  year: context.year ?? null, ram_gb: context.ram_gb, almacenamiento_gb: context.almacenamiento_gb,
});

export const configurationKey = (context?: ConfigurationContext | null) => context
  ? JSON.stringify(purchaseConfiguration(context)) : "";

export const configurationSummary = (context?: ConfigurationContext | null): string | null => context
  ? `${[context.vehicle_brand_name, context.vehicle_model_name, context.vehicle_version_name].filter(Boolean).join(" · ") || `Vehículo #${context.vehicle_version_id}`}${context.year ? ` · ${context.year}` : ""} · Sistema OEM: ${context.vehicle_multimedia_system_name || `#${context.vehicle_multimedia_system_id}`} · RAM: ${context.ram_gb} GB · Almacenamiento: ${context.almacenamiento_gb} GB`
  : null;
