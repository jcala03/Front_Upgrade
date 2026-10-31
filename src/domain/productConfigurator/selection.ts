import { parseShopFilters } from "../../pages/Shop/shopFilters";
import { vehicleKeys } from "./compatibility";
import { resolveConfiguration } from "./resolver";
import type { ResolverInput, Selection } from "./types";

export type ProductVehicleContext = {
  status: "pending" | "resolved" | "ambiguous" | "unverified" | "year_required";
  source: "explicit" | "catalog" | null;
};

/** Establish only the vehicle context; commercial resolution remains in resolveConfiguration. */
export function productVehicleSelection(input: ResolverInput): { selection: Selection; vehicleContext: ProductVehicleContext } {
  const selection = { ...input.selection };
  const result = (status: ProductVehicleContext["status"], source: ProductVehicleContext["source"] = null) =>
    ({ selection, vehicleContext: { status, source } });
  if (!input.profile) return result("unverified");
  if (input.snapshot.status !== "ready" || input.snapshot.coverage !== "complete_public"
    || input.snapshot.requestKey !== input.expectedRequestKey) return result("pending");

  // Never infer from a vehicle-filtered subset, OEM, memory or a variant's position.
  const catalog = resolveConfiguration({ ...input, selection: {} });
  const vehicles = [...new Map(catalog.options.vehicles.map(row =>
    [vehicleKeys.map(key => row[key]).join(":"), row])).values()];
  const matches = vehicles.filter(row => vehicleKeys.every(key => selection[key] == null || selection[key] === row[key]));
  const completeExplicit = vehicleKeys.every(key => selection[key] != null);
  if (!matches.length) return result("unverified");
  if (matches.length > 1) return result("ambiguous");
  // Missing metadata may conceal other compatibilities: do not infer uniqueness from it.
  if (!completeExplicit && catalog.reasons.some(reason => reason.code !== "selection_required")) return result("unverified");
  const vehicle = matches[0]; // Unique confirmed tuple; duplicate OEM/year rows are the same vehicle.
  for (const key of vehicleKeys) selection[key] = vehicle[key];
  const source = completeExplicit ? "explicit" : "catalog";
  if (input.profile.requireYear && selection.year == null) return result("year_required", source);
  return result("resolved", source);
}

/** Use exactly the Store's existing query parsing and parent-ID rules. */
export function selectionFromShopQuery(query: string): Selection {
  const parsed = parseShopFilters(query);
  return Object.fromEntries([...vehicleKeys, "vehicle_multimedia_system_id", "year"].filter(key => parsed[key as keyof typeof parsed] !== "").map(key => [key, Number(parsed[key as keyof typeof parsed])])) as Selection;
}

export function reconcileSelection(input: Omit<ResolverInput, "selection"> & { previous: Selection; patch: Partial<Selection> }) {
  const selection: Selection = { ...input.previous, ...input.patch };
  if (!input.profile) return { selection, cleared: [], resolution: resolveConfiguration({ ...input, selection }) };
  const cleared = new Set<keyof Selection>();
  const clear = (key: keyof Selection) => { if (selection[key] != null) { selection[key] = null; cleared.add(key); } };
  const dependencies = [...vehicleKeys, "vehicle_multimedia_system_id", "year", "ram_gb", "almacenamiento_gb"] as const;
  if (!("variant_id" in input.patch) && dependencies.some(key => String(input.previous[key] ?? "") !== String(selection[key] ?? ""))) clear("variant_id");
  // Never clear memory based on a partial, loading or stale response.
  const usable = input.snapshot.status === "ready" && input.snapshot.coverage === "complete_public" && input.snapshot.requestKey === input.expectedRequestKey;
  if (input.profile && usable) {
    const current = resolveConfiguration({ ...input, selection });
    if (current.status === "insufficient_data" && !current.reasons.some(reason => ["invalid_selection", "missing_vehicle_parent"].includes(reason.code)))
      return { selection, cleared: [...cleared], resolution: current };
    // Consult options without invalid child IDs to avoid confusing hierarchy with an empty catalog.
    let options = resolveConfiguration({ ...input, selection: {} }).options;
    if (selection.vehicle_model_id != null && !options.vehicles.some(row => row.vehicle_brand_id === selection.vehicle_brand_id && row.vehicle_model_id === selection.vehicle_model_id)) clear("vehicle_model_id");
    if (selection.vehicle_model_id == null || selection.vehicle_version_id != null && !options.vehicles.some(row => row.vehicle_brand_id === selection.vehicle_brand_id && row.vehicle_model_id === selection.vehicle_model_id && row.vehicle_version_id === selection.vehicle_version_id)) clear("vehicle_version_id");
    const vehicleSelection = { ...selection, vehicle_multimedia_system_id: null, ram_gb: null, almacenamiento_gb: null, variant_id: null };
    options = resolveConfiguration({ ...input, selection: vehicleSelection }).options;
    if (selection.vehicle_version_id == null || selection.vehicle_multimedia_system_id != null && !options.oems.some(row => row.vehicle_multimedia_system_id === selection.vehicle_multimedia_system_id)) clear("vehicle_multimedia_system_id");
    options = resolveConfiguration({ ...input, selection: { ...selection, variant_id: null } }).options;
    const hasPair = options.memories.some(row => row.ram_gb === Number(selection.ram_gb) && row.almacenamiento_gb === Number(selection.almacenamiento_gb));
    if (!hasPair) {
      if (selection.ram_gb != null && options.memories.some(row => row.ram_gb === Number(selection.ram_gb))) clear("almacenamiento_gb");
      else {
        clear("ram_gb");
        if (!options.memories.some(row => row.almacenamiento_gb === Number(selection.almacenamiento_gb))) clear("almacenamiento_gb");
      }
    }
    // A stock/catalog refresh must not silently replace the customer's commercial ID.
    // Keep an explicitly selected missing/hidden/sold-out reference rejected until they choose again.
  }
  return { selection, cleared: [...cleared], resolution: resolveConfiguration({ ...input, selection }) };
}
