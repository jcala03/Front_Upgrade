import type { Product } from "../../types/product";
import type { ProductConfiguratorModel } from "./useProductConfigurator";

/** Only tuples offered by the resolver, labelled from the same stored compatibility. */
export function ConfiguratorVehicleFields({ model, product, disabled }: {
  model: ProductConfiguratorModel; product: Product; disabled: boolean;
}) {
  const selection = model.selection;
  const vehicles = model.resolution.options.vehicles;
  const rows = (model.fullProduct ?? product).variants?.flatMap(variant => variant.vehicle_compatibilities ?? []) ?? [];
  const rowFor = (vehicle: typeof vehicles[number]) => rows.find(row =>
    row.vehicle_brand_id === vehicle.vehicle_brand_id && row.vehicle_model_id === vehicle.vehicle_model_id
    && row.vehicle_version_id === vehicle.vehicle_version_id);
  const unique = (items: { id: number; name: string | undefined | null }[]) =>
    [...new Map(items.filter(item => item.name).map(item => [item.id, item])).values()];
  const brands = unique(vehicles.map(v => ({ id: v.vehicle_brand_id, name: rowFor(v)?.vehicle_brand?.name })));
  const models = unique(vehicles.filter(v => v.vehicle_brand_id === selection.vehicle_brand_id)
    .map(v => ({ id: v.vehicle_model_id, name: rowFor(v)?.vehicle_model?.name })));
  const versions = unique(vehicles.filter(v => v.vehicle_brand_id === selection.vehicle_brand_id && v.vehicle_model_id === selection.vehicle_model_id)
    .map(v => ({ id: v.vehicle_version_id, name: rowFor(v)?.vehicle_version?.name ?? rowFor(v)?.vehicle_version?.display_name })));
  const hasMultipleVehicles = new Set(vehicles.map(v => [v.vehicle_brand_id, v.vehicle_model_id, v.vehicle_version_id].join(":"))).size > 1;
  return <fieldset disabled={disabled} className="product-configurator__vehicle">
    <legend>Tu vehículo</legend>
    {hasMultipleVehicles ? <div className="product-configurator__vehicle-grid">
      <label>Marca del vehículo<select aria-label="Marca del vehículo" value={selection.vehicle_brand_id ?? ""}
        onChange={event => model.select({ vehicle_brand_id: event.target.value ? Number(event.target.value) : null })}>
        <option value="">Selecciona la marca</option>{brands.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label>Modelo<select aria-label="Modelo del vehículo" value={selection.vehicle_model_id ?? ""} disabled={!selection.vehicle_brand_id}
        onChange={event => model.select({ vehicle_model_id: event.target.value ? Number(event.target.value) : null })}>
        <option value="">Selecciona el modelo</option>{models.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label>Generación<select aria-label="Generación del vehículo" value={selection.vehicle_version_id ?? ""} disabled={!selection.vehicle_model_id}
        onChange={event => model.select({ vehicle_version_id: event.target.value ? Number(event.target.value) : null })}>
        <option value="">Selecciona la generación</option>{versions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
    </div> : null}
    {model.yearRequired || selection.year != null ? <label className="product-configurator__year">Año del vehículo
      <input aria-label="Año del vehículo" type="number" inputMode="numeric" min={1900} max={2100} step={1}
        value={selection.year ?? ""} onChange={event => model.select({ year: event.target.value ? Number(event.target.value) : null })} />
      <small>Usa el año real. La cobertura depende de la generación y del sistema original registrado.</small>
    </label> : null}
  </fieldset>;
}
