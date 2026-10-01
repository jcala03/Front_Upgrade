import type { Product } from "../types/product";
import { createSeo, seoHead, type PublicBootstrap } from "./model";
import logo from "../assets/logos/upgrade79-logo.png";
let cachedElement: HTMLElement | null = null;
let cachedData: PublicBootstrap | null = null;

export function publicBootstrap(): PublicBootstrap | null {
  if (typeof document === "undefined") return null;
  try {
    const element = document.getElementById("public-bootstrap");
    if (element !== cachedElement) {
      cachedElement = element;
      cachedData = JSON.parse(element?.textContent ?? "null") as PublicBootstrap | null;
    }
    return cachedData?.path === (location.pathname.replace(/\/+$/, "") || "/") ? cachedData : null;
  } catch { return null; }
}

export function updatePublicSeo(path: string, product?: Product, status?: number) {
  // No incluir query strings privadas en canonical, Open Graph o JSON-LD.
  const seo = createSeo(path, __PUBLIC_SITE_URL__, { product, status, query: location.search, image: new URL(logo, __PUBLIC_SITE_URL__).href });
  document.head.querySelectorAll("[data-public-seo], title, meta[name=description], meta[name=robots], link[rel=canonical]").forEach(node => node.remove());
  const template = document.createElement("template");
  template.innerHTML = seoHead(seo);
  document.head.append(template.content);
}
