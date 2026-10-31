import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { getProductBySlug, ProductApiError } from "../../api/products";
import { vehicleSelectionQuery } from "../Shop/shopFilters";
import { useCart } from "../../context/CartContext";
import type { Product, ProductVariant } from "../../types/product";
import { publicBootstrap, updatePublicSeo } from "../../seo/client";
import { productDescription } from "../../seo/model";
import { getProductImageUrl } from "../../utils/getProductImageUrl";
import {
  productCompatibility,
  productCompatibilitySummary,
  productGallery,
  isQaProduct,
  specificationFacts,
} from "./productPresentation";
import "./ProductDetailPage.css";
import { ProductConfigurator, ProductConfigurationSummary } from "./ProductConfigurator";
import { useProductConfigurator } from "./useProductConfigurator";

type ProductDetailPageProps = { slug: string; initialProduct?: Product; query?: string };
const formatPrice = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export const ProductDetailPage = ({
  slug,
  initialProduct = publicBootstrap()?.product,
  query = publicBootstrap()?.query ?? (typeof location === "undefined" ? "" : location.search),
}: ProductDetailPageProps) => {
  const { addItem, items, totalItems } = useCart();
  const vehicleQuery = vehicleSelectionQuery(query);
  const backToShop = "/tienda" + (vehicleQuery ? "?" + vehicleQuery : "");
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
  const configuration = useProductConfigurator(product, slug, vehicleQuery);
  useEffect(() => {
    setMounted(true);
    return () => {
      if (toastTimeout.current !== null)
        window.clearTimeout(toastTimeout.current);
    };
  }, []);

  useEffect(() => {
    // Static HTML hydrates first; refresh its build-time price/stock afterwards.
    if (matchingInitial && retry === 0 && !publicBootstrap()?.prerendered) {
      // Client navigation may reuse this component with a new SSR/public snapshot.
      if (product?.slug !== slug) {
        setProduct(matchingInitial);
        setSelectedVariantId(null);
        setSelectedImageUrl(null);
        setSelectionError("");
        setQuantity(matchingInitial.has_variants ? 0 : matchingInitial.stock > 0 ? 1 : 0);
      }
      setStatus("ready");
      return;
    }
    const controller = new AbortController();
    if (!(matchingInitial && retry === 0 && publicBootstrap()?.prerendered)) setStatus("loading");
    setNotFound(false);
    getProductBySlug(slug, controller.signal, vehicleQuery)
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
  }, [slug, retry, vehicleQuery]);

  const variants = useMemo(
    () => product?.variants?.filter((v) => v.is_active && v.is_visible) ?? [],
    [product]
  );
  const hasVariants = Boolean(product?.has_variants) || variants.length > 0;
  const selectedVariant = configuration.required ? configuration.selectedVariant
    : variants.find((v) => v.id === selectedVariantId) ?? null;
  const presentationProduct = configuration.required ? configuration.fullProduct ?? product : product;
  const availableStock = Number(
    selectedVariant?.stock ??
      (configuration.required ? 0 : hasVariants ? product?.total_variant_stock : product?.stock) ??
      0
  );
  const effectivePrice = Number(
    selectedVariant?.price ??
      (hasVariants ? presentationProduct?.lowest_variant_price : presentationProduct?.price) ??
      0
  );
  // Session-dependent information is restored only AFTER the public SSR tree is
  // hydrated. Cart storage, variant identity and checkout stock validation stay intact.
  const cartQuantity =
    mounted && product
      ? items.filter(
          (i) =>
            i.product.id === product.id &&
            (i.variant?.id ?? null) === (selectedVariant?.id ?? null)
        ).reduce((sum, item) => sum + item.quantity, 0)
      : 0;
  const remainingStock = Math.max(availableStock - cartQuantity, 0);
  const configurationBlocked = configuration.required && !configuration.purchaseContext;
  const visibleTotal = mounted ? totalItems : 0;
  const gallery = presentationProduct ? productGallery(presentationProduct, selectedVariant) : [];
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

  useEffect(() => {
    if (!configuration.required) return;
    setSelectedImageUrl(null);
    setQuantity(selectedVariant && selectedVariant.stock > 0 ? 1 : 0);
  }, [configuration.required, selectedVariant?.id, selectedVariant?.stock]);

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
    // UX only: the server independently verifies context and purchase enrollment.
    if (!product || configurationBlocked || isAddingRef.current) return;
    if (hasVariants && !selectedVariant) {
      setSelectionError("Selecciona una versión antes de agregar el producto.");
      return;
    }
    if (remainingStock <= 0 || quantity <= 0) return;
    isAddingRef.current = true;
    addStartTotalRef.current = totalItems;
    setIsAdding(true);
    addItem(presentationProduct!, Math.min(quantity, remainingStock), selectedVariant, configuration.purchaseContext ?? undefined);
    setWasAdded(true);
    if (toastTimeout.current !== null)
      window.clearTimeout(toastTimeout.current);
    toastTimeout.current = window.setTimeout(() => setWasAdded(false), 2400);
  };

  if (status === "loading" || product && product.slug !== slug)
    return (
      <main className="product-detail-page">
        <a className="product-detail__back" href={backToShop}>
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
          <a href={backToShop}>Volver a la tienda</a>
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
        <a href={backToShop}>Tienda</a>
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
          {isQaProduct(product) ? <p className="product-detail__qa-notice"><span>QA · SOLO LOCAL</span> Datos sintéticos e imágenes ilustrativas. No es mercancía real ni compatibilidad certificada.</p> : null}
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
            {product.product_category?.name ?? product.category ?? "UP GRADE 79 — STORE"}
          </span>
          <h1>{product.name}</h1>
          <p className="product-detail__compatibility-summary">{productCompatibilitySummary(presentationProduct ?? product, selectedVariant)} <a href="#product-compatibility" onClick={() => {
            const detail = document.getElementById("product-compatibility");
            if (detail instanceof HTMLDetailsElement) detail.open = true;
          }}>Ver detalle <span aria-hidden="true">↗</span></a></p>
          {configuration.required ? <ProductConfigurator model={configuration} product={product} interactive={mounted} /> : hasVariants ? (
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
          <section className="product-detail__commercial" aria-label="Resumen y compra">
          {configuration.required ? <ProductConfigurationSummary model={configuration} /> : selectedVariant ? <p className="product-detail__selected-reference">{selectedVariant.display_name || selectedVariant.name}</p> : null}
          <strong className="product-detail__price">
            {(hasVariants || configuration.required) && !selectedVariant ? <span>Desde </span> : null}
            {formatPrice(effectivePrice)}
          </strong>
          {selectedVariant?.sku || (!configuration.required && product.sku) ? (
            <span className="product-detail__sku">SKU {selectedVariant?.sku ?? product.sku}</span>
          ) : null}
          <div className="product-detail__stock" data-available={availableStock > 0 && (!hasVariants || Boolean(selectedVariant))}>
            {configuration.required ? selectedVariant
              ? availableStock > 0 ? `${availableStock} disponibles en la red · surtido por confirmar` : "Referencia agotada"
              : "Selecciona una configuración para consultar su disponibilidad"
              : hasVariants && !selectedVariant
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
                  configurationBlocked || !mounted || quantity <= 1 || (hasVariants && !selectedVariant)
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
                  configurationBlocked || !mounted ||
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
                configurationBlocked || !mounted ||
                isAdding ||
                remainingStock <= 0 ||
                (hasVariants && !selectedVariant)
              }
              onClick={handleAdd}
            >
              <ShoppingBag size={18} aria-hidden="true" />
              {configurationBlocked ? configuration.purchaseEnabled ? "Completa tu configuración" : "Compra online no habilitada" : isAdding
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
          {configuration.required && !configuration.purchaseEnabled ? <p className="product-detail__preview-note">Vista previa de configuración. La compra online de este producto todavía no está habilitada.</p> : null}
          <a className="product-detail__cart-link" href="/carrito">
            Ver carrito <span aria-hidden="true">→</span>
          </a>
          </section>
        </div>
      </section>
      <section className="product-detail__information">
        <details className="product-detail__disclosure">
          <summary>Descripción</summary>
          <div><p>{productDescription(product)}</p></div>
        </details>
        {facts.length > 0 ? (
          <details className="product-detail__disclosure" id="product-specifications">
            <summary>Especificaciones</summary>
            <div>
            <dl>
              {facts.map(([name, value]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            </div>
          </details>
        ) : null}
        <details className="product-detail__disclosure" id="product-compatibility">
          <summary>Compatibilidad</summary>
          <div>{compatibility.map(label => <p key={label}>{label}</p>)}<p>Confirma sistema original, conexiones, medidas e instalación con el taller. El año por sí solo no identifica el sistema OEM.</p></div>
        </details>
        <details className="product-detail__disclosure">
          <summary>Antes de comprar</summary>
          <div>
          <p>
            Precios en pesos colombianos. El envío y los cargos aplicables se
            muestran en checkout antes del pago. La instalación se coordina con
            el taller.
          </p>
          <a href={backToShop}>Continuar explorando</a>
          </div>
        </details>
      </section>
    </main>
  );
};
