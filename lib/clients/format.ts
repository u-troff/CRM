// Money formatting for the clients table. ZAR to match where the business
// invoices from (the same reason the outreach tracker runs on Africa/
// Johannesburg time) — change the two constants below if that changes.
const LOCALE = "en-ZA";
const CURRENCY = "ZAR";

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

// Parses a money field back out of a text input. Blank, partial ("-", "."), or
// junk input becomes 0 so a half-typed value can't be saved as NaN.
export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
