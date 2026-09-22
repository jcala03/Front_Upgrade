import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { listAllBranches } from "../../../api/branches";
import { getAdminCommercialProducts } from "../../../api/commercialProducts";
import { getCustomerVehicles } from "../../../api/customers";
import { getEmployees } from "../../../api/employees";
import { getVehicleBrands, getVehicleModels, getVehicleVersions } from "../../../api/vehicles";
import type { Branch } from "../../../types/branch";
import type { CommercialProduct, CommercialProductBranch, CommercialProductVariant } from "../../../types/commercialProduct";
import type { Employee } from "../../../types/employee";
import type { CreateAdminOrderPayload, Order, PaymentMethod } from "../../../types/order";
import type { Service } from "../../../types/service";
import type { Customer, CustomerVehicle } from "../../../types/customer";
import type { VehicleBrand, VehicleModel, VehicleVersion } from "../../../types/vehicle";
import { formatCurrency } from "../../../utils/formatCurrency";
import { hasPermission } from "../../../utils/authStorage";
import { paymentMethodLabels } from "./orderUtils";
import { CommercialItemPicker } from "./CommercialItemPicker";
import { formatServiceDuration } from "./ServicePicker";
import { CustomerPicker } from "./CustomerPicker";
import { useDialogFocus } from "./useDialogFocus";

export type SaleLine =
  | { type: "product"; key: string; product: CommercialProduct; variant: CommercialProductVariant | null; quantity: number; discount: number }
  | { type: "service"; key: string; service: Service; quantity: number; discount: number };
type Props = { open: boolean; onClose: () => void; onSubmit: (payload: CreateAdminOrderPayload) => Promise<Order>; onCreated: (order: Order) => void };
const paymentMethods: PaymentMethod[] = ["cash", "transfer", "card_terminal", "wompi", "other"];
type CustomerMode = "counter" | "existing" | "adhoc";
type VehicleMode = "none" | "existing" | "adhoc";

const isAbort = (cause: unknown) => cause instanceof DOMException && cause.name === "AbortError";
const errorMessage = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;
const productStock = (product: CommercialProduct, variant: CommercialProductVariant | null) => Math.max(0, Number(variant?.branch_stock ?? product.branch_stock));

