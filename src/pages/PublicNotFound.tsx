export function PublicNotFound({ unavailable = false }: { unavailable?: boolean }) {
  return <main className="product-detail-page"><section className="product-detail-state">
    <h1>{unavailable ? "Catálogo temporalmente no disponible" : "Página no encontrada"}</h1>
    <p>{unavailable ? "Intenta nuevamente en unos momentos." : "Esta dirección no corresponde a una página disponible."}</p>
    {unavailable ? <button type="button" onClick={() => location.reload()}>Reintentar</button> : null}
    <a href="/tienda">Explorar tienda</a><a href="/">Volver al inicio</a>
  </section></main>;
}
