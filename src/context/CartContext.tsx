import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product, ProductVariant } from "../types/product";

export type CartItem = {
  product: Product;
  variant: ProductVariant | null;
  quantity: number;
};

export type CartLineQuantity = {
  productId: number;
  variantId: number | null;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  addItem: (product: Product, quantity?: number, variant?: ProductVariant | null) => void;
  removeItem: (productId: number, variantId?: number | null) => void;
  updateQuantity: (productId: number, variantId: number | null, quantity: number) => void;
  clearCart: () => void;
  consumeLines: (lines: CartLineQuantity[]) => void;
};

const CART_KEY = "upgrade79_cart";

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const cartItemKey = (productId: number, variantId?: number | null) =>
  `${productId}:${variantId ?? "product"}`;

export const cartItemStock = (item: CartItem) => Number(item.variant?.stock ?? item.product.stock ?? 0);
export const cartItemPrice = (item: CartItem) => Number(item.variant?.price ?? item.product.price ?? 0);

const productHasVariants = (product: Product) =>
  Boolean(product.has_variants) ||
  Boolean(product.variants?.length) ||
  Number(product.variants_count ?? 0) > 0;

const readCart = (): CartItem[] => {
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
      .filter((item) => item?.product && (!productHasVariants(item.product) || item.variant != null))
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

  const addItem = (product: Product, quantity = 1, variant: ProductVariant | null = null) => {
    if ((product.has_variants || Boolean(product.variants?.length)) && !variant) return;
    const availableStock = Number(variant?.stock ?? product.stock ?? 0);
    if (availableStock <= 0) {
      return;
    }

    setItems((currentItems: CartItem[]) => {
      const existingItem = currentItems.find(
        (item: CartItem) => cartItemKey(item.product.id, item.variant?.id) === cartItemKey(product.id, variant?.id)
      );

      if (!existingItem) {
        return [
          ...currentItems,
          {
            product,
            variant,
            quantity: Math.min(quantity, availableStock),
          },
        ];
      }

      return currentItems.map((item: CartItem) => {
        if (cartItemKey(item.product.id, item.variant?.id) !== cartItemKey(product.id, variant?.id)) {
          return item;
        }

        return {
          ...item,
          product,
          variant,
          quantity: Math.min(item.quantity + quantity, availableStock),
        };
      });
    });
  };

  const removeItem = (productId: number, variantId: number | null = null) => {
    setItems((currentItems: CartItem[]) =>
      currentItems.filter((item: CartItem) => cartItemKey(item.product.id, item.variant?.id) !== cartItemKey(productId, variantId))
    );
  };

  const updateQuantity = (productId: number, variantId: number | null, quantity: number) => {
    setItems((currentItems: CartItem[]) =>
      currentItems.map((item: CartItem) => {
        if (cartItemKey(item.product.id, item.variant?.id) !== cartItemKey(productId, variantId)) {
          return item;
        }

        return {
          ...item,
          quantity: Math.max(1, Math.min(quantity, cartItemStock(item))),
        };
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const consumeLines = (lines: CartLineQuantity[]) => {
    const quantities = new Map(lines.map((line) => [cartItemKey(line.productId, line.variantId), line.quantity]));
    setItems((currentItems) => currentItems.flatMap((item) => {
      const purchased = quantities.get(cartItemKey(item.product.id, item.variant?.id));
      if (!purchased) return [item];
      const remaining = item.quantity - purchased;
      return remaining > 0 ? [{ ...item, quantity: remaining }] : [];
    }));
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