export const SaleForm = ({ open, onClose, onSubmit, onCreated }: Props) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState("");
  const [branchId, setBranchId] = useState("");
  const [sellers, setSellers] = useState<Employee[]>([]);
  const [sellerId, setSellerId] = useState("");
  const [sellersLoading, setSellersLoading] = useState(false);
  const [sellersError, setSellersError] = useState("");
  const [products, setProducts] = useState<CommercialProduct[]>([]);
  const [catalogBranch, setCatalogBranch] = useState<CommercialProductBranch | null>(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [versions, setVersions] = useState<VehicleVersion[]>([]);
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [customerMode, setCustomerMode] = useState<CustomerMode>("counter");
  const [vehicleMode, setVehicleMode] = useState<VehicleMode>("none");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerVehicles, setCustomerVehicles] = useState<CustomerVehicle[]>([]);
  const [selectedCustomerVehicle, setSelectedCustomerVehicle] = useState<CustomerVehicle | null>(null);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState("");
  const [withPayment, setWithPayment] = useState(false);
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", document: "", city: "", address: "", notes: "" });
  const [vehicle, setVehicle] = useState({ brand: "", model: "", version: "", year: "", plate: "", vin: "", color: "", notes: "" });
  const [payment, setPayment] = useState({ method: "cash" as PaymentMethod, amount: "", reference: "", notes: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const vehiclesRequestRef = useRef(0);
  const catalogRequestRef = useRef(0);
  const sellersRequestRef = useRef(0);
  const customerFieldsId = useId();
  const vehicleFieldsId = useId();
  const paymentFieldsId = useId();
  const branchFieldsId = useId();
  const closeDialog = () => {
    if (!submitLockRef.current) onClose();
  };
  const dialogRef = useDialogFocus<HTMLDivElement>({
    open,
    onEscape: closeDialog,
    canClose: !submitting,
  });

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let active = true;
    setBranchesLoading(true);
    setBranchesError("");
    setError("");
    Promise.allSettled([listAllBranches(controller.signal), getVehicleBrands(), getVehicleModels(), getVehicleVersions()])
      .then(([nextBranches, nextBrands, nextModels, nextVersions]) => {
        if (!active) return;
        if (nextBranches.status === "fulfilled") setBranches(nextBranches.value);
        else if (!isAbort(nextBranches.reason)) setBranchesError(errorMessage(nextBranches.reason, "No se pudieron cargar las sedes."));
        if (nextBrands.status === "fulfilled") setBrands(nextBrands.value);
        else setError(errorMessage(nextBrands.reason, "No se pudieron cargar las marcas de vehículo."));
        if (nextModels.status === "fulfilled") setModels(nextModels.value);
        else setError(errorMessage(nextModels.reason, "No se pudieron cargar los modelos de vehículo."));
        if (nextVersions.status === "fulfilled") setVersions(nextVersions.value);
        else setError(errorMessage(nextVersions.reason, "No se pudieron cargar las versiones de vehículo."));
      })
      .finally(() => { if (active) setBranchesLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedBranchId = Number(branchId);
    if (!selectedBranchId) {
      sellersRequestRef.current += 1;
      setSellers([]);
      setSellerId("");
      setSellersError("");
      setSellersLoading(false);
      return;
    }
    const controller = new AbortController();
    const requestId = ++sellersRequestRef.current;
    setSellersLoading(true);
    setSellersError("");
    getEmployees({ branch_id: selectedBranchId, is_active: "1", page: 1, per_page: 100, sort: "name", direction: "asc" }, controller.signal)
      .then((response) => {
        if (requestId !== sellersRequestRef.current) return;
        const compatible = response.data.filter((employee) => employee.is_active && employee.branch_id === selectedBranchId);
        setSellers(compatible);
        setSellerId((current) => current && compatible.some((employee) => String(employee.id) === current) ? current : "");
      })
      .catch((cause) => { if (!isAbort(cause) && requestId === sellersRequestRef.current) setSellersError(errorMessage(cause, "No se pudieron cargar vendedores compatibles.")); })
      .finally(() => { if (requestId === sellersRequestRef.current) setSellersLoading(false); });
    return () => { controller.abort(); };
  }, [open, branchId]);

  useEffect(() => {
    if (!open) return;
    const selectedBranchId = Number(branchId);
    const term = catalogSearch.trim();
    if (!selectedBranchId) {
      catalogRequestRef.current += 1;
      setProducts([]);
      setCatalogBranch(null);
      setCatalogError("");
      setCatalogLoading(false);
      return;
    }
    if (term.length === 1) {
      catalogRequestRef.current += 1;
      setProducts([]);
      setCatalogError("");
      setCatalogLoading(false);
      return;
    }
    const controller = new AbortController();
    const requestId = ++catalogRequestRef.current;
    const timer = window.setTimeout(() => {
      setCatalogLoading(true);
      setCatalogError("");
      getAdminCommercialProducts({ branch_id: selectedBranchId, search: term || undefined, limit: 100 }, controller.signal)
        .then((catalog) => {
          if (requestId !== catalogRequestRef.current) return;
          setCatalogBranch(catalog.branch);
          if (catalog.branch.id !== selectedBranchId) {
            setProducts([]);
            setCatalogError("El catálogo respondió una sede distinta a la seleccionada. Vuelve a seleccionar la sede antes de vender.");
            return;
          }
          setProducts(catalog.products);
        })
        .catch((cause) => { if (!isAbort(cause) && requestId === catalogRequestRef.current) setCatalogError(errorMessage(cause, "No se pudieron cargar los productos de la sede.")); })
        .finally(() => { if (requestId === catalogRequestRef.current) setCatalogLoading(false); });
    }, term ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, branchId, catalogSearch]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  const visibleModels = models.filter((model) => String(model.vehicle_brand_id) === vehicle.brand && model.is_active);
  const visibleVersions = versions.filter((version) => String(version.vehicle_model_id) === vehicle.model && version.is_active);
  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + (line.type === "product" ? Number(line.variant?.price ?? line.product.price) : Number(line.service.price)) * line.quantity, 0), [lines]);
  const discounts = lines.reduce((sum, line) => sum + line.discount, 0);
  const estimatedTotal = Math.max(0, subtotal - discounts);
  const paymentAmount = Number(payment.amount || 0);
  const activeBranches = branches.filter((branch) => branch.is_active);
  const selectedBranch = activeBranches.find((branch) => String(branch.id) === branchId) ?? null;

  const addLine = (product: CommercialProduct, variant: CommercialProductVariant | null) => {
    if (product.has_variants && !variant) { setError("Selecciona una variante antes de agregar este producto."); return; }
    const maximum = productStock(product, variant);
    if (maximum <= 0) { setError("Este producto no tiene existencias disponibles en la sede seleccionada."); return; }
    const key = `${product.id}:${variant?.id ?? "product"}`;
    setLines((current) => current.some((line) => line.key === key)
      ? current.map((line) => line.key === key && line.type === "product" ? { ...line, quantity: Math.min(line.quantity + 1, maximum) } : line)
      : [...current, { type: "product", key, product, variant, quantity: 1, discount: 0 }]);
    setError("");
  };

  const addServiceLine = (service: Service) => {
    const key = `service:${service.id}`;
    setLines((current) => current.some((line) => line.key === key)
      ? current.map((line) => line.key === key && line.type === "service" ? { ...line, quantity: Math.min(999, line.quantity + 1) } : line)
      : [...current, { type: "service", key, service, quantity: 1, discount: 0 }]);
  };

  const reset = () => {
    vehiclesRequestRef.current += 1;
    catalogRequestRef.current += 1;
    sellersRequestRef.current += 1;
    setLines([]); setCustomerMode("counter"); setVehicleMode("none"); setSelectedCustomer(null); setCustomerVehicles([]); setSelectedCustomerVehicle(null); setVehiclesLoading(false); setVehiclesError(""); setWithPayment(false);
    setBranchId(""); setSellerId(""); setSellers([]); setSellersLoading(false); setSellersError(""); setProducts([]); setCatalogBranch(null); setCatalogSearch(""); setCatalogLoading(false); setCatalogError("");
    setCustomer({ name: "", phone: "", email: "", document: "", city: "", address: "", notes: "" });
    setVehicle({ brand: "", model: "", version: "", year: "", plate: "", vin: "", color: "", notes: "" });
    setPayment({ method: "cash", amount: "", reference: "", notes: "" }); setError("");
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const resetPersistentVehicle = () => {
    vehiclesRequestRef.current += 1;
    setVehicleMode("none");
    setSelectedCustomerVehicle(null);
    setCustomerVehicles([]);
    setVehiclesLoading(false);
    setVehiclesError("");
  };

  const changeCustomerMode = (mode: CustomerMode) => {
    setCustomerMode(mode);
    setSelectedCustomer(null);
    resetPersistentVehicle();
    if (mode !== "adhoc") setCustomer({ name: "", phone: "", email: "", document: "", city: "", address: "", notes: "" });
  };

  const changeVehicleMode = (mode: VehicleMode) => {
    setVehicleMode(mode);
    setSelectedCustomerVehicle(null);
    if (mode !== "adhoc") setVehicle({ brand: "", model: "", version: "", year: "", plate: "", vin: "", color: "", notes: "" });
  };

  const changeBranch = (nextBranchId: string) => {
    if (nextBranchId === branchId) return;
    if (lines.length) {
      const confirmed = window.confirm("Cambiar la sede eliminará los artículos seleccionados, porque las existencias dependen de la sede.");
      if (!confirmed) return;
      setLines([]);
    }
    setBranchId(nextBranchId);
    setSellerId("");
    setCatalogSearch("");
    setProducts([]);
    setCatalogBranch(null);
    setCatalogError("");
    setError("");
  };

  const selectCustomer = async (nextCustomer: Customer) => {
    setSelectedCustomer(nextCustomer);
    setCustomer((current) => ({ ...current, notes: "" }));
    resetPersistentVehicle();
    const requestId = ++vehiclesRequestRef.current;
    setVehiclesLoading(true);
    try { const nextVehicles = await getCustomerVehicles(nextCustomer.id); if (requestId === vehiclesRequestRef.current) setCustomerVehicles(nextVehicles); }
    catch (cause) { if (requestId === vehiclesRequestRef.current) setVehiclesError(errorMessage(cause, "No se pudieron cargar los vehículos del cliente.")); }
    finally { if (requestId === vehiclesRequestRef.current) setVehiclesLoading(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitLockRef.current) return;
    const selectedBranchId = Number(branchId);
    if (!selectedBranchId) { setError("Selecciona una sede para registrar la venta."); return; }
    if (!lines.length) { setError("Agrega al menos un artículo."); return; }
    if (sellerId && !sellers.some((seller) => String(seller.id) === sellerId && seller.branch_id === selectedBranchId)) { setError("Selecciona un vendedor compatible con la sede."); return; }
    if (customerMode === "existing" && !selectedCustomer) { setError("Selecciona un cliente existente o cambia el modo de cliente."); return; }
    if (vehicleMode === "existing" && !selectedCustomerVehicle) { setError("Selecciona un vehículo del cliente o cambia el modo de vehículo."); return; }
    if (withPayment && (paymentAmount <= 0 || paymentAmount > estimatedTotal)) { setError("El pago debe ser mayor a cero y no superar el total aproximado."); return; }
    const clean = (value: string) => value.trim() || undefined;
    const payload: CreateAdminOrderPayload = {
      branch_id: selectedBranchId,
      ...(sellerId ? { sales_employee_id: Number(sellerId) } : {}),
      ...(customerMode === "existing" && selectedCustomer ? { customer_id: selectedCustomer.id, customer_notes: clean(customer.notes) } : {}),
      ...(customerMode === "adhoc" ? { customer_name: clean(customer.name), customer_phone: clean(customer.phone), customer_email: clean(customer.email), customer_document: clean(customer.document), customer_city: clean(customer.city), customer_address: clean(customer.address), customer_notes: clean(customer.notes) } : {}),
      ...(vehicleMode === "existing" && selectedCustomerVehicle ? { customer_vehicle_id: selectedCustomerVehicle.id } : {}),
      ...(vehicleMode === "adhoc" ? { vehicle_brand_id: vehicle.brand ? Number(vehicle.brand) : null, vehicle_model_id: vehicle.model ? Number(vehicle.model) : null, vehicle_version_id: vehicle.version ? Number(vehicle.version) : null, vehicle_year: vehicle.year ? Number(vehicle.year) : undefined, vehicle_plate: clean(vehicle.plate), vehicle_vin: clean(vehicle.vin), vehicle_color: clean(vehicle.color), vehicle_notes: clean(vehicle.notes) } : {}),
      items: lines.map((line) => line.type === "service"
        ? { item_type: "service" as const, service_id: line.service.id, quantity: line.quantity, discount_amount: Math.max(0, line.discount) }
        : { product_id: line.product.id, product_variant_id: line.variant?.id ?? null, quantity: line.quantity, discount_amount: Math.max(0, line.discount) }),
      ...(withPayment ? { payment: { amount: paymentAmount, method: payment.method, reference: clean(payment.reference), notes: clean(payment.notes) } } : {}),
    };
    submitLockRef.current = true;
    try { setSubmitting(true); setError(""); const order = await onSubmit(payload); reset(); onCreated(order); }
    catch (submitError) { setError(errorMessage(submitError, "No se pudo registrar la venta.")); }
    finally { submitLockRef.current = false; setSubmitting(false); }
  };

  if (!open) return null;
  const productHelperText = !branchId
    ? "Selecciona una sede para consultar las existencias disponibles."
    : catalogSearch.trim().length === 1
      ? "Escribe al menos 2 caracteres o limpia la búsqueda."
      : catalogBranch
        ? `Catálogo de ${catalogBranch.name}. Las cantidades usan el stock de esta sede.`
        : undefined;
  return (
    <div ref={dialogRef} className="orders-sheet" role="dialog" aria-modal="true" aria-labelledby="sale-form-title" tabIndex={-1}>
      <button className="orders-sheet__backdrop" type="button" tabIndex={-1} aria-label="Cerrar nueva venta" disabled={submitting} onClick={closeDialog} />
      <form className="orders-sheet__panel" onSubmit={submit}>
        <header className="orders-sheet__header"><div><span>Venta CRM</span><h2 id="sale-form-title" tabIndex={-1} data-dialog-initial>Nueva venta</h2><p>El backend confirmará precios, stock y totales.</p></div><button type="button" disabled={submitting} onClick={closeDialog}>Cerrar</button></header>
        <div className="orders-sheet__body">
          <fieldset><legend>1. Cliente</legend><div className="sale-mode-options">{([{ value: "counter", label: "Venta mostrador" }, ...(hasPermission("customers.view") ? [{ value: "existing", label: "Cliente existente" }] : []), { value: "adhoc", label: "Cliente ad hoc" }] as { value: CustomerMode; label: string }[]).map((option) => <label key={option.value}><input type="radio" name="customer-mode" value={option.value} checked={customerMode === option.value} disabled={submitting} onChange={() => changeCustomerMode(option.value)} /><span>{option.label}</span></label>)}</div>
            {customerMode === "counter" ? <p>Venta mostrador / Sin cliente.</p> : customerMode === "existing" ? <div id={customerFieldsId} className="sale-existing-customer"><CustomerPicker selected={selectedCustomer} disabled={submitting} onSelect={(next) => void selectCustomer(next)} onClear={() => { setSelectedCustomer(null); setCustomer((current) => ({ ...current, notes: "" })); resetPersistentVehicle(); }} />{selectedCustomer ? <label className="orders-field"><span>Notas de esta venta</span><textarea value={customer.notes} disabled={submitting} onChange={(event) => setCustomer((current) => ({ ...current, notes: event.target.value }))} /></label> : null}</div> : <div className="orders-form-grid" id={customerFieldsId}>{([['name','Nombre'],['phone','Teléfono'],['email','Email'],['document','Documento'],['city','Ciudad'],['address','Dirección']] as const).map(([key,label]) => <label className="orders-field" key={key}><span>{label}</span><input type={key === 'email' ? 'email' : 'text'} value={customer[key]} disabled={submitting} onChange={(event) => setCustomer((current) => ({ ...current, [key]: event.target.value }))} /></label>)}<label className="orders-field orders-field--full"><span>Notas de esta venta</span><textarea value={customer.notes} disabled={submitting} onChange={(event) => setCustomer((current) => ({ ...current, notes: event.target.value }))} /></label></div>}
          </fieldset>
          <fieldset><legend>2. Sede y vendedor</legend><div className="orders-form-grid" id={branchFieldsId}>
            <label className="orders-field"><span>Sede *</span><select value={branchId} disabled={submitting || branchesLoading} onChange={(event) => changeBranch(event.target.value)}><option value="">{branchesLoading ? "Cargando sedes..." : "Seleccionar sede"}</option>{activeBranches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select>{branchesError ? <small className="orders-field-error" role="alert">{branchesError}</small> : null}</label>
            <label className="orders-field"><span>Vendedor opcional</span><select value={sellerId} disabled={submitting || !branchId || sellersLoading || Boolean(sellersError)} onChange={(event) => setSellerId(event.target.value)}><option value="">{!branchId ? "Selecciona sede primero" : sellersLoading ? "Cargando vendedores..." : "Sin vendedor asignado"}</option>{sellers.map((seller) => <option value={seller.id} key={seller.id}>{seller.name}</option>)}</select>{sellersError ? <small className="orders-field-error" role="alert">{sellersError}</small> : null}</label>
          </div>{selectedBranch ? <p className="sale-branch-context">Sede seleccionada: <strong>{selectedBranch.name}</strong>. El catálogo comercial se consulta por sede y el vendedor debe pertenecer a ella.</p> : <p className="sale-branch-context">Selecciona una sede activa para habilitar productos y vendedores compatibles.</p>}</fieldset>
          <fieldset><legend>3. Vehículo</legend><div className="sale-mode-options">{([{ value: "none", label: "Sin vehículo" }, ...(selectedCustomer ? [{ value: "existing", label: "Vehículo del cliente" }] : []), { value: "adhoc", label: "Vehículo ad hoc" }] as { value: VehicleMode; label: string }[]).map((option) => <label key={option.value}><input type="radio" name="vehicle-mode" value={option.value} checked={vehicleMode === option.value} disabled={submitting || (option.value === "existing" && !selectedCustomer)} onChange={() => changeVehicleMode(option.value)} /><span>{option.label}</span></label>)}</div>
            {vehicleMode === "none" ? <p>Sin vehículo asociado.</p> : vehicleMode === "existing" ? <div id={vehicleFieldsId} className="sale-customer-vehicles">{vehiclesLoading ? <p role="status">Cargando vehículos...</p> : vehiclesError ? <p className="orders-error" role="alert">{vehiclesError}</p> : !customerVehicles.length ? <p>Este cliente todavía no tiene vehículos registrados.</p> : customerVehicles.map((item) => { const brand = item.vehicle_brand ?? item.vehicleBrand; const model = item.vehicle_model ?? item.vehicleModel; const version = item.vehicle_version ?? item.vehicleVersion; const isSelected = selectedCustomerVehicle?.id === item.id; return <article className={isSelected ? "is-selected" : ""} key={item.id}><div><strong>{item.nickname || [brand?.name, model?.name].filter(Boolean).join(" ") || "Vehículo sin catálogo"}</strong><small>{[version?.display_name, item.year, item.plate].filter(Boolean).join(" · ") || "Datos parciales"}</small><span>{item.is_active ? "Activo" : "Inactivo"}</span></div><button type="button" disabled={submitting || !item.is_active} onClick={() => setSelectedCustomerVehicle(item)}>{isSelected ? "Seleccionado" : item.is_active ? "Seleccionar" : "No disponible"}</button></article>; })}</div> : <div className="orders-form-grid" id={vehicleFieldsId}><label className="orders-field"><span>Marca</span><select value={vehicle.brand} disabled={submitting} onChange={(event) => setVehicle((current) => ({ ...current, brand: event.target.value, model: "", version: "" }))}><option value="">Seleccionar</option>{brands.filter((item) => item.is_active).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="orders-field"><span>Modelo</span><select value={vehicle.model} disabled={submitting || !vehicle.brand} onChange={(event) => setVehicle((current) => ({ ...current, model: event.target.value, version: "" }))}><option value="">Seleccionar</option>{visibleModels.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="orders-field"><span>Versión</span><select value={vehicle.version} disabled={submitting || !vehicle.model} onChange={(event) => setVehicle((current) => ({ ...current, version: event.target.value }))}><option value="">Seleccionar</option>{visibleVersions.map((item) => <option value={item.id} key={item.id}>{item.display_name}</option>)}</select></label>{([['year','Año'],['plate','Placa'],['vin','VIN'],['color','Color']] as const).map(([key,label]) => <label className="orders-field" key={key}><span>{label}</span><input type={key === 'year' ? 'number' : 'text'} value={vehicle[key]} disabled={submitting} onChange={(event) => setVehicle((current) => ({ ...current, [key]: event.target.value }))} /></label>)}<label className="orders-field orders-field--full"><span>Notas del vehículo</span><textarea value={vehicle.notes} disabled={submitting} onChange={(event) => setVehicle((current) => ({ ...current, notes: event.target.value }))} /></label></div>}
          </fieldset>
          <fieldset><legend>4. Productos y servicios</legend><CommercialItemPicker<CommercialProduct, CommercialProductVariant> products={products} onAddProduct={addLine} onAddService={addServiceLine} disabled={submitting || !branchId} stockMode="branch" productsLoading={catalogLoading} productsError={catalogError} productSearchValue={catalogSearch} onProductSearchChange={setCatalogSearch} productHelperText={productHelperText} productEmptyMessage={branchId ? "No hay productos comerciales para esta búsqueda en la sede." : "Selecciona una sede para consultar productos."} productLoadingMessage="Cargando productos de la sede..." />
            <div className="sale-lines">{lines.map((line) => { const isProduct = line.type === "product"; const price = isProduct ? Number(line.variant?.price ?? line.product.price) : Number(line.service.price); const maximum = isProduct ? Math.max(1, productStock(line.product, line.variant)) : 999; return <article key={line.key}><div><span className="commercial-line-type">{isProduct ? "Producto" : "Servicio"}</span><strong>{isProduct ? line.product.name : line.service.name}</strong><span>{isProduct ? `${line.variant?.display_name || line.variant?.name || "Artículo simple"} · ${line.variant?.sku || line.product.sku || "Sin SKU"} · Stock sede ${maximum}` : `${line.service.category?.name ?? "Sin categoría"} · ${formatServiceDuration(line.service.estimated_duration_minutes)}`}</span></div><label>Cantidad<input type="number" min="1" max={maximum} value={line.quantity} onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, quantity: Math.max(1, Math.min(maximum, Number(event.target.value) || 1)) } : item))} /></label><label>Descuento COP<input type="number" min="0" value={line.discount} onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, discount: Math.max(0, Number(event.target.value)) } : item))} /></label><strong>{formatCurrency(Math.max(0, price * line.quantity - line.discount))}</strong><button type="button" onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}>Eliminar</button></article>; })}</div>
          </fieldset>
          <fieldset><legend>5. Pago inicial opcional</legend><label className="orders-toggle"><input type="checkbox" checked={withPayment} aria-expanded={withPayment} aria-controls={paymentFieldsId} onChange={(event) => setWithPayment(event.target.checked)} /> Registrar pago ahora</label>{withPayment ? <div className="orders-form-grid" id={paymentFieldsId}><label className="orders-field"><span>Método</span><select value={payment.method} onChange={(event) => setPayment((current) => ({ ...current, method: event.target.value as PaymentMethod }))}>{paymentMethods.map((method) => <option value={method} key={method}>{paymentMethodLabels[method]}</option>)}</select></label><label className="orders-field"><span>Monto</span><input type="number" min="1" max={estimatedTotal} value={payment.amount} onChange={(event) => setPayment((current) => ({ ...current, amount: event.target.value }))} /></label><label className="orders-field"><span>Referencia</span><input value={payment.reference} onChange={(event) => setPayment((current) => ({ ...current, reference: event.target.value }))} /></label><label className="orders-field orders-field--full"><span>Notas</span><textarea value={payment.notes} onChange={(event) => setPayment((current) => ({ ...current, notes: event.target.value }))} /></label></div> : null}</fieldset>
          {error ? <p className="orders-error" role="alert">{error}</p> : null}
        </div>
        <footer className="orders-sheet__footer"><div><span>Subtotal {formatCurrency(subtotal)}</span><span>Descuento {formatCurrency(discounts)}</span><strong>Total aproximado {formatCurrency(estimatedTotal)}</strong>{withPayment ? <small>Restante aproximado {formatCurrency(estimatedTotal - paymentAmount)}</small> : null}</div><button type="submit" disabled={submitting || !branchId || !lines.length}>{submitting ? "Registrando..." : "Registrar venta"}</button></footer>
      </form>
    </div>
  );
};
