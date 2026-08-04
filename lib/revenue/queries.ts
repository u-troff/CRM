import { createClient } from "@/lib/supabase/client";
import { Currency } from "@/types/ads";
import { ClientRevenueEntry } from "@/types/revenue";

// ── Row shape (snake_case, as returned by PostgREST) ─────────────────────────
type DbRevenueEntry = {
  id: string;
  lead_id: string;
  entry_type: ClientRevenueEntry["entryType"];
  description: string | null;
  amount: number | string | null;
  currency: Currency;
  period_start: string | null;
  period_end: string | null;
  expected_date: string;
  collected_date: string | null;
  created_at: string;
};

// PostgREST can hand back `numeric` as a string to preserve precision.
function toNumber(value: number | string | null): number {
  const n = typeof value === "string" ? Number(value) : value;
  return n === null || Number.isNaN(n) ? 0 : n;
}

// ── Mapper ───────────────────────────────────────────────────────────────────
export function mapRevenueEntry(row: DbRevenueEntry): ClientRevenueEntry {
  return {
    id: row.id,
    leadId: row.lead_id,
    entryType: row.entry_type,
    description: row.description,
    amount: toNumber(row.amount),
    currency: row.currency,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    expectedDate: row.expected_date,
    collectedDate: row.collected_date,
    createdAt: row.created_at,
  };
}

// ── Fetchers ─────────────────────────────────────────────────────────────────
// Every entry for every client. The table gains a handful of rows a month, so
// one fetch beats a query per lead and the panel filters client-side.
export async function fetchRevenueEntries(): Promise<ClientRevenueEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("client_revenue_entries")
    .select("*")
    .order("expected_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapRevenueEntry(r as DbRevenueEntry));
}

// ── Derived helpers ──────────────────────────────────────────────────────────
export function entriesForLead(
  entries: ClientRevenueEntry[],
  leadId: string
): ClientRevenueEntry[] {
  return entries.filter((e) => e.leadId === leadId);
}

export interface RevenueTotals {
  collected: number;
  outstanding: number;
  currencies: Currency[];
}

export function totalsForEntries(entries: ClientRevenueEntry[]): RevenueTotals {
  const currencies = new Set<Currency>();
  let collected = 0;
  let outstanding = 0;
  for (const entry of entries) {
    currencies.add(entry.currency);
    if (entry.collectedDate) collected += entry.amount;
    else outstanding += entry.amount;
  }
  return { collected, outstanding, currencies: [...currencies] };
}
