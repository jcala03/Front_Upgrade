import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { SlidersHorizontal, X, ArrowUpRight } from "lucide-react";
import { getProducts, type ProductSortOption } from "../../api/products";
import { getProductBrands } from "../../api/productBrands";
import { getProductCategories } from "../../api/productCategories";
import {
  getVehicleBrands,
  getVehicleModels,
  getVehicleVersions,
} from "../../api/vehicles";
import type { Product } from "../../types/product";
import type { ProductBrand } from "../../types/productBrand";
import type {
  ProductCategory,
  ProductCategoryField,
} from "../../types/productCategory";
import type {
  VehicleBrand,
  VehicleModel,
  VehicleVersion,
} from "../../types/vehicle";
import { publicBootstrap, updatePublicSeo } from "../../seo/client";
import { productPath } from "../../seo/model";
import { getProductImageUrl } from "../../utils/getProductImageUrl";
import {
  activeShopFilterCount,
  defaultShopFilters,
  parseShopFilters,
  serializeShopFilters,
  shopApiFilters,
  shopUrl,
  type ShopFilters,
} from "./shopFilters";
import "./ShopPage.css";

const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
const price = (p: Product) => {
  const variants = p.variants?.filter((v) => v.is_active && v.is_visible) ?? [];
  const minimum =
    p.lowest_variant_price ??
    (variants.length ? Math.min(...variants.map((v) => +v.price)) : null);
  return p.has_variants || variants.length
    ? `Desde ${money(Number(minimum ?? p.price))}`
    : money(p.price);
};
const stock = (p: Product) =>
  p.has_variants || p.variants?.length
    ? p.total_variant_stock ??
      p.variants
        ?.filter((v) => v.is_active && v.is_visible)
        .reduce((n, v) => n + Number(v.stock ?? 0), 0) ??
      0
    : p.stock ?? 0;
const initialQuery = () =>
  publicBootstrap()?.query ??
  (typeof location === "undefined" ? "" : location.search);

