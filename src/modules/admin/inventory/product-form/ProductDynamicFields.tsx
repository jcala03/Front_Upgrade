import type { ProductCategoryField } from "../../../../types/productCategory";
import type { ProductTechnicalSpecs } from "../../../../types/product";

type ProductDynamicFieldsProps = {
  fields: ProductCategoryField[];
  values: ProductTechnicalSpecs;
  errors?: Record<string, string>;
  errorPrefix: string;
  onChange: (field: ProductCategoryField, value: string | boolean) => void;
};

export const ProductDynamicFields = ({
  fields,
  values,
  errors = {},
  errorPrefix,
  onChange,
}: ProductDynamicFieldsProps) => {
  if (fields.length === 0) {
    return <p className="smart-product-form__empty">No hay campos adicionales para esta categoría.</p>;
  }

  return (
    <div className="smart-product-form__grid">
      {fields.map((field) => {
        const value = values[field.field_key];
        const errorKey = `${errorPrefix}.${field.field_key}`;
        const inputId = `${errorPrefix}-${field.id}`.replaceAll(".", "-");
        const label = `${field.name}${field.filter_unit ? ` (${field.filter_unit})` : ""}`;

        if (field.type === "boolean") {
          return (
            <label className="smart-product-form__check" key={field.id} htmlFor={inputId}>
              <input
                id={inputId}
                type="checkbox"
                checked={Boolean(value)}
                onChange={(event) => onChange(field, event.target.checked)}
                aria-describedby={errors[errorKey] ? `${inputId}-error` : undefined}
              />
              <span>{label}{field.is_required ? " *" : ""}</span>
              {errors[errorKey] ? <small id={`${inputId}-error`} className="smart-product-form__field-error">{errors[errorKey]}</small> : null}
            </label>
          );
        }

        return (
          <label className="smart-product-form__field" key={field.id} htmlFor={inputId}>
            <span>{label}{field.is_required ? " *" : ""}</span>
            {field.type === "select" ? (
              <select
                id={inputId}
                value={typeof value === "string" ? value : ""}
                onChange={(event) => onChange(field, event.target.value)}
                required={field.is_required}
                aria-invalid={Boolean(errors[errorKey])}
              >
                <option value="">Seleccionar</option>
                {(field.options ?? []).map((option) => <option value={option} key={option}>{option}</option>)}
              </select>
            ) : (
              <input
                id={inputId}
                type={field.type === "number" ? "number" : "text"}
                value={typeof value === "string" || typeof value === "number" ? value : ""}
                onChange={(event) => onChange(field, event.target.value)}
                required={field.is_required}
                aria-invalid={Boolean(errors[errorKey])}
              />
            )}
            {errors[errorKey] ? <small id={`${inputId}-error`} className="smart-product-form__field-error">{errors[errorKey]}</small> : null}
          </label>
        );
      })}
    </div>
  );
};
