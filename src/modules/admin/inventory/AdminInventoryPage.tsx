import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeftRight, Boxes, ChevronLeft, ChevronRight, CircleAlert, Pencil, Plus, Search, Truck, X } from "lucide-react";
import { listAllBranches } from "../../../api/branches";
import { ApiError } from "../../../api/http";
import { cancelInventoryTransfer, createInventoryMovement, createInventoryTransfer, dispatchInventoryTransfer, getInventoryCatalog, getInventoryMovements, getInventoryStocks, getInventoryTransfer, getInventoryTransfers, receiveInventoryTransfer, updateInventoryMinimum } from "../../../api/inventory";
import { CrmDialog } from "../../../components/crm/Dialog";
import { StatusBadge, type StatusBadgeTone } from "../../../components/crm/StatusBadge";
import type { Branch } from "../../../types/branch";
import type { InventoryCatalogProduct, InventoryMovement, InventoryMovementPayload, InventoryMovementType, InventoryStock, InventoryTransfer, InventoryTransferStatus, ManualInventoryMovementType } from "../../../types/inventory";
import { formatCrmTimestamp } from "../../../utils/crmDateTime";
import { hasPermission } from "../../../utils/authStorage";
import "./AdminInventoryPage.css";
import { getAdminProductCategories } from "../../../api/productCategories";
import { getAdminProductBrands } from "../../../api/productBrands";
import { getAdminVehicleBrands, getAdminVehicleModels, getAdminVehicleMultimediaSystems, getAdminVehicleVersions, } from "../../../api/vehicles";
import { ProductForm } from "./product-form/ProductForm";
import type { ProductFormCatalogs } from "./product-form/productFormTypes";

export type InventoryView = "stocks" | "movements" | "transfers";
const movementLabels: Record<InventoryMovementType, string> = { entry: "Entrada", exit: "Salida", adjustment: "Ajuste", sale: "Venta", sale_reversal: "Reversión de venta", transfer_out: "Salida por traslado", transfer_in: "Entrada por traslado" };
const transferLabels: Record<InventoryTransferStatus, string> = { requested: "Solicitada", in_transit: "En tránsito", received: "Recibida", cancelled: "Cancelada" };
const transferTones: Record<InventoryTransferStatus, StatusBadgeTone> = { requested: "warning", in_transit: "info", received: "success", cancelled: "neutral" };
const stockTones = { normal: "success", low: "warning", out: "danger" } as const;
const stockLabels = { normal: "Disponible", low: "Stock bajo", out: "Agotado" } as const;
const errorMessage = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;
const itemName = (stock: InventoryStock) => stock.product_variant ? `${stock.product?.name ?? "Producto"} / ${stock.product_variant.name}` : stock.product?.name ?? "Producto no disponible";
const itemSku = (stock: InventoryStock) => stock.product_variant?.sku ?? stock.product?.sku ?? "Sin SKU";
const newRequestKey = () => globalThis.crypto?.randomUUID?.() ?? `transfer-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const InventoryNavigation = ({ view }: { view: InventoryView }) => <nav className="inventory-tabs" aria-label="Secciones de inventario">
<a href="/crm/inventory" aria-current={view === "stocks" ? "page" : undefined}>
<Boxes size={17} aria-hidden="true" />Existencias</a>
<a href="/crm/inventory/movements" aria-current={view === "movements" ? "page" : undefined}>
<ArrowLeftRight size={17} aria-hidden="true" />Movimientos</a>{hasPermission("inventory_transfers.view") ? <a href="/crm/inventory/transfers" aria-current={view === "transfers" ? "page" : undefined}>
<Truck size={17} aria-hidden="true" />Transferencias</a> : null}</nav>;

export const AdminInventoryPage = ({ view = "stocks" }: { view?: InventoryView }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchError, setBranchError] = useState("");
  useEffect(() => { const controller = new AbortController(); listAllBranches(controller.signal).then(setBranches).catch((cause) => { if (!(cause instanceof DOMException && cause.name === "AbortError")) setBranchError(errorMessage(cause, "No se pudieron cargar las sedes.")); }); return () => controller.abort(); }, []);
  return <section className="admin-inventory">
<InventoryNavigation view={view} />{branchError ? <p className="inventory-feedback is-error" role="alert">{branchError}</p> : null}{view === "stocks" ? <StocksView branches={branches} /> : view === "movements" ? <MovementsView branches={branches} /> : <TransfersView branches={branches} />}</section>;
};

const StocksView = ({ branches }: { branches: Branch[] }) => {
  const canUpdate = hasPermission("inventory.update");
  const [stocks, setStocks] = useState<InventoryStock[]>([]);
  const [branchId, setBranchId] = useState("");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [minimumStock, setMinimumStock] = useState<InventoryStock | null>(null);
  const [movementStock, setMovementStock] = useState<InventoryStock | null>(null);
  const [enteringInventory, setEnteringInventory] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [dialogBusy, setDialogBusy] = useState(false);
  const requestId = useRef(0);
  const load = useCallback(async (signal?: AbortSignal) => { const current = ++requestId.current; setLoading(true); setError(""); try { const result = await getInventoryStocks({ branch_id: branchId ? Number(branchId) : undefined, search: submittedSearch || undefined, low_stock: criticalOnly || undefined, page, per_page: 25 }, signal); if (current === requestId.current) { setStocks(result.data); setPages(Math.max(1, result.last_page)); setTotal(result.total); } } catch (cause) { if (!(cause instanceof DOMException && cause.name === "AbortError") && current === requestId.current) setError(errorMessage(cause, "No se pudieron cargar las existencias.")); } finally { if (current === requestId.current) setLoading(false); } }, [branchId, criticalOnly, page, submittedSearch]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => { requestId.current += 1; controller.abort(); }; }, [load]);
  return <>
<header className="inventory-heading">
  <div>
    <span>Inventario multisede</span>
    <h2>Existencias por sede</h2>
    <p>La disponibilidad operativa se consulta por artículo y ubicación.</p>
  </div>

  {canUpdate ? (
    <div className="inventory-heading__actions">
      <button
        type="button"
        onClick={() => setCreatingProduct(true)}
      >
        <Plus size={18} />
        Crear producto
      </button>

      <button
        className="is-primary"
        type="button"
        onClick={() => setEnteringInventory(true)}
      >
        <Plus size={18} />
        Ajustar existencias
      </button>
    </div>
  ) : null}
</header>

<form
  className="inventory-filters"
  onSubmit={(event) => {
    event.preventDefault();
    setPage(1);
    setSubmittedSearch(search.trim());
  }}
>
  <label>
    <span>Sede</span>
    <select
      value={branchId}
      onChange={(event) => {
        setBranchId(event.target.value);
        setPage(1);
      }}
    >
      <option value="">Todas las sedes</option>
      {branches.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.name}
          {branch.is_active ? "" : " (inactiva)"}
        </option>
      ))}
    </select>
  </label>

  <label className="is-grow">
    <span>Producto o SKU</span>
    <div className="inventory-search">
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar producto, variante o SKU"
      />
      <button type="submit" aria-label="Buscar">
        <Search size={17} />
      </button>
    </div>
  </label>

  <label className="inventory-check">
    <input
      type="checkbox"
      checked={criticalOnly}
      onChange={(event) => {
        setCriticalOnly(event.target.checked);
        setPage(1);
      }}
    />
    <span>Solo stock bajo</span>
  </label>
</form>

{message ? (
  <p className="inventory-feedback" role="status">
    {message}
  </p>
) : null}

{error ? (
  <div className="inventory-feedback is-error" role="alert">
    {error}
    <button type="button" onClick={() => void load()}>
      Reintentar
    </button>
  </div>
) : null}

{loading && !stocks.length ? (
  <p className="inventory-state" role="status">
    Cargando existencias...
  </p>
) : null}

{!loading && !stocks.length && !error ? (
  <p className="inventory-state">
    No hay existencias que coincidan con los filtros.
  </p>
) : null}

{stocks.length ? (
  <div className="inventory-table-wrap" aria-busy={loading}>
    <table className="inventory-table">
      <thead>
        <tr>
          <th>Artículo</th>
          <th>Sede</th>
          <th>Estado</th>
          <th>Existencia</th>
          <th>Mínimo</th>
          <th>Acciones</th>
        </tr>
      </thead>

      <tbody>
        {stocks.map((stock) => (
          <tr key={stock.id}>
            <td data-label="Artículo">
              <strong>{itemName(stock)}</strong>
              <small>
                {itemSku(stock)} ·{" "}
                {stock.type === "variant" ? "Variante" : "Producto simple"}
              </small>
            </td>

            <td data-label="Sede">
              <strong>
                {stock.branch?.name ?? `Sede #${stock.branch_id}`}
              </strong>
              <small>{stock.branch?.code}</small>
            </td>

            <td data-label="Estado">
              <StatusBadge
                label={stockLabels[stock.status]}
                tone={stockTones[stock.status]}
              />
            </td>

            <td data-label="Existencia">
              <strong
                className={stock.status !== "normal" ? "is-critical" : ""}
              >
                {stock.quantity}
              </strong>
            </td>

            <td data-label="Mínimo">{stock.minimum_quantity}</td>

            <td data-label="Acciones">
              <div className="inventory-actions">
                {canUpdate ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setMovementStock(stock)}
                    >
                      Movimiento
                    </button>

                    <button
                      type="button"
                      onClick={() => setMinimumStock(stock)}
                    >
                      <Pencil size={14} />
                      Mínimo
                    </button>
                  </>
                ) : (
                  <span>Solo lectura</span>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
) : null}

