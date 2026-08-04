import { Currency } from "@/types/ads";

// Money and period formatting for ad spend and the client revenue logged
// against it. Unlike lib/clients/format.ts this is multi-currency: a campaign
// can be billed in ZAR or USD, and the two are never summed together — there is
// no exchange rate anywhere in this app.
const LOCALES: Record<Currency, string> = {
  ZAR: "en-ZA",
  USD: "en-US",
};

function formatter(currency: Currency, decimals: number): Intl.NumberFormat {
  return new Intl.NumberFormat(LOCALES[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Whole-currency amounts: spend totals, entry amounts.
export function formatMoney(value: number, currency: Currency): string {
  return formatter(currency, 0).format(value);
}

// Cost-per-X, where the cents matter and null means "no denominator yet".
export function formatCostPer(value: number | null, currency: Currency): string {
  if (value === null) return "—";
  return formatter(currency, 2).format(value);
}

// Parses a money field back out of a text input. Blank, partial ("-", "."), or
// junk input becomes 0 so a half-typed value can't be saved as NaN.
export function parseMoneyInput(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function formatRate(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

// Return on ad spend as a multiple: 2.4× means every rand in brought 2.40 back.
// Below 1× the campaign has not yet paid for itself.
export function formatRoas(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(2)}×`;
}

// Under 1× is money still underwater — worth colouring, since it's the one
// figure in the report that has a right answer.
export function roasColor(value: number | null): string {
  if (value === null) return "var(--text-primary)";
  return value >= 1 ? "var(--accent-lime)" : "var(--accent-amber)";
}

// Short date for period columns, e.g. "21 Jul". Dates come off Postgres as
// YYYY-MM-DD, which `new Date()` reads as UTC midnight — parsed by hand so a
// period never displays as the day before in a negative-offset timezone.
export function formatPeriodDate(value: string | null): string {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export function formatPeriod(start: string, end: string): string {
  return `${formatPeriodDate(start)} – ${formatPeriodDate(end)}`;
}

function asDateInput(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Today as YYYY-MM-DD in local time, for seeding <input type="date"> values.
export function todayInput(): string {
  return asDateInput(new Date());
}

// The calendar month containing `today`, the default period for a retainer or
// commission entry.
export function currentMonthInputs(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  // Day 0 of the next month is the last day of this one.
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: asDateInput(start), end: asDateInput(end) };
}

// The Monday–Sunday week containing `today`, the default period for a new
// spend entry (weekly is the cadence the report is built around).
export function currentWeekInputs(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return { start: asDateInput(monday), end: asDateInput(sunday) };
}
