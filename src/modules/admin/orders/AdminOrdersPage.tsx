import { useEffect, useMemo, useState } from "react";
import { createAdminOrder, getAdminOrder, getAdminOrders } from "../../../api/adminOrders";
import type { CreateAdminOrderPayload, Order, OrderOrigin, OrderPaymentStatus, OrderStatus } from "../../../types/order";
import { formatCurrency } from "../../../utils/formatCurrency";
import { hasPermission } from "../../../utils/authStorage";
import { OrderDetail } from "./OrderDetail";
import { OrderList } from "./OrderList";
import { originLabels, orderStatusLabels, paymentStatusLabels } from "./orderUtils";
import { SaleForm } from "./SaleForm";
import "./AdminOrdersPage.css";

type FilterValue<T extends string> = "all" | T;

export const AdminOrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FilterValue<OrderStatus>>("all");
  const [paymentStatus, setPaymentStatus] = useState<FilterValue<OrderPaymentStatus>>("all");
  const [origin, setOrigin] = useState<FilterValue<OrderOrigin>>("all");
  const canView = hasPermission("orders.view");
  const canCreate = hasPermission("orders.create");

  const loadOrders = async () => {
    if (!canView) return;
    try { setLoading(true); setError(""); setOrders(await getAdminOrders()); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las órdenes."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadOrders(); }, [canView]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return orders.filter((order) => {
      const matchesSearch = !term || [order.order_number, order.customer_name, order.customer_phone, order.customer_email].some((value) => value?.toLocaleLowerCase("es").includes(term));
      return matchesSearch && (status === "all" || order.status === status) && (paymentStatus === "all" || order.payment_status === paymentStatus) && (origin === "all" || order.origin === origin);
    });
  }, [orders, origin, paymentStatus, search, status]);

  const openOrder = async (id: number) => {
    try { setDetailLoading(true); setError(""); setSelectedOrder(await getAdminOrder(id)); }
    catch (detailError) { setError(detailError instanceof Error ? detailError.message : "No se pudo cargar el detalle."); }
    finally { setDetailLoading(false); }
  };

  const handleOrderChanged = (order: Order) => {
    setSelectedOrder(order);
    setOrders((current) => current.map((item) => item.id === order.id ? order : item));
  };

  const createSale = (payload: CreateAdminOrderPayload) => createAdminOrder(payload);
  const handleCreated = (order: Order) => {
    setSaleOpen(false); setSuccess(`Venta ${order.order_number} registrada por ${formatCurrency(order.total)} · ${orderStatusLabels[order.status]} · ${paymentStatusLabels[order.payment_status]}.`);
    setOrders((current) => [order, ...current.filter((item) => item.id !== order.id)]); setSelectedOrder(order);
  };

  if (!canView) return <section className="admin-orders"><div className="orders-access"><span>Acceso restringido</span><h2>No tienes permiso para consultar órdenes.</h2><a href="/crm">Volver al CRM</a></div></section>;

  return (
    <section className="admin-orders">
      <header className="admin-orders__toolbar"><div><span>Operación comercial</span><h2>Órdenes y ventas</h2><p>Consulta ecommerce y registra ventas de mostrador con inventario real.</p></div><div><button type="button" onClick={() => void loadOrders()} disabled={loading}>{loading ? "Actualizando..." : "Actualizar"}</button>{canCreate ? <button className="is-primary" type="button" onClick={() => setSaleOpen(true)}>Nueva venta</button> : null}</div></header>
      <section className="orders-stats"><article><span>Total</span><strong>{orders.length}</strong></article><article><span>Pendientes</span><strong>{orders.filter((order) => order.status === "pending").length}</strong></article><article><span>Pagadas</span><strong>{orders.filter((order) => order.payment_status === "paid").length}</strong></article><article><span>Valor registrado</span><strong>{formatCurrency(orders.reduce((sum, order) => sum + Number(order.total), 0))}</strong></article></section>
      <section className="orders-filters" aria-label="Filtros de órdenes"><label className="orders-field orders-field--search"><span>Buscar</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Orden, cliente, teléfono o email" /></label><label className="orders-field"><span>Estado</span><select value={status} onChange={(event) => setStatus(event.target.value as FilterValue<OrderStatus>)}><option value="all">Todos</option>{Object.entries(orderStatusLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="orders-field"><span>Pago</span><select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as FilterValue<OrderPaymentStatus>)}><option value="all">Todos</option>{Object.entries(paymentStatusLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="orders-field"><span>Origen</span><select value={origin} onChange={(event) => setOrigin(event.target.value as FilterValue<OrderOrigin>)}><option value="all">Todos</option>{Object.entries(originLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label></section>
      {success ? <p className="orders-success" role="status">{success}</p> : null}{error ? <p className="orders-error" role="alert">{error}</p> : null}
      <OrderList orders={filteredOrders} loading={loading} onOpen={(id) => void openOrder(id)} />
      <SaleForm open={saleOpen} onClose={() => setSaleOpen(false)} onSubmit={createSale} onCreated={handleCreated} />
      <OrderDetail order={selectedOrder} loading={detailLoading} onClose={() => setSelectedOrder(null)} onChanged={handleOrderChanged} />
    </section>
  );
};
