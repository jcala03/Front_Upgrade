// The public storefront uses the same backend contract in every environment.
// In Vite development only, the frontend proxies it on the current origin so
// local QA ports do not require broadening backend CORS or changing CRM auth.
export const PUBLIC_API_BASE_URL = import.meta.env.DEV
  ? "/__public-api"
  : import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
