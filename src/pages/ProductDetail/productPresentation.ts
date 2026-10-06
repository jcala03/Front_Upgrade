import type { Product, ProductVariant } from "../../types/product";
import { productFacts } from "../../seo/model";

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
          c.vehicle_version?.display_name,
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
  return [...new Map(facts.map((f) => [f[0], f])).values()];
}
