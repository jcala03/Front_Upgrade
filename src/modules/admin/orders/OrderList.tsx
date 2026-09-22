import type { Order } from "../../../types/order";
import { formatCurrency } from "../../../utils/formatCurrency";
import { formatOrderDate, orderCustomerLabel, orderStatusLabels, originLabels, paymentStatusLabels } from "./orderUtils";

type Props = { orders: Order[]; loading: boolean; onOpen: (id: number) => void };

export const OrderList = ({ orders, loading, onOpen }: Props) => {
  if (loading) return <div className="orders-empty">Cargando órdenes...</div>;
  if (!orders.length) return <div className="orders-empty">No hay órdenes que coincidan con los filtros.</div>;
  return (
    <div className="orders-list">
      <div className="orders-list__head"><span>Orden</span><span>Cliente</span><span>Total</span><span>Estado</span><span>Pago</span><span>Origen</span><span>Fecha</span><span /></div>
      {orders.map((order) => (
        <article className="orders-list__row" key={order.id}>
          <div><strong>#{order.order_number}</strong><small>{order.items?.length ?? 0} líneas</small></div>
          <div><strong>{orderCustomerLabel(order.customer_name)}</strong><small>{order.customer_phone || order.customer_email || "Sin contacto"}</small></div>
          <strong className="orders-list__total">{formatCurrency(order.total)}</strong>
          <span className={`orders-badge is-${order.status}`}>{orderStatusLabels[order.status]}</span>
          <span className={`orders-badge is-payment-${order.payment_status}`}>{paymentStatusLabels[order.payment_status]}</span>
          <span>{originLabels[order.origin]}</span>
          <span>{formatOrderDate(order.created_at)}</span>
          <button type="button" onClick={() => onOpen(order.id)}>Ver orden</button>
        </article>
      ))}
    </div>
  );
};
