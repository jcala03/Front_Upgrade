import { useId } from "react";
import { shippingFields, shippingReadiness, type ShippingDraft, type ShippingField } from "./productShipping";

export const ProductShippingFields = ({ draft, onChange, errors = {}, errorPrefix = "", general, requiresShipping = true }: {
  draft: ShippingDraft;
  onChange: (key: ShippingField, value: string) => void;
  errors?: Record<string, string>;
  errorPrefix?: string;
  general?: ShippingDraft;
  requiresShipping?: boolean;
}) => {
  const id = useId();
  return <div className="smart-product-form__shipping">
    <p className="smart-product-form__hint" id={`${id}-help`}>Medidas del paquete listo para despachar, incluido su embalaje. {general ? "Los campos vacíos heredan el valor general del producto." : "No se asignan medidas automáticamente."}</p>
    <div className="smart-product-form__grid">
      {shippingFields.map(({ key, storedKey, label, step, min }) => {
        const error = errors[errorPrefix + storedKey];
        return <label className="smart-product-form__field" key={key}>
          <span>{label}</span>
          <input type="number" inputMode={key === "weight_grams" ? "numeric" : "decimal"} min={min} step={step}
            max={key === "weight_grams" ? "4294967295" : "429496729.5"}
            value={draft[key]} placeholder={general?.[key] ? `General: ${general[key]}` : "Sin registrar"}
            data-error-key={errorPrefix + storedKey} aria-invalid={Boolean(error)}
            aria-describedby={`${id}-help${error ? ` ${id}-${key}-error` : ""}`}
            onChange={event => onChange(key, event.target.value)} />
          {error ? <small className="smart-product-form__field-error" id={`${id}-${key}-error`}>{error}</small> : null}
        </label>;
      })}
    </div>
    <ShippingReadiness draft={draft} general={general} requiresShipping={requiresShipping} />
  </div>;
};

export const ShippingReadiness = ({ draft, general, requiresShipping = true }: { draft: ShippingDraft; general?: ShippingDraft; requiresShipping?: boolean }) => {
  const { complete, missing } = shippingReadiness(draft, general);
  return <p className="smart-product-form__hint smart-product-form__shipping-status" role="status">
    {!requiresShipping ? "Este producto está registrado como no sujeto a envío físico. Se conserva su configuración actual."
      : complete ? "Medidas completas para solicitar cotización. La tarifa depende del destino, la sede de despacho y la cobertura del transportador."
      : `Pendiente para cotizar envío: ${missing.join(", ")}. Puedes guardar el artículo, pero estas medidas deben completarse antes de solicitar envío a domicilio.`}
  </p>;
};
