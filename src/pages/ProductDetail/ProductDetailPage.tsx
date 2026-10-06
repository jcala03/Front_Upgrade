import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { getProductBySlug, ProductApiError } from "../../api/products";
import { useCart } from "../../context/CartContext";
import type { Product, ProductVariant } from "../../types/product";
import { publicBootstrap, updatePublicSeo } from "../../seo/client";
import { productDescription } from "../../seo/model";
import { getProductImageUrl } from "../../utils/getProductImageUrl";
import {
  productCompatibility,
  productGallery,
  specificationFacts,
} from "./productPresentation";
import "./ProductDetailPage.css";

type ProductDetailPageProps = { slug: string; initialProduct?: Product };
const formatPrice = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export const ProductDetailPage = ({
  slug,
  initialProduct = publicBootstrap()?.product,
}: ProductDetailPageProps) => {
  const { addItem, items, totalItems } = useCart();
  const matchingInitial =
    initialProduct?.slug === slug ? initialProduct : undefined;
  const [product, setProduct] = useState<Product | null>(
    matchingInitial ?? null
  );
  const [quantity, setQuantity] = useState(
    matchingInitial
      ? matchingInitial.has_variants || matchingInitial.stock <= 0
        ? 0
        : 1
      : 1
  );
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    null
  );
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    matchingInitial ? "ready" : "loading"
  );
  const [notFound, setNotFound] = useState(false);
  const [retry, setRetry] = useState(0);
  const [wasAdded, setWasAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isAddingRef = useRef(false);
  const addStartTotalRef = useRef(totalItems);
  const toastTimeout = useRef<number | null>(null);
  useEffect(() => {
    setMounted(true);
    return () => {
      if (toastTimeout.current !== null)
        window.clearTimeout(toastTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (matchingInitial && retry === 0) return;
    const controller = new AbortController();
    setStatus("loading");
    setNotFound(false);
    getProductBySlug(slug, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setProduct(data);
        setSelectedImageUrl(null);
        setSelectedVariantId(null);
        setSelectionError("");
        setQuantity(data.has_variants ? 0 : data.stock > 0 ? 1 : 0);
        setStatus("ready");
        updatePublicSeo(`/tienda/${encodeURIComponent(data.slug)}`, data);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        const missing =
          error instanceof ProductApiError && error.status === 404;
        console.error("[storefront] product request failed", error);
        setNotFound(missing);
        setStatus("error");
        updatePublicSeo(
          `/tienda/${encodeURIComponent(slug)}`,
          undefined,
          missing ? 404 : 503
        );
      });
    return () => controller.abort();
  }, [slug, retry]);

  const variants = useMemo(
    () => product?.variants?.filter((v) => v.is_active && v.is_visible) ?? [],
    [product]
  );
  const hasVariants = Boolean(product?.has_variants) || variants.length > 0;
  const selectedVariant =
    variants.find((v) => v.id === selectedVariantId) ?? null;
  const availableStock = Number(
    selectedVariant?.stock ??
      (hasVariants ? product?.total_variant_stock : product?.stock) ??
      0
  );
  const effectivePrice = Number(
    selectedVariant?.price ??
      (hasVariants ? product?.lowest_variant_price : product?.price) ??
      0
  );
  // Session-dependent information is restored only AFTER the public SSR tree is
  // hydrated. Cart storage, variant identity and checkout stock validation stay intact.
  const cartQuantity =
    mounted && product
      ? items.find(
          (i) =>
            i.product.id === product.id &&
            (i.variant?.id ?? null) === (selectedVariant?.id ?? null)
        )?.quantity ?? 0
      : 0;
  const remainingStock = Math.max(availableStock - cartQuantity, 0);
  const visibleTotal = mounted ? totalItems : 0;
  const gallery = product ? productGallery(product, selectedVariant) : [];
  const imageUrl = getProductImageUrl(
    selectedImageUrl ??
      selectedVariant?.image_url ??
      product?.image_url ??
      gallery[0]
  );
  const compatibility = product
    ? productCompatibility(product, selectedVariant)
    : [];
  const facts = product ? specificationFacts(product, selectedVariant) : [];

  useEffect(() => {
    if (!isAdding || totalItems === addStartTotalRef.current) return;
    isAddingRef.current = false;
    setIsAdding(false);
  }, [isAdding, totalItems]);

  const selectVariant = (variant: ProductVariant | null) => {
    setSelectedImageUrl(null);
    setSelectedVariantId(variant?.id ?? null);
    setSelectionError("");
    setWasAdded(false);
    const inCart =
      items.find(
        (i) => i.product.id === product?.id && i.variant?.id === variant?.id
      )?.quantity ?? 0;
    setQuantity(variant && variant.stock > inCart ? 1 : 0);
  };
  const handleAdd = () => {
    if (!product || isAddingRef.current) return;
    if (hasVariants && !selectedVariant) {
      setSelectionError("Selecciona una versión antes de agregar el producto.");
      return;
    }
    if (remainingStock <= 0 || quantity <= 0) return;
    isAddingRef.current = true;
    addStartTotalRef.current = totalItems;
    setIsAdding(true);
    addItem(product, Math.min(quantity, remainingStock), selectedVariant);
    setWasAdded(true);
    if (toastTimeout.current !== null)
      window.clearTimeout(toastTimeout.current);
    toastTimeout.current = window.setTimeout(() => setWasAdded(false), 2400);
  };

  if (status === "loading")
    return (
      <main className="product-detail-page">
        <a className="product-detail__back" href="/tienda">
          <ArrowLeft size={16} aria-hidden="true" />
          Volver a la tienda
        </a>
        <section
          className="product-detail product-detail-skeleton"
          aria-busy="true"
          aria-label="Cargando información del producto"
        >
          <div className="product-detail-skeleton__image" />
          <div>
            <span />
            <span />
            <span />
            <p role="status">Consultando producto…</p>
          </div>
        </section>
      </main>
    );
  if (status === "error" || !product)
    return (
      <main className="product-detail-page">
        <section className="product-detail-state">
          <span>
            {notFound ? "Producto no disponible" : "Conexión interrumpida"}
          </span>
          <h1>
            {notFound
              ? "Este producto ya no está disponible."
              : "No pudimos cargar este producto."}
          </h1>
          <p>
            {notFound
              ? "Explora la tienda para encontrar otras opciones."
              : "Comprueba tu conexión y vuelve a intentarlo."}
          </p>
          {!notFound ? (
            <button type="button" onClick={() => setRetry((n) => n + 1)}>
              Reintentar
            </button>
          ) : null}
          <a href="/tienda">Volver a la tienda</a>
        </section>
      </main>
    );

  return (
    <main className="product-detail-page">
      <nav
        className="product-detail__breadcrumb"
        aria-label="Ruta del producto"
      >
        <a href="/">Inicio</a>
        <span>/</span>
        <a href="/tienda">Tienda</a>
        <span>/</span>
        <span>
          {product.product_category?.name ?? product.category ?? "Artículos"}
        </span>
      </nav>
      {wasAdded ? (
        <div className="product-added-toast" role="status">
          <Check size={20} aria-hidden="true" />
          <div>
            <strong>Agregado al carrito</strong>
            <span>
              {product.name}
              {selectedVariant ? ` · ${selectedVariant.name}` : ""}
            </span>
          </div>
          <a href="/carrito">Ver carrito</a>
        </div>
      ) : null}
      <section className="product-detail">
        <div className="product-detail__gallery">
          <div className="product-detail__media">
            {imageUrl ? (
              <img
                key={imageUrl}
                src={imageUrl}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                alt={`${product.name}${
                  selectedVariant ? ` — ${selectedVariant.name}` : ""
                }`}
              />
            ) : (
              <span>Fotografía no disponible</span>
            )}
          </div>
          {gallery.length > 1 ? (
            <div
              className="product-detail__thumbnails"
              role="group"
              aria-label="Galería del producto"
            >
              {gallery.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  aria-label={`Ver imagen ${index + 1} de ${product.name}`}
                  aria-pressed={getProductImageUrl(url) === imageUrl}
                  onClick={() => setSelectedImageUrl(url)}
                >
                  <img
                    src={getProductImageUrl(url)}
                    alt={`${product.name}, vista ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="product-detail__content">
          <span className="product-detail__eyebrow">
            {product.product_brand?.name ?? "UP GRADE 79 — STORE"}
          </span>
          <h1>{product.name}</h1>
          {selectedVariant?.sku || product.sku ? (
            <span className="product-detail__sku">
              Ref. {selectedVariant?.sku ?? product.sku}
            </span>
          ) : null}
          <strong className="product-detail__price">
            {hasVariants && !selectedVariant ? "Desde " : ""}
            {formatPrice(effectivePrice)}
          </strong>
          <section
            className="product-detail__compatibility"
            aria-label="Compatibilidad del producto"
          >
            <h2>Compatible con</h2>
            {compatibility.map((label) => (
              <p key={label}>{label}</p>
            ))}
            <small>
              Confirma conexiones, medidas e instalación con el taller.
            </small>
          </section>
          {hasVariants ? (
            <label className="product-detail__variant">
              <span>Versión del producto</span>
              <select
                disabled={!mounted}
                aria-label="Versión del producto"
                value={selectedVariantId ?? ""}
                onChange={(e) =>
                  selectVariant(
                    variants.find((v) => v.id === Number(e.target.value)) ??
                      null
                  )
                }
                aria-invalid={Boolean(selectionError)}
                aria-describedby={
                  selectionError
                    ? "product-variant-error"
                    : "product-variant-help"
                }
              >
                <option value="">Selecciona una versión</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id} disabled={v.stock <= 0}>
                    {v.display_name || v.name} · {formatPrice(v.price)}
                    {v.stock <= 0 ? " · Agotada" : ""}
                  </option>
                ))}
              </select>
              <small id="product-variant-help">
                La versión determina el precio y la disponibilidad.
              </small>
              {selectionError ? (
                <small id="product-variant-error" role="alert">
                  {selectionError}
                </small>
              ) : null}
            </label>
          ) : null}
          <div className="product-detail__stock">
            {hasVariants && !selectedVariant
              ? availableStock > 0
                ? `${availableStock} disponibles en nuestra red entre versiones`
                : "Producto agotado"
              : availableStock > 0
              ? `${availableStock} disponibles en nuestra red`
              : selectedVariant
              ? "Versión agotada"
              : "Producto agotado"}
          </div>
          <div className="product-detail__buy-box">
            <div
              className="product-detail__quantity"
              role="group"
              aria-label="Cantidad"
            >
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(q - 1, 1))}
                disabled={
                  !mounted || quantity <= 1 || (hasVariants && !selectedVariant)
                }
                aria-label="Reducir cantidad"
              >
                <Minus size={17} aria-hidden="true" />
              </button>
              <output aria-live="polite" aria-label="Cantidad seleccionada">
                {quantity}
              </output>
              <button
                type="button"
                onClick={() =>
                  setQuantity((q) => Math.min(q + 1, remainingStock))
                }
                disabled={
                  !mounted ||
                  quantity >= remainingStock ||
                  (hasVariants && !selectedVariant)
                }
                aria-label="Aumentar cantidad"
              >
                <Plus size={17} aria-hidden="true" />
              </button>
            </div>
            <button
              className="product-detail__button"
              type="button"
              disabled={
                !mounted ||
                isAdding ||
                remainingStock <= 0 ||
                (hasVariants && !selectedVariant)
              }
              onClick={handleAdd}
            >
              <ShoppingBag size={18} aria-hidden="true" />
              {isAdding
                ? "Agregando…"
                : remainingStock <= 0 && availableStock > 0
                ? "Stock máximo en carrito"
                : availableStock <= 0
                ? "Agotado"
                : hasVariants && !selectedVariant
                ? "Selecciona una versión"
                : "Agregar al carrito"}
            </button>
          </div>
          <p className="product-detail__note" role="status" aria-live="polite">
            {wasAdded ? "Producto agregado. " : ""}
            {visibleTotal > 0
              ? `${visibleTotal} productos en tu carrito.`
              : "La disponibilidad se verifica nuevamente antes de confirmar tu compra."}
          </p>
          <a className="product-detail__cart-link" href="/carrito">
            Ver carrito <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>
      <section className="product-detail__information">
        <section aria-labelledby="product-description-title">
          <h2 id="product-description-title">El producto</h2>
          <p>{productDescription(product)}</p>
        </section>
        {facts.length > 0 ? (
          <section aria-labelledby="product-specifications-title">
            <h2 id="product-specifications-title">Especificaciones</h2>
            <dl>
              {facts.map(([name, value]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
        <section className="product-detail__purchase-info">
          <h2>Antes de comprar</h2>
          <p>
            Precios en pesos colombianos. El envío y los cargos aplicables se
            muestran en checkout antes del pago. La instalación se coordina con
            el taller.
          </p>
          <a href="/tienda">Continuar explorando</a>
        </section>
      </section>
    </main>
  );
};