<Pagination
  page={page}
  pages={pages}
  total={total}
  onPage={setPage}
/>

{/* CREAR PRODUCTO */}
<CrmDialog
  open={creatingProduct}
  titleId="product-create-title"
  onClose={() => setCreatingProduct(false)}
  busy={false}
>
  {creatingProduct ? (
    <CreateProductForm
      onClose={() => setCreatingProduct(false)}
      onSaved={(successMessage) => {
        setCreatingProduct(false);
        setMessage(successMessage);
        void load();
      }}
    />
  ) : null}
</CrmDialog>

{/* MODIFICAR STOCK MÍNIMO */}
<CrmDialog
  open={minimumStock !== null}
  titleId="minimum-title"
  onClose={() => setMinimumStock(null)}
  busy={dialogBusy}
>
  {minimumStock ? (
    <MinimumForm
      key={minimumStock.id}
      stock={minimumStock}
      onBusyChange={setDialogBusy}
      onClose={() => setMinimumStock(null)}
      onSaved={(updated) => {
        setStocks((current) =>
          current.map((item) =>
            item.id === updated.id ? updated : item
          )
        );
        setMinimumStock(null);
        setMessage("Stock mínimo actualizado correctamente.");
        void load();
      }}
    />
  ) : null}
</CrmDialog>

{/* MOVIMIENTO MANUAL */}
<CrmDialog
  open={movementStock !== null}
  titleId="movement-title"
  onClose={() => setMovementStock(null)}
  busy={dialogBusy}
>
  {movementStock ? (
    <MovementForm
      key={movementStock.id}
      stock={movementStock}
      onBusyChange={setDialogBusy}
      onClose={() => setMovementStock(null)}
      onSaved={() => {
        setMovementStock(null);
        setMessage("Movimiento registrado correctamente.");
        void load();
      }}
    />
  ) : null}
