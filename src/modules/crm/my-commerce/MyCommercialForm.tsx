import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Package, Search, Wrench, X } from "lucide-react";
import { listMyServiceOptions, searchMyCustomerOptions } from "../../../api/commercialDiscovery";
import { getMyCommercialProducts } from "../../../api/commercialProducts";
import { getProducts } from "../../../api/products";
import type { CommercialProduct, CommercialProductBranch, CommercialProductVariant } from "../../../types/commercialProduct";
import type { CustomerOption, CustomerVehicleOption, ServiceOption } from "../../../types/commercialDiscovery";
import type { CreateMyQuotationPayload, CreateMySalePayload, MyCommercialItem, MyCommercialItemPayload, MyQuotation } from "../../../types/myCommerce";
import type { Product, ProductVariant } from "../../../types/product";
import { formatCurrency } from "../../../utils/formatCurrency";

type ProductLine = { key: string; kind: "product"; productId: number; variantId: number | null; name: string; detail: string; unitPrice: number; quantity: number; discount: number; maxQuantity: number | null; stockLabel: string | null };
type ServiceLine = { key: string; kind: "service"; serviceId: number; name: string; detail: string; unitPrice: number; quantity: number; discount: number; historical: boolean };
type Line = ProductLine | ServiceLine;
type CustomerMode = "counter" | "registered" | "adhoc";
type Props = { kind: "quotation" | "sale"; quotation?: MyQuotation | null; branchName?: string | null; saving: boolean; error: string; errors: Record<string, string[]>; onClose: () => void; onSubmit: (payload: CreateMyQuotationPayload | CreateMySalePayload) => Promise<void> };
type PickerProduct = Product | CommercialProduct;
type PickerVariant = ProductVariant | CommercialProductVariant;

const makeKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const isAbort = (cause: unknown) => cause instanceof DOMException && cause.name === "AbortError";
const errorMessage = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;
const customerContact = (option: CustomerOption) => [option.contact.phone, option.contact.email, option.contact.document].filter(Boolean).join(" · ");

const quotationVehicleOption = (quotation: MyQuotation): CustomerVehicleOption | null => {
  const vehicle = quotation.vehicle;
  if (!vehicle.customer_vehicle_id) return null;
  const parts = [vehicle.brand_name, vehicle.model_name, vehicle.version_name, vehicle.year, vehicle.plate].filter(Boolean);
  return {
    id: vehicle.customer_vehicle_id,
    display_name: parts.join(" · ") || "Vehículo asociado",
    nickname: null,
    brand: vehicle.brand_id && vehicle.brand_name ? { id: vehicle.brand_id, name: vehicle.brand_name } : null,
    model: vehicle.model_id && vehicle.model_name ? { id: vehicle.model_id, name: vehicle.model_name } : null,
    version: vehicle.version_id && vehicle.version_name ? { id: vehicle.version_id, name: vehicle.version_name } : null,
    year: vehicle.year,
    plate: vehicle.plate,
  };
};

const quotationCustomerOption = (quotation: MyQuotation): CustomerOption | null => {
  if (!quotation.customer.id) return null;
  const vehicle = quotationVehicleOption(quotation);
  return { id: quotation.customer.id, name: quotation.customer.name ?? "Cliente registrado", contact: { phone: null, email: null, document: null }, vehicles: vehicle ? [vehicle] : [] };
};

const historicalLine = (item: MyCommercialItem): Line | null => {
  if (item.item_type === "service" && item.service_id) return { key: makeKey(), kind: "service", serviceId: item.service_id, name: item.service_name ?? "Servicio histórico", detail: item.service_description ?? "Servicio guardado en la cotización", unitPrice: Number(item.unit_price), quantity: item.quantity, discount: Number(item.discount_amount), historical: true };
  if (item.item_type === "product" && item.product_id) return { key: makeKey(), kind: "product", productId: item.product_id, variantId: item.product_variant_id, name: `${item.product_name ?? "Producto histórico"}${item.variant_name ? ` / ${item.variant_name}` : ""}`, detail: item.variant_sku ?? item.product_sku ?? "Sin SKU", unitPrice: Number(item.unit_price), quantity: item.quantity, discount: Number(item.discount_amount), maxQuantity: null, stockLabel: "Línea histórica" };
  return null;
};

