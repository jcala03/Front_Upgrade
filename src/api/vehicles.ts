import type {
  VehicleBrand,
  VehicleBrandPayload,
  VehicleModel,
  VehicleModelPayload,
  VehicleMultimediaSystem,
  VehicleMultimediaSystemPayload,
  VehicleVersion,
  VehicleVersionMultimediaSystemsSyncPayload,
  VehicleVersionPayload,
} from "../types/vehicle";
import { handleInactiveAccountResponse } from "../utils/authStorage";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type VehicleBrandsResponse = {
  data: VehicleBrand[];
};

type VehicleBrandResponse = {
  message?: string;
  data: VehicleBrand;
};

type VehicleModelsResponse = {
  data: VehicleModel[];
};

type VehicleModelResponse = {
  message?: string;
  data: VehicleModel;
};

type VehicleVersionsResponse = {
  data: VehicleVersion[];
};

type VehicleVersionResponse = {
  message?: string;
  data: VehicleVersion;
};

type VehicleMultimediaSystemsResponse = {
  data: VehicleMultimediaSystem[];
};

type VehicleMultimediaSystemResponse = {
  message?: string;
  data: VehicleMultimediaSystem;
};

type QueryFilters = Record<string, string | number | boolean | null | undefined>;

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
    throw new Error(result?.message ?? "No se pudo completar la solicitud.");
  }

  return result as T;
};

const buildQuery = (filters?: QueryFilters) => {
  if (!filters) {
    return "";
  }

  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }

    if (typeof value === "boolean") {
      params.append(key, value ? "1" : "0");
      return;
    }

    params.append(key, String(value));
  });

  const query = params.toString();

  return query ? `?${query}` : "";
};

/*
|--------------------------------------------------------------------------
| Public vehicle brands
|--------------------------------------------------------------------------
*/

export const getVehicleBrands = async (): Promise<VehicleBrand[]> => {
  const response = await fetch(`${API_BASE_URL}/api/vehicle-brands`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const result = await handleJsonResponse<VehicleBrandsResponse>(response);

  return result.data;
};

/*
|--------------------------------------------------------------------------
| Public vehicle models
|--------------------------------------------------------------------------
*/

export const getVehicleModels = async (
  filters?: QueryFilters
): Promise<VehicleModel[]> => {
  const query = buildQuery(filters);

  const response = await fetch(`${API_BASE_URL}/api/vehicle-models${query}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const result = await handleJsonResponse<VehicleModelsResponse>(response);

  return result.data;
};

/*
|--------------------------------------------------------------------------
| Public vehicle versions
|--------------------------------------------------------------------------
*/

export const getVehicleVersions = async (
  filters?: QueryFilters
): Promise<VehicleVersion[]> => {
  const query = buildQuery(filters);

  const response = await fetch(`${API_BASE_URL}/api/vehicle-versions${query}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const result = await handleJsonResponse<VehicleVersionsResponse>(response);

  return result.data;
};

/*
|--------------------------------------------------------------------------
| Public vehicle multimedia systems
|--------------------------------------------------------------------------
*/

export const getVehicleMultimediaSystems = async (
  filters?: QueryFilters
): Promise<VehicleMultimediaSystem[]> => {
  const query = buildQuery(filters);

  const response = await fetch(
    `${API_BASE_URL}/api/vehicle-multimedia-systems${query}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  const result =
    await handleJsonResponse<VehicleMultimediaSystemsResponse>(response);

  return result.data;
};

/*
|--------------------------------------------------------------------------
| Admin vehicle brands
|--------------------------------------------------------------------------
*/

export const getAdminVehicleBrands = async (): Promise<VehicleBrand[]> => {
  const response = await fetch(`${API_BASE_URL}/api/admin/vehicle-brands`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  const result = await handleJsonResponse<VehicleBrandsResponse>(response);

  return result.data;
};

export const createVehicleBrand = async (
  payload: VehicleBrandPayload
): Promise<VehicleBrand> => {
  await getCsrfCookie();

  const response = await fetch(`${API_BASE_URL}/api/admin/vehicle-brands`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const result = await handleJsonResponse<VehicleBrandResponse>(response);

  return result.data;
};

export const updateVehicleBrand = async (
  vehicleBrandId: number,
  payload: VehicleBrandPayload
): Promise<VehicleBrand> => {
  await getCsrfCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/admin/vehicle-brands/${vehicleBrandId}`,
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

  const result = await handleJsonResponse<VehicleBrandResponse>(response);

  return result.data;
};

export const deleteVehicleBrand = async (
  vehicleBrandId: number
): Promise<void> => {
  await getCsrfCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/admin/vehicle-brands/${vehicleBrandId}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...csrfHeaders(),
      },
      credentials: "include",
    }
  );

  await handleJsonResponse<{ message: string }>(response);
};

/*
|--------------------------------------------------------------------------
| Admin vehicle models
|--------------------------------------------------------------------------
*/

