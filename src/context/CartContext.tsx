import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product, ProductVariant } from "../types/product";
import type { ConfigurationContext } from "../types/productConfiguration";
import { addCartItem, changeCartQuantity, consumeCartLines, cartItemKey, cartItemPrice, type CartItem, type CartLineQuantity } from "../domain/cartLines";
export { cartItemKey, cartItemPrice, cartItemStock } from "../domain/cartLines";
export type { CartItem, CartLineQuantity } from "../domain/cartLines";

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  addItem: (product: Product, quantity?: number, variant?: ProductVariant | null, context?: ConfigurationContext) => void;
  removeItem: (productId: number, variantId?: number | null, context?: ConfigurationContext) => void;
  updateQuantity: (productId: number, variantId: number | null, quantity: number, context?: ConfigurationContext) => void;
  clearCart: () => void;
  consumeLines: (lines: CartLineQuantity[]) => void;
};

const CART_KEY = "upgrade79_cart";

const CartContext = createContext<CartContextValue | undefined>(undefined);

const productHasVariants = (product: Product) =>
  Boolean(product.has_variants) ||
  Boolean(product.variants?.length) ||
  Number(product.variants_count ?? 0) > 0;

const readCart = (): CartItem[] => {
  // HTML público en servidor: nunca leer ni serializar el carrito de una sesión.
  if (typeof window === "undefined" || typeof localStorage === "undefined") return [];
  const rawCart = localStorage.getItem(CART_KEY);

  if (!rawCart) {
    return [];
  }

  try {
    const parsedCart = JSON.parse(rawCart) as CartItem[];

    if (!Array.isArray(parsedCart)) {
      return [];
    }

    return parsedCart
      .filter((item) => item?.product && Number.isInteger(item.quantity) && item.quantity > 0
        && (item.product.configuration?.required || !productHasVariants(item.product) || item.variant != null))
      .map((item) => ({ ...item, variant: item.variant ?? null }));
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => readCart());

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product, quantity = 1, variant: ProductVariant | null = null, context?: ConfigurationContext) =>
    setItems(current => addCartItem(current, product, quantity, variant, context));

  const removeItem = (productId: number, variantId: number | null = null, context?: ConfigurationContext) => {
    setItems((currentItems: CartItem[]) =>
      currentItems.filter((item: CartItem) => cartItemKey(item.product.id, item.variant?.id, item.configuration_context) !== cartItemKey(productId, variantId, context))
    );
  };

  const updateQuantity = (productId: number, variantId: number | null, quantity: number, context?: ConfigurationContext) =>
    setItems(current => changeCartQuantity(current, productId, variantId, quantity, context));

  const clearCart = () => {
    setItems([]);
  };

  const consumeLines = (lines: CartLineQuantity[]) => {
    setItems(current => consumeCartLines(current, lines));
  };

  const totalItems = useMemo(() => {
    return items.reduce((total: number, item: CartItem) => {
      return total + item.quantity;
    }, 0);
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce((total: number, item: CartItem) => {
      return total + cartItemPrice(item) * item.quantity;
    }, 0);
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalItems,
      subtotal,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      consumeLines,
    }),
    [items, totalItems, subtotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart debe usarse dentro de CartProvider.");
  }

  return context;
};