</CrmDialog>

{/* Ajustar existencias */}
<CrmDialog
  open={enteringInventory}
  titleId="inventory-entry-title"
  onClose={() => setEnteringInventory(false)}
  busy={dialogBusy}
>
  {enteringInventory ? (
    <InventoryEntryForm
      branches={branches}
      onBusyChange={setDialogBusy}
      onClose={() => setEnteringInventory(false)}
      onSaved={() => {
        setEnteringInventory(false);
        setMessage("Ingreso de inventario registrado correctamente.");
        void load();
      }}
    />
  ) : null}
</CrmDialog>
</>;
};

const MinimumForm = ({ stock, onBusyChange, onClose, onSaved }: { stock: InventoryStock | null; onBusyChange: (busy: boolean) => void; onClose: () => void; onSaved: (stock: InventoryStock) => void }) => { const [value, setValue] = useState(stock?.minimum_quantity ?? 0);
  const [saving, setSaving] = useState(false);
  const submitLock = useRef(false);
  const [error, setError] = useState(""); if (!stock) return null;
  const submit = async (event: FormEvent) => { event.preventDefault(); if (submitLock.current) return; submitLock.current = true; setSaving(true); onBusyChange(true); setError(""); try { onSaved(await updateInventoryMinimum({ branch_id: stock.branch_id, product_id: stock.product_id, product_variant_id: stock.product_variant_id, minimum_quantity: value })); } catch (cause) { setError(errorMessage(cause, "No se pudo actualizar el mínimo.")); } finally { submitLock.current = false; setSaving(false); onBusyChange(false); } }; return <form className="inventory-dialog" onSubmit={submit}>
<DialogHeader title="Stock mínimo" id="minimum-title" onClose={onClose} disabled={saving} />
<div className="inventory-dialog__body">
<p>
<strong>{itemName(stock)}</strong>
<br />{stock.branch?.name}</p>
<label>
<span>Mínimo por sede</span>
<input autoFocus required type="number" min="0" step="1" value={value} onChange={(event) => setValue(Number(event.target.value))} />
</label>{error ? <p role="alert" className="inventory-form-error">{error}</p> : null}</div>
<DialogFooter onClose={onClose} saving={saving} label="Guardar mínimo" />
</form>; };

const StockPicker = ({ options, value, loading, onChange, onSearch }: { options: InventoryStock[]; value: string; loading: boolean; onChange: (value: string) => void; onSearch: (value: string) => void }) => {
  const [search, setSearch] = useState("");
  const normalized = search.trim().toLocaleLowerCase("es");
  const visible = normalized ? options.filter((stock) => `${itemName(stock)} ${itemSku(stock)}`.toLocaleLowerCase("es").includes(normalized)) : options;
  return <div className="stock-picker"><label><span>Buscar artículo en origen</span><div className="inventory-search"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, variante o SKU" /><button type="button" aria-label="Buscar artículo" onClick={() => onSearch(search.trim())}><Search size={16} /></button></div></label><label><span>Artículo con stock</span><select value={value} onChange={(event) => onChange(event.target.value)} disabled={loading}><option value="">{loading ? "Consultando stock..." : visible.length ? "Selecciona un artículo" : "Sin coincidencias"}</option>{visible.map((stock) => <option key={stock.id} value={stock.id}>{itemName(stock)} · {itemSku(stock)} · Disponible {stock.quantity}</option>)}</select></label></div>;
};

const MovementForm = ({ stock, onBusyChange, onClose, onSaved }: { stock: InventoryStock | null; onBusyChange: (busy: boolean) => void; onClose: () => void; onSaved: () => void }) => {
  const [type, setType] = useState<ManualInventoryMovementType>("entry");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const submitLock = useRef(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({}); if (!stock) return null;
  const submit = async (event: FormEvent) => { event.preventDefault(); if (submitLock.current) return; submitLock.current = true; setSaving(true); onBusyChange(true); setError(""); setErrors({});
  const payload: InventoryMovementPayload = { branch_id: stock.branch_id, product_id: stock.product_id, product_variant_id: stock.product_variant_id, type, reason: reason.trim(), notes: notes.trim() || null, ...(type === "adjustment" ? { new_stock: quantity } : { quantity }) }; try { await createInventoryMovement(payload); onSaved(); } catch (cause) { if (cause instanceof ApiError) setErrors(cause.errors); setError(errorMessage(cause, "No se pudo registrar el movimiento.")); } finally { submitLock.current = false; setSaving(false); onBusyChange(false); } }; return <form className="inventory-dialog" onSubmit={submit}>
<DialogHeader title="Movimiento manual" id="movement-title" onClose={onClose} disabled={saving} />
<div className="inventory-dialog__body">
<p>
<strong>{itemName(stock)}</strong>
<br />{itemSku(stock)} · Existencia actual {stock.quantity}</p>
<div className="inventory-form-grid">
<div className="inventory-current-stock"><span>Sede</span><strong>{stock.branch?.name ?? `Sede #${stock.branch_id}`}</strong></div>
<label>
<span>Tipo *</span>
<select value={type} onChange={(e) => setType(e.target.value as ManualInventoryMovementType)}>
<option value="entry">Entrada</option>
<option value="exit">Salida</option>
<option value="adjustment">Ajuste a cantidad final</option>
</select>
</label>
<label>
<span>{type === "adjustment" ? "Nueva existencia" : "Cantidad"} *</span>
<input required type="number" min={type === "adjustment" ? 0 : 1} step="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />{errors.quantity?.[0] || errors.new_stock?.[0] ? <small>{errors.quantity?.[0] ?? errors.new_stock?.[0]}</small> : null}</label>
<label>
<span>Motivo *</span>
<input required maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} />{errors.reason?.[0] ? <small>{errors.reason[0]}</small> : null}</label>
<label className="is-wide">
<span>Notas</span>
<textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
</label>
</div>{error ? <p role="alert" className="inventory-form-error">{error}</p> : null}</div>
<DialogFooter onClose={onClose} saving={saving} label="Registrar movimiento" />
</form>; };

