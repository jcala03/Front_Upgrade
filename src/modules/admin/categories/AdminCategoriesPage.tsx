import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createProductCategory,
  deleteProductCategory,
  getAdminProductCategories,
  updateProductCategory,
} from "../../../api/productCategories";
import type {
  ProductCategory,
  ProductCategoryFieldPayload,
  ProductCategoryFieldScope,
  ProductCategoryFieldType,
  ProductCategoryPayload,
} from "../../../types/productCategory";
import "./AdminCategoriesPage.css";

type AdminCategoriesPageProps = {
  embedded?: boolean;
};

type CategoryFilter = "all" | "active" | "inactive" | "with_filters";

type CategoryFormState = {
  name: string;
  description: string;
  is_active: boolean;
};

type CategoryFieldDraft = {
  id?: number;
  name: string;
  type: ProductCategoryFieldType;
  scope: ProductCategoryFieldScope;
  original_scope?: ProductCategoryFieldScope;
  options_text: string;
  is_required: boolean;
  is_active: boolean;
  is_filterable: boolean;
  filter_label: string;
  filter_unit: string;
  sort_order: number;
};

const emptyCategoryForm: CategoryFormState = {
  name: "",
  description: "",
  is_active: true,
};

const buildEmptyField = (sortOrder = 1): CategoryFieldDraft => ({
  name: "",
  type: "text",
  scope: "product",
  options_text: "",
  is_required: false,
  is_active: true,
  is_filterable: false,
  filter_label: "",
  filter_unit: "",
  sort_order: sortOrder,
});

const fieldTypeLabels: Record<ProductCategoryFieldType, string> = {
  text: "Texto",
  number: "Número",
  select: "Selector",
  boolean: "Sí / No",
};

const fieldScopeLabels: Record<ProductCategoryFieldScope, string> = {
  product: "Producto",
  variant: "Variante",
};

const getFieldScope = (
  scope: ProductCategoryFieldScope | undefined
): ProductCategoryFieldScope => (scope === "variant" ? "variant" : "product");

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const parseOptions = (value: string): string[] | null => {
  const options = value
    .split(/\n|,/)
    .map((option) => option.trim())
    .filter(Boolean);

  return options.length > 0 ? options : null;
};

const getFieldOptionsText = (options: string[] | null) => {
  return options?.join("\n") ?? "";
};

