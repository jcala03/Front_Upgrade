import type { AdminProduct, Product, ProductCommissionPayload, ProductPayload } from "../types/product";
import { handleInactiveAccountResponse } from "../utils/authStorage";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export type ProductSortOption =
  | "featured"
  | "price_asc"
  | "price_desc"
  | "name"
  | "stock"
  | "newest";

export type PublicProductFilters = {
  search?: string;
  category_id?: number | string | null;
  product_brand_id?: number | string | null;
  vehicle_brand_id?: number | string | null;
  vehicle_model_id?: number | string | null;
  vehicle_version_id?: number | string | null;
  vehicle_multimedia_system_id?: number | string | null;
  year?: number | string | null;
  featured?: boolean | null;
  in_stock?: boolean | null;
  min_price?: number | string | null;
  max_price?: number | string | null;
  sort?: ProductSortOption;
  specs?: Record<string, string | number | boolean | string[] | null>;
};

export type AdminProductFilters = Omit<
  PublicProductFilters,
  "in_stock" | "sort"
> & {
  is_active?: boolean | null;
  is_visible?: boolean | null;
  is_featured?: boolean | null;
};

export type ProductPublicationPayload = {
  is_visible: boolean;
  is_featured: boolean;
};

type ProductWritePayload =
  | ProductPayload
  | ProductCommissionPayload
  | ProductPublicationPayload
  | FormData;

type ProductsResponse = {
  data: Product[];
};

type AdminProductsResponse = {
  data: AdminProduct[];
};

type ProductResponse = {
  message?: string;
  data: Product;
};

type AdminProductResponse = {
  message?: string;
  data: AdminProduct;
};

type MessageResponse = {
  message: string;
};

const getCookie = (name: string): string => {
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : "";
};

const csrfHeaders = (): Record<string, string> => {
  const token = getCookie("XSRF-TOKEN");

  if (!token) {
    return {};
  }

  return {
    "X-XSRF-TOKEN": token,
  };
};

const getCsrfCookie = async (): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("No se pudo preparar la sesión segura.");
  }
};

const handleJsonResponse = async <T>(response: Response): Promise<T> => {
  const result = await response.json().catch(() => null);
  handleInactiveAccountResponse(response.status, result);

  if (!response.ok) {
    const validationMessage =
      result?.errors && typeof result.errors === "object"
        ? Object.values(result.errors).flat().join(" ")
        : null;

    throw new Error(
      validationMessage ||
        result?.message ||
        "No se pudo completar la solicitud."
    );
  }

  return result as T;
};

const buildQuery = (
  filters?: Record<string, unknown>,
  parentKey?: string
): string => {
  if (!filters) {
    return "";
  }

  const params = new URLSearchParams();

  const appendValue = (key: string, value: unknown) => {
    if (value === null || value === undefined || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => appendValue(`${key}[]`, item));
      return;
    }

    if (typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(
        ([childKey, childValue]) => {
          appendValue(`${key}[${childKey}]`, childValue);
        }
      );

      return;
    }

    if (typeof value === "boolean") {
      params.append(key, value ? "1" : "0");
      return;
    }

    params.append(key, String(value));
  };

  Object.entries(filters).forEach(([key, value]) => {
    appendValue(parentKey ? `${parentKey}[${key}]` : key, value);
  });

  const query = params.toString();

  return query ? `?${query}` : "";
};

const isFormDataPayload = (
  payload: ProductWritePayload
): payload is FormData => {
  return payload instanceof FormData;
};

const getWriteRequestHeaders = (
  payload: ProductWritePayload
): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...csrfHeaders(),
  };

  if (!isFormDataPayload(payload)) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

const getWriteRequestBody = (payload: ProductWritePayload): BodyInit => {
  if (isFormDataPayload(payload)) {
    return payload;
  }

  return JSON.stringify(payload);
};

/*
|--------------------------------------------------------------------------
| Public products
|--------------------------------------------------------------------------
*/

export const getProducts = async (
  filters?: PublicProductFilters
): Promise<Product[]> => {
  const query = buildQuery(filters);

  const response = await fetch(`${API_BASE_URL}/api/products${query}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const result = await handleJsonResponse<ProductsResponse>(response);

  return result.data;
};

export const getProductBySlug = async (slug: string): Promise<Product> => {
  const response = await fetch(`${API_BASE_URL}/api/products/${slug}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const result = await handleJsonResponse<ProductResponse>(response);

  return result.data;
};

/*
|--------------------------------------------------------------------------
| Admin products
|--------------------------------------------------------------------------
*/

export const getAdminProducts = async (
  filters?: AdminProductFilters
): Promise<AdminProduct[]> => {
  const query = buildQuery(filters);

  const response = await fetch(`${API_BASE_URL}/api/admin/products${query}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  const result = await handleJsonResponse<AdminProductsResponse>(response);

  return result.data;
};

export const createProduct = async (
  payload: ProductWritePayload
): Promise<AdminProduct> => {
  await getCsrfCookie();

  const response = await fetch(`${API_BASE_URL}/api/admin/products`, {
    method: "POST",
    headers: getWriteRequestHeaders(payload),
    credentials: "include",
    body: getWriteRequestBody(payload),
  });

  const result = await handleJsonResponse<AdminProductResponse>(response);

  return result.data;
};

export const updateProduct = async (
  productId: number,
  payload: ProductWritePayload
): Promise<AdminProduct> => {
  await getCsrfCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/admin/products/${productId}`,
    {
      method: "POST",
      headers: getWriteRequestHeaders(payload),
      credentials: "include",
      body: getWriteRequestBody(payload),
    }
  );

  const result = await handleJsonResponse<AdminProductResponse>(response);

  return result.data;
};

export const updateProductPublication = async (
  productId: number,
  payload: ProductPublicationPayload
): Promise<AdminProduct> => {
  return updateProduct(productId, payload);
};

export const deleteProduct = async (productId: number): Promise<void> => {
  await getCsrfCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/admin/products/${productId}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...csrfHeaders(),
      },
      credentials: "include",
    }
  );

  await handleJsonResponse<MessageResponse>(response);
};