type EntryCatalogOption = { key: string; productId: number; variantId: number | null; name: string; sku: string | null; isActive: boolean };

const inventoryCatalogOptions = (products: InventoryCatalogProduct[]): EntryCatalogOption[] => products.flatMap<EntryCatalogOption>((product): EntryCatalogOption[] => {
  const variants = product.variants ?? [];
  if (variants.length) return variants.map((variant) => ({
    key: `variant-${variant.id}`,
    productId: product.id,
    variantId: variant.id,
    name: `${product.name} · ${variant.display_name || variant.name}`,
    sku: variant.sku ?? product.sku,
    isActive: product.is_active && variant.is_active,
  }));
  return [{ key: `product-${product.id}`, productId: product.id, variantId: null, name: product.name, sku: product.sku, isActive: product.is_active }];
});

const InventoryEntryForm = ({ branches, onBusyChange, onClose, onSaved }: { branches: Branch[]; onBusyChange: (busy: boolean) => void; onClose: () => void; onSaved: () => void }) => {
  const activeBranches = branches.filter((branch) => branch.is_active);
  const [branchId, setBranchId] = useState(String(activeBranches[0]?.id ?? ""));
  const [products, setProducts] = useState<InventoryCatalogProduct[]>([]);
  const [itemKey, setItemKey] = useState("");
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("Ingreso de mercancía");
  const [notes, setNotes] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const submitLock = useRef(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const controller = new AbortController();
    setCatalogLoading(true);
    getInventoryCatalog(controller.signal)
      .then((result) => setProducts(result.products))
      .catch((cause) => { if (!(cause instanceof DOMException && cause.name === "AbortError")) setCatalogError(errorMessage(cause, "No se pudo cargar el catálogo inventariable.")); })
      .finally(() => { if (!controller.signal.aborted) setCatalogLoading(false); });
    return () => controller.abort();
  }, []);

  const options = useMemo(() => inventoryCatalogOptions(products), [products]);
  const selected = options.find((option) => option.key === itemKey) ?? null;
  const visibleOptions = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return options.filter((option) => !term || `${option.name} ${option.sku ?? ""}`.toLocaleLowerCase("es").includes(term));
  }, [options, search]);

  useEffect(() => {
    if (!branchId || !selected) { setCurrentStock(null); return; }
    const controller = new AbortController();
    setStockLoading(true);
    getInventoryStocks({ branch_id: Number(branchId), product_id: selected.productId, product_variant_id: selected.variantId ?? undefined, per_page: 100 }, controller.signal)
      .then((result) => {
        const position = result.data.find((stock) => stock.product_id === selected.productId && stock.product_variant_id === selected.variantId);
        setCurrentStock(position?.quantity ?? 0);
      })
      .catch((cause) => { if (!(cause instanceof DOMException && cause.name === "AbortError")) setCurrentStock(null); })
      .finally(() => { if (!controller.signal.aborted) setStockLoading(false); });
    return () => controller.abort();
  }, [branchId, selected?.key]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitLock.current || !selected) return;
    submitLock.current = true; setSaving(true); onBusyChange(true); setError(""); setErrors({});
    const payload: InventoryMovementPayload = { branch_id: Number(branchId), product_id: selected.productId, product_variant_id: selected.variantId, type: "entry", quantity, reason: reason.trim(), notes: notes.trim() || null };
    try { await createInventoryMovement(payload); onSaved(); }
    catch (cause) { if (cause instanceof ApiError) setErrors(cause.errors); setError(errorMessage(cause, "No se pudo ingresar el inventario.")); }
    finally { submitLock.current = false; setSaving(false); onBusyChange(false); }
  };

  return <form className="inventory-dialog" onSubmit={submit}>
<DialogHeader title="Ajustar existencias" id="inventory-entry-title" onClose={onClose} disabled={saving} />
<div className="inventory-dialog__body">
<p>Registra una entrada para una posición existente o para el primer ingreso del artículo en la sede.</p>
<div className="inventory-form-grid">
<label><span>Sede *</span><select required value={branchId} onChange={(event) => setBranchId(event.target.value)}><option value="">Selecciona una sede</option>{activeBranches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select>{errors.branch_id?.[0] ? <small>{errors.branch_id[0]}</small> : null}</label>
<label><span>Buscar producto o SKU</span><div className="inventory-search"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Producto, variante o SKU" /><button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearch("")}><X size={16} /></button></div></label>
<label className="is-wide"><span>Producto / Variante *</span><select required value={itemKey} disabled={catalogLoading || Boolean(catalogError)} onChange={(event) => setItemKey(event.target.value)}><option value="">{catalogLoading ? "Cargando artículos..." : visibleOptions.length ? "Selecciona un artículo" : "Sin coincidencias"}</option>{visibleOptions.map((option) => <option value={option.key} key={option.key}>{option.name}{option.sku ? ` · SKU ${option.sku}` : ""}{option.isActive ? "" : " · Inactivo"}</option>)}</select>{errors.product_id?.[0] ? <small>{errors.product_id[0]}</small> : null}{errors.product_variant_id?.[0] ? <small>{errors.product_variant_id[0]}</small> : null}</label>
{catalogError ? <p className="inventory-form-error is-wide" role="alert">{catalogError}</p> : null}
<label><span>Cantidad *</span><input required type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />{errors.quantity?.[0] ? <small>{errors.quantity[0]}</small> : null}</label>
<div className="inventory-current-stock"><span>Stock actual en sede</span><strong>{!selected || !branchId ? "Selecciona sede y artículo" : stockLoading ? "Consultando..." : currentStock === null ? "No disponible" : currentStock}</strong></div>
<label className="is-wide"><span>Motivo *</span><input required maxLength={255} value={reason} onChange={(event) => setReason(event.target.value)} />{errors.reason?.[0] ? <small>{errors.reason[0]}</small> : null}</label>
<label className="is-wide"><span>Notas</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} />{errors.notes?.[0] ? <small>{errors.notes[0]}</small> : null}</label>
</div>{error ? <p role="alert" className="inventory-form-error">{error}</p> : null}</div>
<DialogFooter onClose={onClose} saving={saving} label="Ajustar existencias" />
</form>;
};




