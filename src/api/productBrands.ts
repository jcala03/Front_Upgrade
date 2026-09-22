import type { ProductBrand, ProductBrandPayload } from "../types/productBrand";
import { handleInactiveAccountResponse } from "../utils/authStorage";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type ProductBrandsResponse = {
  data: ProductBrand[];
};

type ProductBrandResponse = {
  message?: string;
  data: ProductBrand;
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

  return token ? { "X-XSRF-TOKEN": token } : {};
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
    throw new Error(result?.message ?? "No se pudo completar la solicitud.");
  }

  return result as T;
};

export const getProductBrands = async (): Promise<ProductBrand[]> => {
  const response = await fetch(`${API_BASE_URL}/api/product-brands`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const result = await handleJsonResponse<ProductBrandsResponse>(response);

  return result.data;
};

export const getAdminProductBrands = async (): Promise<ProductBrand[]> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/product-brands`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const result = await handleJsonResponse<ProductBrandsResponse>(response);

  return result.data;
};

export const createProductBrand = async (
  payload: ProductBrandPayload
): Promise<ProductBrand> => {
  await getCsrfCookie();

  const response = await fetch(`${API_BASE_URL}/api/admin/product-brands`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const result = await handleJsonResponse<ProductBrandResponse>(response);

  return result.data;
};

export const updateProductBrand = async (
  productBrandId: number,
  payload: ProductBrandPayload
): Promise<ProductBrand> => {
  await getCsrfCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/admin/product-brands/${productBrandId}`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...csrfHeaders(),
      },
      body: JSON.stringify(payload),
    }
  );

  const result = await handleJsonResponse<ProductBrandResponse>(response);

  return result.data;
};

export const deleteProductBrand = async (
  productBrandId: number
): Promise<void> => {
  await getCsrfCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/admin/product-brands/${productBrandId}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...csrfHeaders(),
      },
    }
  );

  await handleJsonResponse<{ message: string }>(response);
};