export const getAdminVehicleModels = async (
  filters?: QueryFilters
): Promise<VehicleModel[]> => {
  const query = buildQuery(filters);

  const response = await fetch(
    `${API_BASE_URL}/api/admin/vehicle-models${query}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
    }
  );

  const result = await handleJsonResponse<VehicleModelsResponse>(response);

  return result.data;
};

export const createVehicleModel = async (
  payload: VehicleModelPayload
): Promise<VehicleModel> => {
  await getCsrfCookie();

  const response = await fetch(`${API_BASE_URL}/api/admin/vehicle-models`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const result = await handleJsonResponse<VehicleModelResponse>(response);

  return result.data;
};

export const updateVehicleModel = async (
  vehicleModelId: number,
  payload: VehicleModelPayload
): Promise<VehicleModel> => {
  await getCsrfCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/admin/vehicle-models/${vehicleModelId}`,
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

  const result = await handleJsonResponse<VehicleModelResponse>(response);

  return result.data;
};

export const deleteVehicleModel = async (
  vehicleModelId: number
): Promise<void> => {
  await getCsrfCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/admin/vehicle-models/${vehicleModelId}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...csrfHeaders(),
      },
      credentials: "include",
    }
  );

  await handleJsonResponse<{ message: string }>(response);
};

/*
|--------------------------------------------------------------------------
| Admin vehicle versions
|--------------------------------------------------------------------------
*/

export const getAdminVehicleVersions = async (
  filters?: QueryFilters
): Promise<VehicleVersion[]> => {
  const query = buildQuery(filters);

  const response = await fetch(
    `${API_BASE_URL}/api/admin/vehicle-versions${query}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
    }
  );

  const result = await handleJsonResponse<VehicleVersionsResponse>(response);

  return result.data;
};

export const createVehicleVersion = async (
  payload: VehicleVersionPayload
): Promise<VehicleVersion> => {
  await getCsrfCookie();

  const response = await fetch(`${API_BASE_URL}/api/admin/vehicle-versions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...csrfHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const result = await handleJsonResponse<VehicleVersionResponse>(response);

  return result.data;
};

export const updateVehicleVersion = async (
  vehicleVersionId: number,
  payload: VehicleVersionPayload
): Promise<VehicleVersion> => {
  await getCsrfCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/admin/vehicle-versions/${vehicleVersionId}`,
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

  const result = await handleJsonResponse<VehicleVersionResponse>(response);

  return result.data;
};

export const syncVehicleVersionMultimediaSystems = async (
  vehicleVersionId: number,
  payload: VehicleVersionMultimediaSystemsSyncPayload
): Promise<VehicleVersion> => {
  await getCsrfCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/admin/vehicle-versions/${vehicleVersionId}/multimedia-systems`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...csrfHeaders(),
      },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );

  const result = await handleJsonResponse<VehicleVersionResponse>(response);

  return result.data;
};

export const deleteVehicleVersion = async (
  vehicleVersionId: number
): Promise<void> => {
  await getCsrfCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/admin/vehicle-versions/${vehicleVersionId}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...csrfHeaders(),
      },
      credentials: "include",
    }
  );

  await handleJsonResponse<{ message: string }>(response);
};

/*
|--------------------------------------------------------------------------
| Admin vehicle multimedia systems
|--------------------------------------------------------------------------
*/

export const getAdminVehicleMultimediaSystems = async (
  filters?: QueryFilters
): Promise<VehicleMultimediaSystem[]> => {
  const query = buildQuery(filters);

  const response = await fetch(
    `${API_BASE_URL}/api/admin/vehicle-multimedia-systems${query}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
    }
  );

  const result =
    await handleJsonResponse<VehicleMultimediaSystemsResponse>(response);

  return result.data;
};

export const createVehicleMultimediaSystem = async (
  payload: VehicleMultimediaSystemPayload
): Promise<VehicleMultimediaSystem> => {
  await getCsrfCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/admin/vehicle-multimedia-systems`,
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

  const result =
    await handleJsonResponse<VehicleMultimediaSystemResponse>(response);

  return result.data;
};

export const updateVehicleMultimediaSystem = async (
  vehicleMultimediaSystemId: number,
  payload: VehicleMultimediaSystemPayload
): Promise<VehicleMultimediaSystem> => {
  await getCsrfCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/admin/vehicle-multimedia-systems/${vehicleMultimediaSystemId}`,
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

  const result =
    await handleJsonResponse<VehicleMultimediaSystemResponse>(response);

  return result.data;
};

export const deleteVehicleMultimediaSystem = async (
  vehicleMultimediaSystemId: number
): Promise<void> => {
  await getCsrfCookie();

  const response = await fetch(
    `${API_BASE_URL}/api/admin/vehicle-multimedia-systems/${vehicleMultimediaSystemId}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...csrfHeaders(),
      },
      credentials: "include",
    }
  );

  await handleJsonResponse<{ message: string }>(response);
};
