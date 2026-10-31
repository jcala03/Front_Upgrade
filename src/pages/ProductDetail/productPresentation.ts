import type { Product, ProductVariant } from "../../types/product";
import { productFacts } from "../../seo/model";

/** Display-only labels. Never used to resolve a commercial variant or compatibility. */
export function productCompatibilitySummary(product: Product, variant: ProductVariant | null = null): string {
  const type = variant?.effective_compatibility_type ?? variant?.compatibility_type ?? product.compatibility_type;
  if (type === "universal" || (!variant && product.is_universal)) return "Compatibilidad universal";
  const own = variant?.vehicle_compatibilities ?? [];
  const rows = own.length ? own : product.vehicle_compatibilities?.length ? product.vehicle_compatibilities
    : product.variants?.filter(v => v.is_active && v.is_visible).flatMap(v => v.vehicle_compatibilities ?? []) ?? [];
  const vehicles = new Map<string, { name: string; labels: Set<string> }>();
  for (const row of rows) {
    const name = [row.vehicle_brand?.name, row.vehicle_model?.name, row.vehicle_version?.name ?? row.vehicle_version?.display_name].filter(Boolean).join(" ");
    if (!name) continue;
    // Explicit variant ranges take precedence. Do not merge ranges from separate rows.
    const override = "year_from" in row && (row.year_from != null || row.year_to != null);
    const from = override && "year_from" in row ? row.year_from : row.vehicle_version?.year_from;
    const to = override && "year_to" in row ? row.year_to : row.vehicle_version?.year_to;
    const range = from && to ? `${from}–${to}` : from ? `desde ${from}` : to ? `hasta ${to}` : "";
    const label = range && row.vehicle_version?.name ? `${name} (${range})` : name;
    const key = [row.vehicle_brand_id, row.vehicle_model_id, row.vehicle_version_id].join(":");
    const vehicle = vehicles.get(key) ?? { name, labels: new Set<string>() };
    vehicle.labels.add(label);vehicles.set(key, vehicle);
  }
  if (vehicles.size > 1) return `Compatibilidad con ${vehicles.size} vehículos registrados. Verifica tu referencia.`;
  const vehicle = [...vehicles.values()][0];
  if (vehicle) return `Compatible con ${vehicle.labels.size === 1 ? [...vehicle.labels][0] : vehicle.name}`;
  return "Verifica la compatibilidad con el taller antes de comprar.";
}

/** An explicit QA marker, not an inference from pricing, stock or vehicle names. */
export function isQaProduct(product: Product): boolean {
  return /^QA(?:[\s_—-]|$)/i.test(product.name) || /QA\s+SINT[ÉE]TICO/i.test(product.description ?? "");
}

export function productGallery(
  product: Product,
  variant: ProductVariant | null = null
): string[] {
  const images = [...(product.images ?? [])].sort(
    (a, b) =>
      Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
  );
  return [
    ...new Set(
      [
        product.image_url,
        ...images.map((i) => i.image_url),
        variant?.image_url,
      ].filter((url): url is string => Boolean(url))
    ),
  ];
}

export function productCompatibility(
  product: Product,
  variant: ProductVariant | null = null
): string[] {
  const type =
    variant?.effective_compatibility_type ??
    variant?.compatibility_type ??
    product.compatibility_type;
  if (type === "universal" || (!variant && product.is_universal))
    return ["Compatibilidad universal"];
  const variantLabels =
    variant?.vehicle_compatibilities
      ?.map((c) => {
        const range =
          c.year_from && c.year_to
            ? `${c.year_from}–${c.year_to}`
            : c.year_from
            ? `Desde ${c.year_from}`
            : c.year_to
            ? `Hasta ${c.year_to}`
            : "";
        return [
          c.vehicle_brand?.name,
          c.vehicle_model?.name,
          c.vehicle_version?.name ?? c.vehicle_version?.display_name,
          range,
          c.vehicle_multimedia_system?.name,
        ]
          .filter(Boolean)
          .join(" · ");
      })
      .filter(Boolean) ?? [];
  const labels = variantLabels.length
    ? variantLabels
    : product.vehicle_compatibilities
        ?.map((c) => c.vehicle_label)
        .filter(Boolean) ?? [];
  return labels.length
    ? [...new Set(labels)]
    : ["Consulta la compatibilidad con el taller antes de comprar."];
}

export function specificationFacts(
  product: Product,
  variant: ProductVariant | null = null
): [string, string][] {
  const facts = productFacts(product).filter(
    ([name]) =>
      ![
        "SKU",
        "Categoría",
        "Marca",
        "Compatibilidad",
        "Compatible con",
      ].includes(name)
  );
  for (const [name, value] of Object.entries({
    ...variant?.attributes,
    ...variant?.specs,
  })) {
    if (value != null)
      facts.push([
        name,
        typeof value === "boolean" ? (value ? "Sí" : "No") : String(value),
      ]);
  }
  const fields = [...(product.product_category?.fields ?? []),
    ...(product.spec_values ?? []).flatMap(spec => spec.field ? [spec.field] : []),
    ...(variant?.spec_values ?? []).flatMap(spec => spec.field ? [spec.field] : [])];
  const commercialFacts = facts.map(([key, value]): [string, string] => {
    const field = fields.find(field => field.field_key === key || field.name === key);
    const memory = key === "ram_gb" || field?.field_key === "ram_gb" ? "RAM"
      : key === "almacenamiento_gb" || field?.field_key === "almacenamiento_gb" ? "Almacenamiento" : null;
    const name = memory ?? (field?.name || key).replace(/_/g, " ").replace(/^./, char => char.toUpperCase());
    const unit = memory ? "GB" : field?.filter_unit;
    const displayed = /^-?\d+(?:\.\d+)?$/.test(value) ? String(Number(value)) : value;
    return [name, unit && !displayed.toLowerCase().endsWith(unit.toLowerCase()) ? `${displayed} ${unit}` : displayed];
  });
  return [...new Map(commercialFacts.map(fact => [fact[0], fact])).values()];
}
