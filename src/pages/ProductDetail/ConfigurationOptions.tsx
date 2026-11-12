import { Check } from "lucide-react";

type ConfigurationOption = {
  value: string;
  label: string;
  detail?: string;
  disabled?: boolean;
  soldOut?: boolean;
};

/** Presentation only: callers supply real options and selection from the resolver. */
export function ConfigurationOptions({ label, options, value, onSelect, emptyMessage, mode = "buttons" }: {
  label: string;
  options: ConfigurationOption[];
  value: string;
  onSelect: (value: string) => void;
  emptyMessage: string;
  mode?: "buttons" | "select";
}) {
  if (mode === "select") return <div className="product-configurator__options" role="group" aria-label={label}>
    {options.length ? <select aria-label={label} value={value} onChange={event => onSelect(event.target.value)}>
      <option value="">Selecciona una opción</option>
      {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>
        {option.label}{option.soldOut ? " · Agotada" : option.detail ? ` · ${option.detail}` : ""}
      </option>)}
    </select> : <p className="product-configurator__hint">{emptyMessage}</p>}
  </div>;
  return <div className="product-configurator__options" role="group" aria-label={label}>
    {options.length ? options.map(option => <button
      key={option.value}
      type="button"
      className="product-configurator__option"
      data-option-value={option.value}
      data-sold-out={option.soldOut || undefined}
      aria-pressed={value === option.value}
      disabled={option.disabled}
      onClick={() => onSelect(option.value)}
    >
      <span className="product-configurator__option-copy">
        <span>{option.label}</span>
        {option.detail ? <small>{option.detail}</small> : null}
      </span>
      <span className="product-configurator__option-mark" aria-hidden="true">
        {value === option.value ? <Check size={14} /> : null}
      </span>
    </button>) : <p className="product-configurator__hint">{emptyMessage}</p>}
  </div>;
}
