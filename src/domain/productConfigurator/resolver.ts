import { isValidMemoryGb } from "../../utils/memoryGb";
import { effectiveCompatibility, matchesRow, positiveId, rowYearRange, validVehicleRow, vehicleKeys } from "./compatibility";
import type { Availability, Candidate, CompatibilityRow, ConfiguratorProduct, ConfiguratorProfile,
  ConfiguratorVariant, Issue, MemoryOption, OemOption, OptionAvailability, Resolution, ResolverInput, Selection, VehicleOption } from "./types";

const memoryKeys = ["ram_gb", "almacenamiento_gb"] as const;
export function selectionIssues(selection: Selection): Issue[] {
  const issues: Issue[] = [];
  for (const key of [...vehicleKeys, "vehicle_multimedia_system_id", "variant_id"] as const)
    if (selection[key] != null && !positiveId(selection[key])) issues.push({ code: "invalid_selection", field: key });
  for (const key of memoryKeys)
    if (selection[key] != null && !isValidMemoryGb(selection[key])) issues.push({ code: "invalid_selection", field: key });
  if (selection.year != null && (!Number.isInteger(selection.year) || selection.year < 1900 || selection.year > 2100)) issues.push({ code: "invalid_selection", field: "year" });
  if (selection.vehicle_model_id != null && selection.vehicle_brand_id == null || selection.vehicle_version_id != null && selection.vehicle_model_id == null || selection.vehicle_multimedia_system_id != null && selection.vehicle_version_id == null)
    issues.push({ code: "missing_vehicle_parent" });
  return issues;
}

export function catalogAvailability(variant: ConfiguratorVariant): Availability {
  const stock = Number.isSafeInteger(variant.stock) && variant.stock >= 0 ? variant.stock : null;
  return { stock, state: !variant.is_active || !variant.is_visible ? "unavailable" : stock === null ? "unknown" : stock === 0 ? "out_of_stock" : "available",
    source: "public_aggregate", provisional: true, requiresFulfillmentValidation: true };
}

type Entry = {
  variant: ConfiguratorVariant;
  candidate: Candidate;
  rows: readonly CompatibilityRow[];
  kind: string | null;
  issues: Issue[];
};

function entryFor(product: ConfiguratorProduct, variant: ConfiguratorVariant, profile: ConfiguratorProfile): Entry {
  const effective = effectiveCompatibility(product, variant);
  const issues: Issue[] = [];
  const values = [variant.specs?.[profile.ramKey], variant.specs?.[profile.storageKey]];
  for (const [index, key] of [profile.ramKey, profile.storageKey].entries()) {
    if (!isValidMemoryGb(values[index])) issues.push({ code: "invalid_or_missing_memory", field: key, variant_id: variant.id });
    const definitions = [...product.product_category?.fields ?? [], ...variant.spec_values?.flatMap(value => value.field ? [value.field] : []) ?? []].filter(field => field.field_key === key);
    if (!definitions.length || definitions.some(field => field.scope !== "variant" || field.type !== "number" || !field.is_active || field.filter_unit !== profile.unit))
      issues.push({ code: "invalid_or_missing_memory_metadata", field: key, variant_id: variant.id });
  }
  if (effective.inconsistent || effective.type == null) issues.push({ code: "unknown_compatibility_type", variant_id: variant.id });
  return { variant, rows: effective.rows, kind: effective.type, issues,
    candidate: { product_id: product.id, variant_id: variant.id, name: variant.name, sku: variant.sku,
      price: variant.price, image_url: variant.image_url,
      ram_gb: isValidMemoryGb(values[0]) ? Number(values[0]) : null,
      almacenamiento_gb: isValidMemoryGb(values[1]) ? Number(values[1]) : null,
      availability: catalogAvailability(variant) } };
}

function oemKnown(row: CompatibilityRow): boolean {
  return positiveId(row.vehicle_multimedia_system_id) && row.vehicle_multimedia_system?.is_active === true;
}

