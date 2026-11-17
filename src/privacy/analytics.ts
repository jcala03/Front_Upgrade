import { readChoice } from "./consent";
import { analyticsInformationReviewed, privacyControlsEnabled } from "./config";
import type { Product, ProductVariant } from "../types/product";
import type { PublicOrder } from "../types/order";
import { cartItemKey, cartItemPrice, type CartItem } from "../domain/cartLines";
type Gtag = (...args: unknown[]) => void;
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag; [key: `ga-disable-${string}`]: boolean };
export const deniedConsent = { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" } as const;
export const analyticsRoute = (path: string): string | null => {
  // Never forward query strings, product slugs, order tokens or CRM paths.
  const pathname = path.split(/[?#]/, 1)[0];
  if (["/", "/tienda", "/carrito", "/checkout", "/orden-confirmada", "/checkout/payment/return"].includes(pathname)) return pathname;
  if (/^\/tienda\/[^/]+\/?$/.test(pathname)) return "/tienda/producto";
  return null;
};
export const ga4Settings = {
  id: import.meta.env.VITE_GA4_MEASUREMENT_ID ?? "",
  enabled: import.meta.env.VITE_GA4_ENABLED === "true",
  // Requires documented review of Enhanced Measurement/user-provided data settings.
  reviewed: import.meta.env.VITE_GA4_SETTINGS_REVIEWED === "true",
  localDebug: import.meta.env.DEV && import.meta.env.VITE_GA4_LOCAL_DEBUG === "true",
};
let loaded = false;
let scriptLoaded = false;
let blocked = false;
let runtimeDenied = false;
let lastView = "";
let generation = 0;
const sent = new Set<string>();
export function analyticsAllowed() {
  if (typeof window === "undefined") return false;
  const originAllowed = ["upgradecolombia.com", "www.upgradecolombia.com"].includes(location.hostname)
    || ga4Settings.localDebug && ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  return originAllowed && privacyControlsEnabled && !blocked && !runtimeDenied && ga4Settings.enabled && ga4Settings.reviewed
    && analyticsInformationReviewed && /^G-[A-Z0-9]{6,}$/.test(ga4Settings.id)
    && readChoice()?.analytics === true && analyticsRoute(window.location.pathname) !== null;
}
const win = () => window as unknown as AnalyticsWindow;
export function syncAnalytics() {
  if (typeof window === "undefined") return;
  const w = win();
  w[`ga-disable-${ga4Settings.id}`] = !analyticsAllowed();
  if (!analyticsAllowed()) {
    if (loaded) { w.dataLayer?.splice(0); w.gtag?.("consent", "update", deniedConsent); }
    document.getElementById("upgrade79-ga4")?.remove();
    if (!scriptLoaded) loaded = false;
    lastView = ""; sent.clear();
    // Keep necessary cookies/cart/session untouched. Only first-party GA identifiers.
    const domains = ["", ...location.hostname.split(".").map((_, index, parts) => "." + parts.slice(index).join(".")).filter(domain => domain.split(".").length > 2)];
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0].trim();
      if (!/^_ga(?:_[A-Z0-9]+)?$/.test(name)) continue;
      for (const domain of domains) document.cookie = `${name}=; Max-Age=0; Path=/;${domain ? ` Domain=${domain};` : ""} SameSite=Lax; Secure`;
    }
    return;
  }
  if (loaded) { w.gtag?.("consent", "update", { ...deniedConsent, analytics_storage: "granted" }); return; }
  if (document.querySelector('script[src*="googletagmanager.com"],script[src*="google-analytics.com"]')) { blocked = true; w[`ga-disable-${ga4Settings.id}`] = true; return; }
  w.dataLayer ??= [];
  w.gtag = function () { w.dataLayer!.push(arguments); };
  w.gtag("consent", "default", deniedConsent);
  w.gtag("set", "ads_data_redaction", true);
  w.gtag("set", "url_passthrough", false);
  w.gtag("consent", "update", { ...deniedConsent, analytics_storage: "granted" });
  w.gtag("js", new Date());
  w.gtag("config", ga4Settings.id, { send_page_view: false, allow_google_signals: false,
    allow_ad_personalization_signals: false, page_location: location.origin + (analyticsRoute(location.pathname) ?? "/"),
    page_referrer: "", page_title: "UP GRADE 79", ignore_referrer: true, cookie_domain: location.hostname,
    cookie_expires: 15552000, cookie_update: false, ...(ga4Settings.localDebug ? { debug_mode: true } : {}) });
  const script = document.createElement("script");
  script.id = "upgrade79-ga4"; script.async = true; script.referrerPolicy = "no-referrer";
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Settings.id)}`;
  script.onload = () => { scriptLoaded = true; };
  script.onerror = () => { loaded = false; script.remove(); };
  document.head.appendChild(script); loaded = true;
}
export function trackPage(path: string) {
  if (!analyticsAllowed()) return;
  syncAnalytics();
  if (!analyticsAllowed()) return;
  const route = analyticsRoute(path);
  if (!route || lastView === path) return;
  lastView = path; generation++;
  win().gtag?.("event", "page_view", { page_location: location.origin + route, page_title: "UP GRADE 79", page_referrer: "" });
}
export type AnalyticsItem = { productId: number; variantId?: number | null; sku?: string | null; price: number; quantity: number };
export function safeItems(items: AnalyticsItem[]) {
  return items.filter(item => Number.isSafeInteger(item.productId) && item.productId > 0
    && (item.variantId == null || (Number.isSafeInteger(item.variantId) && item.variantId > 0))
    && Number.isFinite(item.price) && item.price >= 0 && Number.isSafeInteger(item.quantity) && item.quantity > 0)
    .slice(0, 200).map(item => ({ item_id: `${item.productId}:${item.variantId ?? "product"}`,
      ...(item.variantId != null ? { item_variant: String(item.variantId) } : {}),
      ...(item.sku && /^[A-Za-z0-9_. /-]{1,100}$/.test(item.sku) ? { item_sku: item.sku } : {}),
      price: item.price, quantity: item.quantity }));
}
export function trackCommerce(name: "view_item_list" | "select_item" | "view_item" | "add_to_cart" | "remove_from_cart" | "begin_checkout", items: AnalyticsItem[], key?: string) {
  if (!analyticsAllowed()) return false;
  trackPage(location.pathname + location.search);
  const sanitized = safeItems(items);
  if (!sanitized.length) return false;
  const value = sanitized.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (!Number.isFinite(value)) return false;
  const eventKey = key ? `${generation}:${name}:${key}` : null;
  if (eventKey && sent.has(eventKey)) return false;
  syncAnalytics();
  if (!analyticsAllowed()) return false;
  if (eventKey) sent.add(eventKey);
  win().gtag?.("event", name, { currency: "COP", value, items: sanitized, page_location: location.origin + analyticsRoute(location.pathname), page_referrer: "", page_title: "UP GRADE 79" });
  return true;
}
export function denyAnalyticsNow() {
  runtimeDenied = true; syncAnalytics();
  try { localStorage.removeItem("upgrade79_ga4_purchases"); } catch { /* Never touch cart/session on withdrawal. */ }
}
export function applySavedAnalyticsChoice() {
  runtimeDenied = false; syncAnalytics();
  if (typeof window !== "undefined") window.dispatchEvent(new Event("upgrade79:analytics-ready"));
}

export function productAnalyticsItem(product: Product, variant: ProductVariant | null = null, quantity = 1): AnalyticsItem {
  const variants = product.variants?.filter(v => v.is_active && v.is_visible) ?? [];
  return { productId: product.id, variantId: variant?.id, sku: variant?.sku ?? product.sku,
    price: Number(variant?.price ?? ((product.has_variants || variants.length) ? product.lowest_variant_price ?? Math.min(...variants.map(v => v.price)) : product.price)), quantity };
}
export const cartAnalyticsItems = (items: CartItem[]) => items.map(item => ({ productId: item.product.id,
  variantId: item.variant?.id, sku: item.variant?.sku ?? item.product.sku, price: cartItemPrice(item), quantity: item.quantity }));

export function trackCartChanges(before: CartItem[], after: CartItem[]) {
  const key = (i: CartItem) => cartItemKey(i.product.id, i.variant?.id, i.configuration_context);
  for (const item of after) {
    const delta = item.quantity - (before.find(i => key(i) === key(item))?.quantity ?? 0);
    if (delta > 0) trackCommerce("add_to_cart", cartAnalyticsItems([{ ...item, quantity: delta }]));
  }
  for (const item of before) {
    const delta = item.quantity - (after.find(i => key(i) === key(item))?.quantity ?? 0);
    if (delta > 0) trackCommerce("remove_from_cart", cartAnalyticsItems([{ ...item, quantity: delta }]));
  }
}

/** Call only with a fresh public API response, never URL, callback or storage fields. */
export function trackConfirmedPurchase(order: PublicOrder | null) {
  if (!analyticsAllowed() || !order || order.payment_status !== "paid" || order.order_status === "cancelled"
    || order.currency !== "COP" || !Number.isSafeInteger(order.id) || order.id <= 0 || !Array.isArray(order.items)
    || !Number.isFinite(Number(order.total)) || Number(order.total) <= 0) return false;
  trackPage(location.pathname + location.search);
  const items = safeItems(order.items.filter(i => i.item_type === "product" && i.product_id != null).map(i => ({
    productId: i.product_id!, variantId: i.product_variant_id, sku: i.variant_sku ?? i.product_sku,
    price: Number(i.unit_price), quantity: i.quantity,
  })));
  if (!items.length || items.length !== order.items.length) return false;
  const transaction = `upgrade79-order-${order.id}`;
  let previous: string[] = [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem("upgrade79_ga4_purchases") ?? "[]");
    if (Array.isArray(value)) previous = value.filter((v): v is string => typeof v === "string" && /^upgrade79-order-\d+$/.test(v)).slice(-500);
  } catch { /* GA4 also deduplicates the stable transaction_id across reloads/devices. */ }
  if (sent.has(transaction) || previous.includes(transaction)) return false;
  syncAnalytics();
  if (!analyticsAllowed()) return false;
  sent.add(transaction);
  win().gtag?.("event", "purchase", { transaction_id: transaction, currency: "COP", value: Number(order.total), items,
    page_location: location.origin + analyticsRoute(location.pathname), page_title: "UP GRADE 79", page_referrer: "" });
  try { localStorage.setItem("upgrade79_ga4_purchases", JSON.stringify([...previous, transaction].slice(-500))); } catch { /* Analytics cannot block commerce. */ }
  return true;
}
