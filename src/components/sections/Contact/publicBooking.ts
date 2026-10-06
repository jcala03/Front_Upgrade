export const PUBLIC_BOOKING_START = "09:00";
export const PUBLIC_BOOKING_END = "18:00";
// Preferences for a WhatsApp request, NOT evidence of staff availability.
export const PUBLIC_BOOKING_TIMES = Array.from({ length: 19 }, (_, index) => {
  const minutes = 9 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60
  ).padStart(2, "0")}`;
});

export function bogotaToday(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) =>
    Number(parts.find((p) => p.type === name)?.value);
  return new Date(part("year"), part("month") - 1, part("day"));
}

export function selectablePublicDate(date: Date, today: Date): boolean {
  return date.getDay() !== 0 && date >= today;
}

export function allowedPreferredTime(
  date: Date,
  time: string,
  now = new Date()
): boolean {
  if (
    !selectablePublicDate(date, bogotaToday(now)) ||
    !PUBLIC_BOOKING_TIMES.includes(time)
  )
    return false;
  const today = bogotaToday(now);
  if (date.getTime() !== today.getTime()) return true;
  const currentTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return time > currentTime;
}