export const AdminCategoriesPage = ({
  embedded = false,
}: AdminCategoriesPageProps) => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ProductCategory | null>(null);
  const [categoryForm, setCategoryForm] =
    useState<CategoryFormState>(emptyCategoryForm);
  const [fields, setFields] = useState<CategoryFieldDraft[]>([
    buildEmptyField(),
  ]);

  const firstFieldNameInputRef = useRef<HTMLInputElement | null>(null);
  const [shouldFocusFirstField, setShouldFocusFirstField] = useState(false);

  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(
    null
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadCategories = async () => {
    try {
      setIsFetching(true);
      setError("");

      const response = await getAdminProductCategories();
      setCategories(response);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las categorías."
      );
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!shouldFocusFirstField || !isModalOpen) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      firstFieldNameInputRef.current?.focus();
      setShouldFocusFirstField(false);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [fields, isModalOpen, shouldFocusFirstField]);

  const stats = useMemo(() => {
    return {
      total: categories.length,
      active: categories.filter((category) => category.is_active).length,
      inactive: categories.filter((category) => !category.is_active).length,
      filterableFields: categories.reduce((total, category) => {
        return (
          total +
          category.fields.filter(
            (field) => field.is_filterable && field.is_active
          ).length
        );
      }, 0),
    };
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return categories.filter((category) => {
      const hasFilters = category.fields.some(
        (field) => field.is_filterable && field.is_active
      );

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && category.is_active) ||
        (filter === "inactive" && !category.is_active) ||
        (filter === "with_filters" && hasFilters);

      const searchableText = [
        category.name,
        category.description,
        category.fields.map((field) => field.name).join(" "),
        category.fields.map((field) => field.filter_label).join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return matchesFilter && searchableText.includes(normalizedSearch);
    });
  }, [categories, filter, search]);

  const resetForm = () => {
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
    setFields([buildEmptyField()]);
    setShouldFocusFirstField(false);
    setError("");
  };

  const openCreateModal = () => {
    resetForm();
    setMessage("");
    setIsModalOpen(true);
    setShouldFocusFirstField(true);
  };

  const openEditModal = (category: ProductCategory) => {
    const nextFields =
      category.fields.length > 0
        ? [...category.fields]
            .sort((first, second) => first.sort_order - second.sort_order)
            .map((field, index) => ({
              scope: getFieldScope(field.scope),
              original_scope: getFieldScope(field.scope),
              id: field.id,
              name: field.name,
              type: field.type,
              options_text: getFieldOptionsText(field.options),
              is_required: field.is_required,
              is_active: field.is_active,
              is_filterable: field.is_filterable,
              filter_label: field.filter_label ?? "",
              filter_unit: field.filter_unit ?? "",
              sort_order: index + 1,
            }))
        : [buildEmptyField()];

    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description ?? "",
      is_active: category.is_active,
    });
    setFields(nextFields);
    setShouldFocusFirstField(false);
    setError("");
    setMessage("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const updateCategoryForm = <Key extends keyof CategoryFormState>(
    key: Key,
    value: CategoryFormState[Key]
  ) => {
    setCategoryForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateField = <Key extends keyof CategoryFieldDraft>(
    index: number,
    key: Key,
    value: CategoryFieldDraft[Key]
  ) => {
    setFields((current) =>
      current.map((field, fieldIndex) => {
        if (fieldIndex !== index) {
          return field;
        }

        if (key === "type" && value !== "select") {
          return {
            ...field,
            [key]: value,
            options_text: "",
          };
        }

        if (key === "is_filterable" && value === false) {
          return {
            ...field,
            [key]: value,
            filter_label: "",
            filter_unit: "",
          };
        }

        return {
          ...field,
          [key]: value,
        };
      })
    );
  };

  const addField = () => {
    const firstField = fields[0];

    if (firstField && !firstField.name.trim()) {
      setShouldFocusFirstField(true);
      return;
    }

    setFields((current) => [
      buildEmptyField(1),
      ...current.map((field, index) => ({
        ...field,
        sort_order: index + 2,
      })),
    ]);

    setShouldFocusFirstField(true);
  };

  const removeField = (index: number) => {
    setFields((current) => {
      if (current.length === 1) {
        return [buildEmptyField()];
      }

      return current
        .filter((_, fieldIndex) => fieldIndex !== index)
        .map((field, fieldIndex) => ({
          ...field,
          sort_order: fieldIndex + 1,
        }));
    });
  };

  const buildPayload = (): ProductCategoryPayload => {
    const cleanFields: ProductCategoryFieldPayload[] = fields
      .filter((field) => field.name.trim())
      .map((field, index) => ({
        id: field.id,
        name: field.name.trim(),
        type: field.type,
        scope: field.scope,
        options:
          field.type === "select" ? parseOptions(field.options_text) : null,
        is_required: field.is_required,
        is_active: field.is_active,
        is_filterable: field.is_filterable,
        filter_label: field.is_filterable
          ? field.filter_label.trim() || field.name.trim()
          : null,
        filter_unit: field.is_filterable
          ? field.filter_unit.trim() || null
          : null,
        sort_order: index + 1,
      }));

    return {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim() || null,
      is_active: categoryForm.is_active,
      fields: cleanFields,
    };
  };

  const validateForm = () => {
    if (!categoryForm.name.trim()) {
      return "El nombre de la categoría es obligatorio.";
    }

    const invalidSelectField = fields.find((field) => {
      if (!field.name.trim() || field.type !== "select") {
        return false;
      }

      return !parseOptions(field.options_text);
    });

    if (invalidSelectField) {
      return `El campo "${invalidSelectField.name}" es selector y necesita opciones.`;
    }

    const invalidScopeField = fields.find(
      (field) =>
        field.name.trim() &&
        field.scope !== "product" &&
        field.scope !== "variant"
    );

    if (invalidScopeField) {
      return `Selecciona dónde aplica el campo "${invalidScopeField.name}".`;
    }

    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setMessage("");

      const payload = buildPayload();

      if (editingCategory) {
        await updateProductCategory(editingCategory.id, payload);
        setMessage("Categoría actualizada correctamente.");
      } else {
        await createProductCategory(payload);
        setMessage("Categoría creada correctamente.");
      }

      closeModal();
      await loadCategories();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la categoría."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category: ProductCategory) => {
    const shouldDelete = window.confirm(
      `¿Seguro que quieres eliminar la categoría "${category.name}"?\n\nSi no tiene artículos, se eliminará definitivamente.\nSi ya tiene artículos asociados, solo se desactivará para proteger el inventario y el catálogo publicado.`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingCategoryId(category.id);
      setError("");
      setMessage("");

      const result = await deleteProductCategory(category.id);

      setMessage(result.message);
      await loadCategories();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la categoría."
      );
    } finally {
      setDeletingCategoryId(null);
    }
  };

  return (
    <section className="admin-categories">
      {!embedded ? (
        <section className="categories-hero">
          <div>
            <span>Configuración de inventario</span>
            <h2>Categorías de artículos</h2>
            <p>
              Organiza los artículos y define los datos técnicos que se
              solicitarán al registrarlos en Inventario.
            </p>
          </div>

          <button type="button" onClick={openCreateModal}>
            Crear categoría
          </button>
        </section>
      ) : null}

      <section className="categories-stats">
        <article>
          <span>Total categorías</span>
          <strong>{stats.total}</strong>
          <small>Configuradas en el CRM</small>
        </article>

        <article className="is-success">
          <span>Activas</span>
          <strong>{stats.active}</strong>
          <small>Disponibles en Inventario</small>
        </article>

        <article className="is-warning">
          <span>Inactivas</span>
          <strong>{stats.inactive}</strong>
          <small>Ocultas para nuevos artículos</small>
        </article>

        <article className="is-filter">
          <span>Filtros técnicos</span>
          <strong>{stats.filterableFields}</strong>
          <small>Campos disponibles para ecommerce</small>
        </article>
      </section>

      <section className="categories-panel">
        <div className="categories-panel__header">
          <div>
            <span>Configuración de categorías</span>
            <h3>Categorías registradas</h3>
          </div>

          <div className="categories-panel__tools">
            <input
              type="search"
              placeholder="Buscar categoría o campo técnico..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as CategoryFilter)
              }
            >
              <option value="all">Todas</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
              <option value="with_filters">Con filtros</option>
            </select>

            {embedded ? (
              <button type="button" onClick={openCreateModal}>
                Crear categoría
              </button>
            ) : null}
          </div>
        </div>

        {message ? (
          <p className="categories-message is-success">{message}</p>
        ) : null}

        {error && !isModalOpen ? (
          <p className="categories-message is-error">{error}</p>
        ) : null}

        {isFetching ? (
          <p className="categories-empty">Cargando categorías...</p>
        ) : filteredCategories.length > 0 ? (
          <div className="categories-table-wrap">
            <table className="categories-table">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Campos técnicos</th>
                  <th>Filtros ecommerce</th>
                  <th>Actualización</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredCategories.map((category) => {
                  const activeFields = category.fields.filter(
                    (field) => field.is_active
                  );
                  const filterableFields = category.fields.filter(
                    (field) => field.is_active && field.is_filterable
                  );

                  return (
                    <tr key={category.id}>
                      <td data-label="Categoría">
                        <strong>{category.name}</strong>
                        <small>
                          {category.description || "Sin descripción"}
                        </small>
                      </td>

                      <td data-label="Estado">
                        <span
                          className={
                            category.is_active
                              ? "categories-status is-active"
                              : "categories-status"
                          }
                        >
                          {category.is_active ? "Activa" : "Inactiva"}
                        </span>
                      </td>

                      <td data-label="Campos técnicos">
                        {activeFields.length > 0 ? (
                          <div className="categories-chips">
                            {activeFields.slice(0, 4).map((field) => (
                              <span key={field.id}>
                                {field.name}
                                <small>
                                  {fieldTypeLabels[field.type]}
                                  <b className="categories-field-scope">
                                    {fieldScopeLabels[getFieldScope(field.scope)]}
                                  </b>
                                </small>
                              </span>
                            ))}

                            {activeFields.length > 4 ? (
                              <em>+{activeFields.length - 4}</em>
                            ) : null}
                          </div>
                        ) : (
                          <small>Sin campos técnicos</small>
                        )}
                      </td>

                      <td data-label="Filtros ecommerce">
                        {filterableFields.length > 0 ? (
                          <div className="categories-chips is-filter">
                            {filterableFields.slice(0, 4).map((field) => (
                              <span key={field.id}>
                                {field.filter_label || field.name}

                                {field.filter_unit ? (
                                  <small>{field.filter_unit}</small>
                                ) : null}
                              </span>
                            ))}

                            {filterableFields.length > 4 ? (
                              <em>+{filterableFields.length - 4}</em>
                            ) : null}
                          </div>
                        ) : (
                          <small>Sin filtros</small>
                        )}
                      </td>

                      <td data-label="Actualización">
                        {formatDate(category.updated_at)}
                      </td>

                      <td data-label="Acciones">
                        <div className="categories-actions">
                          <button
                            type="button"
                            onClick={() => openEditModal(category)}
                          >
                            Editar
                          </button>

                          <button
                            className="is-danger"
                            type="button"
                            disabled={deletingCategoryId === category.id}
                            onClick={() => handleDelete(category)}
                          >
                            {deletingCategoryId === category.id
                              ? "Eliminando..."
                              : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="categories-empty">
            <p>No hay categorías para mostrar con estos filtros.</p>

            <button type="button" onClick={openCreateModal}>
              Crear primera categoría
            </button>
          </div>
        )}
      </section>

      {isModalOpen ? (
        <div className="category-modal" role="dialog" aria-modal="true">
          <button
            className="category-modal__backdrop"
            type="button"
            aria-label="Cerrar formulario"
            onClick={closeModal}
          />

          <div className="category-modal__panel">
            <div className="category-modal__header">
              <div>
                <span>Categoría de artículos</span>

                <h2>
                  {editingCategory
                    ? "Editar categoría"
                    : "Crear categoría"}
                </h2>

                <p>
                  Configura los datos técnicos que se solicitarán al registrar
                  artículos de esta categoría.
                </p>
              </div>

              <button type="button" onClick={closeModal}>
                Cerrar
              </button>
            </div>

            <form className="category-form" onSubmit={handleSubmit}>
              <div className="category-form__section">
                <span>Información base</span>

                <div className="category-form__grid">
                  <label className="category-form__field">
                    <span>Nombre *</span>

                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(event) =>
                        updateCategoryForm("name", event.target.value)
                      }
                      placeholder="Ej: Radios, Bodykits, Luces"
                      required
                    />
                  </label>

                  <label className="category-form__check">
                    <input
                      type="checkbox"
                      checked={categoryForm.is_active}
                      onChange={(event) =>
                        updateCategoryForm(
                          "is_active",
                          event.target.checked
                        )
                      }
                    />

                    <span>Categoría activa</span>
                  </label>
                </div>

                <label className="category-form__field">
                  <span>Descripción</span>

                  <textarea
                    rows={3}
                    value={categoryForm.description}
                    onChange={(event) =>
                      updateCategoryForm(
                        "description",
                        event.target.value
                      )
                    }
                    placeholder="Descripción interna para el equipo."
                  />
                </label>

                <p className="category-form__note">
                  Las marcas, modelos, generaciones, años y sistemas
                  multimedia se administran desde Compatibilidad vehicular.
                </p>
              </div>

              <div className="category-form__section">
                <div className="category-form__section-header">
                  <div>
                    <span>Campos técnicos</span>

                    <p>
                      Estos campos aparecerán al registrar artículos de esta
                      categoría en Inventario.
                    </p>
                  </div>

                  <button type="button" onClick={addField}>
                    Agregar campo
                  </button>
                </div>

                <div className="category-fields-builder">
                  {fields.map((field, index) => (
                    <div className="category-field-row" key={index}>
                      <div className="category-field-row__header">
                        <strong>Campo #{index + 1}</strong>

                        <span className="category-field-row__scope">
                          Aplica a: {fieldScopeLabels[field.scope]}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeField(index)}
                        >
                          Quitar
                        </button>
                      </div>

                      <div className="category-form__grid">
                        <label className="category-form__field">
                          <span>Nombre del campo</span>

                          <input
                            ref={
                              index === 0
                                ? firstFieldNameInputRef
                                : undefined
                            }
                            type="text"
                            value={field.name}
                            onChange={(event) =>
                              updateField(
                                index,
                                "name",
                                event.target.value
                              )
                            }
                            placeholder="Ej: RAM, Material, CarPlay"
                            autoComplete="off"
                          />
                        </label>

                        <label className="category-form__field">
                          <span>Tipo</span>

                          <select
                            value={field.type}
                            onChange={(event) =>
                              updateField(
                                index,
                                "type",
                                event.target
                                  .value as ProductCategoryFieldType
                              )
                            }
                          >
                            <option value="text">Texto</option>
                            <option value="number">Número</option>
                            <option value="select">Selector</option>
                            <option value="boolean">Sí / No</option>
                          </select>
                        </label>

                        <label className="category-form__field category-form__field--scope">
                          <span>Aplica a *</span>

                          <select
                            value={field.scope}
                            onChange={(event) =>
                              updateField(
                                index,
                                "scope",
                                event.target.value as ProductCategoryFieldScope
                              )
                            }
                            aria-describedby={`category-field-scope-help-${index}`}
                            required
                          >
                            <option value="product">Producto</option>
                            <option value="variant">Variante</option>
                          </select>

                          <small
                            className="category-form__scope-help"
                            id={`category-field-scope-help-${index}`}
                          >
                            {field.scope === "variant"
                              ? "El valor podrá cambiar entre versiones del producto."
                              : "El valor será común para todo el artículo."}
                          </small>
                        </label>
                      </div>

                      {field.id &&
                      field.original_scope &&
                      field.scope !== field.original_scope ? (
                        <p className="category-form__scope-warning" role="status">
                          Este cambio modifica dónde se utiliza el campo. Los
                          valores guardados anteriormente no se migrarán
                          automáticamente.
                        </p>
                      ) : null}

                      {field.type === "select" ? (
                        <label className="category-form__field">
                          <span>Opciones</span>

                          <textarea
                            rows={4}
                            value={field.options_text}
                            onChange={(event) =>
                              updateField(
                                index,
                                "options_text",
                                event.target.value
                              )
                            }
                            placeholder={
                              "Una por línea o separadas por coma\n2GB\n4GB\n8GB"
                            }
                          />
                        </label>
                      ) : null}

                      <div className="category-form__checks">
                        <label className="category-form__check">
                          <input
                            type="checkbox"
                            checked={field.is_required}
                            onChange={(event) =>
                              updateField(
                                index,
                                "is_required",
                                event.target.checked
                              )
                            }
                          />

                          <span>Obligatorio</span>
                        </label>

                        <label className="category-form__check">
                          <input
                            type="checkbox"
                            checked={field.is_active}
                            onChange={(event) =>
                              updateField(
                                index,
                                "is_active",
                                event.target.checked
                              )
                            }
                          />

                          <span>Activo</span>
                        </label>

                        <label className="category-form__check">
                          <input
                            type="checkbox"
                            checked={field.is_filterable}
                            onChange={(event) =>
                              updateField(
                                index,
                                "is_filterable",
                                event.target.checked
                              )
                            }
                          />

                          <span>Usar como filtro</span>
                        </label>
                      </div>

                      {field.is_filterable ? (
                        <div className="category-form__grid">
                          <label className="category-form__field">
                            <span>Etiqueta del filtro</span>

                            <input
                              type="text"
                              value={field.filter_label}
                              onChange={(event) =>
                                updateField(
                                  index,
                                  "filter_label",
                                  event.target.value
                                )
                              }
                              placeholder="Ej: Memoria RAM"
                            />
                          </label>

                          <label className="category-form__field">
                            <span>Unidad</span>

                            <input
                              type="text"
                              value={field.filter_unit}
                              onChange={(event) =>
                                updateField(
                                  index,
                                  "filter_unit",
                                  event.target.value
                                )
                              }
                              placeholder="Ej: GB, pulgadas, cm"
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {error ? (
                <p className="categories-message is-error">{error}</p>
              ) : null}

              <div className="category-form__actions">
                <button type="submit" disabled={isSaving}>
                  {isSaving
                    ? "Guardando..."
                    : editingCategory
                      ? "Actualizar categoría"
                      : "Crear categoría"}
                </button>

                <button type="button" onClick={closeModal}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
};
