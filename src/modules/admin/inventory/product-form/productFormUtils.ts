import type { ProductCategoryField } from "../../../../types/productCategory";
import type {
  AdminProduct,
  ProductCompatibilityType,
  ProductTechnicalSpecs,
} from "../../../../types/product";
import type {
  PricingDraft,
  PricingPreview,
  ProductFormState,
  ProductVariantDraft,
  VariantCompatibilityDraft,
} from "./productFormTypes";

export const emptyCompatibility = (): VariantCompatibilityDraft => ({
  vehicle_brand_id: "",
  vehicle_model_id: "",
  vehicle_version_id: "",
  vehicle_multimedia_system_id: "",
  year_from: "",
  year_to: "",
  notes: "",
  is_advanced: false,
});

export const emptyProductForm: ProductFormState = {
  name: "",
  description: "",
  category_id: "",
  product_brand_id: "",
  compatibility_type: "",
  sku: "",
  price: "",
  cost_price: "",
  tax_amount: "0",
  extra_charges: "0",
  pricing_mode: "manual",
  target_profit_percent: "",
  commission_enabled: false,
  commission_amount: "",
  is_active: true,
  is_visible: false,
  is_featured: false,
  image: null,
};

export const emptyVariant = (index: number): ProductVariantDraft => ({
  name: "",
  name_is_custom: false,
  sku: "",
  specs: {},
  legacy_attributes: null,
  legacy_vehicle_multimedia_system_id: "",
  use_general_compatibility: true,
  compatibility_type: "vehicle_specific",
  vehicle_compatibilities: [emptyCompatibility()],
  price: "",
  cost_price: "",
  tax_amount: "0",
  extra_charges: "0",
  pricing_mode: "manual",
  target_profit_percent: "",
  is_default: index === 0,
  is_active: true,
  is_visible: true,
  sort_order: String(index),
});

export const toInteger = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
};

export const toDecimal = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const calculatePricingPreview = (draft: PricingDraft): PricingPreview => {
  const costPrice = toInteger(draft.cost_price);
  const taxAmount = toInteger(draft.tax_amount);
  const extraCharges = toInteger(draft.extra_charges);
  const totalCost = costPrice + taxAmount + extraCharges;
  const target = toDecimal(draft.target_profit_percent);
  let price = toInteger(draft.price);

  if (draft.pricing_mode === "markup" && target >= 0) {
    price = Math.round(totalCost * (1 + target / 100));
  }

  if (draft.pricing_mode === "margin" && target >= 0 && target < 100) {
    price = Math.round(totalCost / (1 - target / 100));
  }

  const profitAmount = price - totalCost;

  return {
    price,
    totalCost,
    profitAmount,
    profitMarginPercent: price > 0 ? (profitAmount / price) * 100 : 0,
    markupPercent: totalCost > 0 ? (profitAmount / totalCost) * 100 : 0,
  };
};

export const getFieldDefaultValue = (field: ProductCategoryField) =>
  field.type === "boolean" ? false : "";

export const suggestVariantName = (
  fields: ProductCategoryField[],
  specs: ProductTechnicalSpecs
) =>
  fields
    .map((field) => specs[field.field_key])
    .filter((value) => value !== null && value !== undefined && value !== "" && value !== false)
    .map(String)
    .join(" · ");

const validCompatibilities = (rows: VariantCompatibilityDraft[]) =>
  rows.filter((row) => row.vehicle_brand_id);

const compatibilityKey = (row: VariantCompatibilityDraft) =>
  [row.vehicle_brand_id, row.vehicle_model_id, row.vehicle_version_id].join("|");

