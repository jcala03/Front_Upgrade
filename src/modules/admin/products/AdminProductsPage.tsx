import { useEffect, useMemo, useState } from "react";
import {
  getAdminProducts,
  updateProduct,
  updateProductPublication,
} from "../../../api/products";
import type { AdminProduct, ProductCommissionPayload } from "../../../types/product";
import { formatCurrency as formatCop } from "../../../utils/formatCurrency";
import { hasPermission } from "../../../utils/authStorage";
import "./AdminProductsPage.css";

type StoreFilter =
  | "all"
  | "published"
  | "hidden"
  | "featured";

type PublicationDraft = {
  is_visible: boolean;
  is_featured: boolean;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
};

const getProductImage = (product: AdminProduct) => {
  return product.image_url || product.main_image || "";
};

const getCategoryName = (product: AdminProduct) => {
  return product.product_category?.name ?? product.category ?? "Sin categoría";
};

const getBrandName = (product: AdminProduct) => {
  return product.product_brand?.name ?? "Sin marca";
};

const getProductVariantCount = (product: AdminProduct) => {
  return product.variants_count ?? product.variants?.length ?? 0;
};

const productHasVariants = (product: AdminProduct) => {
  return Boolean(product.has_variants) || getProductVariantCount(product) > 0;
};

const getVisibleActiveVariants = (product: AdminProduct) => {
  return (
    product.variants?.filter(
      (variant) => variant.is_active && variant.is_visible
    ) ?? []
  );
};

const getProductEffectivePrice = (product: AdminProduct) => {
  if (productHasVariants(product)) {
    const visibleVariantPrices = getVisibleActiveVariants(product)
      .map((variant) => Number(variant.price ?? 0))
      .filter((price) => price > 0);

    if (visibleVariantPrices.length > 0) {
      return Math.min(...visibleVariantPrices);
    }

    if (
      typeof product.lowest_variant_price === "number" &&
      product.lowest_variant_price > 0
    ) {
      return product.lowest_variant_price;
    }
  }

  return Number(product.price ?? 0);
};

const getProductDisplayPrice = (product: AdminProduct) => {
  const price = getProductEffectivePrice(product);

  if (productHasVariants(product) && price > 0) {
    return `Desde ${formatCurrency(price)}`;
  }

  return formatCurrency(price);
};

const getCompatibilityLabels = (product: AdminProduct) => {
  return (
    product.vehicle_compatibilities
      ?.map((compatibility) => compatibility.vehicle_label)
      .filter(Boolean) ?? []
  );
};

const getPublicationIssues = (product: AdminProduct) => {
  const issues: string[] = [];

  if (!product.is_active) {
    issues.push("El artículo está inactivo en Inventario.");
  }

  if (!getProductImage(product)) {
    issues.push("El artículo no tiene imagen principal.");
  }

  if (getProductEffectivePrice(product) <= 0) {
    issues.push("El artículo no tiene un precio público válido.");
  }

  if (productHasVariants(product)) {
    const publicVariants = getVisibleActiveVariants(product).filter(
      (variant) => Number(variant.price ?? 0) > 0
    );

    if (publicVariants.length === 0) {
      issues.push(
        "El artículo no tiene versiones activas y visibles con precio válido."
      );
    }
  }

  return issues;
};

