// Unlike authenticated API requests, public images need no same-origin dev
// proxy. Use the configured backend because Vite does not expose /storage.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
const STORAGE_BASE_URL = import.meta.env.VITE_PUBLIC_STORAGE_URL;

/** Full disk URL, independent of the API/auth bridge; also usable in SSR. */
export function resolveProductImageUrl(
  imageUrl?: string | null,
  storageBaseUrl?: string,
  apiBaseUrl = "",
) {
  if (!imageUrl) {
    return "";
  }

  if (/^(?:https?:)?\/\//i.test(imageUrl) || /^(?:blob:|data:image\/)/i.test(imageUrl)) {
    return imageUrl;
  }

  const base = (storageBaseUrl?.trim() || `${apiBaseUrl.replace(/\/+$/, "")}/storage`).replace(/\/+$/, "");
  const path = imageUrl.replace(/^\/+/, "").replace(/^storage\//, "");
  return `${base}/${path}`;
}

export const getProductImageUrl = (imageUrl?: string | null) =>
  resolveProductImageUrl(imageUrl, STORAGE_BASE_URL, API_BASE_URL);
