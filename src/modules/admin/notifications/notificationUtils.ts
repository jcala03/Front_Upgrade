import type { LucideIcon } from "lucide-react";
import { BadgeDollarSign, CircleDollarSign, Clock3, FileCheck2, PackageX, ShoppingCart, TriangleAlert } from "lucide-react";
import type { CrmNotification, CrmNotificationReference } from "../../../types/notification";
import { formatCurrency } from "../../../utils/formatCurrency";

type Presentation = { label: string; icon: LucideIcon };

const presentations: Record<string, Presentation> = {
  stock_low: { label: "Stock bajo", icon: TriangleAlert },
  stock_out: { label: "Producto agotado", icon: PackageX },
  order_ecommerce_pending: { label: "Orden ecommerce", icon: ShoppingCart },
  payment_received: { label: "Pago recibido", icon: CircleDollarSign },
  quotation_expiring: { label: "Cotización por vencer", icon: Clock3 },
  quotation_converted: { label: "Cotización convertida", icon: FileCheck2 },
  commission_earned: { label: "Comisión ganada", icon: BadgeDollarSign },
};

const referenceActions: Partial<Record<CrmNotificationReference, { href: string; label: string; permission: string }>> = {
  order: { href: "/crm/orders", label: "Ver órdenes", permission: "orders.view" },
  payment: { href: "/crm/orders", label: "Ver orden", permission: "orders.view" },
  quotation: { href: "/crm/quotations", label: "Ver cotizaciones", permission: "quotations.view" },
  product: { href: "/crm/inventory", label: "Ver inventario", permission: "inventory.view" },
  product_variant: { href: "/crm/inventory", label: "Ver inventario", permission: "inventory.view" },
};

const stringValue = (data: Record<string, unknown>, key: string) => typeof data[key] === "string" ? data[key] : null;
const numberValue = (data: Record<string, unknown>, key: string) => typeof data[key] === "number" ? data[key] : null;

export const notificationPresentation = (type: string): Presentation => presentations[type] ?? { label: "Notificación", icon: TriangleAlert };
export const notificationReferenceAction = (reference: string | null) => reference ? referenceActions[reference as CrmNotificationReference] ?? null : null;

export const notificationDetails = (notification: CrmNotification): string[] => {
  const data = notification.data ?? {};
  if (notification.type === "payment_received") {
    const amount = numberValue(data, "amount");
    const method = stringValue(data, "method");
    const order = stringValue(data, "order_number");
    const methods: Record<string, string> = { cash: "Efectivo", transfer: "Transferencia", card_terminal: "Tarjeta / datáfono", wompi: "Wompi", other: "Otro" };
    return [amount !== null ? formatCurrency(amount) : null, method ? methods[method] ?? method : null, order].filter((value): value is string => Boolean(value));
  }
  if (notification.type === "stock_low" || notification.type === "stock_out") {
    const sku = stringValue(data, "sku");
    const stock = numberValue(data, "stock");
    const minimum = numberValue(data, "minimum_stock");
    return [sku ? `SKU ${sku}` : null, stock !== null ? `Stock ${stock}` : null, minimum !== null ? `Mínimo ${minimum}` : null].filter((value): value is string => Boolean(value));
  }
  if (notification.type.startsWith("quotation_")) {
    return [stringValue(data, "quotation_number"), stringValue(data, "order_number"), formatDateOnly(stringValue(data, "valid_until"))].filter((value): value is string => Boolean(value));
  }
  if (notification.type === "order_ecommerce_pending") return [stringValue(data, "order_number")].filter((value): value is string => Boolean(value));
  if (notification.type === "commission_earned") {
    const amount = numberValue(data, "amount");
    return [amount !== null ? formatCurrency(amount) : null, stringValue(data, "order_number")].filter((value): value is string => Boolean(value));
  }
  return [];
};

export const formatDateOnly = (value: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10))) return null;
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
};

const bogotaDateKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

export const formatNotificationDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  const today = bogotaDateKey(new Date());
  const yesterday = bogotaDateKey(new Date(Date.now() - 86_400_000));
  const key = bogotaDateKey(date);
  const time = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }).format(date);
  if (key === today) return `Hoy, ${time}`;
  if (key === yesterday) return `Ayer, ${time}`;
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" }).format(date);
};
