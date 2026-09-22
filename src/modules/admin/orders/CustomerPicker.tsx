import { useRef, useState } from "react";
import { getCustomers } from "../../../api/customers";
import type { Customer } from "../../../types/customer";

type Props = {
  selected: Customer | null;
  disabled?: boolean;
  onSelect: (customer: Customer) => void;
  onClear: () => void;
};

export const CustomerPicker = ({ selected, disabled = false, onSelect, onClear }: Props) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const searchCustomers = async () => {
    const term = search.trim();
    if (!term) {
      setResults([]);
      setSearched(false);
      setError("");
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setSearched(true);
    setResults([]);
    setError("");
    try {
      const page = await getCustomers({ search: term, page: 1, per_page: 10 });
      if (id === requestId.current) setResults(page.data);
    } catch (cause) {
      if (id === requestId.current) setError(cause instanceof Error ? cause.message : "Error al buscar clientes.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  if (selected) {
    return <article className="sale-customer-selected"><div><span>Cliente seleccionado</span><strong>{selected.name}</strong><small>{[selected.phone, selected.email, selected.document].filter(Boolean).join(" · ") || "Sin datos de contacto"}</small></div><button type="button" disabled={disabled} onClick={() => { onClear(); setResults([]); setSearched(false); }}>Cambiar</button></article>;
  }

  return <div className="sale-customer-picker">
    <div className="sale-customer-search" role="search"><label className="orders-field"><span>Buscar cliente</span><input value={search} disabled={disabled} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchCustomers(); } }} placeholder="Nombre, teléfono, email o documento" /></label><button type="button" disabled={disabled || loading} onClick={() => void searchCustomers()}>{loading ? "Buscando..." : "Buscar"}</button></div>
    {loading ? <p role="status">Buscando clientes...</p> : error ? <p className="orders-error" role="alert">{error}</p> : !searched ? <p>Escribe para buscar un cliente.</p> : !results.length ? <p>No encontramos clientes.</p> : <div className="sale-customer-results">{results.map((customer) => <article key={customer.id}><div><strong>{customer.name}</strong><small>{[customer.phone, customer.email, customer.document].filter(Boolean).join(" · ") || "Sin datos de contacto"}</small><span>{customer.is_active ? "Activo" : "Inactivo"}</span></div><button type="button" disabled={disabled || !customer.is_active} onClick={() => onSelect(customer)}>{customer.is_active ? "Seleccionar" : "No disponible"}</button></article>)}</div>}
  </div>;
};
