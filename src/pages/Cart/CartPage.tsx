import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { cartItemKey, cartItemPrice, cartItemStock, useCart } from "../../context/CartContext";
import "./CartPage.css";
import { ConfigurationSummary } from "../../components/ConfigurationSummary";
import { commercialQuantity } from "../../domain/cartLines";
import { getProductImageUrl } from "../../utils/getProductImageUrl";

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
              // Stored paths survive an origin change in historical cart snapshots.
              const imageUrl = getProductImageUrl(item.variant?.main_image || item.variant?.image_url || item.product.main_image || item.product.image_url);
              const availableStock = cartItemStock(item);

              return (
                <article className="cart-item" key={cartItemKey(item.product.id, item.variant?.id, item.configuration_context)}>
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

                      {item.variant ? <small>{item.variant.display_name || item.variant.name}{item.variant.sku ? ` · ${item.variant.sku}` : ""}</small> : null}
                      <ConfigurationSummary context={item.configuration_context} />
                      {item.product.configuration?.required && !item.configuration_context ? <p role="alert">Revisa la configuración de este producto en su ficha antes de comprar.</p> : null}

                      <strong>{formatPrice(cartItemPrice(item))}</strong>
                      <p className="cart-item__subtotal">Subtotal · {formatPrice(cartItemPrice(item) * item.quantity)}</p>
                    </div>

                    <div className="cart-item__actions">
                      <div className="cart-item__quantity">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.product.id, item.variant?.id ?? null, item.quantity - 1, item.configuration_context)
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
                            updateQuantity(item.product.id, item.variant?.id ?? null, item.quantity + 1, item.configuration_context)
                          }
                          disabled={commercialQuantity(items, item.product.id, item.variant?.id) >= availableStock}
                          aria-label="Aumentar cantidad"
                        >
                          <Plus size={15} strokeWidth={1.8} />
                        </button>
                      </div>

                      <button
                        className="cart-item__remove"
                        type="button"
                        onClick={() => removeItem(item.product.id, item.variant?.id ?? null, item.configuration_context)}
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
              El envío y los cargos aplicables se muestran antes del pago.
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