export const AdminProductsPage = () => {
  const canUpdateProducts = hasPermission("products.update");
  const canViewInventory = hasPermission("inventory.view");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [filter, setFilter] = useState<StoreFilter>("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savingProductId, setSavingProductId] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [commissionProduct, setCommissionProduct] = useState<AdminProduct | null>(null);
  const [commissionEnabled, setCommissionEnabled] = useState(false);
  const [commissionAmount, setCommissionAmount] = useState("");
  const [commissionError, setCommissionError] = useState("");
  const [publicationDraft, setPublicationDraft] =
    useState<PublicationDraft | null>(null);

  const loadProducts = async () => {
    try {
      setIsFetching(true);
      setError("");

      const response = await getAdminProducts();
      setProducts(response);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los artículos de la tienda."
      );
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && savingProductId === null) {
        setSelectedProduct(null);
        setPublicationDraft(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedProduct, savingProductId]);

  const stats = useMemo(() => {
    return {
      total: products.length,
      published: products.filter((product) => product.is_visible).length,
      hidden: products.filter((product) => !product.is_visible).length,
      featured: products.filter((product) => product.is_featured).length,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "published" && product.is_visible) ||
        (filter === "hidden" && !product.is_visible) ||
        (filter === "featured" && product.is_featured);

      const compatibilityText = getCompatibilityLabels(product).join(" ");

      const searchableText = [
        product.name,
        product.sku,
        getCategoryName(product),
        getBrandName(product),
        compatibilityText,
      ]
        .join(" ")
        .toLowerCase();

      return matchesFilter && searchableText.includes(normalizedSearch);
    });
  }, [products, filter, search]);

  const replaceProduct = (updatedProduct: AdminProduct) => {
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === updatedProduct.id ? updatedProduct : product
      )
    );
  };

  const openCommission = (product: AdminProduct) => {
    if (!canUpdateProducts) return;
    setCommissionProduct(product);
    setCommissionEnabled(product.commission_enabled);
    setCommissionAmount(product.commission_amount === null ? "" : String(product.commission_amount));
    setCommissionError("");
  };

  const saveCommission = async () => {
    if (!canUpdateProducts || !commissionProduct || savingProductId !== null) return;
    const amount = Number(commissionAmount);
    if (commissionEnabled && (!Number.isInteger(amount) || amount <= 0)) {
      setCommissionError("Ingresa una comisión entera mayor que cero.");
      return;
    }
    const payload: ProductCommissionPayload = {
      commission_enabled: commissionEnabled,
      commission_amount: commissionEnabled ? amount : null,
    };
    setSavingProductId(commissionProduct.id);
    setCommissionError("");
    setError("");
    try {
      const updated = await updateProduct(commissionProduct.id, payload);
      replaceProduct(updated);
      setCommissionProduct(null);
      setMessage("Comisión comercial actualizada correctamente.");
    } catch (cause) {
      setCommissionError(cause instanceof Error ? cause.message : "No se pudo actualizar la comisión.");
    } finally {
      setSavingProductId(null);
    }
  };

  const savePublication = async (
    product: AdminProduct,
    draft: PublicationDraft,
    successMessage: string
  ): Promise<AdminProduct | null> => {
    if (!canUpdateProducts) return null;
    try {
      setSavingProductId(product.id);
      setMessage("");
      setError("");

      const normalizedDraft: PublicationDraft = {
        is_visible: draft.is_visible || draft.is_featured,
        is_featured: draft.is_featured,
      };

      if (!normalizedDraft.is_visible) {
        normalizedDraft.is_featured = false;
      }

      const updatedProduct = await updateProductPublication(
        product.id,
        normalizedDraft
      );

      replaceProduct(updatedProduct);
      setMessage(successMessage);

      return updatedProduct;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo actualizar la publicación."
      );

      return null;
    } finally {
      setSavingProductId(null);
    }
  };

  const openPublicationModal = (
    product: AdminProduct,
    draft?: PublicationDraft
  ) => {
    if (!canUpdateProducts) return;
    setSelectedProduct(product);
    setPublicationDraft(
      draft ?? {
        is_visible: Boolean(product.is_visible),
        is_featured: Boolean(product.is_featured),
      }
    );
    setMessage("");
  };

  const closePublicationModal = () => {
    if (savingProductId !== null) {
      return;
    }

    setSelectedProduct(null);
    setPublicationDraft(null);
  };

  const handleVisibilityChange = async (
    product: AdminProduct,
    nextValue: boolean
  ) => {
    const nextDraft: PublicationDraft = {
      is_visible: nextValue,
      is_featured: nextValue ? Boolean(product.is_featured) : false,
    };

    if (nextValue) {
      const issues = getPublicationIssues(product);

      if (issues.length > 0) {
        openPublicationModal(product, nextDraft);
        setError(
          `No se puede publicar este artículo. ${issues.join(" ")}`
        );
        return;
      }
    }

    await savePublication(
      product,
      nextDraft,
      nextValue
        ? "Artículo publicado en la tienda."
        : "Artículo ocultado de la tienda."
    );
  };

  const handleFeaturedChange = async (
    product: AdminProduct,
    nextValue: boolean
  ) => {
    const nextDraft: PublicationDraft = {
      is_featured: nextValue,
      is_visible: nextValue ? true : Boolean(product.is_visible),
    };

    if (nextValue) {
      const issues = getPublicationIssues(product);

      if (issues.length > 0) {
        openPublicationModal(product, nextDraft);
        setError(
          `No se puede destacar este artículo. ${issues.join(" ")}`
        );
        return;
      }
    }

    await savePublication(
      product,
      nextDraft,
      nextValue
        ? "Artículo marcado como destacado."
        : "Artículo retirado de destacados."
    );
  };

  const handleModalSave = async () => {
    if (!selectedProduct || !publicationDraft) {
      return;
    }

    const normalizedDraft: PublicationDraft = {
      is_visible:
        publicationDraft.is_visible || publicationDraft.is_featured,
      is_featured: publicationDraft.is_featured,
    };

    if (normalizedDraft.is_visible) {
      const issues = getPublicationIssues(selectedProduct);

      if (issues.length > 0) {
        setError(
          `No se puede publicar este artículo. ${issues.join(" ")}`
        );
        return;
      }
    }

    const updatedProduct = await savePublication(
      selectedProduct,
      normalizedDraft,
      normalizedDraft.is_visible
        ? normalizedDraft.is_featured
          ? "Artículo publicado y destacado correctamente."
          : "Publicación del artículo actualizada correctamente."
        : "Artículo ocultado de la tienda."
    );

    if (updatedProduct) {
      setSelectedProduct(null);
      setPublicationDraft(null);
    }
  };

  const selectedProductIssues = selectedProduct
    ? getPublicationIssues(selectedProduct)
    : [];

  return (
    <section className="admin-store-products">
      <section className="store-products-hero">
        <div>
          <span>Tienda ecommerce</span>
          <h2>Publicación de artículos</h2>
          <p>
            Aquí decides cuáles artículos se publican, cuáles se ocultan y
            cuáles aparecen destacados en la tienda.
          </p>
        </div>

        {canViewInventory ? <a href="/crm/inventory">Ver inventario</a> : null}
      </section>

      <section className="store-products-stats">
        <article>
          <span>Total artículos</span>
          <strong>{stats.total}</strong>
          <small>Artículos disponibles para publicar</small>
        </article>

        <article className="is-success">
          <span>Publicados</span>
          <strong>{stats.published}</strong>
          <small>Visibles en ecommerce</small>
        </article>

        <article className="is-warning">
          <span>Ocultos</span>
          <strong>{stats.hidden}</strong>
          <small>No aparecen en tienda</small>
        </article>

        <article className="is-featured">
          <span>Destacados</span>
          <strong>{stats.featured}</strong>
          <small>Promocionados en vitrinas</small>
        </article>
      </section>

      <section className="store-products-panel">
        <div className="store-products-panel__header">
          <div>
            <span>Catálogo publicado</span>
            <h3>Artículos del catálogo</h3>
          </div>

          <div className="store-products-panel__tools">
            <input
              type="search"
              placeholder="Buscar por artículo, marca, categoría, SKU o compatibilidad..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as StoreFilter)
              }
            >
              <option value="all">Todos</option>
              <option value="published">Publicados</option>
              <option value="hidden">Ocultos</option>
              <option value="featured">Destacados</option>
            </select>
          </div>
        </div>

        {message ? (
          <p className="store-products-message is-success">{message}</p>
        ) : null}

        {error ? (
          <p className="store-products-message is-error">{error}</p>
        ) : null}

        {isFetching ? (
          <p className="store-products-empty">Cargando artículos...</p>
        ) : filteredProducts.length > 0 ? (
          <div className="store-products-table-wrap">
            <table className="store-products-table">
              <thead>
                <tr>
                  <th>Artículo</th>
                  <th>Marca</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Compatibilidad</th>
                  <th>Publicación</th>
                  <th>Destacado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => {
                  const image = getProductImage(product);
                  const compatibilityLabels =
                    getCompatibilityLabels(product);
                  const isSaving = savingProductId === product.id;

                  return (
                    <tr key={product.id}>
                      <td data-label="Artículo">
                        <div className="store-product-info">
                          {image ? (
                            <img src={image} alt={product.name} />
                          ) : (
                            <span>{product.name.charAt(0)}</span>
                          )}

                          <div>
                            <strong>{product.name}</strong>
                            <small>{product.sku || "Sin SKU"}</small>
                          </div>
                        </div>
                      </td>

                      <td data-label="Marca">
                        {getBrandName(product)}
                      </td>

                      <td data-label="Categoría">
                        {getCategoryName(product)}
                      </td>

                      <td data-label="Precio">
                        {getProductDisplayPrice(product)}
                      </td>

                      <td data-label="Compatibilidad">
                        {compatibilityLabels.length > 0 ? (
                          <div className="store-product-chips">
                            {compatibilityLabels
                              .slice(0, 3)
                              .map((compatibility, index) => (
                                <span
                                  key={`${product.id}-${index}-${compatibility}`}
                                >
                                  {compatibility}
                                </span>
                              ))}

                            {compatibilityLabels.length > 3 ? (
                              <small>
                                +{compatibilityLabels.length - 3} más
                              </small>
                            ) : null}
                          </div>
                        ) : product.compatibility_type === "universal" ? (
                          <span className="store-product-compatibility-universal">
                            Compatibilidad universal
                          </span>
                        ) : (
                          <small>Sin compatibilidad registrada</small>
                        )}
                      </td>

                      <td data-label="Publicación">
                        {canUpdateProducts ? <button
                          className={
                            product.is_visible
                              ? "store-product-action is-active"
                              : "store-product-action"
                          }
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            void handleVisibilityChange(
                              product,
                              !product.is_visible
                            )
                          }
                        >
                          {isSaving
                            ? "Guardando..."
                            : product.is_visible
                              ? "Publicado"
                              : "Oculto"}
                        </button> : <span>{product.is_visible ? "Publicado" : "Oculto"}</span>}
                      </td>

                      <td data-label="Destacado">
                        {canUpdateProducts ? <button
                          className={
                            product.is_featured
                              ? "store-product-action is-featured"
                              : "store-product-action"
                          }
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            void handleFeaturedChange(
                              product,
                              !product.is_featured
                            )
                          }
                        >
                          {isSaving
                            ? "Guardando..."
                            : product.is_featured
                              ? "Destacado"
                              : "Normal"}
                        </button> : <span>{product.is_featured ? "Destacado" : "Normal"}</span>}
                      </td>

                      <td data-label="Acciones">
                        {canUpdateProducts ? <button
                          className="store-product-configure"
                          type="button"
                          disabled={isSaving}
                          onClick={() => openCommission(product)}
                        >
                          {product.commission_enabled ? `Comisión ${formatCop(product.commission_amount)}` : "Configurar comisión"}
                        </button> : null}
                        {canUpdateProducts ? <button
                          className="store-product-configure"
                          type="button"
                          disabled={isSaving}
                          onClick={() => openPublicationModal(product)}
                        >
                          Configurar publicación
                        </button> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="store-products-empty">
            <p>No hay artículos para mostrar con estos filtros.</p>
            {canViewInventory ? <a href="/crm/inventory">Ver inventario</a> : null}
          </div>
        )}
      </section>

      {selectedProduct && publicationDraft ? (
        <div
          className="store-publication-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePublicationModal();
            }
          }}
        >
          <section
            className="store-publication-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="publication-modal-title"
          >
            <header className="store-publication-modal__header">
              <div>
                <span>Configuración de tienda</span>
                <h3 id="publication-modal-title">
                  Configurar publicación
                </h3>
                <p>{selectedProduct.name}</p>
              </div>

              <button
                type="button"
                aria-label="Cerrar configuración"
                disabled={savingProductId !== null}
                onClick={closePublicationModal}
              >
                ×
              </button>
            </header>

            <div className="store-publication-modal__content">
              <section className="store-publication-settings">
                <h4>Estado de publicación</h4>

                <label className="store-publication-toggle">
                  <span>
                    <strong>Publicado en la tienda</strong>
                    <small>
                      El artículo aparecerá en el ecommerce público.
                    </small>
                  </span>

                  <input
                    type="checkbox"
                    checked={publicationDraft.is_visible}
                    onChange={(event) => {
                      const isVisible = event.target.checked;

                      setPublicationDraft((currentDraft) =>
                        currentDraft
                          ? {
                              ...currentDraft,
                              is_visible: isVisible,
                              is_featured: isVisible
                                ? currentDraft.is_featured
                                : false,
                            }
                          : currentDraft
                      );
                    }}
                  />
                </label>

                <label className="store-publication-toggle">
                  <span>
                    <strong>Artículo destacado</strong>
                    <small>
                      Aparecerá en las vitrinas principales de la tienda.
                    </small>
                  </span>

                  <input
                    type="checkbox"
                    checked={publicationDraft.is_featured}
                    onChange={(event) => {
                      const isFeatured = event.target.checked;

                      setPublicationDraft((currentDraft) =>
                        currentDraft
                          ? {
                              ...currentDraft,
                              is_featured: isFeatured,
                              is_visible: isFeatured
                                ? true
                                : currentDraft.is_visible,
                            }
                          : currentDraft
                      );
                    }}
                  />
                </label>

                <section className="store-publication-validation">
                  <h4>Validación para publicar</h4>

                  {selectedProductIssues.length > 0 ? (
                    <ul>
                      {selectedProductIssues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      El artículo tiene la información mínima necesaria para
                      publicarse.
                    </p>
                  )}

                </section>
              </section>

              <section className="store-publication-preview">
                <div className="store-publication-preview__heading">
                  <span>Vista previa básica</span>
                  <strong>
                    {publicationDraft.is_visible
                      ? "Visible en tienda"
                      : "Oculto"}
                  </strong>
                </div>

                <article className="store-publication-card">
                  {getProductImage(selectedProduct) ? (
                    <img
                      src={getProductImage(selectedProduct)}
                      alt={selectedProduct.name}
                    />
                  ) : (
                    <div className="store-publication-card__placeholder">
                      {selectedProduct.name.charAt(0)}
                    </div>
                  )}

                  <div>
                    {publicationDraft.is_featured ? (
                      <span className="store-publication-card__featured">
                        Destacado
                      </span>
                    ) : null}

                    <small>
                      {getBrandName(selectedProduct)} ·{" "}
                      {getCategoryName(selectedProduct)}
                    </small>

                    <h4>{selectedProduct.name}</h4>

                    <strong>
                      {getProductDisplayPrice(selectedProduct)}
                    </strong>


                    <div className="store-publication-card__compatibility">
                      {getCompatibilityLabels(selectedProduct).length > 0 ? (
                        getCompatibilityLabels(selectedProduct)
                          .slice(0, 3)
                          .map((compatibility, index) => (
                            <span
                              key={`${selectedProduct.id}-preview-${index}`}
                            >
                              {compatibility}
                            </span>
                          ))
                      ) : selectedProduct.compatibility_type ===
                        "universal" ? (
                        <span>Compatibilidad universal</span>
                      ) : (
                        <span>Compatibilidad no registrada</span>
                      )}
                    </div>
                  </div>
                </article>
              </section>
            </div>

            <footer className="store-publication-modal__footer">
              <button
                type="button"
                disabled={savingProductId !== null}
                onClick={closePublicationModal}
              >
                Cancelar
              </button>

              <button
                className="is-primary"
                type="button"
                disabled={savingProductId !== null}
                onClick={() => void handleModalSave()}
              >
                {savingProductId !== null
                  ? "Guardando..."
                  : "Guardar publicación"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {commissionProduct ? <div className="store-publication-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && savingProductId === null) setCommissionProduct(null); }}>
        <section className="store-publication-modal__panel store-commission-modal" role="dialog" aria-modal="true" aria-labelledby="commission-modal-title">
          <header className="store-publication-modal__header"><div><span>Configuración interna</span><h3 id="commission-modal-title">Comisión comercial</h3><p>{commissionProduct.name}</p></div><button type="button" aria-label="Cerrar configuración de comisión" disabled={savingProductId !== null} onClick={() => setCommissionProduct(null)}>×</button></header>
          <div className="store-commission-modal__content">
            <label className="store-publication-toggle"><span><strong>Genera comisión</strong><small>La tarifa pertenece al producto y sus variantes la heredan.</small></span><input type="checkbox" checked={commissionEnabled} onChange={(event) => { setCommissionEnabled(event.target.checked); setCommissionError(""); if (!event.target.checked) setCommissionAmount(""); }} /></label>
            <label className="store-commission-field"><span>Comisión por unidad (COP) {commissionEnabled ? "*" : ""}</span><input autoFocus={commissionEnabled} type="number" min="1" step="1" inputMode="numeric" disabled={!commissionEnabled || savingProductId !== null} required={commissionEnabled} value={commissionAmount} aria-invalid={Boolean(commissionError)} onChange={(event) => { setCommissionAmount(event.target.value); setCommissionError(""); }} /><small>Monto fijo que recibe el colaborador por cada unidad vendida.</small></label>
            {commissionError ? <p className="store-commission-error" role="alert">{commissionError}</p> : null}
          </div>
          <footer className="store-publication-modal__footer"><button type="button" disabled={savingProductId !== null} onClick={() => setCommissionProduct(null)}>Cancelar</button><button className="is-primary" type="button" disabled={savingProductId !== null} onClick={() => void saveCommission()}>{savingProductId !== null ? "Guardando..." : "Guardar comisión"}</button></footer>
        </section>
      </div> : null}
    </section>
  );
};
