import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createProductBrand,
  deleteProductBrand,
  getAdminProductBrands,
  updateProductBrand,
} from "../../../api/productBrands";
import {
  createVehicleBrand,
  createVehicleModel,
  createVehicleMultimediaSystem,
  createVehicleVersion,
  deleteVehicleBrand,
  deleteVehicleModel,
  deleteVehicleMultimediaSystem,
  deleteVehicleVersion,
  getAdminVehicleBrands,
  getAdminVehicleModels,
  getAdminVehicleMultimediaSystems,
  getAdminVehicleVersions,
  syncVehicleVersionMultimediaSystems,
  updateVehicleBrand,
  updateVehicleModel,
  updateVehicleMultimediaSystem,
  updateVehicleVersion,
} from "../../../api/vehicles";
import type { ProductBrand } from "../../../types/productBrand";
import type {
  VehicleBrand,
  VehicleModel,
  VehicleMultimediaSystem,
  VehicleVersion,
  VehicleVersionMultimediaSystemSyncItem,
} from "../../../types/vehicle";
import "./AdminReferencesPage.css";

export type AdminReferencesScope =
  | "all"
  | "product_brands"
  | "vehicle_compatibility";

type AdminReferencesPageProps = {
  scope?: AdminReferencesScope;
  embedded?: boolean;
};

type ReferenceSection = "product_brands" | "vehicle_compatibility";

type ReferenceTab =
  | "product_brands"
  | "vehicle_brands"
  | "vehicle_models"
  | "vehicle_versions"
  | "multimedia_systems";

type ReferenceTabDefinition = {
  value: ReferenceTab;
  label: string;
  description: string;
  singularLabel: string;
  createLabel: string;
  searchPlaceholder: string;
  section: ReferenceSection;
};

type BaseFormState = {
  name: string;
  description: string;
  is_active: boolean;
};

type VehicleModelFormState = BaseFormState & {
  vehicle_brand_id: string;
};

type VehicleVersionFormState = {
  vehicle_model_id: string;
  name: string;
  year_from: string;
  year_to: string;
  description: string;
  is_active: boolean;
};

type MultimediaSystemFormState = BaseFormState & {
  vehicle_brand_id: string;
  code: string;
};

type VersionOemSelection = {
  selected: boolean;
  adjust_years: boolean;
  year_from: string;
  year_to: string;
};

type VersionOemSelections = Record<number, VersionOemSelection>;
type VersionOemErrors = Record<number, string>;

const emptyBaseForm: BaseFormState = {
  name: "",
  description: "",
  is_active: true,
};

const emptyVehicleModelForm: VehicleModelFormState = {
  vehicle_brand_id: "",
  name: "",
  description: "",
  is_active: true,
};

const emptyVehicleVersionForm: VehicleVersionFormState = {
  vehicle_model_id: "",
  name: "",
  year_from: "",
  year_to: "",
  description: "",
  is_active: true,
};

const emptyMultimediaSystemForm: MultimediaSystemFormState = {
  vehicle_brand_id: "",
  name: "",
  code: "",
  description: "",
  is_active: true,
};

const buildEmptyOemSelection = (): VersionOemSelection => ({
  selected: false,
  adjust_years: false,
  year_from: "",
  year_to: "",
});

const tabDefinitions: ReferenceTabDefinition[] = [
  {
    value: "product_brands",
    label: "Marcas de artículos",
    description: "Pioneer, Sony, Alpine, Kenwood, Brembo...",
    singularLabel: "marca de artículo",
    createLabel: "Nueva marca de artículo",
    searchPlaceholder: "Buscar marca de artículo...",
    section: "product_brands",
  },
  {
    value: "vehicle_brands",
    label: "Marcas de vehículos",
    description: "BMW, Audi, Mercedes-Benz, Porsche...",
    singularLabel: "marca de vehículo",
    createLabel: "Nueva marca de vehículo",
    searchPlaceholder: "Buscar marca de vehículo...",
    section: "vehicle_compatibility",
  },
  {
    value: "vehicle_models",
    label: "Modelos",
    description: "M3, X5, A4, Q5, Cayenne...",
    singularLabel: "modelo",
    createLabel: "Nuevo modelo",
    searchPlaceholder: "Buscar modelo o marca...",
    section: "vehicle_compatibility",
  },
  {
    value: "vehicle_versions",
    label: "Generaciones y años",
    description: "F80 2014–2020, G80 2021 en adelante...",
    singularLabel: "generación",
    createLabel: "Nueva generación",
    searchPlaceholder: "Buscar generación, modelo o año...",
    section: "vehicle_compatibility",
  },
  {
    value: "multimedia_systems",
    label: "Sistemas multimedia",
    description: "NBT, CIC, MMI, MIB, NTG...",
    singularLabel: "sistema multimedia",
    createLabel: "Nuevo sistema multimedia",
    searchPlaceholder: "Buscar sistema multimedia...",
    section: "vehicle_compatibility",
  },
];

const getInitialSection = (
  scope: AdminReferencesScope
): ReferenceSection => {
  return scope === "vehicle_compatibility"
    ? "vehicle_compatibility"
    : "product_brands";
};

