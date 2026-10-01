import type { Product } from "../types/product";
import { brand } from "../data/brand.ts";

export type Seo = {
  title: string; description: string; canonical: string | null;
  robots: string; image: string | null; type: "website" | "product";
  structuredData: Record<string, unknown>[];
};
export type PublicBootstrap = { path: string; product?: Product; products?: Product[]; seo: Seo };

export function siteOrigin(value: string) {
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("PUBLIC_SITE_URL debe ser un origen HTTPS sin ruta ni credenciales (HTTP sólo en loopback).");
  }
  return url.origin;
}

export const plainText = (value: unknown) => String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
export const productPath = (product: Pick<Product, "slug">) => `/tienda/${encodeURIComponent(product.slug)}`;
export const publicVariants = (product: Product) => product.variants?.filter(v => v.is_active && v.is_visible) ?? [];
export function productDescription(product: Product) {
  return plainText(product.description) || [product.name, product.product_category?.name ?? product.category, product.product_brand?.name, product.is_universal ? "Compatibilidad universal" : null].filter(Boolean).join(". ");
}
export function productImages(product: Product) {
  // La principal no necesariamente es sort_order=0. No inferirla de la primera miniatura.
  const urls = [product.image_url, ...(product.images ?? []).filter(i => i.is_primary).map(i => i.image_url), ...(product.images ?? []).filter(i => !i.is_primary).map(i => i.image_url)];
  return [...new Set(urls.filter((u): u is string => Boolean(u) && /^https?:\/\//.test(u!)))];
}
export const indexableProduct = (p: Product) => Boolean(p.is_active && p.is_visible && p.slug && productImages(p).length);

export function productFacts(product: Product): [string, string][] {
  const facts: [string, string][] = [];
  if (product.sku) facts.push(["SKU", product.sku]);
  if (product.product_category?.name || product.category) facts.push(["Categoría", product.product_category?.name ?? product.category!]);
  if (product.product_brand?.name) facts.push(["Marca", product.product_brand.name]);
  if (product.is_universal) facts.push(["Compatibilidad", "Universal"]);
  for (const compatibility of product.vehicle_compatibilities ?? []) {
    if (compatibility.vehicle_label) facts.push(["Compatible con", compatibility.vehicle_label]);
  }
  for (const spec of product.spec_values ?? []) {
    const value = spec.value_text ?? spec.value_number ?? (spec.value_boolean == null ? null : spec.value_boolean ? "Sí" : "No");
    if (value != null && spec.field?.name) facts.push([spec.field.name, String(value)]);
  }
  for (const [name, value] of Object.entries(product.technical_specs ?? {})) {
    if (value != null) facts.push([name, typeof value === "boolean" ? value ? "Sí" : "No" : String(value)]);
  }
  return facts;
}

export function createSeo(path: string, origin: string, options: { product?: Product; image?: string; query?: string; status?: number } = {}): Seo {
  const site = siteOrigin(origin);
  const schema = "https://schema.org";
  const base: Seo = { title: `${brand.name} | Personalización automotriz en Barranquilla`, description: "Tecnología, diseño y transformación automotriz en Barranquilla, Colombia. Explora artículos para tu vehículo en UP GRADE 79.", canonical: `${site}/`, robots: "index, follow", image: options.image ?? null, type: "website", structuredData: [] };
  const breadcrumbs = (items: [string, string][]) => ({ "@context": schema, "@type": "BreadcrumbList", itemListElement: items.map(([name, item], index) => ({ "@type": "ListItem", position: index + 1, name, item: site + item })) });
  if (path === "/") {
    base.structuredData = [
      { "@context": schema, "@type": "Organization", "@id": `${site}/#organization`, name: brand.name, url: `${site}/`, ...(options.image ? { logo: options.image } : {}), telephone: brand.phone, sameAs: [brand.instagramUrl] },
      { "@context": schema, "@type": "WebSite", "@id": `${site}/#website`, name: brand.name, url: `${site}/`, inLanguage: "es-CO" },
    ];
  } else if (path === "/tienda") {
    base.title = `Tienda de artículos automotrices | ${brand.name}`;
    base.description = "Encuentra artículos para tu vehículo. Filtra por categoría, marca y compatibilidad; consulta precios en COP y disponibilidad en nuestra red.";
    base.canonical = `${site}/tienda`;
    base.structuredData = [breadcrumbs([["Inicio", "/"], ["Tienda", "/tienda"]])];
    const query = new URLSearchParams(options.query);
    if ([...query.keys()].some(key => !/^(utm_.+|gclid|fbclid|msclkid)$/.test(key))) base.robots = "noindex, follow";
  } else if (options.product && indexableProduct(options.product)) {
    const product = options.product;
    base.canonical = site + productPath(product);
    base.title = `${product.name} | ${brand.name}`;
    base.description = productDescription(product).slice(0, 170);
    const images = productImages(product);
    base.image = images[0] ?? null;
    base.type = "product";
    const variants = publicVariants(product);
    const sources = variants.length ? variants : product.has_variants ? [] : [product];
    const offers = sources.filter(p => Number.isFinite(Number(p.price)) && Number(p.price) > 0).map(p => ({ "@type": "Offer", url: base.canonical, priceCurrency: "COP", price: Number(p.price), availability: `${schema}/${Number(p.stock) > 0 ? "InStock" : "OutOfStock"}`, ...(p !== product ? { name: p.name } : {}) }));
    base.structuredData = [breadcrumbs([["Inicio", "/"], ["Tienda", "/tienda"], [product.name, productPath(product)]]),
      { "@context": schema, "@type": "Product", "@id": `${base.canonical}#product`, name: product.name, url: base.canonical, description: productDescription(product), image: images, ...(product.sku ? { sku: product.sku } : {}), ...(product.product_brand?.name ? { brand: { "@type": "Brand", name: product.product_brand.name } } : {}), ...(offers.length ? { offers: offers.length === 1 ? offers[0] : offers } : {}) },
    ];
  } else {
    const privateRoute = /^(\/crm(?:\/|$)|\/admin(?:\/|$)|\/login$|\/carrito$|\/checkout(?:\/|$)|\/orden-confirmada$)/.test(path);
    base.title = `${privateRoute ? "Área privada" : "Página no encontrada"} | ${brand.name}`;
    base.description = privateRoute ? "Acceso privado a UP GRADE 79." : "Esta página no está disponible. Explora los artículos de nuestra tienda.";
    base.canonical = null;
    base.image = null;
    base.robots = "noindex, nofollow";
  }
  if (options.status && options.status >= 400) {
    base.robots = "noindex, nofollow"; base.canonical = null; base.structuredData = []; base.image = null;
    if (options.status === 503) { base.title = `Temporalmente no disponible | ${brand.name}`; base.description = "No pudimos consultar el catálogo. Intenta nuevamente en unos momentos."; }
  }
  return base;
}

export const escapeHtml = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export const safeJson = (value: unknown) => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
export function seoHead(seo: Seo) {
  const meta = (name: string, value: string, property = false) => `<meta ${property ? "property" : "name"}="${name}" content="${escapeHtml(value)}" data-public-seo>`;
  return [ `<title>${escapeHtml(seo.title)}</title>`, meta("description", seo.description), meta("robots", seo.robots),
    ...(seo.canonical ? [`<link rel="canonical" href="${escapeHtml(seo.canonical)}" data-public-seo>`] : []),
    meta("og:title", seo.title, true), meta("og:description", seo.description, true), meta("og:type", seo.type, true), meta("og:site_name", brand.name, true), meta("og:locale", "es_CO", true),
    ...(seo.canonical ? [meta("og:url", seo.canonical, true)] : []), ...(seo.image ? [meta("og:image", seo.image, true), meta("og:image:alt", seo.title, true)] : []),
    meta("twitter:card", seo.image && seo.type === "product" ? "summary_large_image" : "summary"), meta("twitter:title", seo.title), meta("twitter:description", seo.description), ...(seo.image ? [meta("twitter:image", seo.image), meta("twitter:image:alt", seo.title)] : []),
    ...seo.structuredData.map(data => `<script type="application/ld+json" data-public-seo>${safeJson(data)}</script>`),
  ].join("\n");
}

export function sitemapXml(products: Product[], siteUrl: string) {
  const origin = siteOrigin(siteUrl);
  const paths = ["/", "/tienda", ...products.filter(indexableProduct).map(productPath)];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(paths)].map(path => `<url><loc>${escapeHtml(origin + path)}</loc></url>`).join("")}</urlset>`;
}
