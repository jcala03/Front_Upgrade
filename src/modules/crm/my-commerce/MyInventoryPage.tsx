import { useEffect, useState, type FormEvent } from "react";
import { getMyCommercialProducts } from "../../../api/commercialProducts";
import type { CommercialProductCatalog } from "../../../types/commercialProduct";
import { getAuthUser } from "../../../utils/authStorage";
import "./MyCommerce.css";

export const MyInventoryPage = () => {
  const employee = getAuthUser()?.employee;
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<CommercialProductCatalog | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!employee?.branch) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setCatalog(null);
    void getMyCommercialProducts({ search: query || undefined, limit: 100 }, controller.signal)
      .then(result => { if (!controller.signal.aborted) setCatalog(result); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudieron consultar las existencias."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [employee?.branch?.id, query]);
  const submit = (event: FormEvent) => { event.preventDefault(); setQuery(search.trim()); };
  if (!employee?.branch) return <section className="my-commerce"><h2>Inventario / Existencias</h2><p>Necesitas un empleado activo con sede asignada. Contacta a un administrador.</p></section>;
  return <section className="my-commerce">
    <header className="my-commerce-heading"><div><span>Consulta comercial</span><h2>Inventario / Existencias</h2><p>Sede: {catalog?.branch.name ?? employee.branch.name}. Consulta de solo lectura.</p></div></header>
    <form className="my-commerce-filters" onSubmit={submit}><label className="is-grow"><span>Buscar producto, variante o SKU</span><input value={search} minLength={2} onChange={event => setSearch(event.target.value)} /></label><button type="submit">Buscar</button></form>
    {loading ? <p role="status">Consultando existencias…</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    {catalog ? <><p>Hasta 100 productos por consulta. Usa el buscador para localizar otras referencias.</p><div className="my-commerce-grid">{catalog.products.map(product => <article key={product.id}>
      <header><h3>{product.name}</h3></header><p>SKU: {product.sku ?? "Sin SKU"}</p>
      {product.has_variants ? <ul className="my-detail-items">{product.variants.map(variant => <li key={variant.id}><div><strong>{variant.display_name || variant.name}</strong><small>SKU: {variant.sku ?? "Sin SKU"}</small></div><span>Existencias: {variant.branch_stock}</span></li>)}</ul> : <p>Existencias: {product.branch_stock}</p>}
    </article>)}</div>{!catalog.products.length ? <p>No hay productos con estos filtros.</p> : null}</> : null}
  </section>;
};
