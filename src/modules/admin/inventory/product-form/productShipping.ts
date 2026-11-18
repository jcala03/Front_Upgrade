import type { ProductLogistics } from "../../../../types/product";

export const shippingFields = [
  { key: "weight_grams", storedKey: "weight_grams", label: "Peso embalado (g)", step: "1", min: "1" },
  { key: "length_cm", storedKey: "length_mm", label: "Largo (cm)", step: "0.1", min: "0.1" },
  { key: "width_cm", storedKey: "width_mm", label: "Ancho (cm)", step: "0.1", min: "0.1" },
  { key: "height_cm", storedKey: "height_mm", label: "Alto (cm)", step: "0.1", min: "0.1" },
] as const;

export type ShippingField = typeof shippingFields[number]["key"];
export type ShippingDraft = Record<ShippingField, string>;
export const emptyShippingDraft = (): ShippingDraft => ({ weight_grams: "", length_cm: "", width_cm: "", height_cm: "" });

/** MySQL unsignedInteger, as already defined by the logistics migration. */
const maxStoredValue = 4294967295;

/** Convert cm to integer mm exactly. Never round an invalid measurement or default it to zero. */
export const parseShippingValue = (value: string, field: ShippingField): number | null => {
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) return null;
  const [whole = "0", fraction = ""] = value.trim().split(".");
  const decimals = fraction.replace(/0+$/, "");
  const dimension = field !== "weight_grams";
  if (decimals.length > (dimension ? 1 : 0)) return null;
  const result = Number(whole) * (dimension ? 10 : 1) + (dimension ? Number(decimals || "0") : 0);
  return Number.isSafeInteger(result) && result >= 1 && result <= maxStoredValue ? result : null;
};

export const shippingToDraft = (source: ProductLogistics): ShippingDraft => ({
  weight_grams: source.weight_grams == null ? "" : String(source.weight_grams),
  length_cm: source.length_mm == null ? "" : String(source.length_mm / 10),
  width_cm: source.width_mm == null ? "" : String(source.width_mm / 10),
  height_cm: source.height_mm == null ? "" : String(source.height_mm / 10),
});

export const variantShippingToDraft = (source: ProductLogistics) => ({
  ...shippingToDraft(source),
  // Use raw values, not effective_logistics: partially overridden historical variants stay intact.
  use_general_shipping: shippingFields.every(({ storedKey }) => source[storedKey] == null),
});

export const shippingDraftErrors = (draft: ShippingDraft, prefix = ""): Record<string, string> =>
  Object.fromEntries(shippingFields.filter(({ key }) => draft[key] !== "" && parseShippingValue(draft[key], key) === null)
    .map(({ key, storedKey }) => [prefix + storedKey, key === "weight_grams"
      ? "Ingresa un peso entero en gramos, mayor que cero y dentro del límite permitido."
      : "Ingresa centímetros mayores que cero, con máximo un decimal y dentro del límite permitido."]));

export const shippingPayload = (draft: ShippingDraft): ProductLogistics => {
  if (Object.keys(shippingDraftErrors(draft)).length) throw new Error("Revisa los datos para envío.");
  return Object.fromEntries(shippingFields.map(({ key, storedKey }) => [storedKey,
    draft[key] === "" ? null : parseShippingValue(draft[key], key)]));
};

export const shippingReadiness = (draft: ShippingDraft, general?: ShippingDraft) => {
  const missing = shippingFields.filter(({ key }) => parseShippingValue(draft[key] === "" && general ? general[key] : draft[key], key) === null);
  return { complete: missing.length === 0, missing: missing.map(({ label }) => label) };
};
