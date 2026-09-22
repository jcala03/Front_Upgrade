import { handleInactiveAccountResponse } from "../utils/authStorage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export type ValidationErrors = Record<string, string[]>;
export type ApiMetadata = Record<string, unknown>;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors: ValidationErrors = {},
    public readonly metadata: ApiMetadata = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type QueryPrimitive = string | number | boolean;
export type QueryValue = QueryPrimitive | readonly QueryPrimitive[] | null | undefined;
export type QueryParams = Record<string, QueryValue>;

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  query?: QueryParams;
  csrf?: boolean;
};

const xsrfCookie = () => {
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : "";
};

export const buildQueryString = (query: QueryParams = {}) => {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(`${key}[]`, String(item)));
      return;
    }

    params.set(key, String(value));
  });

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

const prepareCsrf = async (signal?: AbortSignal) => {
  const response = await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, {
    credentials: "include",
    signal,
  });

  if (!response.ok) {
    throw new ApiError("No se pudo preparar la sesión segura.", response.status);
  }
};

const objectValue = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const validationErrors = (payload: Record<string, unknown> | null): ValidationErrors => {
  const candidate = objectValue(payload?.errors);
  if (!candidate) return {};

  return Object.fromEntries(
    Object.entries(candidate).flatMap(([field, messages]) => {
      if (!Array.isArray(messages)) return [];
      const strings = messages.filter((message): message is string => typeof message === "string");
      return strings.length ? [[field, strings]] : [];
    }),
  );
};

const errorMetadata = (payload: Record<string, unknown> | null): ApiMetadata => {
  if (!payload) return {};
  const rootMetadata = Object.fromEntries(
    Object.entries(payload).filter(([key]) => !["message", "errors", "data", "meta"].includes(key)),
  );
  const metadata = {
    ...rootMetadata,
    ...(objectValue(payload.meta) ?? {}),
    ...(objectValue(payload.data) ?? {}),
  };
  const reasonCodes = payload.reason_codes ?? metadata.reason_codes;

  return reasonCodes === undefined ? metadata : { ...metadata, reason_codes: reasonCodes };
};

const parseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204 || response.headers.get("content-length") === "0") return null;
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

export const apiRequest = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const { body, query, csrf, signal, headers, ...init } = options;
  const method = (init.method ?? "GET").toUpperCase();
  const requiresCsrf = csrf ?? !["GET", "HEAD", "OPTIONS"].includes(method);

  try {
    if (requiresCsrf) await prepareCsrf(signal ?? undefined);

    const token = xsrfCookie();
    const hasBody = body !== undefined;
    const response = await fetch(`${API_BASE_URL}${path}${buildQueryString(query)}`, {
      ...init,
      signal,
      credentials: "include",
      body: hasBody ? JSON.stringify(body) : undefined,
      headers: {
        Accept: "application/json",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(token ? { "X-XSRF-TOKEN": token } : {}),
        ...headers,
      },
    });
    const payload = await parseBody(response);
    const payloadObject = objectValue(payload);
    handleInactiveAccountResponse(response.status, payloadObject);

    if (response.status === 401) {
      window.location.href = "/login";
      throw new ApiError("Tu sesión ha terminado.", 401);
    }

    if (!response.ok) {
      const errors = validationErrors(payloadObject);
      const firstValidationMessage = Object.values(errors).flat()[0];
      const responseMessage = typeof payloadObject?.message === "string" ? payloadObject.message : null;
      const fallback = response.status === 403
        ? "No tienes permiso para realizar esta acción."
        : response.status === 404
          ? "El recurso solicitado ya no está disponible."
          : "No se pudo completar la solicitud.";

      throw new ApiError(
        firstValidationMessage ?? responseMessage ?? fallback,
        response.status,
        errors,
        errorMetadata(payloadObject),
      );
    }

    return payload as T;
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    if (cause instanceof ApiError) throw cause;
    throw new ApiError("No pudimos conectar con el servidor. Intenta nuevamente.", 0);
  }
};

export type ApiDownload = { blob: Blob; filename: string | null; contentType: string | null };

const downloadFilename = (header: string | null) => {
  if (!header) return null;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
  if (encoded) {
    try { return decodeURIComponent(encoded); } catch { return encoded; }
  }
  return /filename="?([^";]+)"?/i.exec(header)?.[1]?.trim() ?? null;
};

export const apiDownload = async (path: string, query: QueryParams = {}, signal?: AbortSignal): Promise<ApiDownload> => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}${buildQueryString(query)}`, {
      method: "GET",
      credentials: "include",
      signal,
      headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json" },
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError("No pudimos conectar con el servidor. Intenta nuevamente.", 0);
  }

  if (response.status === 401) {
    window.location.href = "/login";
    throw new ApiError("Tu sesión ha terminado.", 401);
  }
  if (!response.ok) {
    const payload = objectValue(await parseBody(response));
    handleInactiveAccountResponse(response.status, payload);
    const errors = validationErrors(payload);
    const message = Object.values(errors).flat()[0]
      ?? (typeof payload?.message === "string" ? payload.message : null)
      ?? (response.status === 403 ? "No tienes permiso para exportar este reporte." : "No se pudo exportar el reporte.");
    throw new ApiError(message, response.status, errors, errorMetadata(payload));
  }

  return {
    blob: await response.blob(),
    filename: downloadFilename(response.headers.get("Content-Disposition")),
    contentType: response.headers.get("Content-Type"),
  };
};

export const getApiBaseUrl = () => API_BASE_URL;
