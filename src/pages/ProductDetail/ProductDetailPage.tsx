import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { getProductBySlug, ProductApiError } from "../../api/products";
import { useCart } from "../../context/CartContext";
import type { Product, ProductVariant } from "../../types/product";
import "./ProductDetailPage.css";
import { publicBootstrap, updatePublicSeo } from "../../seo/client";
import { productDescription, productFacts } from "../../seo/model";

type ProductDetailPageProps = {
  slug: string;
  initialProduct?: Product;
};

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

export const ProductDetailPage = ({ slug, initialProduct = publicBootstrap()?.product }: ProductDetailPageProps) => {
  const { addItem, items, totalItems } = useCart();

  const [product, setProduct] = useState<Product | null>(initialProduct ?? null);
  const [quantity, setQuantity] = useState(initialProduct ? initialProduct.has_variants || initialProduct.stock <= 0 ? 0 : 1 : 1);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    initialProduct ? "ready" : "loading"
  );
  const [wasAdded, setWasAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const isAddingRef = useRef(false);
  const addStartTotalRef = useRef(totalItems);

  const imageUrl = useMemo(() => {
    const selectedVariant = product?.variants?.find((variant) => variant.id === selectedVariantId);
    return getImageUrl(selectedImageUrl ?? selectedVariant?.image_url ?? product?.image_url);
  }, [product, selectedVariantId, selectedImageUrl]);
  const gallery = useMemo(() => {
    const variantImage = product?.variants?.find((variant) => variant.id === selectedVariantId)?.image_url;
    const urls = [...(variantImage ? [variantImage] : []), ...(product?.images?.map((image) => image.image_url) ?? [])];
    return Array.from(new Set(urls));
  }, [product, selectedVariantId]);

  useEffect(() => {
    isAddingRef.current = false;
    setIsAdding(false);
    if (!initialProduct || initialProduct.slug !== slug) setStatus("loading");

    getProductBySlug(slug)
      .then((productData) => {
        setProduct(productData);
        setSelectedImageUrl(null);
        setSelectedVariantId(null);
        setSelectionError("");
        setQuantity(productData.has_variants ? 0 : productData.stock > 0 ? 1 : 0);
        setStatus("ready");
        updatePublicSeo(`/tienda/${encodeURIComponent(productData.slug)}`, productData);
      })
      .catch((error) => {
        setProduct(null);
        setStatus("error");
        updatePublicSeo(`/tienda/${encodeURIComponent(slug)}`, undefined, error instanceof ProductApiError && error.status === 404 ? 404 : 503);
      });
  }, [slug]);

  const publicVariants = useMemo(
    () => product?.variants?.filter((variant) => variant.is_active && variant.is_visible) ?? [],
    [product]
  );
  const hasVariants = Boolean(product?.has_variants) || publicVariants.length > 0;
  const selectedVariant = publicVariants.find((variant) => variant.id === selectedVariantId) ?? null;
  const availableStock = Number(selectedVariant?.stock ?? (hasVariants ? product?.total_variant_stock : product?.stock) ?? 0);
  const effectivePrice = selectedVariant?.price ?? (hasVariants ? product?.lowest_variant_price : product?.price) ?? 0;
  const cartQuantity = product
    ? items.find(
        (item) =>
          item.product.id === product.id &&
          (item.variant?.id ?? null) === (selectedVariant?.id ?? null)
      )?.quantity ?? 0
    : 0;
  const remainingStock = Math.max(availableStock - cartQuantity, 0);

  useEffect(() => {
    if (!isAdding || totalItems === addStartTotalRef.current) {
      return;
    }

    isAddingRef.current = false;
    setIsAdding(false);
  }, [isAdding, totalItems]);

  const selectVariant = (variant: ProductVariant | null) => {
    setSelectedImageUrl(null);
    setSelectedVariantId(variant?.id ?? null);
    setSelectionError("");
    setQuantity(variant && variant.stock > 0 ? 1 : 0);
  };

  const increaseQuantity = () => {
    if (!product || (hasVariants && !selectedVariant)) return;

    setQuantity((currentQuantity) =>
      Math.min(currentQuantity + 1, availableStock)
    );
  };

  const decreaseQuantity = () => {
    setQuantity((currentQuantity) => Math.max(currentQuantity - 1, 1));
  };

  const handleAddToCart = () => {
    if (!product || isAddingRef.current) return;
    if (hasVariants && !selectedVariant) {
      setSelectionError("Selecciona una versión antes de agregar el producto.");
      return;
    }
    if (availableStock <= 0 || remainingStock <= 0 || quantity <= 0) {
      return;
    }

    isAddingRef.current = true;
    addStartTotalRef.current = totalItems;
    setIsAdding(true);
    addItem(product, quantity, selectedVariant);
    setWasAdded(true);
    setPulseKey((currentKey) => currentKey + 1);

    window.setTimeout(() => {
      setWasAdded(false);
    }, 1800);
  };

  if (status === "loading") {
    return (
      <main className="product-detail-page">
        <section className="product-detail-state">
          <span>Cargando producto</span>
          <h1>Preparando upgrade</h1>
          <p>Estamos consultando la información del producto.</p>
        </section>
      </main>
    );
  }

  if (status === "error" || !product) {
    return (
      <main className="product-detail-page">
        <section className="product-detail-state">
          <span>Producto no encontrado</span>
          <h1>No disponible</h1>
          <p>
            No encontramos un producto activo con el slug{" "}
            <strong>{slug}</strong>.
          </p>
          <a href="/tienda">Volver a tienda</a>
        </section>
      </main>
    );
  }

  return (
    <main className="product-detail-page">
      <AnimatePresence>
        {wasAdded ? (
          <motion.div
            className="product-added-toast"
            initial={{ opacity: 0, y: 24, scale: 0.92, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -18, scale: 0.96, filter: "blur(10px)" }}
            transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="product-added-toast__glow"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
              aria-hidden="true"
            />

            <div className="product-added-toast__image">
              {imageUrl ? <img src={imageUrl} alt="" /> : <ShoppingBag size={20} />}
            </div>

            <div className="product-added-toast__content">
              <span>Agregado al carrito</span>
              <strong>{product.name}</strong>
              {selectedVariant ? <small>{selectedVariant.display_name || selectedVariant.name}</small> : null}
              <p>
                {quantity} unidad{quantity > 1 ? "es" : ""} añadida
                {quantity > 1 ? "s" : ""}
              </p>
            </div>

            <motion.div
              className="product-added-toast__check"
              initial={{ scale: 0, rotate: -18 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.12, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              <Check size={18} strokeWidth={2.2} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <section className="product-detail">
        <div className="product-detail__media">
          {imageUrl ? (
            <motion.img
              src={imageUrl}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              alt={`${product.name}${selectedVariant ? ` — ${selectedVariant.name}` : ""}`}
              animate={
                wasAdded
                  ? {
                      scale: [1, 1.035, 1],
                      y: [0, -8, 0],
                    }
                  : undefined
              }
              transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : (
            <span>Sin imagen</span>
          )}
          {gallery.length > 1 ? <div className="product-detail__thumbnails" role="group" aria-label="Galería del producto">
            {gallery.map((url, index) => <button key={url} type="button" aria-label={`Ver imagen ${index + 1} de ${product.name}`} aria-pressed={getImageUrl(url) === imageUrl} onClick={() => setSelectedImageUrl(url)}><img src={getImageUrl(url)} alt={`${product.name}, vista ${index + 1}`} loading="lazy" decoding="async" /></button>)}
          </div> : null}
        </div>

        <div className="product-detail__content">
          <a className="product-detail__back" href="/tienda">
            <ArrowLeft size={16} strokeWidth={1.8} />
            Volver a tienda
          </a>

          <div className="product-detail__cart-pill">
            <ShoppingBag size={16} strokeWidth={1.8} />
            <span>Carrito</span>

            <AnimatePresence mode="popLayout">
              <motion.strong
                key={pulseKey}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {totalItems}
              </motion.strong>
            </AnimatePresence>
          </div>

          <span className="product-detail__eyebrow">UP GRADE 79 Store</span>

          <h1>{product.name}</h1>

          <strong className="product-detail__price">
            {hasVariants && !selectedVariant ? "Desde " : ""}{formatPrice(effectivePrice)}
          </strong>

          <p className="product-detail__description">
            {productDescription(product)}
          </p>

          {hasVariants ? (
            <label className="product-detail__variant">
              <span>Versión</span>
              <select
                value={selectedVariantId ?? ""}
                onChange={(event) => selectVariant(publicVariants.find((variant) => variant.id === Number(event.target.value)) ?? null)}
                aria-invalid={Boolean(selectionError)}
                aria-describedby={selectionError ? "product-variant-error" : undefined}
              >
                <option value="">Selecciona una versión</option>
                {publicVariants.map((variant) => (
                  <option key={variant.id} value={variant.id} disabled={variant.stock <= 0}>
                    {variant.display_name || variant.name} · {formatPrice(variant.price)} · {variant.stock > 0 ? `${variant.stock} disponibles en nuestra red` : "Agotada"}
                  </option>
                ))}
              </select>
              {selectionError ? <small id="product-variant-error" role="alert">{selectionError}</small> : null}
            </label>
          ) : null}

          <div className="product-detail__stock">
            {hasVariants && !selectedVariant ? (
              <span>{availableStock > 0 ? `${availableStock} unidades disponibles en nuestra red entre versiones` : "Producto agotado"}</span>
            ) : availableStock > 0 ? (
              <span>{availableStock} unidades disponibles en nuestra red{selectedVariant?.sku ? ` · SKU ${selectedVariant.sku}` : ""}</span>
            ) : (
              <span>{selectedVariant ? "Versión agotada" : "Producto agotado"}</span>
            )}
          </div>

          <div className="product-detail__buy-box">
            <div className="product-detail__quantity">
              <button
                type="button"
                onClick={decreaseQuantity}
                disabled={quantity <= 1 || availableStock <= 0}
                aria-label="Reducir cantidad"
              >
                <Minus size={16} strokeWidth={1.8} />
              </button>

              <span>{quantity}</span>

              <button
                type="button"
                onClick={increaseQuantity}
                disabled={quantity >= availableStock || availableStock <= 0 || (hasVariants && !selectedVariant)}
                aria-label="Aumentar cantidad"
              >
                <Plus size={16} strokeWidth={1.8} />
              </button>
            </div>

            <motion.button
              className="product-detail__button"
              type="button"
              disabled={
                isAdding ||
                availableStock <= 0 ||
                remainingStock <= 0 ||
                (hasVariants && !selectedVariant)
              }
              onClick={handleAddToCart}
              whileTap={{ scale: 0.97 }}
              animate={
                wasAdded
                  ? {
                      boxShadow: [
                        "0 22px 62px rgba(0, 149, 212, 0.22)",
                        "0 28px 90px rgba(0, 149, 212, 0.46)",
                        "0 22px 62px rgba(0, 149, 212, 0.22)",
                      ],
                    }
                  : undefined
              }
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <span>
                {isAdding
                  ? "Agregando…"
                  : remainingStock <= 0 && availableStock > 0
                    ? "Stock máximo en carrito"
                    : wasAdded
                      ? "Agregado"
                      : hasVariants && !selectedVariant
                        ? "Selecciona una versión"
                        : "Agregar al carrito"}
              </span>
            </motion.button>
          </div>

          <small
            className="product-detail__note"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {isAdding
              ? "Agregando producto al carrito…"
              : wasAdded
                ? "Producto agregado. "
                : null}
            Productos en carrito: <strong>{totalItems}</strong>
          </small>
          {productFacts(product).length > 0 ? <section className="product-detail__facts" aria-label="Información del producto">
            <h2>Especificaciones y compatibilidad</h2>
            <dl>{productFacts(product).map(([name, value], index) => <div key={`${name}-${index}`}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
          </section> : null}
        </div>
      </section>
    </main>
  );
};
