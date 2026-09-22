import type {
  ProductCategory,
  ProductCategoryPayload,
} from "../types/productCategory";
import { handleInactiveAccountResponse } from "../utils/authStorage";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type ProductCategoriesResponse = {
  data: ProductCategory[];
};

type ProductCategoryResponse = {
  message: string;
  data: ProductCategory;
};

export type DeleteProductCategoryResponse = {
  message: string;
  action: "deleted" | "deactivated";
  data?: ProductCategory;
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

export const getProductCategories = async (): Promise<ProductCategory[]> => {
  const response = await fetch(`${API_BASE_URL}/api/product-categories`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const result = await handleJsonResponse<ProductCategoriesResponse>(response);

  return result.data;
};

export const getAdminProductCategories = async (): Promise<ProductCategory[]> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/product-categories`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  const result = await handleJsonResponse<ProductCategoriesResponse>(response);

  return result.data;
};

export const createProductCategory = async (
  payload: ProductCategoryPayload
): Promise<ProductCategory> => {
  await getCsrfCookie();

  const response = await fetch(`${API_BASE_URL}/api/admin/product-categories`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const result = await handleJsonResponse<ProductCategoryResponse>(response);

  return result.data;
};

export const updateProductCategory = async (
  categoryId: number,
  payload: ProductCategoryPayload
): Promise<ProductCategory> => {
  await getCsrfCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/admin/product-categories/${categoryId}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...csrfHeaders(),
      },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );

  const result = await handleJsonResponse<ProductCategoryResponse>(response);

  return result.data;
};

export const deleteProductCategory = async (
  categoryId: number
): Promise<DeleteProductCategoryResponse> => {
  await getCsrfCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/admin/product-categories/${categoryId}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...csrfHeaders(),
      },
      credentials: "include",
    }
  );

  return handleJsonResponse<DeleteProductCategoryResponse>(response);
};
