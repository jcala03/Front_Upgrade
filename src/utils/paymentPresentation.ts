import type { PublicOrder } from "../types/order";

export const terminalPaymentAttempt = (order: PublicOrder) =>
  ["DECLINED", "ERROR", "VOIDED", "UNKNOWN"].includes(order.payment_attempt_status ?? "");

export const paymentReturnCopy = (order: PublicOrder, awaiting: boolean, exhausted: boolean) => {
  if (order.payment_status === "paid") return { tone: "success", title: "Pago confirmado", message: "Confirmamos el pago de tu orden. Te informaremos los siguientes pasos de tu pedido; el pago no significa que la entrega haya terminado." };
  if (order.payment_status === "refunded") return { tone: "warning", title: "Pago devuelto", message: "El pago de esta orden fue devuelto. Si necesitas ayuda, comunícate con nuestro equipo." };
  if (order.payment_status === "partial") return { tone: "warning", title: "Pago parcial registrado", message: "Recibimos un pago parcial. Nuestro equipo te informará cómo continuar." };
  if (order.order_status === "cancelled") return { tone: "warning", title: "Orden cancelada", message: "Esta orden ya no está activa. Puedes iniciar una nueva compra desde la tienda." };
  if (order.payment_attempt_status === "DECLINED") return { tone: "warning", title: "Pago rechazado", message: order.can_retry_payment ? "El pago fue rechazado. Tu orden sigue reservada: puedes reintentar el pago en esta misma orden." : "El pago fue rechazado. Tu orden sigue registrada, pero no está habilitada para otro intento. Contacta a nuestro equipo." };
  if (order.payment_attempt_status === "VOIDED") return { tone: "warning", title: "Intento de pago anulado", message: "Este intento fue anulado antes de confirmar el pago. Consulta el estado antes de continuar." };
  if (["ERROR", "UNKNOWN"].includes(order.payment_attempt_status ?? "")) return { tone: "warning", title: "No pudimos confirmar el resultado", message: "No tenemos una confirmación fiable del pago. Actualiza el estado; si persiste, contacta a nuestro equipo antes de pagar otra vez." };
  if (exhausted) return { tone: "pending", title: "Seguimos esperando la confirmación", message: "La confirmación puede tardar unos minutos. Puedes volver a consultar el estado en unos momentos." };
  if (awaiting || order.payment_attempt_status === "PENDING") return { tone: "pending", title: "Estamos confirmando tu pago", message: "No realices otro intento mientras confirmamos el resultado." };
  return { tone: "pending", title: "Pago pendiente", message: "Todavía no tenemos una confirmación final del pago." };
};