export const MyCommercialForm = ({ kind, quotation, branchName, saving, error, errors, onClose, onSubmit }: Props) => {
  const hydratedCustomer = useMemo(() => quotation ? quotationCustomerOption(quotation) : null, [quotation]);
  const hydratedVehicle = useMemo(() => quotation ? quotationVehicleOption(quotation) : null, [quotation]);
  const hasAdHocCustomer = Boolean(quotation && !quotation.customer.id && (quotation.customer.name || quotation.customer.email || quotation.customer.phone || quotation.customer.city));
  const [publicProducts, setPublicProducts] = useState<Product[]>([]);
  const [commercialProducts, setCommercialProducts] = useState<CommercialProduct[]>([]);
  const [catalogBranch, setCatalogBranch] = useState<CommercialProductBranch | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<PickerProduct | null>(null);
  const [lines, setLines] = useState<Line[]>(() => (quotation?.items ?? []).map(historicalLine).filter((line): line is Line => line !== null));
  const [customerMode, setCustomerMode] = useState<CustomerMode>(hydratedCustomer ? "registered" : hasAdHocCustomer ? "adhoc" : "counter");
  const [customer, setCustomer] = useState({ name: quotation?.customer.name ?? "", email: quotation?.customer.email ?? "", phone: quotation?.customer.phone ?? "", city: quotation?.customer.city ?? "" });
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(hydratedCustomer);
  const [selectedVehicle, setSelectedVehicle] = useState<CustomerVehicleOption | null>(hydratedVehicle);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState("");
  const [notes, setNotes] = useState(quotation?.notes ?? "");
  const [validUntil, setValidUntil] = useState(quotation?.valid_until ?? "");
  const customerSequence = useRef(0);
  const serviceSequence = useRef(0);
  const productSequence = useRef(0);

  useEffect(() => {
    setSelectedProduct(null);
    setProductSearch("");
    setCatalogError("");
  }, [kind]);

  useEffect(() => {
    if (kind !== "quotation") return;
    let active = true;
    productSequence.current += 1;
    setLoadingProducts(true);
    setCatalogError("");
    getProducts({ sort: "name" }).then((result) => { if (active) setPublicProducts(result); }).catch((cause) => { if (active) setCatalogError(errorMessage(cause, "No se pudo cargar el catálogo público.")); }).finally(() => { if (active) setLoadingProducts(false); });
    return () => { active = false; };
  }, [kind]);

  useEffect(() => {
    if (kind !== "sale") return;
    const term = productSearch.trim();
    if (term.length === 1) {
      productSequence.current += 1;
      setCommercialProducts([]);
      setCatalogError("");
      setLoadingProducts(false);
      return;
    }
    const controller = new AbortController();
    const sequence = ++productSequence.current;
    const timer = window.setTimeout(() => {
      setLoadingProducts(true);
      setCatalogError("");
      getMyCommercialProducts({ search: term || undefined, limit: 100 }, controller.signal)
        .then((catalog) => {
          if (sequence !== productSequence.current) return;
          setCatalogBranch(catalog.branch);
          setCommercialProducts(catalog.products);
        })
        .catch((cause) => { if (!isAbort(cause) && sequence === productSequence.current) setCatalogError(errorMessage(cause, "No se pudo cargar el catálogo de tu sede.")); })
        .finally(() => { if (sequence === productSequence.current) setLoadingProducts(false); });
    }, term ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [kind, productSearch]);

  useEffect(() => {
    const term = serviceSearch.trim();
    if (term.length === 1) { serviceSequence.current += 1; setServices([]); setServicesError(""); setServicesLoading(false); return; }
    const controller = new AbortController();
    const sequence = ++serviceSequence.current;
    const timer = window.setTimeout(() => {
      setServicesLoading(true); setServicesError("");
      listMyServiceOptions(term || undefined, controller.signal).then((result) => { if (sequence === serviceSequence.current) setServices(result); }).catch((cause) => { if (!isAbort(cause) && sequence === serviceSequence.current) setServicesError(errorMessage(cause, "No se pudieron cargar los servicios.")); }).finally(() => { if (sequence === serviceSequence.current) setServicesLoading(false); });
    }, term ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [serviceSearch]);

  useEffect(() => {
    if (customerMode !== "registered") return;
    const term = customerSearch.trim();
    if (term.length < 2) { customerSequence.current += 1; setCustomerResults([]); setCustomerError(""); setCustomerLoading(false); return; }
    const controller = new AbortController();
    const sequence = ++customerSequence.current;
    const timer = window.setTimeout(() => {
      setCustomerLoading(true); setCustomerError("");
      searchMyCustomerOptions(term, controller.signal).then((result) => {
        if (sequence !== customerSequence.current) return;
        setCustomerResults(result);
        const refreshed = selectedCustomer ? result.find((option) => option.id === selectedCustomer.id) : null;
        if (refreshed) {
          const refreshedVehicle = selectedVehicle ? refreshed.vehicles.find((vehicle) => vehicle.id === selectedVehicle.id) : null;
          setSelectedCustomer(selectedVehicle && !refreshedVehicle ? { ...refreshed, vehicles: [selectedVehicle, ...refreshed.vehicles] } : refreshed);
          if (refreshedVehicle) setSelectedVehicle(refreshedVehicle);
        }
      }).catch((cause) => { if (!isAbort(cause) && sequence === customerSequence.current) setCustomerError(errorMessage(cause, "No se pudieron buscar clientes.")); }).finally(() => { if (sequence === customerSequence.current) setCustomerLoading(false); });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [customerMode, customerSearch, selectedCustomer?.id]);

  const productVariants = (product: PickerProduct) => kind === "sale"
    ? (product as CommercialProduct).variants
    : ((product as Product).variants ?? []).filter((variant) => variant.is_active);
  const branchStock = (product: PickerProduct, variant: PickerVariant | null = null) => kind === "sale"
    ? Math.max(0, Number((variant as CommercialProductVariant | null)?.branch_stock ?? (product as CommercialProduct).branch_stock))
    : Math.max(0, Number((variant as ProductVariant | null)?.stock ?? (product as Product).stock));
  const productResults = useMemo(() => {
    if (kind === "sale") return commercialProducts.slice(0, 12);
    const term = productSearch.trim().toLocaleLowerCase("es");
    return publicProducts.filter((product) => !term || [product.name, product.sku, ...(product.variants?.map((variant) => `${variant.name} ${variant.sku ?? ""}`) ?? [])].some((value) => value?.toLocaleLowerCase("es").includes(term))).slice(0, 12);
  }, [commercialProducts, kind, productSearch, publicProducts]);
  const addProduct = (product: PickerProduct, variant: PickerVariant | null) => {
    if (kind === "sale") {
      const commercialProduct = product as CommercialProduct;
      const commercialVariant = variant as CommercialProductVariant | null;
      if (commercialProduct.has_variants && !commercialVariant) { setCatalogError("Selecciona una variante antes de agregar este producto."); return; }
      const maximum = branchStock(commercialProduct, commercialVariant);
      if (maximum <= 0) { setCatalogError("Este producto no tiene existencias disponibles en tu sede."); return; }
      if (!lines.some((line) => line.kind === "product" && line.productId === commercialProduct.id && line.variantId === (commercialVariant?.id ?? null))) setLines((current) => [...current, { key: makeKey(), kind: "product", productId: commercialProduct.id, variantId: commercialVariant?.id ?? null, name: `${commercialProduct.name}${commercialVariant ? ` / ${commercialVariant.display_name || commercialVariant.name || "Versión"}` : ""}`, detail: `${commercialVariant?.sku ?? commercialProduct.sku ?? "Sin SKU"} · Stock sede ${maximum}`, unitPrice: Number(commercialVariant?.price ?? commercialProduct.price), quantity: 1, discount: 0, maxQuantity: maximum, stockLabel: `Stock sede ${maximum}` }]);
      setCatalogError("");
      setSelectedProduct(null);
      return;
    }
    const publicProduct = product as Product;
    const publicVariant = variant as ProductVariant | null;
    if (!lines.some((line) => line.kind === "product" && line.productId === publicProduct.id && line.variantId === (publicVariant?.id ?? null))) setLines((current) => [...current, { key: makeKey(), kind: "product", productId: publicProduct.id, variantId: publicVariant?.id ?? null, name: `${publicProduct.name}${publicVariant ? ` / ${publicVariant.display_name || publicVariant.name}` : ""}`, detail: publicVariant?.sku ?? publicProduct.sku ?? "Sin SKU", unitPrice: Number(publicVariant?.price ?? publicProduct.price), quantity: 1, discount: 0, maxQuantity: null, stockLabel: null }]);
    setSelectedProduct(null);
  };
  const addService = (service: ServiceOption) => { if (!lines.some((line) => line.kind === "service" && line.serviceId === service.id)) setLines((current) => [...current, { key: makeKey(), kind: "service", serviceId: service.id, name: service.name, detail: [service.category?.name, service.estimated_duration_minutes ? `${service.estimated_duration_minutes} min` : null].filter(Boolean).join(" · ") || "Servicio", unitPrice: Number(service.price), quantity: 1, discount: 0, historical: false }]); };
  const changeCustomerMode = (mode: CustomerMode) => { setCustomerMode(mode); setSelectedCustomer(null); setSelectedVehicle(null); setCustomerResults([]); setCustomerError(""); setCustomerSearch(""); };
  const chooseCustomer = (option: CustomerOption) => { setSelectedCustomer(option); setSelectedVehicle(null); setCustomerResults([]); setCustomerSearch(""); };
  const total = lines.reduce((sum, line) => sum + Math.max(0, line.unitPrice * line.quantity - line.discount), 0);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!lines.length || saving || (customerMode === "registered" && !selectedCustomer)) return;
    const items: MyCommercialItemPayload[] = lines.map((line) => line.kind === "service" ? { item_type: "service", service_id: line.serviceId, quantity: line.quantity, discount_amount: line.discount } : { item_type: "product", product_id: line.productId, product_variant_id: line.variantId, quantity: line.quantity, discount_amount: line.discount });
    const customerPayload = customerMode === "registered" ? { customer_id: selectedCustomer?.id ?? null, customer_vehicle_id: selectedVehicle?.id ?? null } : customerMode === "adhoc" ? { customer_name: customer.name.trim() || null, customer_email: customer.email.trim() || null, customer_phone: customer.phone.trim() || null, customer_city: customer.city.trim() || null } : { customer_id: null, customer_vehicle_id: null };
    const common = { ...customerPayload, notes: notes.trim() || null, items };
    await onSubmit(kind === "quotation" ? { ...common, valid_until: validUntil || null } : common);
  };

  const vehicles = selectedCustomer?.vehicles ?? [];
  const effectiveBranchName = kind === "sale" ? catalogBranch?.name ?? branchName ?? "Sin sede vinculada" : branchName ?? "Sin sede vinculada";
  const saleCatalogHelp = kind === "sale" ? (catalogBranch ? `Catálogo autoritativo de ${catalogBranch.name}.` : "La sede de venta la deriva el backend desde tu Employee.") : "La disponibilidad es informativa; una cotización no reserva unidades.";
  return <form className="my-commerce-dialog" onSubmit={submit}>
    <header><div><span>Mi operación · {effectiveBranchName}</span><h2 id="my-commerce-form-title">{quotation ? "Editar cotización" : kind === "quotation" ? "Nueva cotización" : "Nueva venta"}</h2><p>Los precios y totales finales serán confirmados por el backend.</p></div><button type="button" aria-label="Cerrar" disabled={saving} onClick={onClose}><X size={20} /></button></header>
    <div className="my-commerce-dialog__body">
      <fieldset><legend>1. Items comerciales</legend><div className="my-branch-context"><strong>{kind === "sale" ? `Sede: ${effectiveBranchName}` : "Cotización"}</strong><span>{saleCatalogHelp}</span></div><div className="my-item-discovery">
        <section aria-labelledby="products-title"><h3 id="products-title"><Package size={17} /> Productos y variantes</h3><p className="my-commerce-help">{kind === "sale" ? "La disponibilidad usa el stock exacto de tu sede." : "La disponibilidad se muestra solo como referencia."}</p><label><span>Buscar producto, variante o SKU</span><div className="my-commerce-search"><Search size={17} /><input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} /></div></label>{productSearch.trim().length === 1 ? <p role="status">Escribe al menos 2 caracteres o limpia la búsqueda.</p> : loadingProducts ? <p role="status">Cargando catálogo...</p> : catalogError ? <p className="my-commerce-error" role="alert">{catalogError}</p> : selectedProduct ? <section className="my-product-results"><header><strong>{selectedProduct.name}</strong><button type="button" onClick={() => setSelectedProduct(null)}>Volver</button></header>{productVariants(selectedProduct).map((variant) => { const stock = branchStock(selectedProduct, variant); const disabled = kind === "sale" && stock <= 0; return <button type="button" key={variant.id} disabled={disabled} onClick={() => addProduct(selectedProduct, variant)}><span><strong>{variant.display_name || variant.name || "Versión"}</strong><small>{variant.sku ?? "Sin SKU"}{kind === "sale" ? ` · ${stock > 0 ? `Stock sede ${stock}` : "Agotada en tu sede"}` : ""}</small></span><b>{formatCurrency(Number(variant.price))}</b></button>; })}</section> : <section className="my-product-results">{productResults.map((product) => { const variants = productVariants(product); const hasVariants = Boolean(product.has_variants) || variants.length > 0; const variantStock = hasVariants ? variants.reduce((totalStock, variant) => totalStock + branchStock(product, variant), 0) : 0; const stock = hasVariants ? variantStock : branchStock(product); const saleBlocked = kind === "sale" && (hasVariants ? variantStock <= 0 : stock <= 0); const pricedVariants = kind === "sale" ? variants.filter((variant) => branchStock(product, variant) > 0) : variants; const price = pricedVariants.length ? Math.min(...pricedVariants.map((variant) => Number(variant.price))) : Number(product.price); return <button type="button" key={product.id} disabled={saleBlocked} onClick={() => variants.length ? setSelectedProduct(product) : addProduct(product, null)}><span><strong>{product.name}</strong><small>{product.sku ?? "Sin SKU"}{variants.length ? ` · ${variants.length} variantes` : ""}{kind === "sale" ? ` · ${stock > 0 ? `Stock sede ${stock}` : "Agotado en tu sede"}` : ""}</small></span><b>{variants.length ? kind === "sale" ? `Desde ${formatCurrency(price)}` : "Elegir variante" : formatCurrency(price)}</b></button>; })}{!productResults.length ? <p>No hay coincidencias.</p> : null}</section>}</section>
        <section aria-labelledby="services-title"><h3 id="services-title"><Wrench size={17} /> Servicios</h3><p className="my-commerce-help">Servicios activos disponibles para esta operación.</p><label><span>Buscar servicio</span><div className="my-commerce-search"><Search size={17} /><input value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} /></div></label>{serviceSearch.trim().length === 1 ? <p role="status">Escribe al menos 2 caracteres o limpia la búsqueda.</p> : servicesLoading ? <p role="status">Cargando servicios...</p> : servicesError ? <p className="my-commerce-error" role="alert">{servicesError}</p> : <section className="my-product-results">{services.map((service) => <button type="button" key={service.id} onClick={() => addService(service)}><span><strong>{service.name}</strong><small>{[service.category?.name, service.estimated_duration_minutes ? `${service.estimated_duration_minutes} min` : null].filter(Boolean).join(" · ") || "Servicio"}</small></span><b>{formatCurrency(service.price)}</b></button>)}{!services.length ? <p>No hay servicios disponibles.</p> : null}</section>}</section>
      </div><div className="my-commerce-lines">{lines.map((line) => { const maximum = line.kind === "product" && kind === "sale" ? line.maxQuantity ?? 999 : 999; return <article key={line.key}><div><strong>{line.name}</strong><small>{line.detail}{line.kind === "service" && line.historical ? " · Línea histórica" : ""}{line.kind === "product" && line.stockLabel ? ` · ${line.stockLabel}` : ""}</small></div><label><span>Cantidad</span><input type="number" min="1" max={maximum} step="1" value={line.quantity} onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, quantity: Math.max(1, Math.min(maximum, Number(event.target.value) || 1)) } : item))} /></label><label><span>Descuento</span><input type="number" min="0" step="1" value={line.discount} onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, discount: Math.max(0, Number(event.target.value) || 0) } : item))} /></label><button type="button" onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}>Quitar</button></article>; })}</div>{errors.items?.[0] ? <small className="my-field-error">{errors.items[0]}</small> : null}</fieldset>
      <fieldset><legend>2. Cliente</legend><div className="my-choice" role="radiogroup" aria-label="Tipo de cliente"><label><input type="radio" checked={customerMode === "counter"} onChange={() => changeCustomerMode("counter")} />Venta mostrador</label><label><input type="radio" checked={customerMode === "registered"} onChange={() => changeCustomerMode("registered")} />Cliente registrado</label><label><input type="radio" checked={customerMode === "adhoc"} onChange={() => changeCustomerMode("adhoc")} />Cliente ad hoc</label></div>{customerMode === "registered" ? <div className="my-customer-discovery"><label><span>Buscar cliente registrado</span><div className="my-commerce-search"><Search size={17} /><input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Nombre, contacto, documento o placa" autoComplete="off" /></div></label>{selectedCustomer ? <section className="my-selected-customer" aria-label="Cliente seleccionado"><div><small>Cliente seleccionado</small><strong>{selectedCustomer.name}</strong>{customerContact(selectedCustomer) ? <span>{customerContact(selectedCustomer)}</span> : null}</div><button type="button" onClick={() => { setSelectedCustomer(null); setSelectedVehicle(null); }}>Cambiar</button></section> : null}{customerSearch.trim().length < 2 ? <p role="status">Escribe al menos 2 caracteres para buscar.</p> : customerLoading ? <p role="status">Buscando clientes...</p> : customerError ? <p className="my-commerce-error" role="alert">{customerError}</p> : <section className="my-customer-results" aria-label="Resultados de clientes">{customerResults.map((option) => <button type="button" key={option.id} onClick={() => chooseCustomer(option)}><strong>{option.name}</strong><span>{customerContact(option) || "Sin contacto visible"}</span><small>{option.vehicles.length} vehículo{option.vehicles.length === 1 ? "" : "s"}</small></button>)}{!customerResults.length ? <p>No se encontraron clientes.</p> : null}</section>}{selectedCustomer ? <label><span>Vehículo (opcional)</span><select value={selectedVehicle?.id ?? ""} onChange={(event) => setSelectedVehicle(vehicles.find((vehicle) => vehicle.id === Number(event.target.value)) ?? null)}><option value="">Sin vehículo</option>{vehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.display_name}</option>)}</select></label> : null}{errors.customer_id?.[0] ? <small className="my-field-error">{errors.customer_id[0]}</small> : null}{errors.customer_vehicle_id?.[0] ? <small className="my-field-error">{errors.customer_vehicle_id[0]}</small> : null}</div> : customerMode === "adhoc" ? <div className="my-commerce-form-grid"><label><span>Nombre</span><input maxLength={120} value={customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))} /></label><label><span>Email</span><input type="email" maxLength={160} value={customer.email} onChange={(event) => setCustomer((current) => ({ ...current, email: event.target.value }))} /></label><label><span>Teléfono</span><input maxLength={40} value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} /></label><label><span>Ciudad</span><input maxLength={120} value={customer.city} onChange={(event) => setCustomer((current) => ({ ...current, city: event.target.value }))} /></label></div> : <p>El documento quedará como venta mostrador, sin cliente persistente.</p>}</fieldset>
      <fieldset><legend>3. Documento</legend>{kind === "quotation" ? <label><span>Válida hasta</span><input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></label> : <p>La venta se creará Pendiente; todavía no descontará inventario.</p>}<label><span>Notas</span><textarea maxLength={3000} value={notes} onChange={(event) => setNotes(event.target.value)} /></label></fieldset>{error ? <p className="my-commerce-error" role="alert">{error}</p> : null}
    </div>
    <footer><div><small>Total aproximado e informativo</small><strong>{formatCurrency(total)}</strong></div><button type="button" disabled={saving} onClick={onClose}>Cancelar</button><button className="is-primary" type="submit" disabled={saving || !lines.length || (customerMode === "registered" && !selectedCustomer)}>{saving ? "Guardando..." : quotation ? "Guardar cambios" : kind === "quotation" ? "Crear cotización" : "Crear venta pendiente"}</button></footer>
  </form>;
};
