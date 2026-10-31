import { useEffect, useMemo, useRef, useState } from "react";
import { getCompleteConfiguratorCatalog } from "../../api/productConfigurator";
import { ProductApiError } from "../../api/products";
import { acceptCatalogResponse, beginCatalogLoad, rejectCatalogResponse } from "../../domain/productConfigurator/catalog";
import { productVehicleSelection, reconcileSelection, selectionFromShopQuery } from "../../domain/productConfigurator/selection";
import { resolveConfiguration } from "../../domain/productConfigurator/resolver";
import { MEMORY_OEM_PROFILE, type CatalogSnapshot, type Selection } from "../../domain/productConfigurator/types";
import type { Product, ProductConfiguration } from "../../types/product";
import type { ConfigurationContext } from "../../types/productConfiguration";

type LoadState = CatalogSnapshot & { fullProduct: Product | null; failure: "connection" | "configuration" | "unavailable" | null };
const initialState = (slug: string): LoadState => ({ status: "idle", requestKey: "", slug, coverage: "unknown", product: null, fullProduct: null, failure: null });

export function supportedConfiguration(registration?: ProductConfiguration | null) {
  return registration?.schema_version === 1 && registration.profile_id === MEMORY_OEM_PROFILE.id && registration.profile_version === 1
    ? MEMORY_OEM_PROFILE : null;
}

