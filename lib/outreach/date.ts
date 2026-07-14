// All outreach dates are anchored to the user's local calendar day
// (Africa/Johannesburg, fixed UTC+2, no DST) rather than UTC, so "today"
// and week/month boundaries match what they'd write on a physical planner.
const TZ = "Africa/Johannesburg";

export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseISO(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const d = parseISO(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

/** Monday=0 .. Sunday=6 */
export function weekdayIndex(dateStr: string): number {
  return (parseISO(dateStr).getUTCDay() + 6) % 7;
}

export function getWeekStart(dateStr: string): string {
  return addDays(dateStr, -weekdayIndex(dateStr));
}

/** Monday..Friday for the week containing dateStr. */
export function getWeekdayDates(dateStr: string): string[] {
  const monday = getWeekStart(dateStr);
  return [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
}

export function getMonthBounds(dateStr: string): { start: string; end: string } {
  const [y, m] = dateStr.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const end = toISO(new Date(Date.UTC(y, m, 0))); // last day of month
  return { start, end };
}

export function formatWeekdayShort(dateStr: string): string {
  return parseISO(dateStr).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

export function formatDayMonth(dateStr: string): string {
  return parseISO(dateStr).toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" });
}