/** One matcher for candidates AND all dependent options. Never join separate compatibility rows. */
function entryMatches(entry: Entry, selection: Selection, profile: ConfiguratorProfile): boolean | "unknown" {
  for (const key of memoryKeys) {
    if (selection[key] != null && entry.candidate[key] !== null && entry.candidate[key] !== Number(selection[key])) return false;
  }
  if (profile.compatibility === "universal") {
    if (entry.kind !== "universal") return entry.kind === null ? "unknown" : false;
    // A universal profile cannot be used to certify a submitted vehicle/OEM.
    if ([...vehicleKeys, "vehicle_multimedia_system_id", "year"].some(key => selection[key as keyof Selection] != null)) return false;
    return entry.issues.length ? "unknown" : true;
  }
  if (entry.kind === "universal") return false;
  if (entry.kind == null || entry.rows.length === 0) return "unknown";
  let unknown = false;
  for (const row of entry.rows) {
    // A missing OEM is insufficient evidence, not compatibility with any system.
    const rowSelection = profile.compatibility === "vehicle_oem" && row.vehicle_multimedia_system_id == null
      ? { ...selection, vehicle_multimedia_system_id: null } : selection;
    const match = matchesRow(row, rowSelection);
    if (match === false) continue;
    if (match === "unknown" || !validVehicleRow(row)) { unknown = true; continue; }
    if (profile.compatibility === "vehicle_oem") {
      if (row.vehicle_multimedia_system?.is_active === false) continue;
      if (!oemKnown(row)) { unknown = true; continue; }
    }
    if (entry.issues.length) { unknown = true; continue; }
    return true;
  }
  return unknown ? "unknown" : false;
}

function addIdentity(option: OptionAvailability, entry: Entry) {
  if (!option.variant_ids.includes(entry.variant.id)) option.variant_ids.push(entry.variant.id);
  if (entry.candidate.availability.state === "available" && !option.available_variant_ids.includes(entry.variant.id)) option.available_variant_ids.push(entry.variant.id);
}

function buildOptions(entries: Entry[], profile: ConfiguratorProfile, selection: Selection): Resolution["options"] {
  const vehicles = new Map<string, VehicleOption>(), oems = new Map<number, OemOption>(), memories = new Map<string, MemoryOption>();
  for (const entry of entries) {
    if (!entry.variant.is_active || !entry.variant.is_visible || entry.issues.length) continue;
    if (profile.compatibility !== "universal" && entry.kind === "vehicle_specific") for (const row of entry.rows) {
      if (!validVehicleRow(row) || profile.compatibility === "vehicle_oem" && !oemKnown(row)) continue;
      const range = rowYearRange(row);
      const key = JSON.stringify([...vehicleKeys.map(key => row[key]), range.from, range.to]);
      const vehicle = vehicles.get(key) ?? { vehicle_brand_id: row.vehicle_brand_id, vehicle_model_id: row.vehicle_model_id!, vehicle_version_id: row.vehicle_version_id!, year_from: range.from, year_to: range.to, year_range_known: range.known, variant_ids: [], available_variant_ids: [] };
      addIdentity(vehicle, entry); vehicles.set(key, vehicle);
      const vehicleSelection = { ...selection, vehicle_multimedia_system_id: null };
      if (matchesRow(row, vehicleSelection) === true && oemKnown(row)) {
        const id = row.vehicle_multimedia_system_id!;
        const oem = oems.get(id) ?? { vehicle_multimedia_system_id: id, name: row.vehicle_multimedia_system?.name ?? null, variant_ids: [], available_variant_ids: [] };
        addIdentity(oem, entry); oems.set(id, oem);
      }
    }
    const withoutMemory = { ...selection, ram_gb: null, almacenamiento_gb: null };
    if (entryMatches(entry, withoutMemory, profile) !== true) continue;
    const ram = entry.candidate.ram_gb!, storage = entry.candidate.almacenamiento_gb!;
    const key = `${ram}/${storage}`;
    const memory = memories.get(key) ?? { ram_gb: ram, almacenamiento_gb: storage, variant_ids: [], available_variant_ids: [] };
    addIdentity(memory, entry); memories.set(key, memory);
  }
  for (const option of [...vehicles.values(), ...oems.values(), ...memories.values()]) {
    option.variant_ids.sort((a, b) => a - b); option.available_variant_ids.sort((a, b) => a - b);
  }
  return { vehicles: [...vehicles.values()].sort((a, b) => a.vehicle_brand_id - b.vehicle_brand_id || a.vehicle_model_id - b.vehicle_model_id || a.vehicle_version_id - b.vehicle_version_id || (a.year_from ?? 0) - (b.year_from ?? 0)),
    oems: [...oems.values()].sort((a, b) => a.vehicle_multimedia_system_id - b.vehicle_multimedia_system_id),
    memories: [...memories.values()].sort((a, b) => a.ram_gb - b.ram_gb || a.almacenamiento_gb - b.almacenamiento_gb) };
}

