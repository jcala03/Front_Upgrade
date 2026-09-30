import { getCustomer, getCustomerVehicles } from "../api/customers";
import type { CustomerOption } from "../types/commercialDiscovery";

export const readCustomerHandoffId = (): number | null => {
  const url = new URL(window.location.href);
  const raw = url.searchParams.get("customer_id");
  const customerId = raw && /^\d+$/.test(raw) ? Number(raw) : null;
  return customerId && customerId > 0 ? customerId : null;
};

export const clearCustomerHandoff = (): void => {
  const url = new URL(window.location.href);
  const raw = url.searchParams.get("customer_id");
  if (raw !== null) {
    url.searchParams.delete("customer_id");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }
};

export const loadCustomerOption = async (customerId: number): Promise<CustomerOption> => {
  const [customer, vehicles] = await Promise.all([
    getCustomer(customerId),
    getCustomerVehicles(customerId),
  ]);
  return {
    id: customer.id,
    name: customer.name,
    contact: {
      phone: customer.phone,
      email: customer.email,
      document: customer.document,
    },
    vehicles: vehicles.filter((vehicle) => vehicle.is_active).map((vehicle) => {
      const brand = vehicle.vehicle_brand ?? vehicle.vehicleBrand;
      const model = vehicle.vehicle_model ?? vehicle.vehicleModel;
      const version = vehicle.vehicle_version ?? vehicle.vehicleVersion;
      return {
        id: vehicle.id,
        display_name: [
          vehicle.nickname,
          vehicle.vehicle_brand?.name ?? vehicle.vehicleBrand?.name,
          vehicle.vehicle_model?.name ?? vehicle.vehicleModel?.name,
          vehicle.vehicle_version?.display_name ?? vehicle.vehicleVersion?.display_name,
          vehicle.year,
          vehicle.plate,
        ].filter(Boolean).join(" · ") || "Vehículo registrado",
        nickname: vehicle.nickname,
        brand: brand ? { id: brand.id, name: brand.name } : null,
        model: model ? { id: model.id, name: model.name } : null,
        version: version ? { id: version.id, name: version.display_name } : null,
        year: vehicle.year,
        plate: vehicle.plate,
      };
    }),
  };
};
