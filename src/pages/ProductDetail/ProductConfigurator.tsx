import { useId } from "react";
import type { Product } from "../../types/product";
import type { ProductConfiguratorModel } from "./useProductConfigurator";
import { ConfigurationOptions } from "./ConfigurationOptions";

const messages = {
  not_applicable: "No hay variantes preparadas para configurar este producto. Consulta con el taller.",
  incomplete: "Completa el sistema original y la memoria para identificar tu referencia.",
  nonexistent: "Esta combinación no existe en el catálogo público. Revisa tu selección.",
  out_of_stock: "La referencia seleccionada está agotada.",
  unavailable: "La referencia seleccionada no está disponible para compra.",
  insufficient_data: "Faltan datos verificados para completar esta configuración. Consulta con el taller.",
  ambiguous: "Hay varias referencias para esta configuración. Elige la referencia comercial correspondiente.",
  valid: "Configuración identificada.",
};
export function ProductConfigurator({ model, interactive }: { model: ProductConfiguratorModel; product: Product; interactive: boolean }) {
  const id = useId();
  const { selection, resolution } = model;
  const selectedVehicle = model.vehicleContext.status === "resolved" && resolution.options.vehicles.some(row =>
    row.vehicle_brand_id === selection.vehicle_brand_id && row.vehicle_model_id === selection.vehicle_model_id && row.vehicle_version_id === selection.vehicle_version_id);
  const oem = resolution.options.oems.find(option => option.vehicle_multimedia_system_id === selection.vehicle_multimedia_system_id);
  const memoryValue = selection.ram_gb != null && selection.almacenamiento_gb != null
    ? `${selection.ram_gb}/${selection.almacenamiento_gb}` : "";
  const memories = selectedVehicle ? model.vehicleMemoryOptions : [];
  const busy = model.loadStatus === "loading" || model.loadStatus === "idle";
  const disabled = !interactive || busy;
  const failureStatus = model.failure === "configuration" ? "insufficient_data" : model.failure === "unavailable" ? "unavailable" : "connection_error";
  const statusMessage = model.loadStatus === "error" ? model.failure === "configuration"
    ? "No pudimos verificar los datos de configuración de este producto. Consulta con el taller."
    : model.failure === "unavailable" ? "Este producto ya no está disponible en el catálogo público."
    : "No pudimos consultar las configuraciones. Comprueba tu conexión y vuelve a intentarlo."
    : busy ? "Consultando todas las configuraciones disponibles…" : messages[resolution.status];

  if (!model.uiEnabled) return <section className="product-configurator" aria-label="Configuración del producto"><h2>Configuración requerida</h2><p role="status">Este producto requiere verificar su configuración con el taller. La compra online no está disponible por el momento.</p></section>;

  return <section className="product-configurator" aria-labelledby={`${id}-title`} aria-busy={busy}>
    <header className="product-configurator__header"><h2 id={`${id}-title`}>Configura tu producto</h2><span>2 pasos</span></header>
    <p className="product-configurator__intro">Elige el sistema original y la capacidad que necesitas.</p>
    {!busy && model.loadStatus !== "error" && !selectedVehicle ? <p className="product-configurator__hint" role="status" data-vehicle-context={model.vehicleContext.status}>
      {model.vehicleContext.status === "ambiguous"
        ? "Esta pantalla tiene compatibilidades con varios vehículos. Abre su ficha desde los filtros de tu vehículo o consulta con el taller."
        : model.vehicleContext.status === "year_required"
          ? "Esta referencia necesita un año verificado. Revisa la compatibilidad desde los filtros de la tienda o consulta con el taller."
          : "No pudimos confirmar un vehículo compatible para esta configuración. Revisa los filtros o consulta con el taller."}
      {" "}<a href="/tienda">Verificar compatibilidad en la tienda</a>
    </p> : null}
    <fieldset disabled={disabled || !selectedVehicle}><legend>1 · Sistema original</legend>
      <ConfigurationOptions label="Sistema OEM" value={String(selection.vehicle_multimedia_system_id ?? "")}
        options={(selectedVehicle ? resolution.options.oems : []).map(option => ({ value: String(option.vehicle_multimedia_system_id),
          label: option.name ?? "Sistema registrado", detail: option.available_variant_ids.length ? undefined : "Sin stock",
          soldOut: !option.available_variant_ids.length }))}
        onSelect={value => model.select({ vehicle_multimedia_system_id: Number(value) })}
        emptyMessage={selectedVehicle ? "No hay sistemas registrados para esta compatibilidad. Revisa los filtros o consulta con el taller." : "Las opciones estarán disponibles al confirmar la compatibilidad del artículo."} />
      <details className="product-configurator__help"><summary>¿No sabes qué sistema original tiene tu vehículo?</summary><p>Consulta con el taller y comparte una fotografía del menú original y las conexiones del vehículo. El año por sí solo no identifica el sistema. No selecciones uno por aproximación.</p></details>
    </fieldset>
    <fieldset disabled={disabled || !selectedVehicle || !oem}><legend>2 · RAM y almacenamiento</legend>
      <ConfigurationOptions label="Configuración de memoria" value={memoryValue}
        options={memories.map(memory => {
          const compatible = resolution.options.memories.find(option => option.ram_gb === memory.ram_gb && option.almacenamiento_gb === memory.almacenamiento_gb);
          const soldOut = Boolean(compatible && !compatible.available_variant_ids.length);
          return { value: `${memory.ram_gb}/${memory.almacenamiento_gb}`, label: `${memory.ram_gb} GB / ${memory.almacenamiento_gb} GB`,
            disabled: Boolean(oem && !compatible), soldOut,
            detail: oem && !compatible ? "No disponible para este sistema" : soldOut ? "Agotada · consultar referencia" : undefined };
        })}
        onSelect={value => {
          const memory = resolution.options.memories.find(option => `${option.ram_gb}/${option.almacenamiento_gb}` === value);
          if (memory) model.select({ ram_gb: memory.ram_gb, almacenamiento_gb: memory.almacenamiento_gb });
        }} emptyMessage="No hay memorias verificadas para esta compatibilidad." />
    </fieldset>
    {model.referenceOptions.length > 1 || selection.variant_id != null ? <fieldset disabled={disabled}><legend>Referencia comercial</legend>
      <ConfigurationOptions label="Elige la referencia exacta" value={String(selection.variant_id ?? "")}
        options={(model.referenceOptions.length ? model.referenceOptions : resolution.candidates).map(candidate => ({ value: String(candidate.variant_id),
          label: candidate.name, detail: `${candidate.sku ?? `Referencia ${candidate.variant_id}`}${candidate.availability.state === "out_of_stock" ? " · Agotada" : ""}`,
          soldOut: candidate.availability.state === "out_of_stock" }))}
        onSelect={value => model.select({ variant_id: Number(value) })} emptyMessage="No hay referencias disponibles para esta combinación." />
    </fieldset> : null}
    {model.cleared.length ? <p className="product-configurator__hint">Actualizamos las opciones que ya no corresponden a tu selección. Revisa la configuración antes de continuar.</p> : null}
    <p id={`${id}-status`} role={model.loadStatus === "error" ? "alert" : "status"} aria-live="polite" data-configuration-status={model.loadStatus === "error" ? failureStatus : busy ? "loading" : resolution.status}>{statusMessage}</p>
    {model.loadStatus === "error" ? <button type="button" className="product-configurator__retry" onClick={model.retry}>Reintentar configuraciones</button> : null}
  </section>;
}

/** One commercial summary, beside price/SKU/quantity in the parent purchase block. */
export function ProductConfigurationSummary({ model }: { model: ProductConfiguratorModel }) {
  const { selection, resolution } = model;
  const oem = resolution.options.oems.find(option => option.vehicle_multimedia_system_id === selection.vehicle_multimedia_system_id);
  const parts = [oem?.name, selection.ram_gb != null && selection.almacenamiento_gb != null
    ? `${selection.ram_gb} GB / ${selection.almacenamiento_gb} GB` : null,
    selection.year != null ? `Año ${selection.year}` : null].filter(Boolean);
  return <div className="product-configurator__summary">
    <h2>3 · Configuración seleccionada</h2>
    <p>{parts.length ? parts.join(" · ") : "Elige sistema original y memoria para completar tu configuración."}</p>
  </div>;
}