type Props = { initialProducts?: Product[]; query?: string };
export const ShopPage = ({
  initialProducts = publicBootstrap()?.products,
  query = initialQuery(),
}: Props = {}) => {
  const [filters, setFilters] = useState(() => parseShopFilters(query));
  const [products, setProducts] = useState<Product[]>(initialProducts ?? []);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [productBrands, setProductBrands] = useState<ProductBrand[]>([]);
  const [vehicleBrands, setVehicleBrands] = useState<VehicleBrand[]>([]);
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);
  const [vehicleVersions, setVehicleVersions] = useState<VehicleVersion[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [filtersError, setFiltersError] = useState(false);
  const [productsLoading, setProductsLoading] = useState(
    initialProducts === undefined
  );
  const [productsError, setProductsError] = useState(false);
  const [filtersRetry, setFiltersRetry] = useState(0);
  const [productsRetry, setProductsRetry] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const drawerButton = useRef<HTMLButtonElement>(null);
  const initialSignature = useRef(
    initialProducts === undefined
      ? null
      : serializeShopFilters(parseShopFilters(query))
  );
  const signature = serializeShopFilters(filters);
  const count = activeShopFilterCount(filters);
  const selectedCategory = categories.find(
    (c) => String(c.id) === filters.category_id
  );
  const fields =
    selectedCategory?.fields?.filter((f) => f.is_active && f.is_filterable) ??
    [];
  const models = vehicleModels.filter(
    (m) =>
      m.is_active && String(m.vehicle_brand_id) === filters.vehicle_brand_id
  );
  const versions = vehicleVersions.filter(
    (v) =>
      v.is_active && String(v.vehicle_model_id) === filters.vehicle_model_id
  );

  useEffect(() => {
    const restore = () => {
      setFilters(parseShopFilters(location.search));
      updatePublicSeo("/tienda");
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  useEffect(() => {
    let alive = true;
    setFiltersLoading(true);
    void Promise.allSettled([
      getProductCategories(),
      getProductBrands(),
      getVehicleBrands(),
      getVehicleModels(),
      getVehicleVersions(),
    ]).then((results) => {
      if (!alive) return;
      const data = (index: number) =>
        results[index].status === "fulfilled" &&
        Array.isArray(results[index].value)
          ? results[index].value
          : [];
      setCategories(data(0) as ProductCategory[]);
      setProductBrands(data(1) as ProductBrand[]);
      setVehicleBrands(data(2) as VehicleBrand[]);
      setVehicleModels(data(3) as VehicleModel[]);
      setVehicleVersions(data(4) as VehicleVersion[]);
      setFiltersError(results.some((r) => r.status === "rejected"));
      results.forEach((result) => {
        if (result.status === "rejected")
          console.error("[storefront] filter request failed", result.reason);
      });
      setFiltersLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [filtersRetry]);

  useEffect(() => {
    // Initial SSR has already fetched this exact query. Do not clear/refetch it
    // during hydration, and do not replace usable cards with a whole-page loader.
    if (initialSignature.current === signature && productsRetry === 0) {
      setProductsLoading(false);
      setProductsError(false);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setProductsLoading(true);
      setProductsError(false);
      void getProducts(shopApiFilters(filters), controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          setProducts(data);
          setProductsLoading(false);
          initialSignature.current = null;
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          console.error("[storefront] products request failed", error);
          setProductsError(true);
          setProductsLoading(false);
        });
    }, 220);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [signature, productsRetry]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  const change = (patch: Partial<ShopFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    const url = shopUrl(next, location.search);
    if (location.pathname + location.search !== url)
      window.history.pushState(null, "", url);
    updatePublicSeo("/tienda");
  };
  const clear = () => change(defaultShopFilters());
  const closeDrawer = () => {
    dialog.current?.close();
    setDrawerOpen(false);
    drawerButton.current?.focus();
  };
  const trapDrawerFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") return;
    const controls = [
      ...event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, a[href], [tabindex="0"]'
      ),
    ].filter((control) => control.getClientRects().length > 0);
    const first = controls[0],
      last = controls.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const field = (f: ProductCategoryField) => {
    const value = filters.specs[f.field_key] ?? "";
    const label = f.filter_label || f.name;
    const update = (v: string) =>
      change({ specs: { ...filters.specs, [f.field_key]: v } });
    return (
      <label className="shop-filter-field" key={f.id}>
        <span>
          {f.filter_label || f.name}
          {f.filter_unit ? ` (${f.filter_unit})` : ""}
        </span>
        {f.type === "select" || f.type === "boolean" ? (
          <select
            aria-label={label}
            value={value}
            onChange={(e) => update(e.target.value)}
          >
            <option value="">Todos</option>
            {f.type === "boolean" ? (
              <>
                <option value="1">Sí</option>
                <option value="0">No</option>
              </>
            ) : (
              (f.options ?? []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))
            )}
          </select>
        ) : (
          <input
            aria-label={label}
            type={f.type === "number" ? "number" : "text"}
            value={value}
            onChange={(e) => update(e.target.value)}
          />
        )}
      </label>
    );
  };
  const filterPanel = () => (
    <div className="shop-filter-panel">
      <div className="shop-filters__header">
        <h2>Filtrar por</h2>
        <button
          type="button"
          onClick={clear}
          disabled={count === 0 && filters.sort === "featured"}
        >
          Limpiar filtros
        </button>
      </div>
      <label className="shop-filter-field">
        <span>Buscar</span>
        <input
          aria-label="Buscar"
          type="search"
          placeholder="Buscar producto…"
          value={filters.search}
          onChange={(e) => change({ search: e.target.value })}
        />
      </label>
      {filtersLoading ? (
        <div className="shop-filter-skeleton" role="status">
          <span>Cargando opciones de filtros…</span>
          <i />
          <i />
          <i />
        </div>
      ) : (
        <>
          {categories.some((c) => c.is_active) ? (
            <label className="shop-filter-field">
              <span>Categoría</span>
              <select
                aria-label="Categoría"
                value={filters.category_id}
                onChange={(e) =>
                  change({ category_id: e.target.value, specs: {} })
                }
              >
                <option value="">Todas las categorías</option>
                {categories
                  .filter((c) => c.is_active)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
          {productBrands.some((b) => b.is_active) ? (
            <label className="shop-filter-field">
              <span>Marca del producto</span>
              <select
                aria-label="Marca del producto"
                value={filters.product_brand_id}
                onChange={(e) => change({ product_brand_id: e.target.value })}
              >
                <option value="">Todas las marcas</option>
                {productBrands
                  .filter((b) => b.is_active)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
          {vehicleBrands.some((b) => b.is_active) ? (
            <fieldset className="shop-filter-group">
              <legend>Compatibilidad con tu vehículo</legend>
              <label className="shop-filter-field">
                <span>Marca del vehículo</span>
                <select
                  aria-label="Marca del vehículo"
                  value={filters.vehicle_brand_id}
                  onChange={(e) =>
                    change({
                      vehicle_brand_id: e.target.value,
                      vehicle_model_id: "",
                      vehicle_version_id: "",
                      year: "",
                    })
                  }
                >
                  <option value="">Selecciona una marca</option>
                  {vehicleBrands
                    .filter((b) => b.is_active)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="shop-filter-field">
                <span>Modelo</span>
                <select
                  aria-label="Modelo"
                  disabled={!filters.vehicle_brand_id || models.length === 0}
                  value={filters.vehicle_model_id}
                  onChange={(e) =>
                    change({
                      vehicle_model_id: e.target.value,
                      vehicle_version_id: "",
                      year: "",
                    })
                  }
                >
                  <option value="">
                    {!filters.vehicle_brand_id
                      ? "Primero selecciona una marca"
                      : models.length
                      ? "Todos los modelos"
                      : "No hay modelos publicados"}
                  </option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              {filters.vehicle_model_id ? (
                <>
                  {versions.length > 0 ? (
                    <label className="shop-filter-field">
                      <span>Referencia / generación</span>
                      <select
                        aria-label="Referencia / generación"
                        value={filters.vehicle_version_id}
                        onChange={(e) =>
                          change({ vehicle_version_id: e.target.value })
                        }
                      >
                        <option value="">Todas las referencias</option>
                        {versions.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.display_name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="shop-filter-field">
                    <span>Año del vehículo</span>
                    <input
                      aria-label="Año del vehículo"
                      type="number"
                      min="1900"
                      max="2100"
                      placeholder="Ej. 2024"
                      value={filters.year}
                      onChange={(e) => change({ year: e.target.value })}
                    />
                  </label>
                </>
              ) : null}
              <p>
                Incluye artículos universales y coincidencias de compatibilidad
                publicadas. Verifica la instalación antes de comprar.
              </p>
            </fieldset>
          ) : null}
          {fields.length > 0 ? (
            <details className="shop-filter-group">
              <summary>Especificaciones de {selectedCategory?.name}</summary>
              {fields.map(field)}
            </details>
          ) : null}
        </>
      )}
      {filtersError ? (
        <div className="shop-filter-error" role="status">
          <p>No pudimos cargar algunas opciones. Puedes seguir buscando.</p>
          <button type="button" onClick={() => setFiltersRetry((n) => n + 1)}>
            Reintentar filtros
          </button>
        </div>
      ) : null}
      <fieldset className="shop-filter-group">
        <legend>Disponibilidad</legend>
        <label className="shop-filter-check">
          <input
            type="checkbox"
            checked={!filters.in_stock}
            onChange={(e) => change({ in_stock: !e.target.checked })}
          />
          <span>Incluir productos agotados</span>
        </label>
        <label className="shop-filter-check">
          <input
            type="checkbox"
            checked={filters.featured}
            onChange={(e) => change({ featured: e.target.checked })}
          />
          <span>Sólo destacados</span>
        </label>
      </fieldset>
      <details className="shop-filter-group">
        <summary>Precio</summary>
        <label className="shop-filter-field">
          <span>Desde (COP)</span>
          <input
            type="number"
            min="0"
            step="1000"
            aria-label="Desde (COP)"
            placeholder="Sin mínimo"
            value={filters.min_price}
            onChange={(e) => change({ min_price: e.target.value })}
          />
        </label>
        <label className="shop-filter-field">
          <span>Hasta (COP)</span>
          <input
            type="number"
            min="0"
            step="1000"
            aria-label="Hasta (COP)"
            placeholder="Sin máximo"
            value={filters.max_price}
            onChange={(e) => change({ max_price: e.target.value })}
          />
        </label>
      </details>
    </div>
  );

  return (
    <main className="shop-page">
      <section className="shop-hero">
        <div>
          <a className="shop-breadcrumb" href="/">
            Inicio /
          </a>
          <span className="shop-eyebrow">UP GRADE 79 — STORE</span>
          <h1>El siguiente upgrade.</h1>
          <p>
            Tecnología y detalles para tu vehículo. Encuentra tu pieza; verifica
            su compatibilidad.
          </p>
        </div>
        <div className="shop-hero__aside">
          <span>SELECCIÓN AUTOMOTRIZ</span>
          <span>Barranquilla · Colombia</span>
        </div>
      </section>
      <section className="shop-layout">
        <aside className="shop-filters" aria-label="Filtros de productos">
          {filterPanel()}
        </aside>
        <section className="shop-results" aria-label="Catálogo de productos">
          <div className="shop-results__toolbar">
            <div
              className="shop-results__count"
              role="status"
              aria-live="polite"
            >
              <strong>
                {productsLoading
                  ? "Actualizando selección…"
                  : `${products.length} productos`}
              </strong>
              <span>
                {count} {count === 1 ? "filtro activo" : "filtros activos"}
              </span>
            </div>
            <button
              ref={drawerButton}
              className="shop-open-filters"
              type="button"
              onClick={() => {
                dialog.current?.showModal();
                setDrawerOpen(true);
              }}
            >
              <SlidersHorizontal size={17} aria-hidden="true" />
              Filtros{count > 0 ? ` (${count})` : ""}
            </button>
            <label className="shop-sort">
              <span>Ordenar</span>
              <select
                aria-label="Ordenar"
                value={filters.sort}
                onChange={(e) =>
                  change({ sort: e.target.value as ProductSortOption })
                }
              >
                <option value="featured">Selección destacada</option>
                <option value="newest">Más recientes</option>
                <option value="price_asc">Menor precio</option>
                <option value="price_desc">Mayor precio</option>
                <option value="name">Nombre A–Z</option>
                <option value="stock">Disponibilidad</option>
              </select>
            </label>
          </div>
          {productsError ? (
            <div className="shop-message is-error" role="alert">
              <h2>No pudimos cargar los productos.</h2>
              <p>
                Comprueba tu conexión y vuelve a intentarlo. La selección
                anterior no se ha borrado.
              </p>
              <button
                type="button"
                onClick={() => setProductsRetry((n) => n + 1)}
              >
                Reintentar productos
              </button>
            </div>
          ) : null}
          <div
            aria-busy={productsLoading}
            className={
              productsLoading && products.length ? "shop-results__updating" : ""
            }
          >
            {products.length ? (
              <div className="shop-products-grid">
                {products.map((product, index) => {
                  const image = getProductImageUrl(
                    product.image_url || product.main_image
                  );
                  const available = stock(product);
                  const compatibility = product.is_universal
                    ? "Compatibilidad universal"
                    : product.vehicle_compatibilities?.[0]?.vehicle_label ||
                      "Consulta compatibilidad";
                  return (
                    <article className="shop-product-card" key={product.id}>
                      <a
                        className="shop-product-card__media"
                        href={productPath(product)}
                        aria-label={`Ver ${product.name}`}
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={product.name}
                            loading={index < 4 ? "eager" : "lazy"}
                            decoding="async"
                          />
                        ) : (
                          <span>Fotografía no disponible</span>
                        )}
                      </a>
                      <div className="shop-product-card__body">
                        <div className="shop-product-card__meta">
                          <span>
                            {product.product_category?.name ??
                              product.category ??
                              "Artículos"}
                          </span>
                          {product.product_brand?.name ? (
                            <span>{product.product_brand.name}</span>
                          ) : null}
                        </div>
                        <h2>
                          <a href={productPath(product)}>{product.name}</a>
                        </h2>
                        <p className="shop-product-card__compatibility">
                          {compatibility}
                        </p>
                        <div
                          className={`shop-product-card__stock ${
                            available > 0 ? "" : "is-unavailable"
                          }`}
                        >
                          {available > 0
                            ? `${available} disponibles en nuestra red`
                            : "Agotado"}
                        </div>
                        <div className="shop-product-card__footer">
                          <strong>{price(product)}</strong>
                          <a href={productPath(product)}>
                            Ver producto{" "}
                            <ArrowUpRight size={15} aria-hidden="true" />
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : productsLoading ? (
              <div
                className="shop-products-grid shop-skeleton-grid"
                role="status"
                aria-label="Cargando productos"
              >
                {Array.from({ length: 6 }, (_, i) => (
                  <div className="shop-card-skeleton" key={i}>
                    <i />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : !productsError ? (
              <div className="shop-empty">
                <span>Sin coincidencias</span>
                <h2>
                  {filters.vehicle_brand_id
                    ? "No encontramos productos compatibles con esta selección."
                    : "No encontramos productos para estos filtros."}
                </h2>
                <p>
                  Prueba otra categoría o vuelve a explorar la selección
                  completa.
                </p>
                <button type="button" onClick={clear}>
                  Limpiar filtros
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </section>
      <dialog
        ref={dialog}
        className="shop-filter-drawer"
        aria-labelledby="shop-drawer-title"
        data-lenis-prevent
        onKeyDown={trapDrawerFocus}
        onClose={() => {
          setDrawerOpen(false);
          drawerButton.current?.focus();
        }}
      >
        <div className="shop-drawer-header">
          <h2 id="shop-drawer-title">Tu selección</h2>
          <button
            type="button"
            aria-label="Cerrar filtros"
            onClick={closeDrawer}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        {filterPanel()}
        <button
          type="button"
          className="shop-drawer-apply"
          onClick={closeDrawer}
        >
          Ver {products.length} productos
        </button>
      </dialog>
    </main>
  );
};