export const buildProductFormData = ({
  form,
  productFields,
  technicalSpecs,
  generalCompatibilities,
  variants,
}: {
  form: ProductFormState;
  productFields: ProductCategoryField[];
  technicalSpecs: ProductTechnicalSpecs;
  generalCompatibilities: VariantCompatibilityDraft[];
  variants: ProductVariantDraft[];
}) => {
  const formData = new FormData();
  const generalRows = validCompatibilities(generalCompatibilities);
  const specificVariantRows = variants.flatMap((variant) => {
    if (variant.use_general_compatibility || variant.compatibility_type === "universal") {
      return [];
    }
    return validCompatibilities(variant.vehicle_compatibilities);
  });
  const unionRows = [...generalRows, ...specificVariantRows].filter(
    (row, index, rows) => rows.findIndex((candidate) => compatibilityKey(candidate) === compatibilityKey(row)) === index
  );
  const productCompatibilityType: ProductCompatibilityType =
    unionRows.length > 0 ? "vehicle_specific" : "universal";

  formData.append("name", form.name.trim());
  formData.append("description", form.description.trim());
  formData.append("category_id", form.category_id);
  formData.append("product_brand_id", form.product_brand_id);
  formData.append("compatibility_type", productCompatibilityType);
  formData.append("sku", form.sku.trim());

  const productPricing = calculatePricingPreview(form);
  formData.append("price", String(productPricing.price));
  formData.append("cost_price", String(toInteger(form.cost_price)));
  formData.append("tax_amount", String(toInteger(form.tax_amount)));
  formData.append("extra_charges", String(toInteger(form.extra_charges)));
  formData.append("pricing_mode", form.pricing_mode);
  formData.append("target_profit_percent", form.target_profit_percent);
  formData.append("commission_enabled", form.commission_enabled ? "1" : "0");
  if (form.commission_enabled) formData.append("commission_amount", form.commission_amount);
  formData.append("is_active", form.is_active ? "1" : "0");
  formData.append("is_visible", form.is_visible ? "1" : "0");
  formData.append("is_featured", form.is_featured ? "1" : "0");

  if (form.image) formData.append("image", form.image);

  productFields.forEach((field) => {
    const value = technicalSpecs[field.field_key];
    if (value === null || value === undefined || value === "") return;
    formData.append(
      `technical_specs[${field.field_key}]`,
      typeof value === "boolean" ? (value ? "1" : "0") : String(value)
    );
  });

  unionRows.forEach((row, index) => {
    formData.append(`vehicle_compatibilities[${index}][vehicle_brand_id]`, row.vehicle_brand_id);
    formData.append(`vehicle_compatibilities[${index}][vehicle_model_id]`, row.vehicle_model_id);
    formData.append(`vehicle_compatibilities[${index}][vehicle_version_id]`, row.vehicle_version_id);
    formData.append(`vehicle_compatibilities[${index}][notes]`, row.notes.trim());
  });

  variants.forEach((variant, index) => {
    const compatibilityType = variant.use_general_compatibility
      ? form.compatibility_type || "universal"
      : variant.compatibility_type;
    const compatibilityRows = variant.use_general_compatibility
      ? generalRows
      : validCompatibilities(variant.vehicle_compatibilities);
    const pricing = calculatePricingPreview(variant);

    if (variant.id) formData.append(`variants[${index}][id]`, String(variant.id));
    formData.append(`variants[${index}][name]`, variant.name.trim());
    formData.append(`variants[${index}][sku]`, variant.sku.trim());
    formData.append(`variants[${index}][compatibility_type]`, compatibilityType);
    formData.append(
      `variants[${index}][vehicle_multimedia_system_id]`,
      variant.legacy_vehicle_multimedia_system_id
    );

    Object.entries(variant.specs).forEach(([fieldKey, value]) => {
      if (value === null || value === undefined || value === "") return;
      formData.append(
        `variants[${index}][specs][${fieldKey}]`,
        typeof value === "boolean" ? (value ? "1" : "0") : String(value)
      );
    });

    Object.entries(variant.legacy_attributes ?? {}).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") return;
      formData.append(`variants[${index}][attributes][${key}]`, String(value));
    });

    if (compatibilityType === "vehicle_specific") {
      compatibilityRows.forEach((row, rowIndex) => {
        const base = `variants[${index}][vehicle_compatibilities][${rowIndex}]`;
        formData.append(`${base}[vehicle_brand_id]`, row.vehicle_brand_id);
        formData.append(`${base}[vehicle_model_id]`, row.vehicle_model_id);
        formData.append(`${base}[vehicle_version_id]`, row.vehicle_version_id);
        formData.append(`${base}[vehicle_multimedia_system_id]`, row.vehicle_multimedia_system_id);
        formData.append(`${base}[year_from]`, row.year_from);
        formData.append(`${base}[year_to]`, row.year_to);
        formData.append(`${base}[notes]`, row.notes.trim());
      });
    }

    formData.append(`variants[${index}][price]`, String(pricing.price));
    formData.append(`variants[${index}][cost_price]`, String(toInteger(variant.cost_price)));
    formData.append(`variants[${index}][tax_amount]`, String(toInteger(variant.tax_amount)));
    formData.append(`variants[${index}][extra_charges]`, String(toInteger(variant.extra_charges)));
    formData.append(`variants[${index}][pricing_mode]`, variant.pricing_mode);
    formData.append(`variants[${index}][target_profit_percent]`, variant.target_profit_percent);
    formData.append(`variants[${index}][main_image]`, "");
    formData.append(`variants[${index}][is_default]`, variant.is_default ? "1" : "0");
    formData.append(`variants[${index}][is_active]`, variant.is_active ? "1" : "0");
    formData.append(`variants[${index}][is_visible]`, variant.is_visible ? "1" : "0");
    formData.append(`variants[${index}][sort_order]`, String(index));
  });

  return formData;
};

export const productToFormState = (product: AdminProduct): ProductFormState => ({
  name: product.name,
  description: product.description ?? "",
  category_id: product.category_id ? String(product.category_id) : "",
  product_brand_id: product.product_brand_id ? String(product.product_brand_id) : "",
  compatibility_type:
    product.compatibility_type ??
    (product.vehicle_compatibilities?.length ? "vehicle_specific" : ""),
  sku: product.sku ?? "",
  price: String(product.price ?? 0),
  cost_price: String(product.cost_price ?? 0),
  tax_amount: String(product.tax_amount ?? 0),
  extra_charges: String(product.extra_charges ?? 0),
  pricing_mode: product.pricing_mode ?? "manual",
  target_profit_percent:
    product.target_profit_percent === null ? "" : String(product.target_profit_percent),
  commission_enabled: product.commission_enabled,
  commission_amount: product.commission_amount === null ? "" : String(product.commission_amount),
  is_active: product.is_active,
  is_visible: product.is_visible,
  is_featured: product.is_featured,
  image: null,
});
