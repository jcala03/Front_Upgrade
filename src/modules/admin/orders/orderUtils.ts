import type { OrderOrigin, OrderPaymentStatus, OrderStatus, PaymentMethod, PaymentStatus } from "../../../types/order";

export const orderStatusLabels: Record<OrderStatus, string> = { pending: "Pendiente", confirmed: "Confirmada", completed: "Completada", cancelled: "Cancelada" };
export const paymentStatusLabels: Record<OrderPaymentStatus, string> = { unpaid: "Sin pagar", partial: "Pago parcial", paid: "Pagada", refunded: "Reembolsada" };
export const originLabels: Record<OrderOrigin, string> = { crm: "CRM", ecommerce: "Ecommerce" };
export const paymentMethodLabels: Record<PaymentMethod, string> = { cash: "Efectivo", transfer: "Transferencia", card_terminal: "Tarjeta / datáfono", wompi: "Wompi", other: "Otro" };
export const paymentRecordStatusLabels: Record<PaymentStatus, string> = { pending: "Pendiente", completed: "Completado", failed: "Fallido", refunded: "Reembolsado" };
export const formatOrderDate = (value: string | null) => value ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Sin fecha";
export const orderCustomerLabel = (name: string | null) => name?.trim() || "Venta mostrador";
