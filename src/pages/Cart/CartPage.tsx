import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { cartItemKey, cartItemPrice, cartItemStock, useCart } from "../../context/CartContext";
import "./CartPage.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const getImageUrl = (imageUrl?: string | null) => {
  if (!imageUrl) {
    return "";
  }

  if (imageUrl.startsWith("http")) {
    return imageUrl;
  }

  return `${API_BASE_URL}${imageUrl}`;
};

const formatPrice = (value: number) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
};

export const CartPage = () => {
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();

  return (
    <main className="cart-page">
      <section className="cart-hero">
        <div>
          <span>UP GRADE 79 Store</span>
          <h1>Carrito</h1>
          <p>
            Revisa los productos seleccionados antes de continuar con la compra.
          </p>
        </div>

        <a href="/tienda">Seguir comprando</a>
      </section>

      {items.length === 0 ? (
        <section className="cart-empty">
          <ShoppingBag size={38} strokeWidth={1.6} />
          <span>Carrito vacío</span>
          <h2>Aún no has agregado productos</h2>
          <p>
            Explora la tienda y selecciona los upgrades que quieres cotizar o
            comprar.
          </p>
          <a href="/tienda">Ir a tienda</a>
        </section>
      ) : (
        <section className="cart-layout">
          <div className="cart-items">
            {items.map((item) => {
              const imageUrl = getImageUrl(item.variant?.image_url ?? item.product.image_url);
              const availableStock = cartItemStock(item);

              return (
                <article className="cart-item" key={cartItemKey(item.product.id, item.variant?.id)}>
                  <a
                    className="cart-item__image"
                    href={`/tienda/${item.product.slug}`}
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt={item.product.name} />
                    ) : (
                      <span>Sin imagen</span>
                    )}
                  </a>

                  <div className="cart-item__content">
                    <div className="cart-item__info">
                      <span className="cart-item__stock">
                        {availableStock} disponibles en nuestra red
                      </span>

                      <h2>
                        <a href={`/tienda/${item.product.slug}`}>
                          {item.product.name}
                        </a>
                      </h2>

                      {item.variant ? <small>{item.variant.display_name || item.variant.name} · {item.variant.sku ?? "Sin SKU"}</small> : null}

                      <strong>{formatPrice(cartItemPrice(item))}</strong>
                    </div>

                    <div className="cart-item__actions">
                      <div className="cart-item__quantity">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.product.id, item.variant?.id ?? null, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          aria-label="Reducir cantidad"
                        >
                          <Minus size={15} strokeWidth={1.8} />
                        </button>

                        <span>{item.quantity}</span>

                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.product.id, item.variant?.id ?? null, item.quantity + 1)
                          }
                          disabled={item.quantity >= availableStock}
                          aria-label="Aumentar cantidad"
                        >
                          <Plus size={15} strokeWidth={1.8} />
                        </button>
                      </div>

                      <button
                        className="cart-item__remove"
                        type="button"
                        onClick={() => removeItem(item.product.id, item.variant?.id ?? null)}
                      >
                        <Trash2 size={16} strokeWidth={1.8} />
                        Quitar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="cart-summary">
            <span>Resumen</span>

            <div className="cart-summary__row">
              <p>Subtotal</p>
              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <div className="cart-summary__note">
              El envío, instalación o mano de obra se confirma directamente con
              el equipo de UP GRADE 79.
            </div>

            <a className="cart-summary__checkout" href="/checkout">
              Continuar compra
            </a>

            <button type="button" onClick={clearCart}>
              Vaciar carrito
            </button>
          </aside>
        </section>
      )}
    </main>
  );
};
