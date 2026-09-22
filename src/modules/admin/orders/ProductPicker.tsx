import { useEffect, useMemo, useState } from "react";
import type { CommercialProduct, CommercialProductVariant } from "../../../types/commercialProduct";
import type {
  AdminProduct,
  AdminProductVariant,
  Product,
  ProductVariant,
} from "../../../types/product";
import { formatCurrency } from "../../../utils/formatCurrency";

export type ProductPickerStockMode = "legacy" | "branch" | "none";
export type PickerProduct = Product | AdminProduct | CommercialProduct;
export type PickerVariant = ProductVariant | AdminProductVariant | CommercialProductVariant;

type Props<TProduct extends PickerProduct = Product, TVariant extends PickerVariant = ProductVariant> = {
  products: TProduct[];
  onAdd: (product: TProduct, variant: TVariant | null) => void;
  allowOutOfStockSelection?: boolean;
  stockMode?: ProductPickerStockMode;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  helperText?: string;
  emptyMessage?: string;
  loadingMessage?: string;
};

const itemStock = (item: PickerProduct | PickerVariant, mode: ProductPickerStockMode) => {
  if (mode === "branch") return "branch_stock" in item ? Number(item.branch_stock) : 0;
  return "stock" in item ? Number(item.stock) : 0;
};

const productVariants = <TVariant extends PickerVariant>(product: PickerProduct, mode: ProductPickerStockMode): TVariant[] => {
  const variants = "variants" in product && Array.isArray(product.variants) ? product.variants : [];
  if (mode === "branch") return variants as TVariant[];
  return variants.filter((variant) => "is_active" in variant ? variant.is_active : true) as TVariant[];
};

const variantName = (variant: PickerVariant) => variant.display_name || variant.name || "Versión";
const productHasVariants = (product: PickerProduct) => Boolean(product.has_variants);
const specsEntries = (variant: PickerVariant) => Object.entries(variant.specs ?? {}).slice(0, 3);

export function ProductPicker<TProduct extends PickerProduct = Product, TVariant extends PickerVariant = ProductVariant>({
  products,
  onAdd,
  allowOutOfStockSelection = false,
  stockMode = "legacy",
  disabled = false,
  loading = false,
  error = "",
  searchValue,
  onSearchChange,
  helperText,
  emptyMessage = "No encontramos artículos con esa búsqueda.",
  loadingMessage = "Cargando productos...",
}: Props<TProduct, TVariant>) {
  const [localSearch, setLocalSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<TProduct | null>(null);
  const search = searchValue ?? localSearch;
  const serverSearch = Boolean(onSearchChange);

  useEffect(() => { setSelectedProduct(null); }, [products, stockMode]);

  const results = useMemo(() => {
    if (serverSearch) return products.slice(0, 12);
    const term = search.trim().toLocaleLowerCase("es");
    if (!term) return products.slice(0, 8);
    return products.filter((product) =>
      [product.name, product.sku, ...productVariants(product, stockMode).map((variant) => `${variantName(variant)} ${variant.sku ?? ""}`)]
        .some((value) => value?.toLocaleLowerCase("es").includes(term))
    ).slice(0, 12);
  }, [products, search, serverSearch, stockMode]);

  const setSearch = (value: string) => {
    setSelectedProduct(null);
    if (onSearchChange) onSearchChange(value);
    else setLocalSearch(value);
  };

  const chooseProduct = (product: TProduct) => {
    const variants = productVariants<TVariant>(product, stockMode);
    if (variants.length) {
      setSelectedProduct(product);
      return;
    }
    if (!productHasVariants(product)) onAdd(product, null);
  };

  const canPickByStock = (stock: number) => allowOutOfStockSelection || stock > 0;
  const usesStock = stockMode !== "none";

  return (
    <div className="sale-picker" aria-busy={loading}>
      <label className="orders-field">
        <span>Buscar artículo o SKU</span>
        <input value={search} disabled={disabled} onChange={(event) => setSearch(event.target.value)} placeholder="Ej: pantalla BMW o SCR-123" />
      </label>
      {helperText ? <p className="sale-picker__state">{helperText}</p> : null}
      {error ? <p className="sale-picker__state is-error" role="alert">{error}</p> : null}
      {!error && loading ? <p className="sale-picker__state" role="status">{loadingMessage}</p> : null}
      {!error && !loading ? <div className="sale-picker__results">
        {results.map((product) => {
          const variants = productVariants<TVariant>(product, stockMode);
          const stock = usesStock
            ? variants.length
              ? variants.reduce((sum, variant) => sum + itemStock(variant, stockMode), 0)
              : itemStock(product, stockMode)
            : null;
          const selectableVariants = usesStock
            ? variants.filter((variant) => canPickByStock(itemStock(variant, stockMode)))
            : variants;
          const pricedVariants = selectableVariants.length ? selectableVariants : variants;
          const price = pricedVariants.length
            ? Math.min(...pricedVariants.map((variant) => Number(variant.price)))
            : Number(product.price);
          const blocked = disabled || (usesStock && !canPickByStock(stock ?? 0)) || (productHasVariants(product) && !variants.length);
          return (
            <button type="button" key={product.id} disabled={blocked} onClick={() => chooseProduct(product)}>
              <span><strong>{product.name}</strong><small>{product.sku || "Sin SKU"}</small></span>
              <span><strong>{variants.length && selectableVariants.length ? `Desde ${formatCurrency(price)}` : formatCurrency(price)}</strong>{usesStock ? <small>{(stock ?? 0) > 0 ? `${stockMode === "branch" ? "Stock sede" : "Stock"} ${stock}` : "Agotado"}{variants.length ? ` · ${variants.length} versiones` : ""}</small> : variants.length ? <small>{variants.length} versiones</small> : null}</span>
            </button>
          );
        })}
        {results.length === 0 ? <p>{emptyMessage}</p> : null}
      </div> : null}
      {selectedProduct ? (
        <div className="sale-picker__variants">
          <header><div><span>Selecciona la versión</span><strong>{selectedProduct.name}</strong></div><button type="button" disabled={disabled} onClick={() => setSelectedProduct(null)}>Volver</button></header>
          {productVariants<TVariant>(selectedProduct, stockMode).map((variant) => {
            const stock = usesStock ? itemStock(variant, stockMode) : null;
            return <button type="button" key={variant.id} disabled={disabled || (usesStock && !canPickByStock(stock ?? 0))} onClick={() => { onAdd(selectedProduct, variant); setSelectedProduct(null); }}>
              <span><strong>{variantName(variant)}</strong><small>{variant.sku || "Sin SKU"}</small></span>
              <span className="sale-picker__specs">{specsEntries(variant).map(([key, value]) => <small key={key}>{key}: {String(value)}</small>)}</span>
              <span><strong>{formatCurrency(Number(variant.price))}</strong>{usesStock ? <small>{stockMode === "branch" ? "Stock sede" : "Stock"} {stock}</small> : null}</span>
            </button>;
          })}
        </div>
      ) : null}
    </div>
  );
}
