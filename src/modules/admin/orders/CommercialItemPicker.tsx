import { useState } from "react";
import type { Product, ProductVariant } from "../../../types/product";
import type { Service } from "../../../types/service";
import { ProductPicker, type PickerProduct, type PickerVariant, type ProductPickerStockMode } from "./ProductPicker";
import { ServicePicker } from "./ServicePicker";

type Props<TProduct extends PickerProduct = Product, TVariant extends PickerVariant = ProductVariant> = {
  products: TProduct[];
  onAddProduct: (product: TProduct, variant: TVariant | null) => void;
  onAddService: (service: Service) => void;
  allowOutOfStockSelection?: boolean;
  disabled?: boolean;
  stockMode?: ProductPickerStockMode;
  productsLoading?: boolean;
  productsError?: string;
  productSearchValue?: string;
  onProductSearchChange?: (value: string) => void;
  productHelperText?: string;
  productEmptyMessage?: string;
  productLoadingMessage?: string;
};

export function CommercialItemPicker<TProduct extends PickerProduct = Product, TVariant extends PickerVariant = ProductVariant>({
  products,
  onAddProduct,
  onAddService,
  allowOutOfStockSelection,
  disabled,
  stockMode = "legacy",
  productsLoading,
  productsError,
  productSearchValue,
  onProductSearchChange,
  productHelperText,
  productEmptyMessage,
  productLoadingMessage,
}: Props<TProduct, TVariant>) {
  const [tab, setTab] = useState<"products" | "services">("products");
  return <div className="commercial-picker">
    <div className="commercial-picker__tabs" role="tablist" aria-label="Tipo de línea comercial">
      <button type="button" role="tab" aria-selected={tab === "products"} disabled={disabled} onClick={() => setTab("products")}>Productos</button>
      <button type="button" role="tab" aria-selected={tab === "services"} disabled={disabled} onClick={() => setTab("services")}>Servicios</button>
    </div>
    <div role="tabpanel">
      {tab === "products" ? <ProductPicker<TProduct, TVariant> products={products} onAdd={onAddProduct} allowOutOfStockSelection={allowOutOfStockSelection} stockMode={stockMode} disabled={disabled} loading={productsLoading} error={productsError} searchValue={productSearchValue} onSearchChange={onProductSearchChange} helperText={productHelperText} emptyMessage={productEmptyMessage} loadingMessage={productLoadingMessage} /> : <ServicePicker onAdd={onAddService} disabled={disabled} />}
    </div>
  </div>;
}
