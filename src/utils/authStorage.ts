import type { AuthUser } from "../types/auth";

const USER_KEY = "upgrade79_crm_user";
const AUTH_NOTICE_KEY = "upgrade79_auth_notice";
const INACTIVE_BACKEND_MESSAGE = "Tu cuenta está desactivada.";
export const INACTIVE_ACCOUNT_NOTICE = "Tu cuenta está inactiva. Contacta a un administrador.";
export const AUTH_USER_EVENT = "crm:auth-user-updated";
let inactiveRedirectStarted = false;

export const saveAuthUser = (user: AuthUser) => {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent<AuthUser>(AUTH_USER_EVENT, { detail: user }));
};

export const getAuthUser = (): AuthUser | null => {
  const rawUser = sessionStorage.getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    const user = JSON.parse(rawUser) as Partial<AuthUser>;

    if (
      typeof user.id !== "number"
      || typeof user.name !== "string"
      || typeof user.email !== "string"
      || (user.role !== "admin" && user.role !== "user")
      || !Array.isArray(user.permissions)
    ) {
      return null;
    }

    return user as AuthUser;
  } catch {
    return null;
  }
};

export const clearAuthSession = () => {
  sessionStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent<AuthUser | null>(AUTH_USER_EVENT, { detail: null }));
};

export const handleInactiveAccountResponse = (status: number, payload: unknown) => {
  const message = payload && typeof payload === "object" && "message" in payload
    ? (payload as { message?: unknown }).message
    : null;
  if (status !== 403 || message !== INACTIVE_BACKEND_MESSAGE) return false;

  clearAuthSession();
  sessionStorage.setItem(AUTH_NOTICE_KEY, INACTIVE_ACCOUNT_NOTICE);
  if (!inactiveRedirectStarted && window.location.pathname !== "/login") {
    inactiveRedirectStarted = true;
    window.location.replace("/login");
  }
  return true;
};

export const consumeAuthNotice = () => {
  const notice = sessionStorage.getItem(AUTH_NOTICE_KEY) ?? "";
  sessionStorage.removeItem(AUTH_NOTICE_KEY);
  return notice;
};

export const hasPermission = (permission: string) => {
  const user = getAuthUser();

  return Boolean(user?.permissions.includes(permission));
};
