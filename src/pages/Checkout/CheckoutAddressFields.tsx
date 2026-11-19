import { useState } from "react";
import type { PublicShippingAddress } from "../../types/order";
import { colombianCity, colombianCityValue, colombianDepartment, colombianDepartments, composeStreet, emptyStreet, parseStreet, shippingCountries, streetTypes, type StreetParts } from "./shippingAddress";

type Props = {
  address: PublicShippingAddress;
  disabled: boolean;
  errors: Record<string, string[]>;
  onChange: (patch: Partial<PublicShippingAddress>) => void;
};

export function CheckoutAddressFields({ address, disabled, errors, onChange }: Props) {
  const colombia = address.country_code === "CO";
  const department = colombia ? colombianDepartment(address.state) : undefined;
  const city = colombianCity(department, address.city);
  const [parts, setParts] = useState<StreetParts>(() => parseStreet(address.address_line1) ?? emptyStreet());
  const [structured, setStructured] = useState(() => colombia && (!address.address_line1 || !!parseStreet(address.address_line1)));
  const errorId = (key: string) => errors[key]?.length ? `delivery-error-${key}` : undefined;
  const error = (key: string) => errors[key]?.length ? <small id={errorId(key)} className="checkout-delivery__field-error">{errors[key].join(" ")}</small> : null;
  const field = (key: keyof PublicShippingAddress, maxLength: number, autoComplete: string) => <input name={key} value={address[key] ?? ""} type="text" required maxLength={maxLength}
    pattern=".*\S.*" autoComplete={autoComplete} disabled={disabled} onChange={event => onChange({ [key]: event.target.value })}
    aria-invalid={!!errors[key]?.length} aria-describedby={errorId(key)} />;

  function changePart(key: keyof StreetParts, value: string) {
    const next = { ...parts, [key]: value };
    setParts(next);
    onChange({ address_line1: composeStreet(next) ?? "" });
  }

  function changeFormat(next: boolean) {
    setStructured(next);
    if (next) {
      const parsed = parseStreet(address.address_line1);
      const nextParts = parsed ?? parts;
      setParts(nextParts);
      onChange({ address_line1: composeStreet(nextParts) ?? "" });
    }
  }

  return <>
    <div className="checkout-form__grid checkout-address__location">
      <label><span>País</span>
        <select name="country_code" value={address.country_code} required autoComplete="shipping country" disabled={disabled}
          aria-invalid={!!errors.country_code?.length} aria-describedby={errorId("country_code")}
          onChange={event => onChange({ country_code: event.target.value, state: "", city: "", postal_code: "" })}>
          <option value="">Selecciona un país</option>
          {!shippingCountries.some(([code]) => code === address.country_code) && address.country_code && <option value={address.country_code}>{address.country_code} (dirección guardada)</option>}
          {shippingCountries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>{error("country_code")}
      </label>
      <label><span>Departamento / Estado</span>
        {colombia ? <select name="state" value={department?.shippingName ?? address.state} required autoComplete="shipping address-level1" disabled={disabled}
          aria-invalid={!!errors.state?.length} aria-describedby={errorId("state")}
          onChange={event => onChange({ state: event.target.value, city: "", postal_code: "" })}>
          <option value="">Selecciona un departamento</option>
          {!department && address.state && <option value={address.state}>{address.state} (dirección guardada)</option>}
          {colombianDepartments.map(item => <option key={item.id} value={item.shippingName}>{item.name}</option>)}
        </select> : field("state", 120, "shipping address-level1")}{error("state")}
      </label>
      <label><span>Ciudad / Municipio</span>
        {colombia ? <select name="city" value={city ? colombianCityValue(city[0], city[1]) : address.city} required autoComplete="shipping address-level2" disabled={disabled || !department}
          aria-invalid={!!errors.city?.length} aria-describedby={errorId("city")}
          onChange={event => onChange({ city: event.target.value, postal_code: "" })}>
          <option value="">{department ? "Selecciona tu ciudad o municipio" : "Elige primero un departamento"}</option>
          {!city && address.city && <option value={address.city}>{address.city} (dirección guardada)</option>}
          {department?.cities.map(([id, name]) => <option key={id} value={colombianCityValue(id, name)}>{name}</option>)}
        </select> : field("city", 120, "shipping address-level2")}{error("city")}
      </label>
      <label><span id="delivery-postal-label">Código postal</span>
        <input name="postal_code" type="text" value={address.postal_code} required maxLength={colombia ? 6 : 20} pattern={colombia ? "[0-9]{6}" : ".*\\S.*"}
          inputMode={colombia ? "numeric" : "text"} autoComplete="shipping postal-code" disabled={disabled} placeholder={colombia ? "6 dígitos" : "Código de tu dirección"}
          title={colombia ? "Escribe los 6 dígitos del código postal de tu dirección." : undefined}
          onChange={event => onChange({ postal_code: event.target.value })} aria-labelledby="delivery-postal-label" aria-invalid={!!errors.postal_code?.length} aria-describedby={["delivery-postal-help", errorId("postal_code")].filter(Boolean).join(" ")} />
        <small id="delivery-postal-help">Corresponde a tu dirección, no solo a la ciudad.</small>{error("postal_code")}
      </label>
    </div>
    {!colombia && <p className="checkout-address__help">Para este país, escribe el estado y la ciudad como aparecen en tu dirección. La cobertura se confirma al cotizar.</p>}
    <fieldset className="checkout-address__street" disabled={disabled}>
      <legend>Dirección de entrega</legend>
      {colombia && <div className="checkout-address__formats">
        <label><input type="radio" name="address_format" checked={structured} onChange={() => changeFormat(true)} /><span>Dirección urbana</span></label>
        <label><input type="radio" name="address_format" checked={!structured} onChange={() => changeFormat(false)} /><span>Dirección rural u otro formato</span></label>
      </div>}
      {structured && colombia ? <>
        <div className="checkout-address__street-grid">
          <label><span>Tipo de vía principal</span><select name="address_line1" value={parts.type} required onChange={event => changePart("type", event.target.value)} aria-invalid={!!errors.address_line1?.length} aria-describedby={errorId("address_line1")}>
            <option value="">Selecciona</option>{streetTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select></label>
          <label><span>Número o nombre de vía</span><input name="street_main" type="text" value={parts.main} required maxLength={80} pattern="[^#\r\n]*\S[^#\r\n]*" placeholder="Ej. 30 o Las Palmas" onChange={event => changePart("main", event.target.value)} /></label>
          <span className="checkout-address__separator" aria-hidden="true">#</span>
          <label><span>Vía generadora</span><input name="street_cross" type="text" value={parts.cross} required maxLength={60} pattern="[^#\r\n]*\S[^#\r\n]*" placeholder="Ej. 42A" onChange={event => changePart("cross", event.target.value)} /></label>
          <span className="checkout-address__separator" aria-hidden="true">−</span>
          <label><span>Placa o puerta</span><input name="street_door" type="text" value={parts.door} required maxLength={20} pattern="[0-9]+[a-zA-Z]?" placeholder="Ej. 24" onChange={event => changePart("door", event.target.value)} /></label>
        </div>
        <p className="checkout-address__preview" aria-live="polite"><span>Tu dirección</span><strong>{composeStreet(parts) ?? "Completa los campos para formar tu dirección"}</strong></p>
      </> : <label><span>Dirección completa</span>{field("address_line1", 220, "shipping address-line1")}</label>}
      {error("address_line1")}
    </fieldset>
  </>;
}
