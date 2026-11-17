import { PREFERENCE_DAYS, PRIVACY_VERSION } from "./config";
export const CONSENT_KEY = "upgrade79_privacy_choice";
export type PrivacyChoice = { version: string; analytics: boolean; updatedAt: number };
export function parseChoice(raw: string | null, now = Date.now()): PrivacyChoice | null {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || value.version !== PRIVACY_VERSION || typeof value.analytics !== "boolean"
      || !Number.isFinite(value.updatedAt) || value.updatedAt > now || now - value.updatedAt >= PREFERENCE_DAYS * 86400000) return null;
    return { version: PRIVACY_VERSION, analytics: value.analytics, updatedAt: value.updatedAt };
  } catch { return null; }
}
export function readChoice(): PrivacyChoice | null {
  try { return parseChoice(localStorage.getItem(CONSENT_KEY)); } catch { return null; }
}
export function saveChoice(analytics: boolean): PrivacyChoice | null {
  const value: PrivacyChoice = { version: PRIVACY_VERSION, analytics, updatedAt: Date.now() };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
    if (!parseChoice(localStorage.getItem(CONSENT_KEY))) return null;
    window.dispatchEvent(new Event("upgrade79:privacy-change"));
    return value;
  } catch { return null; }
}
export const openPrivacyPreferences = () => window.dispatchEvent(new Event("upgrade79:privacy-open"));
