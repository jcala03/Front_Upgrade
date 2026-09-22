export const CRM_TIME_ZONE = "America/Bogota";

const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const timeOnlyPattern = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
const localDateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CRM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const zonedParts = (date: Date) => Object.fromEntries(
  partsFormatter.formatToParts(date)
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, Number(part.value)]),
) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;

const validCalendarDate = (year: number, month: number, day: number) => {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year
    && candidate.getUTCMonth() === month - 1
    && candidate.getUTCDate() === day;
};

export const isDateOnly = (value: string) => {
  const match = dateOnlyPattern.exec(value);
  return Boolean(match && validCalendarDate(Number(match[1]), Number(match[2]), Number(match[3])));
};

export const normalizeDateOnly = (value: string | null | undefined) => {
  const normalized = value?.slice(0, 10) ?? "";
  return isDateOnly(normalized) ? normalized : null;
};

export const formatDateOnly = (value: string | null | undefined, locale = "es-CO") => {
  const normalized = normalizeDateOnly(value);
  if (!normalized) return "—";
  const [year, month, day] = normalized.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
};

export const addDateOnlyDays = (value: string, days: number) => {
  if (!isDateOnly(value) || !Number.isInteger(days)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};

export const normalizeTimeOnly = (value: string | null | undefined) => {
  const match = timeOnlyPattern.exec(value ?? "");
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? 0);
  if (hour > 23 || minute > 59 || second > 59) return null;
  return `${match[1]}:${match[2]}`;
};

export const formatTimeOnly = (value: string | null | undefined, locale = "es-CO") => {
  const normalized = normalizeTimeOnly(value);
  if (!normalized) return "—";
  const [hour, minute] = normalized.split(":").map(Number);
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" })
    .format(new Date(Date.UTC(2000, 0, 1, hour, minute)));
};

export const isTimeRangeValid = (startsAt: string, endsAt: string) => {
  const start = normalizeTimeOnly(startsAt);
  const end = normalizeTimeOnly(endsAt);
  return Boolean(start && end && end > start);
};

export const parseTimestamp = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatCrmTimestamp = (
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
  locale = "es-CO",
) => {
  const date = parseTimestamp(value);
  return date ? new Intl.DateTimeFormat(locale, { ...options, timeZone: CRM_TIME_ZONE }).format(date) : "—";
};

export const timestampToBogotaDateTimeLocal = (value: string | null | undefined) => {
  const date = parseTimestamp(value);
  if (!date) return null;
  const parts = zonedParts(date);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
};

const parseLocalDateTime = (value: string) => {
  const match = localDateTimePattern.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match.slice(1).map((part) => Number(part ?? 0));
  if (!validCalendarDate(year, month, day) || hour > 23 || minute > 59 || second > 59) return null;
  return { year, month, day, hour, minute, second };
};

export const isSameLocalDateTimeDay = (startsAt: string, endsAt: string) => {
  const start = parseLocalDateTime(startsAt);
  const end = parseLocalDateTime(endsAt);
  return Boolean(start && end
    && start.year === end.year
    && start.month === end.month
    && start.day === end.day);
};

export const bogotaDateTimeLocalToTimestamp = (value: string) => {
  const desired = parseLocalDateTime(value);
  if (!desired) return null;

  const desiredAsUtc = Date.UTC(desired.year, desired.month - 1, desired.day, desired.hour, desired.minute, desired.second);
  let candidate = desiredAsUtc;

  // Intl supplies the timezone rules. Iteration avoids assuming a fixed UTC offset.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = zonedParts(new Date(candidate));
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    const difference = desiredAsUtc - actualAsUtc;
    candidate += difference;
    if (difference === 0) break;
  }

  const roundTrip = zonedParts(new Date(candidate));
  if (Object.entries(desired).some(([key, part]) => roundTrip[key as keyof typeof roundTrip] !== part)) return null;
  return new Date(candidate).toISOString();
};

export const isDateTimeRangeValid = (startsAt: string, endsAt: string) => {
  const start = bogotaDateTimeLocalToTimestamp(startsAt);
  const end = bogotaDateTimeLocalToTimestamp(endsAt);
  return Boolean(start && end && Date.parse(end) > Date.parse(start));
};
