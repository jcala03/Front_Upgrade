import { useEffect, useMemo, useState } from "react";
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
import "./ShopPage.css";

type SpecsFilterState = Record<string, string>;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
};

const getProductImage = (product: Product) => {
  return product.image_url || product.main_image || "";
};

const getCategoryName = (product: Product) => {
  return product.product_category?.name ?? product.category ?? "Sin categoría";
};

const getBrandName = (product: Product) => {
  return product.product_brand?.name ?? "Sin marca";
};

const getProductVariantCount = (product: Product) => {
  return product.variants_count ?? product.variants?.length ?? 0;
};

const productHasVariants = (product: Product) => {
  return Boolean(product.has_variants) || getProductVariantCount(product) > 0;
};

const getProductDisplayStock = (product: Product) => {
  if (productHasVariants(product)) {
    if (typeof product.total_variant_stock === "number") {
      return product.total_variant_stock;
    }

    return (
      product.variants
        ?.filter((variant) => variant.is_active && variant.is_visible)
        .reduce((total, variant) => total + Number(variant.stock ?? 0), 0) ?? 0
    );
  }

  return product.stock ?? 0;
};

const getProductDisplayPrice = (product: Product) => {
  if (productHasVariants(product)) {
    if (
      typeof product.lowest_variant_price === "number" &&
      product.lowest_variant_price > 0
    ) {
      return `Desde ${formatCurrency(product.lowest_variant_price)}`;
    }

    const variantPrices =
      product.variants
        ?.filter(
          (variant) =>
            variant.is_active &&
            variant.is_visible &&
            Number(variant.price) > 0
        )
        .map((variant) => Number(variant.price)) ?? [];

    if (variantPrices.length > 0) {
      return `Desde ${formatCurrency(Math.min(...variantPrices))}`;
    }
  }

  return formatCurrency(product.price ?? 0);
};

const getStockLabel = (product: Product) => {
  if (product.stock_status === "out_of_stock") {
    return "Agotado";
  }

  if (product.stock_status === "low_stock") {
    return "Stock bajo";
  }

  return "Disponible";
};

const getStockClass = (product: Product) => {
  if (product.stock_status === "out_of_stock") {
    return "is-danger";
  }

  if (product.stock_status === "low_stock") {
    return "is-warning";
  }

  return "is-success";
};

const getFieldInputType = (field: ProductCategoryField) => {
  if (field.type === "number") {
    return "number";
  }

  return "text";
};