const CreateProductForm = ({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (message: string) => void;
}) => {
  const [catalogs, setCatalogs] = useState<ProductFormCatalogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadCatalogs = async () => {
      setLoading(true);
      setError("");

      try {
        const [
          categories,
          productBrands,
          vehicleBrands,
          vehicleModels,
          vehicleVersions,
          vehicleMultimediaSystems,
        ] = await Promise.all([
          getAdminProductCategories(),
          getAdminProductBrands(),
          getAdminVehicleBrands(),
          getAdminVehicleModels(),
          getAdminVehicleVersions(),
          getAdminVehicleMultimediaSystems(),
        ]);

        if (!active) return;

        setCatalogs({
          categories,
          productBrands,
          vehicleBrands,
          vehicleModels,
          vehicleVersions,
          vehicleMultimediaSystems,
        });
      } catch (cause) {
        if (!active) return;

        setError(
          errorMessage(
            cause,
            "No se pudieron cargar los datos necesarios para crear el producto."
          )
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadCatalogs();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="inventory-dialog">
        <DialogHeader
          id="product-create-title"
          title="Crear producto"
          onClose={onClose}
          disabled={false}
        />

        <div className="inventory-dialog__body">
          <p className="inventory-state" role="status">
            Cargando formulario...
          </p>
        </div>
      </div>
    );
  }

  if (error || !catalogs) {
    return (
      <div className="inventory-dialog">
        <DialogHeader
          id="product-create-title"
          title="Crear producto"
          onClose={onClose}
          disabled={false}
        />

        <div className="inventory-dialog__body">
          <p className="inventory-form-error" role="alert">
            {error || "No se pudo preparar el formulario."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ProductForm
      product={null}
      {...catalogs}
      onCancel={onClose}
      onSaved={(message) => {
        onSaved(message);
      }}
    />
  );
};

const MovementsView = ({ branches }: { branches: Branch[] }) => { const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [branchId, setBranchId] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const load = useCallback(async (signal?: AbortSignal) => { const current = ++requestId.current; setLoading(true); setError(""); try { const result = await getInventoryMovements({ branch_id: branchId ? Number(branchId) : undefined, type: type ? type as InventoryMovementType : undefined }, signal); if (current === requestId.current) setMovements(result); } catch (cause) { if (!(cause instanceof DOMException && cause.name === "AbortError") && current === requestId.current) setError(errorMessage(cause, "No se pudieron cargar los movimientos.")); } finally { if (current === requestId.current) setLoading(false); } }, [branchId, type]); useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => { requestId.current += 1; controller.abort(); }; }, [load]); return <>
<header className="inventory-heading">
<div>
<span>Trazabilidad</span>
<h2>Historial de movimientos</h2>
<p>Consulta entradas, salidas, ajustes, ventas y traslados por sede. Se muestran hasta 150 registros recientes.</p>
</div>
</header>
<div className="inventory-filters">
<label>
<span>Sede</span>
<select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
<option value="">Todas</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.is_active ? "" : " (inactiva)"}</option>)}</select>
</label>
<label>
<span>Tipo</span>
<select value={type} onChange={(e) => setType(e.target.value)}>
<option value="">Todos</option>{Object.entries(movementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
</label>
</div>{error ? <div className="inventory-feedback is-error" role="alert">{error}<button type="button" onClick={() => void load()}>Reintentar</button>
</div> : null}{loading && !movements.length ? <p className="inventory-state" role="status">Cargando movimientos...</p> : null}{!loading && !movements.length && !error ? <p className="inventory-state">No hay movimientos con estos filtros.</p> : null}{movements.length ? <div className="inventory-table-wrap">
<table className="inventory-table">
<thead>
<tr>
<th>Fecha</th>
<th>Artículo</th>
<th>Sede</th>
<th>Tipo</th>
<th>Cambio</th>
<th>Existencia</th>
<th>Motivo / referencia</th>
<th>Operador</th>
</tr>
</thead>
<tbody>{movements.map((movement) => { const product = movement.product ?? movement.inventory_item?.product ?? movement.product_variant?.product;
  const variant = movement.product_variant ?? movement.inventory_item?.product_variant; return <tr key={movement.id}>
<td data-label="Fecha">{formatCrmTimestamp(movement.created_at)}</td>
<td data-label="Artículo">
<strong>{variant ? `${product?.name ?? "Producto"} / ${variant.name}` : product?.name ?? `Artículo #${movement.inventory_item_id}`}</strong>
<small>{variant?.sku ?? product?.sku ?? "Sin SKU"}</small>
</td>
<td data-label="Sede">{movement.branch?.name ?? (movement.branch_id ? `Sede #${movement.branch_id}` : "Sin sede histórica")}</td>
<td data-label="Tipo">{movementLabels[movement.type]}</td>
<td data-label="Cambio">
<strong className={movement.quantity_delta < 0 ? "is-negative" : "is-positive"}>{movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta}</strong>
</td>
<td data-label="Existencia">{movement.stock_before} → {movement.stock_after}</td>
<td data-label="Motivo / referencia"><strong>{movement.reason ?? "—"}</strong>{movement.reference_type && movement.reference_id ? <small>{movement.reference_type} #{movement.reference_id}</small> : null}</td>
<td data-label="Operador">{movement.creator?.name ?? "Sistema"}</td>
</tr>; })}</tbody>
</table>
</div> : null}</>; };

const TransfersView = ({ branches }: { branches: Branch[] }) => { const canCreate = hasPermission("inventory_transfers.create");
  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [status, setStatus] = useState("");
  const [branchId, setBranchId] = useState("");
  const [sourceBranchId, setSourceBranchId] = useState("");
  const [destinationBranchId, setDestinationBranchId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<InventoryTransfer | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const requestId = useRef(0);
  const load = useCallback(async (signal?: AbortSignal) => { const current = ++requestId.current; setLoading(true); setError(""); try { const result = await getInventoryTransfers({ status: status ? status as InventoryTransferStatus : undefined, branch_id: branchId ? Number(branchId) : undefined, source_branch_id: sourceBranchId ? Number(sourceBranchId) : undefined, destination_branch_id: destinationBranchId ? Number(destinationBranchId) : undefined, from: from || undefined, to: to || undefined, search: submittedSearch || undefined, page, per_page: 25 }, signal); if (current === requestId.current) { setTransfers(result.data); setPages(Math.max(1, result.last_page)); setTotal(result.total); } } catch (cause) { if (!(cause instanceof DOMException && cause.name === "AbortError") && current === requestId.current) setError(errorMessage(cause, "No se pudieron cargar las transferencias.")); } finally { if (current === requestId.current) setLoading(false); } }, [branchId, destinationBranchId, from, page, sourceBranchId, status, submittedSearch, to]); useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => { requestId.current += 1; controller.abort(); }; }, [load]);
  const openDetail = async (id: number) => { setError(""); try { setDetail(await getInventoryTransfer(id)); } catch (cause) { setError(errorMessage(cause, "No se pudo cargar la transferencia.")); } }; return <>
<header className="inventory-heading">
<div>
<span>Logística multisede</span>
<h2>Transferencias</h2>
<p>Solicita, despacha y recibe inventario entre sedes con trazabilidad de cada etapa.</p>
</div>{canCreate ? <button className="is-primary" type="button" onClick={() => setCreating(true)}>
<Plus size={18} />Nueva transferencia</button> : null}</header>
<form className="inventory-filters is-transfer-filters" onSubmit={(e) => { e.preventDefault(); setPage(1); setSubmittedSearch(search.trim()); }}>
<label>
<span>Sede involucrada</span>
<select value={branchId} onChange={(e) => { setBranchId(e.target.value); setPage(1); }}>
<option value="">Todas</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.is_active ? "" : " (inactiva)"}</option>)}</select>
</label>
<label>
<span>Origen</span>
<select value={sourceBranchId} onChange={(e) => { setSourceBranchId(e.target.value); setPage(1); }}><option value="">Todos</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
</label>
<label>
<span>Destino</span>
<select value={destinationBranchId} onChange={(e) => { setDestinationBranchId(e.target.value); setPage(1); }}><option value="">Todos</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
</label>
<label><span>Desde</span><input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
<label><span>Hasta</span><input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
<label>
<span>Estado</span>
<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
<option value="">Todos</option>{Object.entries(transferLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
</label>
<label className="is-grow">
<span>Número</span>
<div className="inventory-search">
<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar transferencia" />
<button type="submit" aria-label="Buscar">
<Search size={17} />
</button>
</div>
</label>
</form>{message ? <p className="inventory-feedback" role="status">{message}</p> : null}{error ? <div className="inventory-feedback is-error" role="alert">{error}<button type="button" onClick={() => void load()}>Reintentar</button>
</div> : null}{loading && !transfers.length ? <p className="inventory-state" role="status">Cargando transferencias...</p> : null}{!loading && !transfers.length && !error ? <p className="inventory-state">Todavía no hay transferencias con estos filtros.</p> : null}{transfers.length ? <div className="transfer-grid">{transfers.map((transfer) => <article key={transfer.id}>
<header>
<div>
<small>Transferencia</small>
<h3>{transfer.number}</h3>
</div>
<StatusBadge label={transferLabels[transfer.status]} tone={transferTones[transfer.status]} />
</header>
<p>
<strong>{transfer.source_branch?.name ?? "Sede origen"}</strong> → <strong>{transfer.destination_branch?.name ?? "Sede destino"}</strong>
</p>
<dl>
<div>
<dt>Artículos</dt>
<dd>{transfer.items.length}</dd>
</div>
<div>
<dt>Solicitada</dt>
<dd>{formatCrmTimestamp(transfer.requested_at)}</dd>
</div>
</dl>
<button type="button" onClick={() => void openDetail(transfer.id)}>Ver detalle</button>
</article>)}</div> : null}<Pagination page={page} pages={pages} total={total} onPage={setPage} />
<CrmDialog open={creating} titleId="transfer-create-title" onClose={() => setCreating(false)} busy={dialogBusy}>
  {creating ? <TransferForm branches={branches} onBusyChange={setDialogBusy} onClose={() => setCreating(false)} onSaved={(transfer) => { setCreating(false); setMessage(`${transfer.number} solicitada correctamente.`); void load(); }} /> : null}
</CrmDialog>
<CrmDialog open={detail !== null} titleId="transfer-detail-title" onClose={() => setDetail(null)} busy={dialogBusy}>
  {detail ? <TransferDetail key={`${detail.id}-${detail.status}`} transfer={detail} onBusyChange={setDialogBusy} onClose={() => setDetail(null)} onChanged={(updated, success) => { setDetail(updated); setMessage(success); setTransfers((current) => current.map((item) => item.id === updated.id ? updated : item)); void load(); }} /> : null}
</CrmDialog>
</>; };

type TransferDraftItem = { stock: InventoryStock; quantity: number };
const TransferForm = ({ branches, onBusyChange, onClose, onSaved }: { branches: Branch[]; onBusyChange: (busy: boolean) => void; onClose: () => void; onSaved: (transfer: InventoryTransfer) => void }) => { const activeBranches = branches.filter((branch) => branch.is_active);
  const [sourceId, setSourceId] = useState(String(activeBranches[0]?.id ?? ""));
  const [destinationId, setDestinationId] = useState(String(activeBranches[1]?.id ?? ""));
  const [stocks, setStocks] = useState<InventoryStock[]>([]);
  const [stockId, setStockId] = useState("");
  const [stockSearch, setStockSearch] = useState("");
  const [items, setItems] = useState<TransferDraftItem[]>([]);
  const [notes, setNotes] = useState("");
  const [loadingStock, setLoadingStock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const requestKey = useRef(newRequestKey());
  const stockRequestId = useRef(0);
  const submitLock = useRef(false);
  useEffect(() => {
    const current = ++stockRequestId.current;
    setStocks([]);
    setStockId("");
    setError("");
    if (!sourceId) { setLoadingStock(false); return; }
    const controller = new AbortController();
    setLoadingStock(true);
    getInventoryStocks({ branch_id: Number(sourceId), search: stockSearch || undefined, per_page: 100 }, controller.signal)
      .then((result) => { if (current === stockRequestId.current) setStocks(result.data.filter((stock) => stock.quantity > 0)); })
      .catch((cause) => { if (!(cause instanceof DOMException && cause.name === "AbortError") && current === stockRequestId.current) setError(errorMessage(cause, "No se pudo consultar el stock de origen.")); })
      .finally(() => { if (current === stockRequestId.current) setLoadingStock(false); });
    return () => { stockRequestId.current += 1; controller.abort(); };
  }, [sourceId, stockSearch]);
  useEffect(() => { setItems([]); setStockId(""); setStockSearch(""); }, [sourceId]);
  const options = useMemo(() => stocks.filter((stock) => !items.some((item) => item.stock.inventory_item_id === stock.inventory_item_id)), [items, stocks]);
  const add = () => { const stock = stocks.find((item) => item.id === Number(stockId)); if (!stock) return; setItems((current) => [...current, { stock, quantity: 1 }]); setStockId(""); };
  const submit = async (event: FormEvent) => { event.preventDefault(); if (submitLock.current) return; if (sourceId === destinationId) { setError("La sede destino debe ser diferente de la sede origen."); return; } if (!items.length) { setError("Agrega al menos un artículo."); return; } submitLock.current = true; setSaving(true); onBusyChange(true); setError(""); setErrors({}); try { const response = await createInventoryTransfer({ source_branch_id: Number(sourceId), destination_branch_id: Number(destinationId), items: items.map(({ stock, quantity }) => ({ product_id: stock.product_id, product_variant_id: stock.product_variant_id, quantity })), notes: notes.trim() || null, client_request_key: requestKey.current }); onSaved(response.data); } catch (cause) { if (cause instanceof ApiError) setErrors(cause.errors); setError(errorMessage(cause, "No se pudo solicitar la transferencia.")); } finally { submitLock.current = false; setSaving(false); onBusyChange(false); } }; return <form className="inventory-dialog is-wide" onSubmit={submit}>
<DialogHeader id="transfer-create-title" title="Nueva transferencia" onClose={onClose} disabled={saving} />
<div className="inventory-dialog__body">
<p>La solicitud no descuenta existencias. El stock sale del origen únicamente al despachar.</p>
<div className="inventory-form-grid">
<label>
<span>Sede origen *</span>
<select required value={sourceId} onChange={(e) => { setStocks([]); setStockId(""); setItems([]); setLoadingStock(true); setSourceId(e.target.value); }}>{activeBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
</label>
<label>
<span>Sede destino *</span>
<select required value={destinationId} onChange={(e) => setDestinationId(e.target.value)}>{activeBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
</label>
</div>
<section className="transfer-items">
<div className="transfer-item-picker">
<StockPicker options={options} value={stockId} loading={loadingStock} onChange={setStockId} onSearch={setStockSearch} />
<button type="button" onClick={add} disabled={!stockId}>Agregar</button>
</div>{items.length ? <ul>{items.map((item) => <li key={item.stock.inventory_item_id}>
<div>
<strong>{itemName(item.stock)}</strong>
<small>{itemSku(item.stock)} · Disponible {item.stock.quantity}</small>
</div>
<label>
<span>Cantidad</span>
<input required type="number" min="1" step="1" value={item.quantity} onChange={(e) => setItems((current) => current.map((row) => row.stock.inventory_item_id === item.stock.inventory_item_id ? { ...row, quantity: Number(e.target.value) } : row))} />
</label>
<button type="button" aria-label={`Quitar ${itemName(item.stock)}`} onClick={() => setItems((current) => current.filter((row) => row.stock.inventory_item_id !== item.stock.inventory_item_id))}>
<X size={17} />
</button>
</li>)}</ul> : <p>No has agregado artículos.</p>}</section>
<label>
<span>Notas</span>
<textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
</label>{Object.values(errors).flat().length ? <ul className="inventory-validation">{Object.values(errors).flat().map((value, index) => <li key={`${index}-${value}`}>{value}</li>)}</ul> : null}{error ? <p role="alert" className="inventory-form-error">{error}</p> : null}</div>
<DialogFooter onClose={onClose} saving={saving} label="Solicitar transferencia" />
</form>; };

const TransferDetail = ({ transfer, onBusyChange, onClose, onChanged }: { transfer: InventoryTransfer | null; onBusyChange: (busy: boolean) => void; onClose: () => void; onChanged: (transfer: InventoryTransfer, message: string) => void }) => { const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);
  const [error, setError] = useState("");
  const [cancelReason, setCancelReason] = useState(""); if (!transfer) return null;
  const run = async (action: "dispatch" | "receive" | "cancel") => { if (actionLock.current) return; actionLock.current = true; setBusy(true); onBusyChange(true); setError(""); try { const response = action === "dispatch" ? await dispatchInventoryTransfer(transfer.id) : action === "receive" ? await receiveInventoryTransfer(transfer.id) : await cancelInventoryTransfer(transfer.id, cancelReason.trim()); onChanged(response.data, action === "dispatch" ? "Transferencia despachada." : action === "receive" ? "Transferencia recibida." : "Transferencia cancelada."); } catch (cause) { setError(errorMessage(cause, "No se pudo actualizar la transferencia.")); } finally { actionLock.current = false; setBusy(false); onBusyChange(false); } };
  const canDispatch = transfer.status === "requested" && hasPermission("inventory_transfers.dispatch");
  const canReceive = transfer.status === "in_transit" && hasPermission("inventory_transfers.receive");
  const canCancel = transfer.status === "requested" && hasPermission("inventory_transfers.cancel"); return <article className="inventory-dialog is-wide">
<DialogHeader id="transfer-detail-title" title={transfer.number} onClose={onClose} disabled={busy} />
<div className="inventory-dialog__body">
<div className="transfer-summary">
<StatusBadge label={transferLabels[transfer.status]} tone={transferTones[transfer.status]} />
<p>
<strong>{transfer.source_branch?.name}</strong> → <strong>{transfer.destination_branch?.name}</strong>
</p>
<small>Solicitada {formatCrmTimestamp(transfer.requested_at)} por {transfer.requester?.name ?? "Usuario"}</small>
{transfer.dispatched_at ? <small>Despachada {formatCrmTimestamp(transfer.dispatched_at)} por {transfer.dispatcher?.name ?? "Usuario"}</small> : null}
{transfer.received_at ? <small>Recibida {formatCrmTimestamp(transfer.received_at)} por {transfer.receiver?.name ?? "Usuario"}</small> : null}
{transfer.cancelled_at ? <small>Cancelada {formatCrmTimestamp(transfer.cancelled_at)} por {transfer.canceller?.name ?? "Usuario"}</small> : null}
</div>
{transfer.status === "requested" ? <p className="inventory-notice"><CircleAlert size={18} />Esta transferencia todavía no ha descontado inventario del origen. El stock se descuenta al despacharla y no está reservado.</p> : null}
<ul className="transfer-detail-items">{transfer.items.map((item) => <li key={item.id}>
<div>
<strong>{item.variant_name_snapshot ? `${item.product_name_snapshot} / ${item.variant_name_snapshot}` : item.product_name_snapshot}</strong>
<small>{item.sku_snapshot ?? "Sin SKU"}</small>
</div>
<b>{item.quantity}</b>
</li>)}</ul>{transfer.notes ? <p>
<strong>Notas:</strong> {transfer.notes}</p> : null}{transfer.status === "in_transit" ? <p className="inventory-notice">
<CircleAlert size={18} />Las unidades ya salieron del origen y están en tránsito; todavía no forman parte del stock destino.</p> : null}{transfer.cancellation_reason ? <p>
<strong>Motivo de cancelación:</strong> {transfer.cancellation_reason}</p> : null}{canCancel ? <label>
<span>Motivo para cancelar</span>
<input maxLength={255} required value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
</label> : null}{error ? <p role="alert" className="inventory-form-error">{error}</p> : null}</div>
<footer className="inventory-dialog__footer">
<button type="button" onClick={onClose} disabled={busy}>Cerrar</button>{canCancel ? <button className="is-danger" type="button" disabled={busy || !cancelReason.trim()} onClick={() => { if (window.confirm("¿Cancelar esta transferencia solicitada?")) void run("cancel"); }}>{busy ? "Procesando..." : "Cancelar transferencia"}</button> : null}{canDispatch ? <button className="is-primary" type="button" disabled={busy} onClick={() => { if (window.confirm("¿Despachar la transferencia? El stock saldrá de la sede origen y quedará en tránsito.")) void run("dispatch"); }}>{busy ? "Despachando..." : "Despachar"}</button> : null}{canReceive ? <button className="is-primary" type="button" disabled={busy} onClick={() => { if (window.confirm("¿Confirmar la recepción completa en la sede destino?")) void run("receive"); }}>{busy ? "Recibiendo..." : "Confirmar recepción"}</button> : null}</footer>
</article>; };

const Pagination = ({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (page: number) => void }) => total ? <nav className="inventory-pagination" aria-label="Paginación">
<button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
<ChevronLeft size={16} />Anterior</button>
<span>Página {page} de {pages} · {total} registros</span>
<button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>Siguiente<ChevronRight size={16} />
</button>
</nav> : null;
const DialogHeader = ({ id, title, onClose, disabled }: { id: string; title: string; onClose: () => void; disabled: boolean }) => <header className="inventory-dialog__header">
<div>
<span>Inventario multisede</span>
<h2 id={id}>{title}</h2>
</div>
<button type="button" aria-label="Cerrar" onClick={onClose} disabled={disabled}>
<X size={20} />
</button>
</header>;
const DialogFooter = ({ onClose, saving, label }: { onClose: () => void; saving: boolean; label: string }) => <footer className="inventory-dialog__footer">
<button type="button" onClick={onClose} disabled={saving}>Cancelar</button>
<button className="is-primary" type="submit" disabled={saving}>{saving ? "Guardando..." : label}</button>
</footer>;