export function resolveConfiguration({ profile, snapshot, expectedRequestKey, selection }: ResolverInput): Resolution {
  const result: Resolution = { status: "insufficient_data", reasons: [], candidates: [], variant: null,
    canSelectForPurchase: false, options: { vehicles: [], oems: [], memories: [] }, differentiators: [], coverage: snapshot.coverage };
  const finish = (status: Resolution["status"], code: string): Resolution => ({ ...result, status, reasons: [...result.reasons, { code }] });
  if (!profile) return finish("not_applicable", "profile_not_enabled");
  if (snapshot.status !== "ready") return finish("insufficient_data", `catalog_${snapshot.status}`);
  if (!expectedRequestKey || snapshot.requestKey !== expectedRequestKey) return finish("insufficient_data", "stale_catalog");
  const product = snapshot.product;
  if (!product || !positiveId(product.id) || product.slug !== snapshot.slug) return finish("insufficient_data", "wrong_product_snapshot");
  if (!product.is_active || !product.is_visible) return finish("unavailable", "product_unavailable");
  if (!Array.isArray(product.variants)) return finish("insufficient_data", "missing_variant_list");
  if (!product.has_variants && !product.variants.length) {
    // has_variants itself is computed from the filtered relation by Laravel.
    if (snapshot.coverage !== "complete_public") return finish("insufficient_data", "full_public_catalog_required");
    if (product.product_category?.requires_oem_compatibility) return finish("unavailable", "no_public_oem_variants");
    return finish("not_applicable", "simple_product");
  }
  if (!profile.id || !profile.ramKey || !profile.storageKey || profile.ramKey === profile.storageKey || !["vehicle", "vehicle_oem", "universal"].includes(profile.compatibility) || profile.unit !== "GB" || product.product_category?.requires_oem_compatibility && profile.compatibility !== "vehicle_oem")
    return finish("insufficient_data", "invalid_profile");
  const invalidSelection = selectionIssues(selection);
  if (invalidSelection.length) return { ...result, reasons: invalidSelection };
  const variants = new Map<number, ConfiguratorVariant>();
  for (const variant of product.variants ?? []) {
    if (!positiveId(variant.id) || variant.product_id !== product.id) return finish("insufficient_data", "invalid_variant_identity");
    const previous = variants.get(variant.id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(variant)) return finish("insufficient_data", "conflicting_variant_identity");
    variants.set(variant.id, variant);
  }
  const entries = [...variants.values()].sort((a, b) => a.id - b.id).map(variant => entryFor(product, variant, profile));
  result.options = buildOptions(entries, profile, selection);
  const matches: Entry[] = [], unknown: Entry[] = [];
  for (const entry of entries) {
    if (selection.variant_id != null && entry.variant.id !== selection.variant_id) continue;
    const match = entryMatches(entry, selection, profile);
    if (match === true) matches.push(entry);
    if (match === "unknown" && entry.variant.is_active && entry.variant.is_visible) unknown.push(entry);
  }
  result.candidates = [...matches, ...unknown].map(entry => entry.candidate).sort((a, b) => a.variant_id - b.variant_id);
  result.reasons = unknown.flatMap(entry => entry.issues.length ? entry.issues : [{ code: "incomplete_compatibility", variant_id: entry.variant.id }]);
  if (snapshot.coverage !== "complete_public") return finish("insufficient_data", "full_public_catalog_required");
  const required = [...memoryKeys, ...(profile.compatibility === "universal" ? [] : vehicleKeys),
    ...(profile.compatibility === "vehicle_oem" ? ["vehicle_multimedia_system_id" as const] : []), ...(profile.requireYear ? ["year" as const] : [])];
  const missing = required.filter(key => selection[key] == null);
  if (missing.length) return { ...result, status: "incomplete", reasons: [...result.reasons, ...missing.map(field => ({ code: "selection_required", field }))] };
  if (unknown.length) return finish("insufficient_data", "potential_candidates_have_missing_data");
  if (!matches.length) return finish("nonexistent", "no_matching_public_variant");
  const eligible = matches.filter(entry => entry.variant.is_active && entry.variant.is_visible);
  if (!eligible.length) return finish("unavailable", "variant_inactive_or_hidden");
  if (eligible.length > 1) return { ...finish("ambiguous", "commercial_variant_required"), differentiators: eligible.map(entry => entry.candidate) };
  const candidate = eligible[0].candidate;
  if (candidate.availability.state === "unknown" || !Number.isSafeInteger(candidate.price) || candidate.price < 0) return finish("insufficient_data", "unknown_stock_or_price");
  if (candidate.availability.state === "out_of_stock") return finish("out_of_stock", "variant_out_of_stock");
  return { ...result, status: "valid", variant: candidate, canSelectForPurchase: true };
}