export const ShopPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [productBrands, setProductBrands] = useState<ProductBrand[]>([]);
  const [vehicleBrands, setVehicleBrands] = useState<VehicleBrand[]>([]);
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);
  const [vehicleVersions, setVehicleVersions] = useState<VehicleVersion[]>([]);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [productBrandId, setProductBrandId] = useState("");
  const [vehicleBrandId, setVehicleBrandId] = useState("");
  const [vehicleModelId, setVehicleModelId] = useState("");
  const [vehicleVersionId, setVehicleVersionId] = useState("");
  const [year, setYear] = useState("");
  const [sort, setSort] = useState<ProductSortOption>("featured");
  const [inStock, setInStock] = useState(true);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [specFilters, setSpecFilters] = useState<SpecsFilterState>({});

  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState("");

  const selectedCategory = useMemo(() => {
    return (
      categories.find((category) => String(category.id) === categoryId) ?? null
    );
  }, [categories, categoryId]);

  const filterableFields = useMemo(() => {
    return (
      selectedCategory?.fields?.filter(
        (field) => field.is_active && field.is_filterable
      ) ?? []
    );
  }, [selectedCategory]);

  const availableVehicleModels = useMemo(() => {
    if (!vehicleBrandId) {
      return [];
    }

    return vehicleModels.filter(
      (model) =>
        model.is_active && String(model.vehicle_brand_id) === vehicleBrandId
    );
  }, [vehicleModels, vehicleBrandId]);

  const availableVehicleVersions = useMemo(() => {
    if (!vehicleModelId) {
      return [];
    }

    return vehicleVersions.filter(
      (version) =>
        version.is_active && String(version.vehicle_model_id) === vehicleModelId
    );
  }, [vehicleVersions, vehicleModelId]);

  const activeFilterCount = useMemo(() => {
    return [
      search,
      categoryId,
      productBrandId,
      vehicleBrandId,
      vehicleModelId,
      vehicleVersionId,
      year,
      featuredOnly ? "featured" : "",
      inStock ? "stock" : "",
      ...Object.values(specFilters),
    ].filter(Boolean).length;
  }, [
    search,
    categoryId,
    productBrandId,
    vehicleBrandId,
    vehicleModelId,
    vehicleVersionId,
    year,
    featuredOnly,
    inStock,
    specFilters,
  ]);

  const loadFilterData = async () => {
    try {
      setIsLoadingFilters(true);

      const [
        categoriesResponse,
        productBrandsResponse,
        vehicleBrandsResponse,
        vehicleModelsResponse,
        vehicleVersionsResponse,
      ] = await Promise.all([
        getProductCategories(),
        getProductBrands(),
        getVehicleBrands(),
        getVehicleModels(),
        getVehicleVersions(),
      ]);

      setCategories(categoriesResponse);
      setProductBrands(productBrandsResponse);
      setVehicleBrands(vehicleBrandsResponse);
      setVehicleModels(vehicleModelsResponse);
      setVehicleVersions(vehicleVersionsResponse);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los filtros."
      );
    } finally {
      setIsLoadingFilters(false);
    }
  };

  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true);
      setError("");

      const cleanSpecs = Object.entries(specFilters).reduce<
        Record<string, string>
      >((filters, [key, value]) => {
        if (value !== "") {
          filters[key] = value;
        }

        return filters;
      }, {});

      const response = await getProducts({
        search,
        category_id: categoryId,
        product_brand_id: productBrandId,
        vehicle_brand_id: vehicleBrandId,
        vehicle_model_id: vehicleModelId,
        vehicle_version_id: vehicleVersionId,
        year,
        in_stock: inStock,
        featured: featuredOnly,
        sort,
        specs: cleanSpecs,
      });

      setProducts(response);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los productos."
      );
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    void loadFilterData();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadProducts();
    }, 280);

    return () => window.clearTimeout(timeout);
  }, [
    search,
    categoryId,
    productBrandId,
    vehicleBrandId,
    vehicleModelId,
    vehicleVersionId,
    year,
    inStock,
    featuredOnly,
    sort,
    specFilters,
  ]);

  const handleCategoryChange = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    setSpecFilters({});
  };

  const handleVehicleBrandChange = (nextVehicleBrandId: string) => {
    setVehicleBrandId(nextVehicleBrandId);
    setVehicleModelId("");
    setVehicleVersionId("");
  };

  const handleVehicleModelChange = (nextVehicleModelId: string) => {
    setVehicleModelId(nextVehicleModelId);
    setVehicleVersionId("");
  };

  const updateSpecFilter = (fieldKey: string, value: string) => {
    setSpecFilters((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  };

  const clearFilters = () => {
    setSearch("");
    setCategoryId("");
    setProductBrandId("");
    setVehicleBrandId("");
    setVehicleModelId("");
    setVehicleVersionId("");
    setYear("");
    setSort("featured");
    setInStock(true);
    setFeaturedOnly(false);
    setSpecFilters({});
  };

  const renderTechnicalFilter = (field: ProductCategoryField) => {
    const value = specFilters[field.field_key] ?? "";
    const label = field.filter_label || field.name;

    if (field.type === "boolean") {
      return (
        <label className="shop-filter-field" key={field.id}>
          <span>{label}</span>

          <select
            value={value}
            onChange={(event) =>
              updateSpecFilter(field.field_key, event.target.value)
            }
          >
            <option value="">Todos</option>
            <option value="1">Sí</option>
            <option value="0">No</option>
          </select>
        </label>
      );
    }

    if (field.type === "select") {
      return (
        <label className="shop-filter-field" key={field.id}>
          <span>{label}</span>

          <select
            value={value}
            onChange={(event) =>
              updateSpecFilter(field.field_key, event.target.value)
            }
          >
            <option value="">Todos</option>

            {(field.options ?? []).map((option) => (
              <option value={option} key={option}>
                {option}
                {field.filter_unit ? ` ${field.filter_unit}` : ""}
              </option>
            ))}
          </select>
        </label>
      );
    }

    return (
      <label className="shop-filter-field" key={field.id}>
        <span>{label}</span>

        <input
          type={getFieldInputType(field)}
          value={value}
          onChange={(event) =>
            updateSpecFilter(field.field_key, event.target.value)
          }
          placeholder={field.filter_unit ? `Valor en ${field.filter_unit}` : "Valor"}
        />
      </label>
    );
  };

  return (
    <main className="shop-page">
      <section className="shop-hero">
        <div>
          <span>UP GRADE 79 Store</span>
          <h1>Encuentra el upgrade compatible con tu vehículo</h1>
          <p>
            Filtra por marca, modelo, año, categoría, producto y
            especificaciones técnicas para encontrar piezas compatibles.
          </p>
        </div>

        <div className="shop-hero__meta">
          <strong>{products.length}</strong>
          <small>productos encontrados</small>
        </div>
      </section>

      <section className="shop-layout">
        <aside className="shop-filters">
          <div className="shop-filters__header">
            <div>
              <span>Filtros</span>
              <h2>Búsqueda avanzada</h2>
            </div>

            <button type="button" onClick={clearFilters}>
              Limpiar
            </button>
          </div>

          <label className="shop-filter-field">
            <span>Buscar</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Radio, Pioneer, BMW..."
            />
          </label>

          <div className="shop-filter-group">
            <h3>Producto</h3>

            <label className="shop-filter-field">
              <span>Categoría</span>
              <select
                value={categoryId}
                onChange={(event) => handleCategoryChange(event.target.value)}
                disabled={isLoadingFilters}
              >
                <option value="">Todas</option>

                {categories
                  .filter((category) => category.is_active)
                  .map((category) => (
                    <option value={category.id} key={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="shop-filter-field">
              <span>Marca producto</span>
              <select
                value={productBrandId}
                onChange={(event) => setProductBrandId(event.target.value)}
                disabled={isLoadingFilters}
              >
                <option value="">Todas</option>

                {productBrands
                  .filter((brand) => brand.is_active)
                  .map((brand) => (
                    <option value={brand.id} key={brand.id}>
                      {brand.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div className="shop-filter-group">
            <h3>Vehículo</h3>

            <label className="shop-filter-field">
              <span>Marca vehículo</span>
              <select
                value={vehicleBrandId}
                onChange={(event) =>
                  handleVehicleBrandChange(event.target.value)
                }
                disabled={isLoadingFilters}
              >
                <option value="">Todas</option>

                {vehicleBrands
                  .filter((brand) => brand.is_active)
                  .map((brand) => (
                    <option value={brand.id} key={brand.id}>
                      {brand.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="shop-filter-field">
              <span>Modelo</span>
              <select
                value={vehicleModelId}
                onChange={(event) =>
                  handleVehicleModelChange(event.target.value)
                }
                disabled={!vehicleBrandId || isLoadingFilters}
              >
                <option value="">Todos</option>

                {availableVehicleModels.map((model) => (
                  <option value={model.id} key={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="shop-filter-field">
              <span>Versión / generación</span>
              <select
                value={vehicleVersionId}
                onChange={(event) => setVehicleVersionId(event.target.value)}
                disabled={!vehicleModelId || isLoadingFilters}
              >
                <option value="">Todas</option>

                {availableVehicleVersions.map((version) => (
                  <option value={version.id} key={version.id}>
                    {version.display_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="shop-filter-field">
              <span>Año</span>
              <input
                type="number"
                min="1900"
                max="2100"
                value={year}
                onChange={(event) => setYear(event.target.value)}
                placeholder="Ej: 2015"
              />
            </label>
          </div>

          {filterableFields.length > 0 ? (
            <div className="shop-filter-group">
              <h3>Especificaciones</h3>
              {filterableFields.map((field) => renderTechnicalFilter(field))}
            </div>
          ) : null}

          <div className="shop-filter-group">
            <h3>Disponibilidad</h3>

            <label className="shop-filter-check">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(event) => setInStock(event.target.checked)}
              />
              <span>Solo productos con stock</span>
            </label>

            <label className="shop-filter-check">
              <input
                type="checkbox"
                checked={featuredOnly}
                onChange={(event) => setFeaturedOnly(event.target.checked)}
              />
              <span>Solo destacados</span>
            </label>
          </div>
        </aside>

        <section className="shop-results">
          <div className="shop-results__toolbar">
            <div>
              <span>{activeFilterCount} filtros activos</span>
              <h2>Catálogo compatible</h2>
            </div>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as ProductSortOption)}
            >
              <option value="featured">Destacados primero</option>
              <option value="newest">Más recientes</option>
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
              <option value="name">Nombre A-Z</option>
              <option value="stock">Mayor stock</option>
            </select>
          </div>

          {error ? <p className="shop-message is-error">{error}</p> : null}

          {isLoadingProducts ? (
            <div className="shop-loading">
              <span />
              <p>Cargando productos compatibles...</p>
            </div>
          ) : products.length > 0 ? (
            <div className="shop-products-grid">
              {products.map((product) => {
                const image = getProductImage(product);

                return (
                  <article className="shop-product-card" key={product.id}>
                    <a
                      className="shop-product-card__media"
                      href={`/tienda/${product.slug}`}
                    >
                      {image ? (
                        <img src={image} alt={product.name} />
                      ) : (
                        <span>{product.name.charAt(0)}</span>
                      )}

                      {product.is_featured ? <em>Destacado</em> : null}
                    </a>

                    <div className="shop-product-card__body">
                      <div className="shop-product-card__meta">
                        <span>{getCategoryName(product)}</span>
                        <span>{getBrandName(product)}</span>
                      </div>

                      <h3>
                        <a href={`/tienda/${product.slug}`}>{product.name}</a>
                      </h3>

                      <div className="shop-product-card__stock">
                        <span
                          className={`shop-stock-badge ${getStockClass(product)}`}
                        >
                          {getStockLabel(product)} ·{" "}
                          {getProductDisplayStock(product)} disponibles en red
                        </span>
                      </div>

                      {product.vehicle_compatibilities &&
                      product.vehicle_compatibilities.length > 0 ? (
                        <div className="shop-product-card__compatibility">
                          {product.vehicle_compatibilities
                            .slice(0, 3)
                            .map((compatibility) => (
                              <span key={compatibility.id}>
                                {compatibility.vehicle_label}
                              </span>
                            ))}
                        </div>
                      ) : null}

                      <div className="shop-product-card__footer">
                        <strong>{getProductDisplayPrice(product)}</strong>
                        <a href={`/tienda/${product.slug}`}>Ver producto</a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="shop-empty">
              <h3>No encontramos productos compatibles</h3>
              <p>
                Ajusta los filtros o limpia la búsqueda para ver más opciones.
              </p>
              <button type="button" onClick={clearFilters}>
                Limpiar filtros
              </button>
            </div>
          )}
        </section>
      </section>
    </main>
  );
};
