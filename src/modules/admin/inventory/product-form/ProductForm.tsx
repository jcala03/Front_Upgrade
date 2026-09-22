import { FormEvent, useMemo, useState } from "react";
import { createProduct, updateProduct } from "../../../../api/products";
import { hasPermission } from "../../../../utils/authStorage";
import type { ProductCategoryField } from "../../../../types/productCategory";
import type { ProductCompatibilityType, ProductTechnicalSpecs } from "../../../../types/product";
import type { VehicleMultimediaSystem } from "../../../../types/vehicle";
import { ProductDynamicFields } from "./ProductDynamicFields";
import type {
  ProductFormErrors,
  ProductFormProps,
  ProductFormState,
  ProductVariantDraft,
  VariantCompatibilityDraft,
} from "./productFormTypes";
import {
  buildProductFormData,
  calculatePricingPreview,
  emptyCompatibility,
  emptyProductForm,
  emptyVariant,
  getFieldDefaultValue,
  productToFormState,
  suggestVariantName,
  toDecimal,
} from "./productFormUtils";
import "./ProductForm.css";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export const ProductForm = ({
  product,
  categories,
  productBrands,
  vehicleBrands,
  vehicleModels,
  vehicleVersions,
  vehicleMultimediaSystems,
  onCancel,
  onSaved,
}: ProductFormProps) => {
  const initialCategory = categories.find((category) => category.id === product?.category_id);
  const initialVariantFields = initialCategory?.fields.filter(
    (field) => field.is_active && field.scope === "variant"
  ) ?? [];

  const [form, setForm] = useState<ProductFormState>(() =>
    product ? productToFormState(product) : { ...emptyProductForm }
  );
  const [technicalSpecs, setTechnicalSpecs] = useState<ProductTechnicalSpecs>(
    product?.technical_specs ?? {}
  );
  const [generalCompatibilities, setGeneralCompatibilities] = useState<VariantCompatibilityDraft[]>(() =>
    product?.vehicle_compatibilities?.length
      ? product.vehicle_compatibilities.map((row) => ({
          ...emptyCompatibility(),
          vehicle_brand_id: String(row.vehicle_brand_id),
          vehicle_model_id: row.vehicle_model_id ? String(row.vehicle_model_id) : "",
          vehicle_version_id: row.vehicle_version_id ? String(row.vehicle_version_id) : "",
          notes: row.notes ?? "",
        }))
      : [emptyCompatibility()]
  );
  const [variants, setVariants] = useState<ProductVariantDraft[]>(() =>
    product?.variants?.map((variant, index) => {
      const normalizedSpecs = Object.keys(variant.specs ?? {}).length > 0
        ? variant.specs
        : initialVariantFields.reduce<ProductTechnicalSpecs>((values, field) => {
            const legacyValue = variant.attributes?.[field.field_key];
            if (legacyValue !== undefined && legacyValue !== null) values[field.field_key] = legacyValue;
            return values;
          }, {});
      const variantCompatibilities = variant.vehicle_compatibilities?.map((row) => ({
        ...emptyCompatibility(),
        vehicle_brand_id: String(row.vehicle_brand_id),
        vehicle_model_id: row.vehicle_model_id ? String(row.vehicle_model_id) : "",
        vehicle_version_id: row.vehicle_version_id ? String(row.vehicle_version_id) : "",
        vehicle_multimedia_system_id: row.vehicle_multimedia_system_id
          ? String(row.vehicle_multimedia_system_id)
          : "",
        year_from: row.year_from ? String(row.year_from) : "",
        year_to: row.year_to ? String(row.year_to) : "",
        notes: row.notes ?? "",
        is_advanced: Boolean(
          row.vehicle_multimedia_system_id || row.year_from || row.year_to || row.notes
        ),
      })) ?? [];

      return {
        ...emptyVariant(index),
        id: variant.id,
        name: variant.name,
        name_is_custom: Boolean(variant.name),
        sku: variant.sku ?? "",
        specs: normalizedSpecs,
        legacy_attributes: variant.attributes,
        legacy_vehicle_multimedia_system_id: variant.vehicle_multimedia_system_id
          ? String(variant.vehicle_multimedia_system_id)
          : "",
        use_general_compatibility: variantCompatibilities.length === 0,
        compatibility_type:
          variant.compatibility_type ?? variant.effective_compatibility_type ?? "vehicle_specific",
        vehicle_compatibilities:
          variantCompatibilities.length > 0 ? variantCompatibilities : [emptyCompatibility()],
        price: String(variant.price ?? 0),
        cost_price: String(variant.cost_price ?? 0),
        tax_amount: String(variant.tax_amount ?? 0),
        extra_charges: String(variant.extra_charges ?? 0),
        pricing_mode: variant.pricing_mode ?? "manual",
        target_profit_percent:
          variant.target_profit_percent === null ? "" : String(variant.target_profit_percent),
        is_default: variant.is_default,
        is_active: variant.is_active,
        is_visible: variant.is_visible,
        sort_order: String(variant.sort_order ?? index),
      };
    }) ?? []
  );
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((category) => String(category.id) === form.category_id) ?? null,
    [categories, form.category_id]
  );
  const productFields = useMemo(
    () => selectedCategory?.fields.filter((field) => field.is_active && field.scope === "product") ?? [],
    [selectedCategory]
  );
  const variantFields = useMemo(
    () => selectedCategory?.fields.filter((field) => field.is_active && field.scope === "variant") ?? [],
    [selectedCategory]
  );
  const productPricing = useMemo(() => calculatePricingPreview(form), [form]);
  const canViewInventory = hasPermission("inventory.view");

  const updateForm = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const handleCategoryChange = (categoryId: string) => {
    const nextCategory = categories.find((category) => String(category.id) === categoryId);
    const nextProductFields = nextCategory?.fields.filter(
      (field) => field.is_active && field.scope === "product"
    ) ?? [];
    const nextVariantFields = nextCategory?.fields.filter(
      (field) => field.is_active && field.scope === "variant"
    ) ?? [];

    updateForm("category_id", categoryId);
    setTechnicalSpecs(
      nextProductFields.reduce<ProductTechnicalSpecs>((values, field) => {
        values[field.field_key] = technicalSpecs[field.field_key] ?? getFieldDefaultValue(field);
        return values;
      }, {})
    );
    setVariants((current) => current.map((variant) => ({
      ...variant,
      specs: nextVariantFields.reduce<ProductTechnicalSpecs>((values, field) => {
        const currentValue = variant.specs[field.field_key];
        const legacyValue = variant.legacy_attributes?.[field.field_key];
        values[field.field_key] = currentValue ?? legacyValue ?? getFieldDefaultValue(field);
        return values;
      }, {}),
    })));
  };

  const updateCompatibility = (
    rows: VariantCompatibilityDraft[],
    setRows: (rows: VariantCompatibilityDraft[]) => void,
    index: number,
    key: keyof VariantCompatibilityDraft,
    value: string | boolean
  ) => {
    setRows(rows.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      if (key === "vehicle_brand_id") {
        return { ...row, vehicle_brand_id: String(value), vehicle_model_id: "", vehicle_version_id: "", vehicle_multimedia_system_id: "" };
      }
      if (key === "vehicle_model_id") {
        return { ...row, vehicle_model_id: String(value), vehicle_version_id: "", vehicle_multimedia_system_id: "" };
      }
      if (key === "vehicle_version_id") {
        return { ...row, vehicle_version_id: String(value), vehicle_multimedia_system_id: "", year_from: "", year_to: "" };
      }
      return { ...row, [key]: value };
    }));
  };

  const modelsForBrand = (brandId: string) =>
    vehicleModels.filter((model) => model.is_active && String(model.vehicle_brand_id) === brandId);
  const versionsForModel = (modelId: string) =>
    vehicleVersions.filter((version) => version.is_active && String(version.vehicle_model_id) === modelId);
  const systemsForCompatibility = (row: VariantCompatibilityDraft): VehicleMultimediaSystem[] => {
    const version = vehicleVersions.find((item) => String(item.id) === row.vehicle_version_id);
    if (version?.multimedia_systems?.length) {
      return version.multimedia_systems.filter((system) => system.is_active);
    }
    return vehicleMultimediaSystems.filter(
      (system) => system.is_active && String(system.vehicle_brand_id) === row.vehicle_brand_id
    );
  };

  const renderCompatibilityRows = (
    rows: VariantCompatibilityDraft[],
    setRows: (rows: VariantCompatibilityDraft[]) => void,
    prefix: string,
    advanced: boolean
  ) => (
    <div className="smart-product-form__compatibilities">
      {rows.map((row, index) => {
        const version = vehicleVersions.find((item) => String(item.id) === row.vehicle_version_id);
        return (
          <article className="smart-product-form__compatibility" key={`${prefix}-${index}`}>
            <div className="smart-product-form__compatibility-grid">
              <label className="smart-product-form__field">
                <span>Marca *</span>
                <select value={row.vehicle_brand_id} onChange={(event) => updateCompatibility(rows, setRows, index, "vehicle_brand_id", event.target.value)}>
                  <option value="">Seleccionar</option>
                  {vehicleBrands.filter((brand) => brand.is_active).map((brand) => <option value={brand.id} key={brand.id}>{brand.name}</option>)}
                </select>
              </label>
              <label className="smart-product-form__field">
                <span>Modelo</span>
                <select value={row.vehicle_model_id} disabled={!row.vehicle_brand_id} onChange={(event) => updateCompatibility(rows, setRows, index, "vehicle_model_id", event.target.value)}>
                  <option value="">Toda la marca</option>
                  {modelsForBrand(row.vehicle_brand_id).map((model) => <option value={model.id} key={model.id}>{model.name}</option>)}
                </select>
              </label>
              <label className="smart-product-form__field">
                <span>Versión / generación</span>
                <select value={row.vehicle_version_id} disabled={!row.vehicle_model_id} onChange={(event) => updateCompatibility(rows, setRows, index, "vehicle_version_id", event.target.value)}>
                  <option value="">Todas</option>
                  {versionsForModel(row.vehicle_model_id).map((item) => <option value={item.id} key={item.id}>{item.display_name}</option>)}
                </select>
                {version ? <small>Rango natural: {version.year_from}–{version.year_to ?? "Actual"}</small> : null}
              </label>
            </div>

            {advanced ? (
              <>
                <button
                  className="smart-product-form__advanced-toggle"
                  type="button"
                  aria-expanded={row.is_advanced}
                  onClick={() => updateCompatibility(rows, setRows, index, "is_advanced", !row.is_advanced)}
                >
                  {row.is_advanced ? "Ocultar opciones avanzadas" : "Opciones avanzadas"}
                </button>
                {row.is_advanced ? (
                  <div className="smart-product-form__advanced">
                    <label className="smart-product-form__field"><span>Desde</span><input type="number" min="1900" max="2100" value={row.year_from} placeholder={version ? String(version.year_from) : ""} onChange={(event) => updateCompatibility(rows, setRows, index, "year_from", event.target.value)} /></label>
                    <label className="smart-product-form__field"><span>Hasta</span><input type="number" min="1900" max="2100" value={row.year_to} placeholder={version?.year_to ? String(version.year_to) : "Actual"} onChange={(event) => updateCompatibility(rows, setRows, index, "year_to", event.target.value)} /></label>
                    <label className="smart-product-form__field"><span>Sistema multimedia OEM</span><select value={row.vehicle_multimedia_system_id} disabled={!row.vehicle_brand_id} onChange={(event) => updateCompatibility(rows, setRows, index, "vehicle_multimedia_system_id", event.target.value)}><option value="">No aplica</option>{systemsForCompatibility(row).map((system) => <option value={system.id} key={system.id}>{system.name}</option>)}</select></label>
                    <label className="smart-product-form__field"><span>Nota técnica</span><input type="text" value={row.notes} onChange={(event) => updateCompatibility(rows, setRows, index, "notes", event.target.value)} /></label>
                  </div>
                ) : null}
              </>
            ) : (
              <label className="smart-product-form__field smart-product-form__compatibility-note"><span>Nota técnica</span><input type="text" value={row.notes} onChange={(event) => updateCompatibility(rows, setRows, index, "notes", event.target.value)} /></label>
            )}

            <button className="smart-product-form__remove" type="button" onClick={() => setRows(rows.length === 1 ? [emptyCompatibility()] : rows.filter((_, rowIndex) => rowIndex !== index))}>Eliminar</button>
          </article>
        );
      })}
      <button className="smart-product-form__secondary" type="button" onClick={() => setRows([...rows, emptyCompatibility()])}>+ Agregar vehículo</button>
    </div>
  );

  const updateVariant = <K extends keyof ProductVariantDraft>(index: number, key: K, value: ProductVariantDraft[K]) => {
    setVariants((current) => current.map((variant, variantIndex) =>
      variantIndex === index ? { ...variant, [key]: value } : variant
    ));
  };

  const updateVariantSpec = (index: number, field: ProductCategoryField, value: string | boolean) => {
    setVariants((current) => current.map((variant, variantIndex) => {
      if (variantIndex !== index) return variant;
      const specs = { ...variant.specs, [field.field_key]: value };
      return {
        ...variant,
        specs,
        name: variant.name_is_custom ? variant.name : suggestVariantName(variantFields, specs),
      };
    }));
  };

  const duplicateVariant = (index: number) => {
    const source = variants[index];
    if (!source) return;
    setVariants((current) => [...current, {
      ...source,
      id: undefined,
      name: source.name ? `${source.name} copia` : "",
      name_is_custom: Boolean(source.name),
      sku: "",
      specs: { ...source.specs },
      legacy_attributes: source.legacy_attributes ? { ...source.legacy_attributes } : null,
      vehicle_compatibilities: source.vehicle_compatibilities.map((row) => ({ ...row })),
      is_default: false,
      sort_order: String(current.length),
    }]);
  };

  const validate = () => {
    const nextErrors: ProductFormErrors = {};
    if (!form.name.trim()) nextErrors.name = "El nombre es obligatorio.";
    if (!form.category_id) nextErrors.category_id = "Selecciona una categoría.";
    if (!form.compatibility_type) {
      nextErrors.compatibility = "Indica si el producto es universal o específico.";
    }

    productFields.filter((field) => field.is_required).forEach((field) => {
      const value = technicalSpecs[field.field_key];
      if (value === null || value === undefined || value === "") nextErrors[`productSpecs.${field.field_key}`] = "Campo obligatorio.";
    });

    if (form.compatibility_type === "vehicle_specific" && !generalCompatibilities.some((row) => row.vehicle_brand_id)) {
      nextErrors.compatibility = "Agrega al menos una marca compatible.";
    }

    const seenSkus = new Set<string>();
    variants.forEach((variant, index) => {
      const resolvedName = variant.name.trim() || suggestVariantName(variantFields, variant.specs);
      if (!resolvedName) nextErrors[`variants.${index}.name`] = "Indica un nombre o completa los detalles de la variante.";
      variantFields.filter((field) => field.is_required).forEach((field) => {
        const value = variant.specs[field.field_key];
        if (value === null || value === undefined || value === "") nextErrors[`variants.${index}.specs.${field.field_key}`] = "Campo obligatorio.";
      });
      const sku = variant.sku.trim().toLowerCase();
      if (sku && seenSkus.has(sku)) nextErrors[`variants.${index}.sku`] = "El SKU está repetido en otra variante.";
      if (sku) seenSkus.add(sku);
      if (variant.pricing_mode !== "manual" && variant.target_profit_percent.trim() === "") nextErrors[`variants.${index}.pricing`] = "Indica el porcentaje de rentabilidad.";
      if (variant.pricing_mode === "margin" && toDecimal(variant.target_profit_percent) >= 100) nextErrors[`variants.${index}.pricing`] = "El margen debe ser menor de 100%.";
      const effectiveType: ProductCompatibilityType = variant.use_general_compatibility
        ? (form.compatibility_type || "universal")
        : variant.compatibility_type;
      const rows = variant.use_general_compatibility ? generalCompatibilities : variant.vehicle_compatibilities;
      if (effectiveType === "vehicle_specific" && !rows.some((row) => row.vehicle_brand_id)) nextErrors[`variants.${index}.compatibility`] = "Agrega al menos una compatibilidad válida.";
      rows.forEach((row, rowIndex) => {
        if (row.year_from && row.year_to && Number(row.year_from) > Number(row.year_to)) nextErrors[`variants.${index}.compatibility.${rowIndex}`] = "El año inicial no puede superar el final.";
      });
    });

    if (form.pricing_mode !== "manual" && form.target_profit_percent.trim() === "") nextErrors.pricing = "Indica el porcentaje de rentabilidad.";
    if (form.pricing_mode === "margin" && toDecimal(form.target_profit_percent) >= 100) nextErrors.pricing = "El margen debe ser menor de 100%.";
    if (form.commission_enabled) {
      const commissionAmount = Number(form.commission_amount);
      if (!Number.isInteger(commissionAmount) || commissionAmount <= 0) nextErrors.commission_amount = "Ingresa una comisión entera mayor que cero.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    try {
      setIsSaving(true);
      const normalizedVariants = variants.map((variant) => ({
        ...variant,
        name: variant.name.trim() || suggestVariantName(variantFields, variant.specs),
      }));
      const payload = buildProductFormData({
        form,
        productFields,
        technicalSpecs,
        generalCompatibilities,
        variants: normalizedVariants,
      });
      if (product) await updateProduct(product.id, payload);
      else await createProduct(payload);
      await onSaved(product ? "Artículo actualizado correctamente." : "Artículo creado correctamente.");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No se pudo guardar el artículo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="smart-product-form" onSubmit={handleSubmit} noValidate>
      <header className="smart-product-form__header">
        <div><span>{product ? "Editar producto" : "Nuevo producto"}</span><h2>{product?.name ?? "Crear artículo"}</h2><p>Información comercial, compatibilidad y versiones en una sola pantalla.</p></div>
        <button type="button" onClick={onCancel} aria-label="Cerrar formulario">×</button>
      </header>

      <div className="smart-product-form__body">
        <section className="smart-product-form__section" aria-labelledby="product-information-title">
          <div className="smart-product-form__section-heading"><span>01</span><div><h3 id="product-information-title">Información</h3><p>Identidad principal del artículo.</p></div></div>
          <div className="smart-product-form__grid">
            <label className="smart-product-form__field"><span>Nombre *</span><input value={form.name} onChange={(event) => updateForm("name", event.target.value)} aria-invalid={Boolean(errors.name)} />{errors.name ? <small className="smart-product-form__field-error">{errors.name}</small> : null}</label>
            <label className="smart-product-form__field"><span>Categoría *</span><select value={form.category_id} onChange={(event) => handleCategoryChange(event.target.value)} aria-invalid={Boolean(errors.category_id)}><option value="">Seleccionar</option>{categories.filter((category) => category.is_active).map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select>{errors.category_id ? <small className="smart-product-form__field-error">{errors.category_id}</small> : null}</label>
            <label className="smart-product-form__field"><span>Marca del producto</span><select value={form.product_brand_id} onChange={(event) => updateForm("product_brand_id", event.target.value)}><option value="">Sin marca</option>{productBrands.filter((brand) => brand.is_active).map((brand) => <option value={brand.id} key={brand.id}>{brand.name}</option>)}</select></label>
            <label className="smart-product-form__field"><span>SKU / referencia</span><input value={form.sku} onChange={(event) => updateForm("sku", event.target.value)} /></label>
            <label className="smart-product-form__field smart-product-form__wide"><span>Descripción</span><textarea rows={3} value={form.description} onChange={(event) => updateForm("description", event.target.value)} /></label>
            <label className="smart-product-form__field smart-product-form__wide"><span>Imagen principal</span><input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={(event) => updateForm("image", event.target.files?.[0] ?? null)} />{product?.image_url && !form.image ? <small>Se conservará la imagen actual.</small> : null}</label>
          </div>
        </section>

        <section className="smart-product-form__section" aria-labelledby="product-details-title">
          <div className="smart-product-form__section-heading"><span>02</span><div><h3 id="product-details-title">Detalles</h3><p>Campos definidos por la categoría para el producto.</p></div></div>
          <ProductDynamicFields fields={productFields} values={technicalSpecs} errors={errors} errorPrefix="productSpecs" onChange={(field, value) => setTechnicalSpecs((current) => ({ ...current, [field.field_key]: value }))} />
        </section>

        <section className="smart-product-form__section" aria-labelledby="product-compatibility-title">
          <div className="smart-product-form__section-heading"><span>03</span><div><h3 id="product-compatibility-title">Compatibilidad</h3><p>¿Para qué vehículos sirve?</p></div></div>
          <div className="smart-product-form__choice-grid">
            {(["universal", "vehicle_specific"] as ProductCompatibilityType[]).map((type) => <label className={form.compatibility_type === type ? "smart-product-form__choice is-active" : "smart-product-form__choice"} key={type}><input type="radio" name="product-compatibility" checked={form.compatibility_type === type} onChange={() => updateForm("compatibility_type", type)} /><strong>{type === "universal" ? "Universal" : "Vehículos específicos"}</strong><small>{type === "universal" ? "No requiere selección vehicular." : "Define marcas, modelos o versiones."}</small></label>)}
          </div>
          {errors.compatibility ? <p className="smart-product-form__section-error">{errors.compatibility}</p> : null}
          {form.compatibility_type === "vehicle_specific" ? renderCompatibilityRows(generalCompatibilities, setGeneralCompatibilities, "general", false) : <p className="smart-product-form__hint">Este artículo podrá utilizarse sin asociarlo a un vehículo concreto.</p>}
        </section>

        <section className="smart-product-form__section" aria-labelledby="product-pricing-title">
          <div className="smart-product-form__section-heading"><span>04</span><div><h3 id="product-pricing-title">Precio</h3><p>Valores comerciales base del producto.</p></div></div>
          <PricingFields draft={form} update={updateForm} preview={productPricing} error={errors.pricing} />
          <InventoryNotice canViewInventory={canViewInventory} />
        </section>

        <section className="smart-product-form__section" aria-labelledby="product-variants-title">
          <div className="smart-product-form__section-heading smart-product-form__section-heading--action"><span>05</span><div><h3 id="product-variants-title">Variantes</h3><p>Opcionales: configuraciones con precio o compatibilidad propia.</p></div><button className="smart-product-form__secondary" type="button" onClick={() => setVariants((current) => [...current, emptyVariant(current.length)])}>+ Agregar variante</button></div>
          {variants.length === 0 ? <p className="smart-product-form__empty">Este producto es simple. Agrega una variante solo si tiene versiones diferentes.</p> : null}
          <div className="smart-product-form__variants">
            {variants.map((variant, index) => {
              const pricing = calculatePricingPreview(variant);
              const variantRowsSetter = (rows: VariantCompatibilityDraft[]) => updateVariant(index, "vehicle_compatibilities", rows);
              return (
                <article className="smart-product-form__variant" key={variant.id ?? `new-${index}`}>
                  <header>
                    <div>
                      <strong>Variante {index + 1}{variant.is_default ? " · Principal" : ""}</strong>
                      <small>{suggestVariantName(variantFields, variant.specs) || "Configura sus detalles"}</small>
                    </div>
                    <div>
                      <button type="button" onClick={() => setVariants((current) => current.map((item, itemIndex) => ({ ...item, is_default: itemIndex === index })))}>Principal</button>
                      <button type="button" onClick={() => duplicateVariant(index)}>Duplicar</button>
                      <button
                        type="button"
                        className="is-danger"
                        onClick={() => setVariants((current) => {
                          const next = current.filter((_, itemIndex) => itemIndex !== index);
                          return next.length > 0 && !next.some((item) => item.is_default)
                            ? next.map((item, itemIndex) => ({ ...item, is_default: itemIndex === 0 }))
                            : next;
                        })}
                      >
                        Eliminar
                      </button>
                    </div>
                  </header>
                  <div className="smart-product-form__grid">
                    <label className="smart-product-form__field"><span>Nombre</span><input value={variant.name} placeholder={suggestVariantName(variantFields, variant.specs) || "Nombre de variante"} onChange={(event) => { updateVariant(index, "name", event.target.value); updateVariant(index, "name_is_custom", event.target.value.trim() !== ""); }} />{errors[`variants.${index}.name`] ? <small className="smart-product-form__field-error">{errors[`variants.${index}.name`]}</small> : null}</label>
                    <label className="smart-product-form__field"><span>SKU</span><input value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} />{errors[`variants.${index}.sku`] ? <small className="smart-product-form__field-error">{errors[`variants.${index}.sku`]}</small> : null}</label>
                  </div>
                  <div className="smart-product-form__subsection"><h4>Detalles de esta variante</h4><ProductDynamicFields fields={variantFields} values={variant.specs} errors={errors} errorPrefix={`variants.${index}.specs`} onChange={(field, value) => updateVariantSpec(index, field, value)} /></div>
                  <div className="smart-product-form__subsection"><h4>Precio</h4><PricingFields draft={variant} update={(key, value) => updateVariant(index, key, value)} preview={pricing} error={errors[`variants.${index}.pricing`]} /></div>
                  <div className="smart-product-form__subsection"><label className="smart-product-form__check"><input type="checkbox" checked={variant.use_general_compatibility} onChange={(event) => updateVariant(index, "use_general_compatibility", event.target.checked)} /><span>Usar la compatibilidad general del producto</span></label>{variant.use_general_compatibility ? <p className="smart-product-form__hint">Usará {form.compatibility_type === "universal" ? "compatibilidad universal" : `${generalCompatibilities.filter((row) => row.vehicle_brand_id).length} compatibilidades del producto`}.</p> : <><div className="smart-product-form__choice-grid smart-product-form__choice-grid--small">{(["universal", "vehicle_specific"] as ProductCompatibilityType[]).map((type) => <label className={variant.compatibility_type === type ? "smart-product-form__choice is-active" : "smart-product-form__choice"} key={type}><input type="radio" name={`variant-compatibility-${index}`} checked={variant.compatibility_type === type} onChange={() => updateVariant(index, "compatibility_type", type)} /><strong>{type === "universal" ? "Universal" : "Específica"}</strong></label>)}</div>{errors[`variants.${index}.compatibility`] ? <p className="smart-product-form__section-error">{errors[`variants.${index}.compatibility`]}</p> : null}{variant.compatibility_type === "vehicle_specific" ? renderCompatibilityRows(variant.vehicle_compatibilities, variantRowsSetter, `variant-${index}`, true) : null}</>}</div>
                  <div className="smart-product-form__checks"><label className="smart-product-form__check"><input type="checkbox" checked={variant.is_active} onChange={(event) => updateVariant(index, "is_active", event.target.checked)} /><span>Activa</span></label><label className="smart-product-form__check"><input type="checkbox" checked={variant.is_visible} onChange={(event) => updateVariant(index, "is_visible", event.target.checked)} /><span>Visible</span></label></div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="smart-product-form__section" aria-labelledby="product-commission-title">
          <div className="smart-product-form__section-heading"><span>06</span><div><h3 id="product-commission-title">Comisión comercial</h3><p>Configura el monto fijo que recibe el colaborador por cada unidad vendida.</p></div></div>
          <div className="smart-product-form__commission">
            <label className="smart-product-form__check"><input type="checkbox" checked={form.commission_enabled} onChange={(event) => { updateForm("commission_enabled", event.target.checked); if (!event.target.checked) updateForm("commission_amount", ""); }} /><span>Genera comisión</span></label>
            <label className="smart-product-form__field"><span>Comisión por unidad (COP) {form.commission_enabled ? "*" : ""}</span><input type="number" min="1" step="1" inputMode="numeric" disabled={!form.commission_enabled} required={form.commission_enabled} value={form.commission_amount} aria-invalid={Boolean(errors.commission_amount)} onChange={(event) => updateForm("commission_amount", event.target.value)} />{errors.commission_amount ? <small className="smart-product-form__field-error">{errors.commission_amount}</small> : <small>Monto fijo que recibe el colaborador por cada unidad vendida.</small>}</label>
          </div>
          {variants.length > 0 ? <p className="smart-product-form__hint">Las variantes heredan la comisión configurada en el producto.</p> : null}
        </section>

        <section className="smart-product-form__section" aria-labelledby="product-publication-title">
          <div className="smart-product-form__section-heading"><span>07</span><div><h3 id="product-publication-title">Publicación / estado</h3><p>Control operativo y visibilidad.</p></div></div>
          <div className="smart-product-form__checks"><label className="smart-product-form__check"><input type="checkbox" checked={form.is_active} onChange={(event) => updateForm("is_active", event.target.checked)} /><span>Producto activo</span></label><label className="smart-product-form__check"><input type="checkbox" checked={form.is_visible} onChange={(event) => updateForm("is_visible", event.target.checked)} /><span>Visible en ecommerce</span></label><label className="smart-product-form__check"><input type="checkbox" checked={form.is_featured} onChange={(event) => updateForm("is_featured", event.target.checked)} /><span>Producto destacado</span></label></div>
        </section>
      </div>

      <footer className="smart-product-form__footer">
        <div>{submitError ? <p role="alert">{submitError}</p> : Object.keys(errors).length > 0 ? <p role="alert">Revisa los campos marcados antes de guardar.</p> : null}</div>
        <button type="button" onClick={onCancel} disabled={isSaving}>Cancelar</button>
        <button type="submit" disabled={isSaving}>{isSaving ? "Guardando…" : "Guardar producto"}</button>
      </footer>
    </form>
  );
};

type PricingFieldsProps<T extends ProductFormState | ProductVariantDraft> = {
  draft: T;
  update: <K extends keyof T>(key: K, value: T[K]) => void;
  preview: ReturnType<typeof calculatePricingPreview>;
  error?: string;
};

const InventoryNotice = ({ canViewInventory }: { canViewInventory: boolean }) => (
  <aside className="smart-product-form__inventory-note" aria-labelledby="product-inventory-note-title">
    <div>
      <h4 id="product-inventory-note-title">Inventario por sede</h4>
      <p>El inventario se administra por sede desde el módulo de Existencias.</p>
    </div>
    {canViewInventory ? <a href="/crm/inventory">Gestionar inventario</a> : null}
  </aside>
);

const PricingFields = <T extends ProductFormState | ProductVariantDraft>({ draft, update, preview, error }: PricingFieldsProps<T>) => (
  <>
    <div className="smart-product-form__grid smart-product-form__pricing-grid">
      {(["cost_price", "tax_amount", "extra_charges"] as const).map((key) => <label className="smart-product-form__field" key={key}><span>{key === "cost_price" ? "Costo" : key === "tax_amount" ? "Impuestos" : "Cargos extra"}</span><input type="number" min="0" value={draft[key]} onChange={(event) => update(key, event.target.value as T[typeof key])} /></label>)}
      <label className="smart-product-form__field"><span>Modo de precio</span><select value={draft.pricing_mode} onChange={(event) => update("pricing_mode", event.target.value as T["pricing_mode"])}><option value="manual">Manual</option><option value="markup">Ganancia sobre costo</option><option value="margin">Margen real</option></select></label>
      {draft.pricing_mode === "manual" ? <label className="smart-product-form__field"><span>Precio de venta</span><input type="number" min="0" value={draft.price} onChange={(event) => update("price", event.target.value as T["price"])} /></label> : <label className="smart-product-form__field"><span>{draft.pricing_mode === "markup" ? "Ganancia sobre costo %" : "Margen deseado %"}</span><input type="number" min="0" max={draft.pricing_mode === "margin" ? 99 : undefined} value={draft.target_profit_percent} onChange={(event) => update("target_profit_percent", event.target.value as T["target_profit_percent"])} /></label>}
    </div>
    {error ? <p className="smart-product-form__section-error">{error}</p> : null}
    <div className="smart-product-form__pricing-preview"><span>Costo total <strong>{formatCurrency(preview.totalCost)}</strong></span><span>Venta <strong>{formatCurrency(preview.price)}</strong></span><span>Ganancia <strong>{formatCurrency(preview.profitAmount)}</strong></span><span>Margen <strong>{preview.profitMarginPercent.toFixed(2)}%</strong></span></div>
  </>
);
