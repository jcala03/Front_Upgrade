import { ArrowRight } from "lucide-react";
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getProducts } from "../../../api/products";
import audiLogo from "../../../assets/brands/audi.webp";
import bmwLogo from "../../../assets/brands/bmw.png";
import mercedesBenzLogo from "../../../assets/brands/mercedes-benz.webp";
import miniLogo from "../../../assets/brands/mini.png";
import porscheLogo from "../../../assets/brands/porsche.png";
import volkswagenLogo from "../../../assets/brands/volkswagen.webp";
import volvoLogo from "../../../assets/brands/volvo.png";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";
import type { Product } from "../../../types/product";
import { getProductImageUrl } from "../../../utils/getProductImageUrl";
import "./FeaturedProducts.css";

const EUROPEAN_BRANDS = [
  { name: "BMW", logo: bmwLogo, modifier: "bmw" },
  { name: "Audi", logo: audiLogo, modifier: "audi" },
  {
    name: "Mercedes-Benz",
    logo: mercedesBenzLogo,
    modifier: "mercedes",
  },
  { name: "Porsche", logo: porscheLogo, modifier: "porsche" },
  {
    name: "Volkswagen",
    logo: volkswagenLogo,
    modifier: "volkswagen is-dark",
  },
  { name: "MINI", logo: miniLogo, modifier: "mini is-dark" },
  { name: "Volvo", logo: volvoLogo, modifier: "volvo is-dark" },
] as const;

const formatPrice = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

const getStockLabel = (product: Product) => {
  if (product.stock_status === "out_of_stock" || product.stock <= 0) {
    return "Agotado";
  }

  if (product.stock_status === "low_stock" || product.is_low_stock) {
    return "Últimas unidades";
  }

  return "Disponible";
};

const getProductCategory = (product: Product) =>
  product.product_category?.name ?? product.category;

type ProductCardProps = {
  product: Product;
  index: number;
};

const ProductCard = ({ product, index }: ProductCardProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = getProductImageUrl(product.image_url);
  const category = getProductCategory(product);
  const stockLabel = getStockLabel(product);
  const stockModifier =
    stockLabel === "Agotado"
      ? "is-out"
      : stockLabel === "Últimas unidades"
        ? "is-low"
        : "is-available";
  const entryStyle = {
    "--product-entry-index": index,
  } as CSSProperties;

  return (
    <article className="featured-product-card" style={entryStyle}>
      <a
        className="featured-product-card__link"
        href={`/tienda/${product.slug}`}
        aria-label={`Ver producto: ${product.name}`}
      >
        <div className="featured-product-card__media">
          {imageUrl && !imageFailed ? (
            <img
              src={imageUrl}
              alt={product.name}
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="featured-product-card__fallback" aria-hidden="true">
              {category ? <span>{category}</span> : null}
              <strong>{product.name}</strong>
            </div>
          )}

          <span
            className={`featured-product-card__status ${stockModifier}`}
          >
            {stockLabel}
          </span>
        </div>

        <div className="featured-product-card__content">
          <div className="featured-product-card__identity">
            {category ? (
              <span className="featured-product-card__category">
                {category}
              </span>
            ) : null}
            <h3>{product.name}</h3>
          </div>

          <div className="featured-product-card__footer">
            <strong>{formatPrice(product.price)}</strong>
            <span className="featured-product-card__action">
              Ver producto
              <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
            </span>
          </div>
        </div>
      </a>
    </article>
  );
};

const BrandList = ({ hidden = false }: { hidden?: boolean }) => (
  <ul className="featured-products__brand-list" aria-hidden={hidden || undefined}>
    {EUROPEAN_BRANDS.map((brand) => (
      <li className={`featured-products__brand is-${brand.modifier}`} key={brand.name}>
        <img
          src={brand.logo}
          alt={hidden ? "" : brand.name}
          draggable="false"
          loading="eager"
          decoding="async"
        />
      </li>
    ))}
  </ul>
);

export const FeaturedProducts = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasEntered, setHasEntered] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const featuredProducts = useMemo(() => products.slice(0, 6), [products]);

  useEffect(() => {
    let isMounted = true;

    getProducts()
      .then((result) => {
        if (isMounted) {
          setProducts(result);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProducts([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    const reduceMotion =
      prefersReducedMotion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      setHasEntered(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        setHasEntered(true);
        observer.disconnect();
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  return (
    <section
      ref={sectionRef}
      className={`featured-products${hasEntered ? " is-visible" : ""}`}
      id="productos"
      aria-labelledby="featured-products-title"
    >
      <div className="featured-products__brands">
        <div className="featured-products__shell featured-products__brands-copy">
          <span className="featured-products__eyebrow">Marcas</span>
          <div>
            <h2>Especialistas en plataformas europeas.</h2>
            <p>
              Trabajamos con vehículos de algunas de las marcas más reconocidas
              del mercado europeo.
            </p>
          </div>
        </div>

        <div
          className="featured-products__marquee"
          role="group"
          aria-label="Marcas europeas con las que trabaja Upgrade La 79"
        >
          <div className="featured-products__marquee-track">
            <BrandList />
            <BrandList hidden />
          </div>
        </div>
      </div>

      <div className="featured-products__shell featured-products__catalog">
        <header className="featured-products__header">
          <div className="featured-products__heading">
            <span className="featured-products__eyebrow">Store preview</span>
            <h2 id="featured-products-title">
              Productos para elevar el look.
            </h2>
          </div>

          <div className="featured-products__header-aside">
            <p>
              Piezas, accesorios y upgrades seleccionados para transformar el
              carácter visual de tu vehículo.
            </p>
            <a className="featured-products__store-link" href="/tienda">
              Ver tienda completa
              <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
            </a>
          </div>
        </header>

        {isLoading ? (
          <div
            className="featured-products__grid"
            aria-label="Cargando productos destacados"
            aria-busy="true"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <article
                className="featured-product-card is-loading"
                key={index}
                style={{ "--product-entry-index": index } as CSSProperties}
              >
                <div className="featured-product-card__skeleton-media" />
                <div className="featured-product-card__skeleton-line" />
                <div className="featured-product-card__skeleton-line is-short" />
              </article>
            ))}
          </div>
        ) : featuredProducts.length > 0 ? (
          <div className="featured-products__grid">
            {featuredProducts.map((product, index) => (
              <ProductCard product={product} index={index} key={product.id} />
            ))}
          </div>
        ) : (
          <p className="featured-products__empty" role="status">
            No hay productos destacados disponibles en este momento.
          </p>
        )}

        <a
          className="featured-products__store-link featured-products__store-link--mobile"
          href="/tienda"
        >
          Ver tienda completa
          <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
};
