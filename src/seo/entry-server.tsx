import { renderToString } from "react-dom/server";
import { CartProvider } from "../context/CartContext";
import { Layout } from "../components/layout/Layout";
import { Hero } from "../components/sections/Hero";
import { Transformation } from "../components/sections/Transformation";
import { FeaturedProducts } from "../components/sections/FeaturedProducts";
import { Atelier } from "../components/sections/Atelier";
import { Contact } from "../components/sections/Contact";
import { ShopPage } from "../pages/Shop";
import { ProductDetailPage } from "../pages/ProductDetail";
import { PublicNotFound } from "../pages/PublicNotFound";
import logo from "../assets/logos/upgrade79-logo.png";
import type { Product } from "../types/product";
import { createSeo, indexableProduct, safeJson, seoHead, siteOrigin, sitemapXml, type PublicBootstrap } from "./model";

type Options = { siteUrl: string; apiBase: string };
type Response = { status: number; body: string; headers: Record<string, string> };
export const buildOptions = { siteUrl: __PUBLIC_SITE_URL__, apiBase: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000" };

async function publicApi(path: string, options: Options) {
  // Contrato público únicamente. Nunca reenviar cookies, auth, tokens o query del visitante.
  const response = await fetch(`${options.apiBase.replace(/\/$/, "")}/api/products${path}`, { headers: { Accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(5000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Catálogo no disponible");
  return (await response.json()).data;
}

export async function renderRequest(requestUrl: string, template: string, options: Options): Promise<Response> {
  const origin = siteOrigin(options.siteUrl);
  const url = new URL(requestUrl, "http://localhost");
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const headers: Record<string, string> = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
  if (path === "/robots.txt") return { status: 200, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" }, body: `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n` };
  if (path === "/sitemap.xml") {
    try {
      const products = await publicApi("?in_stock=0", options);
      if (!Array.isArray(products)) throw new Error("Respuesta inválida");
      return { status: 200, headers: { ...headers, "Content-Type": "application/xml; charset=utf-8" }, body: sitemapXml(products, origin) };
    } catch { return { status: 503, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8", "Retry-After": "60", "X-Robots-Tag": "noindex, nofollow" }, body: "Sitemap temporalmente no disponible." }; }
  }
  const privateRoute = /^(\/crm(?:\/|$)|\/admin(?:\/|$)|\/login$|\/carrito$|\/checkout(?:\/|$)|\/orden-confirmada$)/.test(path);
  let product: Product | undefined;
  let products: Product[] | undefined;
  let status = 200;
  try {
    if (path === "/" || path === "/tienda") {
      const data = await publicApi(path === "/tienda" ? "?in_stock=1&sort=featured" : "", options);
      if (!Array.isArray(data)) throw new Error("Respuesta inválida");
      products = data;
    } else if (/^\/tienda\/[^/]+$/.test(path)) {
      product = await publicApi(`/${encodeURIComponent(decodeURIComponent(path.slice(8)))}`, options) ?? undefined;
      if (!product || !indexableProduct(product)) { product = undefined; status = 404; }
    } else if (!privateRoute) status = 404;
  } catch (error) { status = error instanceof URIError ? 404 : 503; }
  const seo = createSeo(path, origin, { product, query: url.search, status, image: new URL(logo, origin).href });
  headers["X-Robots-Tag"] = seo.robots;
  if (status === 503) headers["Retry-After"] = "60";
  const bootstrap: PublicBootstrap = { path, seo, ...(product ? { product } : {}), ...(products ? { products } : {}) };
  const content = privateRoute ? <main><p>Área privada. Cargando aplicación…</p></main> :
    <CartProvider><Layout pathname={path}>{status >= 400 ? <PublicNotFound unavailable={status === 503} /> : path === "/" ? <main><Hero /><Transformation /><FeaturedProducts initialProducts={products} /><Atelier /><Contact /></main> : path === "/tienda" ? <ShopPage initialProducts={products} /> : <ProductDetailPage slug={product!.slug} initialProduct={product} />}</Layout></CartProvider>;
  // Mismos componentes y datos públicos para humanos y crawlers, sin detectar User-Agent.
  const body = template.replace("<!--seo-head-->", seoHead(seo)).replace('<div id="root"></div>', `<div id="root">${renderToString(content)}</div>${privateRoute || status >= 400 ? "" : `<script id="public-bootstrap" type="application/json">${safeJson(bootstrap)}</script>`}`);
  return { status, headers, body };
}
