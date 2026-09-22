import { BarChart3, Building2, CalendarDays, RefreshCcw, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { getMyBusinessOverview } from "../../../api/businessOverview";
import { ApiError, type ValidationErrors } from "../../../api/http";
import type {
  BusinessOverviewBranch,
  BusinessOverviewFilters,
  BusinessOverviewPersonalCommissions,
  BusinessOverviewPersonalQuotations,
  BusinessOverviewPersonalSales,
  BusinessOverviewResponse,
  BusinessOverviewScope,
  BusinessOverviewTopProduct,
} from "../../../types/businessOverview";
import { formatDateOnly } from "../../../utils/crmDateTime";
import { formatCurrency } from "../../../utils/formatCurrency";
import "./BusinessOverviewPage.css";

type MetricDefinition = {
  key: keyof Omit<BusinessOverviewScope, "top_products">;
  label: string;
  hint: string;
  kind?: "count" | "percent";
};

type LoadState = {
  loading: boolean;
  error: string | null;
  fieldErrors: ValidationErrors;
};

const metrics: MetricDefinition[] = [
  { key: "sales_count", label: "Ventas confirmadas", hint: "Cantidad de ventas confirmadas", kind: "count" },
  { key: "product_units", label: "Unidades vendidas", hint: "Productos vendidos en el período", kind: "count" },
  { key: "quotations_count", label: "Cotizaciones", hint: "Cotizaciones creadas", kind: "count" },
  { key: "quotation_conversion_rate", label: "Conversión de cotizaciones", hint: "Convertidas sobre resueltas", kind: "percent" },
  { key: "customers_served", label: "Clientes atendidos", hint: "Clientes únicos atendidos", kind: "count" },
];

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const integerFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

const emptyLoadState: LoadState = { loading: false, error: null, fieldErrors: {} };

const isAbortError = (cause: unknown) => cause instanceof DOMException && cause.name === "AbortError";
const firstFieldError = (errors: ValidationErrors, field: string) => errors[field]?.[0] ?? null;

const toNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const formatCount = (value: number | string | null | undefined) => {
  const numeric = toNumber(value);
  return numeric === null ? "Sin dato" : integerFormatter.format(numeric);
};

const formatDecimal = (value: number | string | null | undefined) => {
  const numeric = toNumber(value);
  return numeric === null ? "Sin dato" : numberFormatter.format(numeric);
};

const formatPercent = (value: number | string | null | undefined) => {
  const numeric = toNumber(value);
  return numeric === null ? "Sin dato" : `${numberFormatter.format(numeric)}%`;
};

const formatMoney = (value: number | string | null | undefined) => {
  const numeric = toNumber(value);
  return numeric === null ? "Sin dato" : formatCurrency(numeric);
};

const formatPeriod = (data: BusinessOverviewResponse | null) => {
  if (!data?.period) return "Período pendiente";
  return `${formatDateOnly(data.period.from)} – ${formatDateOnly(data.period.to)}`;
};

const daysBetween = (from: string, to: string) => {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.floor((end - start) / 86_400_000);
};

const appliedFilterPayload = (from: string, to: string): BusinessOverviewFilters => ({
  ...(from ? { from } : {}),
  ...(to ? { to } : {}),
});

const branchLabel = (branch: BusinessOverviewBranch | null) => {
  if (!branch) return "Sin sede vinculada";
  return [branch.name, branch.code].filter(Boolean).join(" · ") || `Sede #${branch.id}`;
};

const branchMeta = (branch: BusinessOverviewBranch | null) => {
  if (!branch) return "El backend no entregó una sede actual para este empleado.";
  return [branch.city, branch.is_active ? "Activa" : "Inactiva"].filter(Boolean).join(" · ");
};

const normalizeTopProducts = (items: BusinessOverviewTopProduct[] | null | undefined) => Array.isArray(items) ? items : [];

const BusinessState = ({ title, description, action, light = false, error = false }: {
  title: string;
  description: string;
  action?: ReactNode;
  light?: boolean;
  error?: boolean;
}) => (
  <section className={`business-overview__state ${light ? "is-light" : ""}`} role={error ? "alert" : "status"}>
    <strong>{title}</strong>
    <p>{description}</p>
    {action}
  </section>
);

const ContextCard = ({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) => (
  <article className="business-overview__context">
    {icon}
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{detail}</small>
  </article>
);

const TopProductsList = ({ products }: { products: BusinessOverviewTopProduct[] }) => {
  const visibleProducts = normalizeTopProducts(products);

  return (
    <div className="business-overview__top-products">
      <span>Top productos</span>
      <h4>Productos con más unidades</h4>
      {visibleProducts.length ? (
        <ol>
          {visibleProducts.map((product, index) => (
            <li key={`${product.product_id ?? product.product_name ?? "product"}-${index}`}>
              <div>
                <strong>{product.product_name || "Producto sin nombre"}</strong>
                <small>{product.sku ? `SKU ${product.sku}` : product.product_id ? `Producto #${product.product_id}` : "Sin SKU"}</small>
              </div>
              <span className="business-overview__units">{formatCount(product.units)} unidades</span>
            </li>
          ))}
        </ol>
      ) : (
        <p>Sin productos vendidos en este período.</p>
      )}
    </div>
  );
};

const ScopePanel = ({ label, title, description, scope }: {
  label: string;
  title: string;
  description: string;
  scope: BusinessOverviewScope | null;
}) => (
  <section className="business-overview__panel" aria-labelledby={`${label.toLowerCase().replace(/\s+/g, "-")}-title`}>
    <div className="business-overview__panel-header">
      <div>
        <span className="business-overview__scope-label">{label}</span>
        <h3 id={`${label.toLowerCase().replace(/\s+/g, "-")}-title`}>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
    {scope ? (
      <>
        <div className="business-overview__metrics-grid">
          {metrics.map((metric) => (
            <article className="business-overview__metric" key={metric.key}>
              <span>{metric.label}</span>
              <strong>{metric.kind === "percent" ? formatPercent(scope[metric.key]) : formatCount(scope[metric.key])}</strong>
              <small>{metric.hint}</small>
            </article>
          ))}
        </div>
        <TopProductsList products={scope.top_products} />
      </>
    ) : (
      <BusinessState
        light
        title="Sin métricas disponibles"
        description="El backend no entregó este bloque para el período solicitado. No se muestran datos inventados."
      />
    )}
  </section>
);

const PersonalUnavailable = ({ title }: { title: string }) => (
  <article className="business-overview__personal-card">
    <span>Mi desempeño</span>
    <h4>{title}</h4>
    <p>No disponible para tu perfil en este período.</p>
  </article>
);

const PersonalValues = ({ children }: { children: ReactNode }) => <dl className="business-overview__personal-values">{children}</dl>;

const PersonalMetric = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

const PersonalSalesCard = ({ sales }: { sales: BusinessOverviewPersonalSales }) => {
  if (!sales.available) return <PersonalUnavailable title="Ventas personales" />;

  return (
    <article className="business-overview__personal-card">
      <span>Mi desempeño</span>
      <h4>Ventas personales</h4>
      <PersonalValues>
        <PersonalMetric label="Ventas confirmadas" value={formatCount(sales.sales_count)} />
        <PersonalMetric label="Unidades vendidas" value={formatCount(sales.product_units)} />
        <PersonalMetric label="Total vendido" value={formatMoney(sales.sales_total)} />
      </PersonalValues>
    </article>
  );
};

const PersonalQuotationsCard = ({ quotations }: { quotations: BusinessOverviewPersonalQuotations }) => {
  if (!quotations.available) return <PersonalUnavailable title="Cotizaciones personales" />;

  return (
    <article className="business-overview__personal-card">
      <span>Mi desempeño</span>
      <h4>Cotizaciones personales</h4>
      <PersonalValues>
        <PersonalMetric label="Cotizaciones" value={formatCount(quotations.quotation_count)} />
        <PersonalMetric label="Convertidas" value={formatCount(quotations.converted_count)} />
        <PersonalMetric label="Conversión" value={formatPercent(quotations.conversion_rate)} />
      </PersonalValues>
    </article>
  );
};

const PersonalCommissionsCard = ({ commissions }: { commissions: BusinessOverviewPersonalCommissions }) => {
  if (!commissions.available) return <PersonalUnavailable title="Comisiones personales" />;

  return (
    <article className="business-overview__personal-card">
      <span>Mi desempeño</span>
      <h4>Comisiones personales</h4>
      <PersonalValues>
        <PersonalMetric label="Pendientes" value={formatMoney(commissions.pending_amount)} />
        <PersonalMetric label="Ganadas" value={formatMoney(commissions.earned_amount)} />
        <PersonalMetric label="Anuladas" value={formatMoney(commissions.voided_amount)} />
        <PersonalMetric label="Unidades ganadas" value={formatDecimal(commissions.earned_units)} />
      </PersonalValues>
    </article>
  );
};

export const MyBusinessOverviewPage = () => {
  const [data, setData] = useState<BusinessOverviewResponse | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<BusinessOverviewFilters>({});
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>(emptyLoadState);
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const appliedLabel = useMemo(() => formatPeriod(data), [data]);

  const loadOverview = useCallback(() => {
    const id = requestId.current + 1;
    requestId.current = id;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoadState((current) => ({ ...current, loading: true, error: null }));

    getMyBusinessOverview(appliedFilters, controller.signal)
      .then((response) => {
        if (requestId.current !== id) return;
        setData(response);
        setDraftFrom(response.period.from);
        setDraftTo(response.period.to);
        setLoadState({ loading: false, error: null, fieldErrors: {} });
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause) || requestId.current !== id) return;
        if (cause instanceof ApiError) {
          setLoadState({
            loading: false,
            error: cause.message,
            fieldErrors: cause.status === 422 ? cause.errors : {},
          });
          return;
        }
        setLoadState({ loading: false, error: "No pudimos cargar el resumen del negocio.", fieldErrors: {} });
      });
  }, [appliedFilters]);

  useEffect(() => {
    loadOverview();
    return () => abortRef.current?.abort();
  }, [loadOverview, refreshToken]);

  const handleApply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: ValidationErrors = {};
    const distance = draftFrom && draftTo ? daysBetween(draftFrom, draftTo) : null;

    if (distance !== null && distance < 0) {
      errors.to = ["La fecha final debe ser posterior o igual a la fecha inicial."];
    } else if (distance !== null && distance > 365) {
      errors.to = ["El rango máximo permitido es de 366 días."];
    }

    if (Object.keys(errors).length) {
      setLoadState((current) => ({ ...current, fieldErrors: errors, error: null }));
      return;
    }

    setAppliedFilters(appliedFilterPayload(draftFrom, draftTo));
    setLoadState((current) => ({ ...current, fieldErrors: {}, error: null }));
  };

  const handleReset = () => {
    setDraftFrom("");
    setDraftTo("");
    setAppliedFilters({});
    setLoadState((current) => ({ ...current, fieldErrors: {}, error: null }));
  };

  const handleRefresh = () => {
    setRefreshToken((current) => current + 1);
  };

  const fieldFromError = firstFieldError(loadState.fieldErrors, "from");
  const fieldToError = firstFieldError(loadState.fieldErrors, "to");
  const isFirstLoad = loadState.loading && !data;

  return (
    <main className="business-overview" aria-busy={loadState.loading}>
      <section className="business-overview__hero" aria-labelledby="business-overview-title">
        <div>
          <span className="business-overview__eyebrow">Área personal CRM</span>
          <h2 id="business-overview-title">Resumen del negocio</h2>
          <p>
            Consulta tu contexto comercial por compañía, sede actual y desempeño personal con datos seguros del backend.
          </p>
          <div className="business-overview__period" aria-label="Período aplicado">
            <span className="business-overview__chip">Período aplicado: {appliedLabel}</span>
            {data?.period.timezone ? <span className="business-overview__chip">Zona horaria: {data.period.timezone}</span> : null}
          </div>
        </div>
        <div className="business-overview__hero-actions">
          <button type="button" className="business-overview__secondary-button" onClick={handleRefresh}>
            <RefreshCcw size={16} aria-hidden="true" /> Actualizar
          </button>
        </div>
      </section>

      <form className="business-overview__filters" onSubmit={handleApply} noValidate>
        <label>
          <span>Desde</span>
          <input type="date" value={draftFrom} onChange={(event) => setDraftFrom(event.target.value)} aria-invalid={Boolean(fieldFromError)} />
          {fieldFromError ? <small className="business-overview__field-error">{fieldFromError}</small> : null}
        </label>
        <label>
          <span>Hasta</span>
          <input type="date" value={draftTo} onChange={(event) => setDraftTo(event.target.value)} aria-invalid={Boolean(fieldToError)} />
          {fieldToError ? <small className="business-overview__field-error">{fieldToError}</small> : null}
        </label>
        <button type="submit">Aplicar</button>
        <button type="button" className="business-overview__secondary-button" onClick={handleReset}>Mes actual</button>
      </form>

      {loadState.error ? <p className="business-overview__error" role="alert">{loadState.error}</p> : null}
      {isFirstLoad ? <BusinessState title="Cargando resumen" description="Estamos consultando el período vigente del backend." /> : null}

      {data && !data.employee_linked ? (
        <BusinessState
          title="Tu usuario todavía no tiene empleado asociado"
          description="Este estado es válido: puedes entrar al módulo con el permiso business_overview.view, pero las métricas personales aparecen cuando tu usuario se vincula a un empleado activo. Conservamos el período y el botón de actualización sin inventar KPIs."
          action={<button type="button" onClick={handleRefresh}>Actualizar</button>}
        />
      ) : null}

      {data?.employee_linked ? (
        <>
          <section className="business-overview__context-grid" aria-label="Contexto personal">
            <ContextCard
              icon={<UserRound size={20} aria-hidden="true" />}
              label="Empleado"
              value={data.employee?.name || (data.employee?.id ? `Empleado #${data.employee.id}` : "Empleado vinculado")}
              detail="Perfil operativo asociado a tu usuario"
            />
            <ContextCard
              icon={<Building2 size={20} aria-hidden="true" />}
              label="Sede actual"
              value={branchLabel(data.branch)}
              detail={branchMeta(data.branch)}
            />
            <ContextCard
              icon={<CalendarDays size={20} aria-hidden="true" />}
              label="Período"
              value={formatPeriod(data)}
              detail={data.period.timezone}
            />
          </section>

          <ScopePanel
            label="Compañía"
            title="Actividad de la compañía"
            description="Totales operativos permitidos para tu vista personal. No incluye ingresos globales, costos ni márgenes."
            scope={data.company}
          />

          <ScopePanel
            label="Mi sede"
            title="Actividad de mi sede actual"
            description="Métricas devueltas por el backend para la sede asociada a tu empleado en este período."
            scope={data.my_branch}
          />

          <section className="business-overview__panel" aria-labelledby="personal-performance-title">
            <div className="business-overview__panel-header">
              <div>
                <span className="business-overview__scope-label">Mi desempeño</span>
                <h3 id="personal-performance-title">Resultado personal</h3>
                <p>Ventas, cotizaciones y comisiones disponibles para tu perfil.</p>
              </div>
              <BarChart3 size={24} aria-hidden="true" />
            </div>
            <div className="business-overview__personal-grid">
              <PersonalSalesCard sales={data.personal.sales} />
              <PersonalQuotationsCard quotations={data.personal.quotations} />
              <PersonalCommissionsCard commissions={data.personal.commissions} />
            </div>
          </section>
        </>
      ) : null}

      {!loadState.loading && !data && !loadState.error ? (
        <BusinessState
          light
          title="Resumen sin datos"
          description="No hay una respuesta disponible todavía. Usa Actualizar para consultar nuevamente."
        />
      ) : null}
    </main>
  );
};
