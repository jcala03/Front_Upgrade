import type { AuthUser, LoginResponse, MeResponse } from "../types/auth";
import { handleInactiveAccountResponse } from "../utils/authStorage";

export class AuthApiError extends Error {
  constructor(message: string, public status: number, public errors: Record<string, string[]> = {}) {
    super(message);
    this.name = "AuthApiError";
  }
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

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

export const getCsrfCookie = async (): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("No se pudo preparar la sesión segura.");
  }
};

export const login = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  await getCsrfCookie();

  const formData = new FormData();

  formData.append("email", email);
  formData.append("password", password);

  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...csrfHeaders(),
    },
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    throw new AuthApiError(
      response.status === 429 ? "Demasiados intentos. Intenta nuevamente en un momento." : error?.message ?? "No se pudo iniciar sesión. Revisa tus credenciales.",
      response.status,
      error?.errors ?? {}
    );
  }

  return response.json() as Promise<LoginResponse>;
};

export const getMe = async (): Promise<MeResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    handleInactiveAccountResponse(response.status, result);
    throw new Error("No hay sesión activa.");
  }

  return response.json() as Promise<MeResponse>;
};

export const logout = async (): Promise<void> => {
  await getCsrfCookie();

  await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...csrfHeaders(),
    },
    credentials: "include",
  });
};

const authenticatedPatch = async <T,>(path: string, payload: object): Promise<T> => {
  await getCsrfCookie();
  const response = await fetch(`${API_BASE_URL}${path}`, { method: "PATCH", credentials: "include", headers: { Accept: "application/json", "Content-Type": "application/json", ...csrfHeaders() }, body: JSON.stringify(payload) });
  const result = await response.json().catch(() => null);
  handleInactiveAccountResponse(response.status, result);
  if (response.status === 401) { window.location.href = "/login"; throw new AuthApiError("Tu sesión ha terminado.", 401); }
  if (!response.ok) {
    const errors = (result?.errors ?? {}) as Record<string, string[]>;
    throw new AuthApiError(Object.values(errors).flat()[0] ?? result?.message ?? "No se pudo completar la solicitud.", response.status, errors);
  }
  return result as T;
};

export const updateMe = async (payload: { name: string; email: string }) => {
  const result = await authenticatedPatch<{ user?: AuthUser; data?: AuthUser }>("/api/auth/me", payload);
  return result.user ?? result.data as AuthUser;
};

export const updateMyPassword = (payload: { current_password: string; password: string; password_confirmation: string }) => authenticatedPatch<{ message: string }>("/api/auth/me/password", payload);
