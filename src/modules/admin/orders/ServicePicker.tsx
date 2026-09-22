import { useEffect, useRef, useState } from "react";
import { getServices } from "../../../api/services";
import type { Service } from "../../../types/service";
import { formatCurrency } from "../../../utils/formatCurrency";

type Props = { onAdd: (service: Service) => void; disabled?: boolean };

export const formatServiceDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
};

export const ServicePicker = ({ onAdd, disabled = false }: Props) => {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const current = ++requestId.current;
    setLoading(true);
    setError("");
    getServices({ search: search || undefined, is_active: true, page: 1, per_page: 25, sort: "sort_order", direction: "asc" })
      .then((result) => { if (current === requestId.current) setServices(result.data); })
      .catch((cause) => { if (current === requestId.current) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los servicios."); })
      .finally(() => { if (current === requestId.current) setLoading(false); });
    return () => { requestId.current += 1; };
  }, [retry, search]);

  return <div className="service-picker">
    <form className="service-picker__search" role="search" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); }}>
      <label className="orders-field"><span>Buscar servicio</span><input value={searchInput} disabled={disabled} onChange={(event) => setSearchInput(event.target.value)} placeholder="Ej: instalación de pantalla" /></label>
      <button type="submit" disabled={disabled || loading}>{loading ? "Buscando..." : "Buscar"}</button>
    </form>
    {error ? <div className="service-picker__state is-error" role="alert"><span>{error}</span><button type="button" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></div> : null}
    {!error && loading ? <p className="service-picker__state" role="status">Cargando servicios...</p> : null}
    {!error && !loading && !services.length ? <p className="service-picker__state">No encontramos servicios activos.</p> : null}
    {!error && !loading && services.length ? <div className="service-picker__results">
      {services.map((service) => <button type="button" key={service.id} disabled={disabled} onClick={() => onAdd(service)}>
        <span><strong>{service.name}</strong><small>{service.category?.name ?? "Sin categoría"} · {formatServiceDuration(service.estimated_duration_minutes)}</small></span>
        <strong>{formatCurrency(service.price)}</strong>
      </button>)}
    </div> : null}
  </div>;
};