const getInitialTab = (scope: AdminReferencesScope): ReferenceTab => {
  return scope === "vehicle_compatibility"
    ? "vehicle_brands"
    : "product_brands";
};

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const capitalizeFirstLetter = (value: string) => {
  if (!value) {
    return value;
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
};

export const AdminReferencesPage = ({
  scope = "all",
  embedded = false,
}: AdminReferencesPageProps) => {
  const [activeSection, setActiveSection] = useState<ReferenceSection>(
    getInitialSection(scope)
  );
  const [activeTab, setActiveTab] = useState<ReferenceTab>(
    getInitialTab(scope)
  );

  const [productBrands, setProductBrands] = useState<ProductBrand[]>([]);
  const [vehicleBrands, setVehicleBrands] = useState<VehicleBrand[]>([]);
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);
  const [vehicleVersions, setVehicleVersions] = useState<VehicleVersion[]>([]);
  const [multimediaSystems, setMultimediaSystems] = useState<
    VehicleMultimediaSystem[]
  >([]);

  const [search, setSearch] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [baseForm, setBaseForm] = useState<BaseFormState>(emptyBaseForm);
  const [vehicleModelForm, setVehicleModelForm] =
    useState<VehicleModelFormState>(emptyVehicleModelForm);
  const [vehicleVersionForm, setVehicleVersionForm] =
    useState<VehicleVersionFormState>(emptyVehicleVersionForm);
  const [multimediaSystemForm, setMultimediaSystemForm] =
    useState<MultimediaSystemFormState>(emptyMultimediaSystemForm);
  const [versionOemSelections, setVersionOemSelections] =
    useState<VersionOemSelections>({});
  const [versionOemErrors, setVersionOemErrors] =
    useState<VersionOemErrors>({});

  const selectedVersionModel = useMemo(
    () =>
      vehicleModels.find(
        (model) => String(model.id) === vehicleVersionForm.vehicle_model_id
      ) ?? null,
    [vehicleModels, vehicleVersionForm.vehicle_model_id]
  );

  const availableVersionOemSystems = useMemo(() => {
    if (!selectedVersionModel) {
      return [];
    }

    return multimediaSystems.filter(
      (system) =>
        system.vehicle_brand_id === selectedVersionModel.vehicle_brand_id &&
        (system.is_active || versionOemSelections[system.id]?.selected)
    );
  }, [multimediaSystems, selectedVersionModel, versionOemSelections]);

  const visibleTabs = useMemo(() => {
    if (scope === "product_brands") {
      return tabDefinitions.filter(
        (tab) => tab.section === "product_brands"
      );
    }

    if (scope === "vehicle_compatibility") {
      return tabDefinitions.filter(
        (tab) => tab.section === "vehicle_compatibility"
      );
    }

    return tabDefinitions.filter((tab) => tab.section === activeSection);
  }, [activeSection, scope]);

  const activeTabInfo =
    tabDefinitions.find((tab) => tab.value === activeTab) ??
    tabDefinitions[0];

  const pageContent = useMemo(() => {
    if (scope === "product_brands") {
      return {
        eyebrow: "Configuración comercial",
        title: "Marcas de artículos",
        description:
          "Administra las marcas comerciales que pueden asignarse a los artículos del inventario.",
      };
    }

    if (scope === "vehicle_compatibility") {
      return {
        eyebrow: "Configuración vehicular",
        title: "Compatibilidad vehicular",
        description:
          "Administra marcas, modelos, generaciones, años y sistemas multimedia para relacionarlos con los artículos.",
      };
    }

    return {
      eyebrow: "Listas de configuración",
      title: "Configuración comercial y vehicular",
      description:
        "Mantén organizadas las marcas de artículos y los datos utilizados para definir compatibilidad vehicular.",
    };
  }, [scope]);

  useEffect(() => {
    const nextSection = getInitialSection(scope);
    const nextTab = getInitialTab(scope);

    setActiveSection(nextSection);
    setActiveTab(nextTab);
    setSearch("");
    setMessage("");
    setError("");
  }, [scope]);

  useEffect(() => {
    const activeTabIsVisible = visibleTabs.some(
      (tab) => tab.value === activeTab
    );

    if (!activeTabIsVisible && visibleTabs[0]) {
      setActiveTab(visibleTabs[0].value);
    }
  }, [activeTab, visibleTabs]);

  const loadReferences = async () => {
    try {
      setIsFetching(true);
      setError("");

      const [
        productBrandsResponse,
        vehicleBrandsResponse,
        vehicleModelsResponse,
        vehicleVersionsResponse,
        multimediaSystemsResponse,
      ] = await Promise.all([
        getAdminProductBrands(),
        getAdminVehicleBrands(),
        getAdminVehicleModels(),
        getAdminVehicleVersions(),
        getAdminVehicleMultimediaSystems(),
      ]);

      setProductBrands(productBrandsResponse);
      setVehicleBrands(vehicleBrandsResponse);
      setVehicleModels(vehicleModelsResponse);
      setVehicleVersions(vehicleVersionsResponse);
      setMultimediaSystems(multimediaSystemsResponse);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la configuración."
      );
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    void loadReferences();
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

  const filteredProductBrands = useMemo(() => {
    const term = search.trim().toLowerCase();

    return productBrands.filter((brand) =>
      [brand.name, brand.description]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [productBrands, search]);

  const filteredVehicleBrands = useMemo(() => {
    const term = search.trim().toLowerCase();

    return vehicleBrands.filter((brand) =>
      [brand.name, brand.description]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [vehicleBrands, search]);

  const filteredVehicleModels = useMemo(() => {
    const term = search.trim().toLowerCase();

    return vehicleModels.filter((model) =>
      [
        model.name,
        model.description,
        model.brand?.name,
        vehicleBrands.find(
          (brand) => brand.id === model.vehicle_brand_id
        )?.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [vehicleModels, vehicleBrands, search]);

  const filteredVehicleVersions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return vehicleVersions.filter((version) =>
      [
        version.name,
        version.description,
        version.display_name,
        version.year_from,
        version.year_to,
        version.model?.name,
        vehicleModels.find(
          (model) => model.id === version.vehicle_model_id
        )?.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [vehicleVersions, vehicleModels, search]);

  const filteredMultimediaSystems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return multimediaSystems.filter((system) =>
      [
        system.name,
        system.code,
        system.description,
        system.vehicle_brand?.name,
        vehicleBrands.find(
          (brand) => brand.id === system.vehicle_brand_id
        )?.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [multimediaSystems, vehicleBrands, search]);

  const resetForms = () => {
    setEditingId(null);
    setBaseForm(emptyBaseForm);
    setVehicleModelForm(emptyVehicleModelForm);
    setVehicleVersionForm(emptyVehicleVersionForm);
    setMultimediaSystemForm(emptyMultimediaSystemForm);
    setVersionOemSelections({});
    setVersionOemErrors({});
    setError("");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForms();
  };

  const openCreateModal = () => {
    resetForms();
    setMessage("");
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (id: number) => {
    resetForms();
    setMessage("");
    setError("");
    setEditingId(id);

    if (activeTab === "product_brands") {
      const brand = productBrands.find((item) => item.id === id);

      if (brand) {
        setBaseForm({
          name: brand.name,
          description: brand.description ?? "",
          is_active: brand.is_active,
        });
      }
    }

    if (activeTab === "vehicle_brands") {
      const brand = vehicleBrands.find((item) => item.id === id);

      if (brand) {
        setBaseForm({
          name: brand.name,
          description: brand.description ?? "",
          is_active: brand.is_active,
        });
      }
    }

    if (activeTab === "vehicle_models") {
      const model = vehicleModels.find((item) => item.id === id);

      if (model) {
        setVehicleModelForm({
          vehicle_brand_id: String(model.vehicle_brand_id),
          name: model.name,
          description: model.description ?? "",
          is_active: model.is_active,
        });
      }
    }

    if (activeTab === "vehicle_versions") {
      const version = vehicleVersions.find((item) => item.id === id);

      if (version) {
        setVehicleVersionForm({
          vehicle_model_id: String(version.vehicle_model_id),
          name: version.name ?? "",
          year_from: String(version.year_from),
          year_to: version.year_to ? String(version.year_to) : "",
          description: version.description ?? "",
          is_active: version.is_active,
        });

        setVersionOemSelections(
          Object.fromEntries(
            (version.multimedia_systems ?? []).map((system) => {
              const yearFrom = system.pivot?.year_from ?? null;
              const yearTo = system.pivot?.year_to ?? null;

              return [
                system.id,
                {
                  selected: true,
                  adjust_years: yearFrom !== null || yearTo !== null,
                  year_from: yearFrom !== null ? String(yearFrom) : "",
                  year_to: yearTo !== null ? String(yearTo) : "",
                },
              ];
            })
          )
        );
      }
    }

    if (activeTab === "multimedia_systems") {
      const system = multimediaSystems.find((item) => item.id === id);

      if (system) {
        setMultimediaSystemForm({
          vehicle_brand_id: String(system.vehicle_brand_id),
          name: system.name,
          code: system.code ?? "",
          description: system.description ?? "",
          is_active: system.is_active,
        });
      }
    }

    setIsModalOpen(true);
  };

  const changeSection = (section: ReferenceSection) => {
    setActiveSection(section);
    setActiveTab(
      section === "product_brands"
        ? "product_brands"
        : "vehicle_brands"
    );
    setSearch("");
    setMessage("");
    setError("");
  };

  const changeTab = (tab: ReferenceTab) => {
    setActiveTab(tab);
    setSearch("");
    setMessage("");
    setError("");
  };

  const updateOemSelection = (
    systemId: number,
    updates: Partial<VersionOemSelection>
  ) => {
    setVersionOemSelections((current) => ({
      ...current,
      [systemId]: {
        ...(current[systemId] ?? buildEmptyOemSelection()),
        ...updates,
      },
    }));

    setVersionOemErrors((current) => {
      if (!current[systemId]) {
        return current;
      }

      const next = { ...current };
      delete next[systemId];
      return next;
    });
  };

  const toggleOemYears = (systemId: number) => {
    const current =
      versionOemSelections[systemId] ?? buildEmptyOemSelection();
    const shouldAdjustYears = !current.adjust_years;

    updateOemSelection(systemId, {
      adjust_years: shouldAdjustYears,
      year_from: shouldAdjustYears ? current.year_from : "",
      year_to: shouldAdjustYears ? current.year_to : "",
    });
  };

  const validateOemSelections = () => {
    const yearFrom = Number(vehicleVersionForm.year_from);
    const yearTo = vehicleVersionForm.year_to
      ? Number(vehicleVersionForm.year_to)
      : null;
    const nextErrors: VersionOemErrors = {};

    availableVersionOemSystems.forEach((system) => {
      const selection = versionOemSelections[system.id];

      if (!selection?.selected || !selection.adjust_years) {
        return;
      }

      const customFrom = selection.year_from
        ? Number(selection.year_from)
        : null;
      const customTo = selection.year_to ? Number(selection.year_to) : null;

      if (customFrom !== null && customFrom < yearFrom) {
        nextErrors[system.id] = `El año inicial no puede ser menor a ${yearFrom}.`;
        return;
      }

      if (yearTo !== null && customFrom !== null && customFrom > yearTo) {
        nextErrors[system.id] = `El año inicial no puede superar ${yearTo}.`;
        return;
      }

      if (customTo !== null && customTo < yearFrom) {
        nextErrors[system.id] = `El año final no puede ser menor a ${yearFrom}.`;
        return;
      }

      if (yearTo !== null && customTo !== null && customTo > yearTo) {
        nextErrors[system.id] = `El año final no puede superar ${yearTo}.`;
        return;
      }

      if (
        customFrom !== null &&
        customTo !== null &&
        customFrom > customTo
      ) {
        nextErrors[system.id] =
          "El año inicial no puede superar el año final.";
      }
    });

    setVersionOemErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildOemSyncItems = (): VehicleVersionMultimediaSystemSyncItem[] =>
    availableVersionOemSystems.flatMap((system) => {
      const selection = versionOemSelections[system.id];

      if (!selection?.selected) {
        return [];
      }

      return [
        {
          vehicle_multimedia_system_id: system.id,
          year_from:
            selection.adjust_years && selection.year_from
              ? Number(selection.year_from)
              : null,
          year_to:
            selection.adjust_years && selection.year_to
              ? Number(selection.year_to)
              : null,
        },
      ];
    });

  const validateCurrentForm = () => {
    if (
      (activeTab === "product_brands" ||
        activeTab === "vehicle_brands") &&
      !baseForm.name.trim()
    ) {
      return "El nombre es obligatorio.";
    }

    if (activeTab === "vehicle_models") {
      if (!vehicleModelForm.vehicle_brand_id) {
        return "Selecciona la marca del vehículo.";
      }

      if (!vehicleModelForm.name.trim()) {
        return "El nombre del modelo es obligatorio.";
      }
    }

    if (activeTab === "vehicle_versions") {
      if (!vehicleVersionForm.vehicle_model_id) {
        return "Selecciona el modelo del vehículo.";
      }

      if (!vehicleVersionForm.year_from.trim()) {
        return "Indica el año inicial de la generación.";
      }

      const yearFrom = Number(vehicleVersionForm.year_from);
      const yearTo = vehicleVersionForm.year_to
        ? Number(vehicleVersionForm.year_to)
        : null;

      if (yearTo !== null && yearTo < yearFrom) {
        return "El año final no puede ser menor que el año inicial.";
      }

      if (!validateOemSelections()) {
        return "Revisa los rangos configurados para los sistemas multimedia.";
      }
    }

    if (activeTab === "multimedia_systems") {
      if (!multimediaSystemForm.vehicle_brand_id) {
        return "Selecciona la marca del vehículo.";
      }

      if (!multimediaSystemForm.name.trim()) {
        return "El nombre del sistema multimedia es obligatorio.";
      }
    }

    return "";
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const validationError = validateCurrentForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setMessage("");

      if (activeTab === "product_brands") {
        const payload = {
          name: baseForm.name.trim(),
          description: baseForm.description.trim() || null,
          is_active: baseForm.is_active,
        };

        if (editingId) {
          await updateProductBrand(editingId, payload);
          setMessage(
            "Marca de artículo actualizada correctamente."
          );
        } else {
          await createProductBrand(payload);
          setMessage("Marca de artículo creada correctamente.");
        }
      }

      if (activeTab === "vehicle_brands") {
        const payload = {
          name: baseForm.name.trim(),
          description: baseForm.description.trim() || null,
          is_active: baseForm.is_active,
        };

        if (editingId) {
          await updateVehicleBrand(editingId, payload);
          setMessage(
            "Marca de vehículo actualizada correctamente."
          );
        } else {
          await createVehicleBrand(payload);
          setMessage("Marca de vehículo creada correctamente.");
        }
      }

      if (activeTab === "vehicle_models") {
        const payload = {
          vehicle_brand_id: Number(
            vehicleModelForm.vehicle_brand_id
          ),
          name: vehicleModelForm.name.trim(),
          description:
            vehicleModelForm.description.trim() || null,
          is_active: vehicleModelForm.is_active,
        };

        if (editingId) {
          await updateVehicleModel(editingId, payload);
          setMessage("Modelo actualizado correctamente.");
        } else {
          await createVehicleModel(payload);
          setMessage("Modelo creado correctamente.");
        }
      }

      if (activeTab === "vehicle_versions") {
        const payload = {
          vehicle_model_id: Number(
            vehicleVersionForm.vehicle_model_id
          ),
          name: vehicleVersionForm.name.trim() || null,
          year_from: Number(vehicleVersionForm.year_from),
          year_to: vehicleVersionForm.year_to
            ? Number(vehicleVersionForm.year_to)
            : null,
          description:
            vehicleVersionForm.description.trim() || null,
          is_active: vehicleVersionForm.is_active,
        };

        const wasEditingVersion = editingId !== null;
        const savedVersion = editingId
          ? await updateVehicleVersion(editingId, payload)
          : await createVehicleVersion(payload);

        if (!wasEditingVersion) {
          setEditingId(savedVersion.id);
        }

        try {
          await syncVehicleVersionMultimediaSystems(savedVersion.id, {
            multimedia_systems: buildOemSyncItems(),
          });
        } catch (syncError) {
          await loadReferences();
          setMessage("Los datos generales de la versión sí fueron guardados.");
          setError(
            syncError instanceof Error
              ? `La versión se guardó, pero no fue posible actualizar sus sistemas multimedia. ${syncError.message}`
              : "La versión se guardó, pero no fue posible actualizar sus sistemas multimedia."
          );
          return;
        }

        setMessage(
          wasEditingVersion
            ? "Generación y sistemas multimedia actualizados correctamente."
            : "Generación y sistemas multimedia creados correctamente."
        );
      }

      if (activeTab === "multimedia_systems") {
        const payload = {
          vehicle_brand_id: Number(
            multimediaSystemForm.vehicle_brand_id
          ),
          name: multimediaSystemForm.name.trim(),
          code: multimediaSystemForm.code.trim() || null,
          description:
            multimediaSystemForm.description.trim() || null,
          is_active: multimediaSystemForm.is_active,
        };

        if (editingId) {
          await updateVehicleMultimediaSystem(
            editingId,
            payload
          );
          setMessage(
            "Sistema multimedia actualizado correctamente."
          );
        } else {
          await createVehicleMultimediaSystem(payload);
          setMessage(
            "Sistema multimedia creado correctamente."
          );
        }
      }

      closeModal();
      await loadReferences();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la configuración."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number, label: string) => {
    const shouldDelete = window.confirm(
      `¿Seguro que quieres eliminar "${label}"?`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingId(id);
      setError("");
      setMessage("");

      if (activeTab === "product_brands") {
        await deleteProductBrand(id);
        setMessage(
          "Marca de artículo eliminada correctamente."
        );
      }

      if (activeTab === "vehicle_brands") {
        await deleteVehicleBrand(id);
        setMessage(
          "Marca de vehículo eliminada correctamente."
        );
      }

      if (activeTab === "vehicle_models") {
        await deleteVehicleModel(id);
        setMessage("Modelo eliminado correctamente.");
      }

      if (activeTab === "vehicle_versions") {
        await deleteVehicleVersion(id);
        setMessage("Generación eliminada correctamente.");
      }

      if (activeTab === "multimedia_systems") {
        await deleteVehicleMultimediaSystem(id);
        setMessage(
          "Sistema multimedia eliminado correctamente."
        );
      }

      await loadReferences();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el registro."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const getVehicleBrandName = (vehicleBrandId: number) => {
    return (
      vehicleBrands.find(
        (brand) => brand.id === vehicleBrandId
      )?.name ?? "Sin marca"
    );
  };

  const getVehicleModelName = (vehicleModelId: number) => {
    return (
      vehicleModels.find(
        (model) => model.id === vehicleModelId
      )?.name ?? "Sin modelo"
    );
  };

  const renderStatus = (isActive: boolean) => (
    <span
      className={
        isActive
          ? "references-status is-active"
          : "references-status"
      }
    >
      {isActive ? "Activo" : "Inactivo"}
    </span>
  );

  const renderActions = (id: number, label: string) => (
    <div className="references-actions">
      <button type="button" onClick={() => openEditModal(id)}>
        Editar
      </button>

      <button
        className="is-danger"
        type="button"
        disabled={deletingId === id}
        onClick={() => handleDelete(id, label)}
      >
        {deletingId === id ? "Eliminando..." : "Eliminar"}
      </button>
    </div>
  );

  const renderTable = () => {
    if (activeTab === "product_brands") {
      return (
        <table className="references-table">
          <thead>
            <tr>
              <th>Marca de artículo</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th>Actualización</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filteredProductBrands.map((brand) => (
              <tr key={brand.id}>
                <td data-label="Marca de artículo">
                  <strong>{brand.name}</strong>
                  <small>{brand.slug}</small>
                </td>

                <td data-label="Descripción">
                  {brand.description || "Sin descripción"}
                </td>

                <td data-label="Estado">
                  {renderStatus(brand.is_active)}
                </td>

                <td data-label="Actualización">
                  {formatDate(brand.updated_at)}
                </td>

                <td data-label="Acciones">
                  {renderActions(brand.id, brand.name)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === "vehicle_brands") {
      return (
        <table className="references-table">
          <thead>
            <tr>
              <th>Marca de vehículo</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th>Actualización</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filteredVehicleBrands.map((brand) => (
              <tr key={brand.id}>
                <td data-label="Marca de vehículo">
                  <strong>{brand.name}</strong>
                  <small>{brand.slug}</small>
                </td>

                <td data-label="Descripción">
                  {brand.description || "Sin descripción"}
                </td>

                <td data-label="Estado">
                  {renderStatus(brand.is_active)}
                </td>

                <td data-label="Actualización">
                  {formatDate(brand.updated_at)}
                </td>

                <td data-label="Acciones">
                  {renderActions(brand.id, brand.name)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === "vehicle_models") {
      return (
        <table className="references-table">
          <thead>
            <tr>
              <th>Modelo</th>
              <th>Marca de vehículo</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th>Actualización</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filteredVehicleModels.map((model) => (
              <tr key={model.id}>
                <td data-label="Modelo">
                  <strong>{model.name}</strong>
                  <small>{model.slug}</small>
                </td>

                <td data-label="Marca de vehículo">
                  {model.brand?.name ??
                    getVehicleBrandName(
                      model.vehicle_brand_id
                    )}
                </td>

                <td data-label="Descripción">
                  {model.description || "Sin descripción"}
                </td>

                <td data-label="Estado">
                  {renderStatus(model.is_active)}
                </td>

                <td data-label="Actualización">
                  {formatDate(model.updated_at)}
                </td>

                <td data-label="Acciones">
                  {renderActions(model.id, model.name)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeTab === "vehicle_versions") {
      return (
        <table className="references-table">
          <thead>
            <tr>
              <th>Generación</th>
              <th>Modelo</th>
              <th>Rango de años</th>
              <th>Estado</th>
              <th>Actualización</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filteredVehicleVersions.map((version) => (
              <tr key={version.id}>
                <td data-label="Generación">
                  <strong>{version.display_name}</strong>
                  <small>
                    {version.description || "Sin descripción"}
                  </small>
                  <small className="references-table__oem">
                    OEM:{" "}
                    {version.multimedia_systems?.length
                      ? version.multimedia_systems
                          .map((system) => system.name)
                          .join(" · ")
                      : "Sin definir"}
                  </small>
                </td>

                <td data-label="Modelo">
                  {version.model?.name ??
                    getVehicleModelName(
                      version.vehicle_model_id
                    )}
                </td>

                <td data-label="Rango de años">
                  {version.year_from}
                  {version.year_to
                    ? ` - ${version.year_to}`
                    : " en adelante"}
                </td>

                <td data-label="Estado">
                  {renderStatus(version.is_active)}
                </td>

                <td data-label="Actualización">
                  {formatDate(version.updated_at)}
                </td>

                <td data-label="Acciones">
                  {renderActions(
                    version.id,
                    version.display_name
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return (
      <table className="references-table">
        <thead>
          <tr>
            <th>Sistema multimedia</th>
            <th>Marca de vehículo</th>
            <th>Código</th>
            <th>Descripción</th>
            <th>Estado</th>
            <th>Actualización</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {filteredMultimediaSystems.map((system) => (
            <tr key={system.id}>
              <td data-label="Sistema multimedia">
                <strong>{system.name}</strong>
                <small>{system.slug}</small>
              </td>

              <td data-label="Marca de vehículo">
                {system.vehicle_brand?.name ??
                  getVehicleBrandName(
                    system.vehicle_brand_id
                  )}
              </td>

              <td data-label="Código">
                {system.code || "Sin código"}
              </td>

              <td data-label="Descripción">
                {system.description || "Sin descripción"}
              </td>

              <td data-label="Estado">
                {renderStatus(system.is_active)}
              </td>

              <td data-label="Actualización">
                {formatDate(system.updated_at)}
              </td>

              <td data-label="Acciones">
                {renderActions(system.id, system.name)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const getCurrentCount = () => {
    if (activeTab === "product_brands") {
      return filteredProductBrands.length;
    }

    if (activeTab === "vehicle_brands") {
      return filteredVehicleBrands.length;
    }

    if (activeTab === "vehicle_models") {
      return filteredVehicleModels.length;
    }

    if (activeTab === "vehicle_versions") {
      return filteredVehicleVersions.length;
    }

    return filteredMultimediaSystems.length;
  };

  const renderModalForm = () => {
    if (
      activeTab === "product_brands" ||
      activeTab === "vehicle_brands"
    ) {
      return (
        <>
          <label className="references-form__field">
            <span>Nombre *</span>

            <input
              type="text"
              value={baseForm.name}
              onChange={(event) =>
                setBaseForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder={
                activeTab === "product_brands"
                  ? "Ej: Pioneer"
                  : "Ej: BMW"
              }
              required
            />
          </label>

          <label className="references-form__field">
            <span>Descripción</span>

            <textarea
              rows={4}
              value={baseForm.description}
              onChange={(event) =>
                setBaseForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder={
                activeTab === "product_brands"
                  ? "Información interna sobre la marca comercial."
                  : "Información interna sobre la marca de vehículos."
              }
            />
          </label>

          <label className="references-form__check">
            <input
              type="checkbox"
              checked={baseForm.is_active}
              onChange={(event) =>
                setBaseForm((current) => ({
                  ...current,
                  is_active: event.target.checked,
                }))
              }
            />

            <span>Activo</span>
          </label>
        </>
      );
    }

    if (activeTab === "vehicle_models") {
      return (
        <>
          <label className="references-form__field">
            <span>Marca del vehículo *</span>

            <select
              value={vehicleModelForm.vehicle_brand_id}
              onChange={(event) =>
                setVehicleModelForm((current) => ({
                  ...current,
                  vehicle_brand_id: event.target.value,
                }))
              }
              required
            >
              <option value="">Seleccionar marca</option>

              {vehicleBrands
                .filter((brand) => brand.is_active)
                .map((brand) => (
                  <option value={brand.id} key={brand.id}>
                    {brand.name}
                  </option>
                ))}
            </select>
          </label>

          <label className="references-form__field">
            <span>Nombre del modelo *</span>

            <input
              type="text"
              value={vehicleModelForm.name}
              onChange={(event) =>
                setVehicleModelForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Ej: M3, X5, A4"
              required
            />
          </label>

          <label className="references-form__field">
            <span>Descripción</span>

            <textarea
              rows={4}
              value={vehicleModelForm.description}
              onChange={(event) =>
                setVehicleModelForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Información interna sobre el modelo."
            />
          </label>

          <label className="references-form__check">
            <input
              type="checkbox"
              checked={vehicleModelForm.is_active}
              onChange={(event) =>
                setVehicleModelForm((current) => ({
                  ...current,
                  is_active: event.target.checked,
                }))
              }
            />

            <span>Activo</span>
          </label>
        </>
      );
    }

    if (activeTab === "vehicle_versions") {
      return (
        <>
          <label className="references-form__field">
            <span>Modelo del vehículo *</span>

            <select
              value={vehicleVersionForm.vehicle_model_id}
              onChange={(event) => {
                setVehicleVersionForm((current) => ({
                  ...current,
                  vehicle_model_id: event.target.value,
                }));
                setVersionOemSelections({});
                setVersionOemErrors({});
              }}
              required
            >
              <option value="">Seleccionar modelo</option>

              {vehicleModels
                .filter((model) => model.is_active)
                .map((model) => (
                  <option value={model.id} key={model.id}>
                    {getVehicleBrandName(
                      model.vehicle_brand_id
                    )}{" "}
                    · {model.name}
                  </option>
                ))}
            </select>
          </label>

          <label className="references-form__field">
            <span>Código de generación</span>

            <input
              type="text"
              value={vehicleVersionForm.name}
              onChange={(event) =>
                setVehicleVersionForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Ej: F80, G80, B8, C218"
            />
          </label>

          <div className="references-form__grid">
            <label className="references-form__field">
              <span>Año desde *</span>

              <input
                type="number"
                min="1900"
                max="2100"
                value={vehicleVersionForm.year_from}
                onChange={(event) =>
                  setVehicleVersionForm((current) => ({
                    ...current,
                    year_from: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="references-form__field">
              <span>Año hasta</span>

              <input
                type="number"
                min="1900"
                max="2100"
                value={vehicleVersionForm.year_to}
                onChange={(event) =>
                  setVehicleVersionForm((current) => ({
                    ...current,
                    year_to: event.target.value,
                  }))
                }
                placeholder="Vacío = continúa vigente"
              />
            </label>
          </div>

          <label className="references-form__field">
            <span>Descripción</span>

            <textarea
              rows={4}
              value={vehicleVersionForm.description}
              onChange={(event) =>
                setVehicleVersionForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Información adicional sobre esta generación."
            />
          </label>

          <fieldset className="references-oem">
            <legend>Sistemas multimedia OEM</legend>

            {selectedVersionModel ? (
              <>
                <div className="references-oem__context">
                  <span>
                    {getVehicleBrandName(
                      selectedVersionModel.vehicle_brand_id
                    )}
                    {vehicleVersionForm.name.trim()
                      ? ` · ${vehicleVersionForm.name.trim()}`
                      : ` · ${selectedVersionModel.name}`}
                  </span>
                  <small>
                    {vehicleVersionForm.year_from || "Año inicial"}–
                    {vehicleVersionForm.year_to || "Actual"}
                  </small>
                </div>

                {availableVersionOemSystems.length > 0 ? (
                  <div className="references-oem__grid">
                    {availableVersionOemSystems.map((system) => {
                      const selection =
                        versionOemSelections[system.id] ??
                        buildEmptyOemSelection();
                      const yearsId = `version-oem-years-${system.id}`;
                      const errorId = `version-oem-error-${system.id}`;

                      return (
                        <div
                          className={`references-oem__item${
                            selection.selected ? " is-selected" : ""
                          }`}
                          key={system.id}
                        >
                          <label className="references-oem__check">
                            <input
                              type="checkbox"
                              checked={selection.selected}
                              onChange={(event) =>
                                updateOemSelection(system.id, {
                                  selected: event.target.checked,
                                  adjust_years: event.target.checked
                                    ? selection.adjust_years
                                    : false,
                                  year_from: event.target.checked
                                    ? selection.year_from
                                    : "",
                                  year_to: event.target.checked
                                    ? selection.year_to
                                    : "",
                                })
                              }
                            />
                            <span>{system.name}</span>
                            {system.code ? <small>{system.code}</small> : null}
                          </label>

                          {selection.selected ? (
                            <>
                              <button
                                className="references-oem__years-toggle"
                                type="button"
                                aria-expanded={selection.adjust_years}
                                aria-controls={yearsId}
                                onClick={() => toggleOemYears(system.id)}
                              >
                                {selection.adjust_years
                                  ? "Usar rango completo"
                                  : "Ajustar años"}
                              </button>

                              {selection.adjust_years ? (
                                <div
                                  className="references-oem__years"
                                  id={yearsId}
                                >
                                  <label>
                                    <span>Desde</span>
                                    <input
                                      type="number"
                                      min={vehicleVersionForm.year_from || 1900}
                                      max={vehicleVersionForm.year_to || 2100}
                                      value={selection.year_from}
                                      aria-invalid={Boolean(
                                        versionOemErrors[system.id]
                                      )}
                                      aria-describedby={
                                        versionOemErrors[system.id]
                                          ? errorId
                                          : undefined
                                      }
                                      onChange={(event) =>
                                        updateOemSelection(system.id, {
                                          year_from: event.target.value,
                                        })
                                      }
                                    />
                                  </label>

                                  <label>
                                    <span>Hasta</span>
                                    <input
                                      type="number"
                                      min={vehicleVersionForm.year_from || 1900}
                                      max={vehicleVersionForm.year_to || 2100}
                                      value={selection.year_to}
                                      aria-invalid={Boolean(
                                        versionOemErrors[system.id]
                                      )}
                                      aria-describedby={
                                        versionOemErrors[system.id]
                                          ? errorId
                                          : undefined
                                      }
                                      onChange={(event) =>
                                        updateOemSelection(system.id, {
                                          year_to: event.target.value,
                                        })
                                      }
                                    />
                                  </label>
                                </div>
                              ) : (
                                <small className="references-oem__range-note">
                                  Aplica a todo el rango de esta versión.
                                </small>
                              )}

                              {versionOemErrors[system.id] ? (
                                <p
                                  className="references-oem__error"
                                  id={errorId}
                                  role="alert"
                                >
                                  {versionOemErrors[system.id]}
                                </p>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="references-oem__empty">
                    Esta marca todavía no tiene sistemas multimedia activos.
                  </p>
                )}
              </>
            ) : (
              <p className="references-oem__empty">
                Selecciona un modelo para ver los sistemas de su marca.
              </p>
            )}
          </fieldset>

          <label className="references-form__check">
            <input
              type="checkbox"
              checked={vehicleVersionForm.is_active}
              onChange={(event) =>
                setVehicleVersionForm((current) => ({
                  ...current,
                  is_active: event.target.checked,
                }))
              }
            />

            <span>Activo</span>
          </label>
        </>
      );
    }

    return (
      <>
        <label className="references-form__field">
          <span>Marca del vehículo *</span>

          <select
            value={multimediaSystemForm.vehicle_brand_id}
            onChange={(event) =>
              setMultimediaSystemForm((current) => ({
                ...current,
                vehicle_brand_id: event.target.value,
              }))
            }
            required
          >
            <option value="">Seleccionar marca</option>

            {vehicleBrands
              .filter((brand) => brand.is_active)
              .map((brand) => (
                <option value={brand.id} key={brand.id}>
                  {brand.name}
                </option>
              ))}
          </select>
        </label>

        <label className="references-form__field">
          <span>Nombre del sistema *</span>

          <input
            type="text"
            value={multimediaSystemForm.name}
            onChange={(event) =>
              setMultimediaSystemForm((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            placeholder="Ej: NBT, NBT EVO, MMI 3G+, MIB2"
            required
          />
        </label>

        <label className="references-form__field">
          <span>Código interno</span>

          <input
            type="text"
            value={multimediaSystemForm.code}
            onChange={(event) =>
              setMultimediaSystemForm((current) => ({
                ...current,
                code: event.target.value,
              }))
            }
            placeholder="Ej: BMW-NBT-EVO"
          />
        </label>

        <label className="references-form__field">
          <span>Descripción</span>

          <textarea
            rows={4}
            value={multimediaSystemForm.description}
            onChange={(event) =>
              setMultimediaSystemForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Ej: Sistema original BMW utilizado en determinadas generaciones."
          />
        </label>

        <label className="references-form__check">
          <input
            type="checkbox"
            checked={multimediaSystemForm.is_active}
            onChange={(event) =>
              setMultimediaSystemForm((current) => ({
                ...current,
                is_active: event.target.checked,
              }))
            }
          />

          <span>Activo</span>
        </label>
      </>
    );
  };

  return (
    <section className="admin-references">
      {!embedded ? (
        <section className="references-hero">
          <div>
            <span>{pageContent.eyebrow}</span>
            <h2>{pageContent.title}</h2>
            <p>{pageContent.description}</p>
          </div>

          <button type="button" onClick={openCreateModal}>
            {activeTabInfo.createLabel}
          </button>
        </section>
      ) : null}

      {scope === "all" ? (
        <section
          className="references-tabs"
          aria-label="Tipo de configuración"
        >
          <button
            className={
              activeSection === "product_brands"
                ? "is-active"
                : ""
            }
            type="button"
            onClick={() => changeSection("product_brands")}
          >
            <strong>Marcas de artículos</strong>
            <span>
              Marcas comerciales asignadas al inventario.
            </span>
          </button>

          <button
            className={
              activeSection === "vehicle_compatibility"
                ? "is-active"
                : ""
            }
            type="button"
            onClick={() =>
              changeSection("vehicle_compatibility")
            }
          >
            <strong>Compatibilidad vehicular</strong>
            <span>
              Vehículos, generaciones y sistemas multimedia.
            </span>
          </button>
        </section>
      ) : null}

      {visibleTabs.length > 1 ? (
        <section
          className="references-tabs"
          aria-label="Configuración vehicular"
        >
          {visibleTabs.map((tab) => (
            <button
              className={
                activeTab === tab.value ? "is-active" : ""
              }
              type="button"
              key={tab.value}
              onClick={() => changeTab(tab.value)}
            >
              <strong>{tab.label}</strong>
              <span>{tab.description}</span>
            </button>
          ))}
        </section>
      ) : null}

      <section className="references-panel">
        <div className="references-panel__header">
          <div>
            <span>{activeTabInfo.label}</span>
            <h3>{getCurrentCount()} registros</h3>
          </div>

          <div className="references-panel__tools">
            <input
              type="search"
              placeholder={activeTabInfo.searchPlaceholder}
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            <button type="button" onClick={openCreateModal}>
              {activeTabInfo.createLabel}
            </button>
          </div>
        </div>

        {message ? (
          <p className="references-message is-success">
            {message}
          </p>
        ) : null}

        {error && !isModalOpen ? (
          <p className="references-message is-error">
            {error}
          </p>
        ) : null}

        {isFetching ? (
          <p className="references-empty">
            Cargando configuración...
          </p>
        ) : getCurrentCount() > 0 ? (
          <div className="references-table-wrap">
            {renderTable()}
          </div>
        ) : (
          <div className="references-empty">
            <p>
              No hay registros para esta configuración.
            </p>

            <button type="button" onClick={openCreateModal}>
              {activeTabInfo.createLabel}
            </button>
          </div>
        )}
      </section>

      {isModalOpen ? (
        <div
          className="references-modal"
          role="dialog"
          aria-modal="true"
        >
          <button
            className="references-modal__backdrop"
            type="button"
            aria-label="Cerrar formulario"
            onClick={closeModal}
          />

          <div className="references-modal__panel">
            <div className="references-modal__header">
              <div>
                <span>{activeTabInfo.label}</span>

                <h2>
                  {editingId
                    ? `Editar ${activeTabInfo.singularLabel}`
                    : activeTabInfo.createLabel}
                </h2>

                <p>{activeTabInfo.description}</p>
              </div>

              <button type="button" onClick={closeModal}>
                Cerrar
              </button>
            </div>

            <form
              className="references-form"
              onSubmit={handleSubmit}
            >
              {renderModalForm()}

              {error ? (
                <p className="references-message is-error">
                  {capitalizeFirstLetter(error)}
                </p>
              ) : null}

              <div className="references-form__actions">
                <button type="submit" disabled={isSaving}>
                  {isSaving
                    ? "Guardando..."
                    : editingId
                      ? "Actualizar"
                      : "Crear"}
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
