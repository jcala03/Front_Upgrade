import type { Product, ProductVariant } from "../types/product";
import { configurationKey, type ConfigurationContext } from "../types/productConfiguration";

export type CartItem = { product: Product; variant: ProductVariant | null; quantity: number; configuration_context?: ConfigurationContext };
export type CartLineQuantity = { productId: number; variantId: number | null; quantity: number; configuration_context?: ConfigurationContext };

// Commercial identity stays intact; context is a separate discriminator, never another SKU.
export const commercialItemKey = (productId: number, variantId?: number | null) => `${productId}:${variantId ?? "product"}`;
export const cartItemKey = (productId: number, variantId?: number | null, context?: ConfigurationContext | null) =>
  `${commercialItemKey(productId, variantId)}${context ? `:${configurationKey(context)}` : ""}`;
export const cartItemStock = (item: CartItem) => Number(item.variant?.stock ?? item.product.stock ?? 0);
export const cartItemPrice = (item: CartItem) => Number(item.variant?.price ?? item.product.price ?? 0);
export const commercialQuantity = (items: CartItem[], productId: number, variantId?: number | null) => items.reduce((sum, item) =>
  commercialItemKey(item.product.id, item.variant?.id) === commercialItemKey(productId, variantId) ? sum + item.quantity : sum, 0);

export function addCartItem(items: CartItem[], product: Product, quantity: number, variant: ProductVariant | null, context?: ConfigurationContext): CartItem[] {
  if (!Number.isInteger(quantity) || quantity <= 0 || (product.has_variants || product.variants?.length) && !variant) return items;
  if (variant && variant.product_id !== product.id) return items;
  if (product.configuration?.required && (!context || !product.configuration.purchase_enabled)) return items;
  const stock = Number(variant?.stock ?? product.stock ?? 0);
  const available = Math.max(0, stock - commercialQuantity(items, product.id, variant?.id));
  const increment = Math.min(quantity, available);
  if (increment <= 0) return items;
  const key = cartItemKey(product.id, variant?.id, context);
  const existing = items.some(item => cartItemKey(item.product.id, item.variant?.id, item.configuration_context) === key);
  return existing ? items.map(item => cartItemKey(item.product.id, item.variant?.id, item.configuration_context) === key
    ? { ...item, product, variant, quantity: item.quantity + increment } : item)
    : [...items, { product, variant, quantity: increment, ...(context ? { configuration_context: context } : {}) }];
}

export function changeCartQuantity(items: CartItem[], productId: number, variantId: number | null, quantity: number, context?: ConfigurationContext): CartItem[] {
  if (!Number.isInteger(quantity)) return items;
  const key = cartItemKey(productId, variantId, context);
  return items.map(item => {
    if (cartItemKey(item.product.id, item.variant?.id, item.configuration_context) !== key) return item;
    const others = commercialQuantity(items, productId, variantId) - item.quantity;
    return { ...item, quantity: Math.max(1, Math.min(quantity, cartItemStock(item) - others)) };
  });
}

export function consumeCartLines(items: CartItem[], lines: CartLineQuantity[]): CartItem[] {
  const quantities = new Map<string, number>();
  for (const line of lines) {
    const key = cartItemKey(line.productId, line.variantId, line.configuration_context);
    if (Number.isInteger(line.quantity) && line.quantity > 0) quantities.set(key, (quantities.get(key) ?? 0) + line.quantity);
  }
  return items.flatMap(item => {
    const key = cartItemKey(item.product.id, item.variant?.id, item.configuration_context);
    const consumed = Math.min(item.quantity, quantities.get(key) ?? 0);
    quantities.set(key, (quantities.get(key) ?? 0) - consumed);
    return item.quantity > consumed ? [{ ...item, quantity: item.quantity - consumed }] : [];
  });
}