/** Always called by the real detail page; Hooks remain unconditional across all modes. */
export function useProductConfigurator(product: Product | null, slug: string, query: string) {
  const incoming = product?.slug === slug ? product.configuration : null;
  const [remembered, setRemembered] = useState<{ slug: string; value: ProductConfiguration | null }>(() => ({ slug, value: incoming ?? null }));
  const [load, setLoad] = useState<LoadState>(() => initialState(slug));
  const [retry, setRetry] = useState(0);
  const serial = useRef(0);
  const [draft, setDraft] = useState(() => ({ slug, query, value: selectionFromShopQuery(query), cleared: [] as string[] }));
  const currentLoad = load.slug === slug ? load : initialState(slug);
  const registration = currentLoad.fullProduct?.configuration?.required ? currentLoad.fullProduct.configuration
    : incoming?.required ? incoming : remembered.slug === slug ? remembered.value : null;
  const required = registration?.required === true;
  const profile = supportedConfiguration(registration);
  const uiEnabled = required && registration?.ui_enabled === true && profile !== null
    && !(incoming?.required && (!incoming.ui_enabled || !supportedConfiguration(incoming)));

  useEffect(() => {
    if (incoming?.required) setRemembered({ slug, value: incoming });
    else if (remembered.slug !== slug) setRemembered({ slug, value: null });
  }, [slug, incoming, remembered.slug]);

  useEffect(() => {
    if (!required || !uiEnabled) return;
    const controller = new AbortController();
    const requestKey = `${slug}:${++serial.current}`;
    setLoad({ ...beginCatalogLoad(slug, requestKey), fullProduct: null, failure: null });
    getCompleteConfiguratorCatalog(slug, requestKey, controller.signal).then(response => {
      if (controller.signal.aborted) return;
      // Missing/changed authority is a contract failure, never a fallback to traditional buying.
      if (!response.product.configuration?.required || !supportedConfiguration(response.product.configuration)
        || response.product.id !== product?.id) {
        setLoad(current => {
          const rejected = rejectCatalogResponse(current, requestKey);
          return rejected === current ? current : { ...rejected, fullProduct: null, failure: "configuration" };
        });
        return;
      }
      setLoad(current => {
        const next = acceptCatalogResponse(current, response);
        return next === current ? current : { ...next, fullProduct: response.product, failure: null };
      });
    }).catch(error => {
      if (controller.signal.aborted) return;
      setLoad(current => {
        const rejected = rejectCatalogResponse(current, requestKey);
        return rejected === current ? current : { ...rejected, fullProduct: null,
          failure: error instanceof ProductApiError && error.status === 404 ? "unavailable" : "connection" };
      });
    });
    return () => controller.abort();
  }, [slug, required, uiEnabled, retry, product?.id, incoming?.profile_id, incoming?.profile_version]);

  const rawSelection = draft.slug === slug && draft.query === query ? draft.value : selectionFromShopQuery(query);
  const model = useMemo(() => {
    const vehicle = productVehicleSelection({ profile, snapshot: currentLoad,
      expectedRequestKey: currentLoad.requestKey, selection: rawSelection });
    return { ...reconcileSelection({ profile, snapshot: currentLoad, expectedRequestKey: currentLoad.requestKey,
      previous: vehicle.selection, patch: {} }), vehicleContext: vehicle.vehicleContext };
  }, [profile, currentLoad, rawSelection]);
  const select = (patch: Partial<Selection>) => {
    const next = reconcileSelection({ profile, snapshot: currentLoad, expectedRequestKey: currentLoad.requestKey, previous: model.selection, patch });
    setDraft({ slug, query, value: next.selection, cleared: next.cleared });
  };
  const resolvedId = model.resolution.variant?.variant_id ?? (model.resolution.status === "out_of_stock"
    ? model.resolution.candidates.find(candidate => candidate.availability.state === "out_of_stock")?.variant_id : null);
  const selectedVariant = uiEnabled && currentLoad.status === "ready"
    ? currentLoad.fullProduct?.variants?.find(variant => variant.id === resolvedId) ?? null : null;
  const referenceOptions = resolveConfiguration({ profile, snapshot: currentLoad, expectedRequestKey: currentLoad.requestKey,
    selection: { ...model.selection, variant_id: null } }).differentiators;
  // Real pairs for this vehicle/year, including pairs belonging to another OEM.
  // The view may show those as disabled; eligibility still comes from the current resolution.
  const vehicleMemoryOptions = resolveConfiguration({ profile, snapshot: currentLoad, expectedRequestKey: currentLoad.requestKey,
    selection: { ...model.selection, vehicle_multimedia_system_id: null, ram_gb: null, almacenamiento_gb: null, variant_id: null } }).options.memories;
  const purchaseEnabled = uiEnabled && currentLoad.status === "ready" && currentLoad.failure === null
    && currentLoad.fullProduct?.configuration?.purchase_enabled === true;
  const selection = model.selection;
  const row = selectedVariant?.vehicle_compatibilities?.find(row => row.vehicle_brand_id === selection.vehicle_brand_id
    && row.vehicle_model_id === selection.vehicle_model_id && row.vehicle_version_id === selection.vehicle_version_id
    && row.vehicle_multimedia_system_id === selection.vehicle_multimedia_system_id);
  const purchaseContext: ConfigurationContext | null = purchaseEnabled && model.vehicleContext.status === "resolved"
    && model.resolution.status === "valid" && row ? {
    schema_version: 1, profile_id: "vehicle-oem-memory-v1", profile_version: 1,
    vehicle_brand_id: row.vehicle_brand_id, vehicle_model_id: row.vehicle_model_id!, vehicle_version_id: row.vehicle_version_id!,
    vehicle_multimedia_system_id: row.vehicle_multimedia_system_id!, year: selection.year ?? null,
    ram_gb: Number(selection.ram_gb), almacenamiento_gb: Number(selection.almacenamiento_gb),
    vehicle_brand_name: row.vehicle_brand?.name, vehicle_model_name: row.vehicle_model?.name,
    vehicle_version_name: row.vehicle_version?.name ?? undefined, vehicle_multimedia_system_name: row.vehicle_multimedia_system?.name,
  } : null;
  return { required, uiEnabled, profile, registration, selection: model.selection, resolution: model.resolution,
    purchaseEnabled, purchaseContext,
    loadStatus: currentLoad.status, failure: currentLoad.failure, fullProduct: currentLoad.fullProduct, selectedVariant,
    referenceOptions, vehicleMemoryOptions, vehicleContext: model.vehicleContext,
    cleared: [...new Set([...model.cleared, ...(draft.slug === slug && draft.query === query ? draft.cleared : [])])],
    select, retry: () => setRetry(value => value + 1) };
}

export type ProductConfiguratorModel = ReturnType<typeof useProductConfigurator>;
