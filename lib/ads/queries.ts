import { createClient } from "@/lib/supabase/client";
import {
  AdCampaign,
  AdSpendEntry,
  CampaignMetrics,
  CampaignPeriodReport,
  CampaignTotals,
  Currency,
} from "@/types/ads";

// ── Row shapes (snake_case, as returned by PostgREST) ────────────────────────
type DbAdCampaign = {
  id: string;
  name: string;
  platform: string;
  vertical: string | null;
  market: string | null;
  currency: Currency;
  created_at: string;
};

type DbAdSpendEntry = {
  id: string;
  campaign_id: string;
  period_start: string;
  period_end: string;
  amount_spent: number | string | null;
  currency: Currency;
  notes: string | null;
  created_at: string;
};

// Shared by both report views.
type DbMetrics = {
  total_leads: number;
  qualified_leads: number;
  unqualified_leads: number;
  pending_leads: number;
  booked_count: number;
  won_count: number;
  lost_count: number;
  revenue_collected: number | string | null;
  revenue_outstanding: number | string | null;
  revenue_currencies: Currency[] | null;
  qualified_rate: number | string | null;
  cost_per_lead: number | string | null;
  cost_per_qualified_lead: number | string | null;
  cost_per_booking: number | string | null;
  cost_per_win: number | string | null;
  roas: number | string | null;
};

type DbCampaignTotals = DbMetrics & {
  campaign_id: string;
  campaign_name: string;
  platform: string;
  vertical: string | null;
  market: string | null;
  currency: Currency;
  created_at: string;
  total_spend: number | string | null;
  entry_count: number;
  currencies: Currency[] | null;
  first_period_start: string | null;
  last_period_end: string | null;
};

type DbCampaignPeriodReport = DbMetrics & {
  spend_entry_id: string;
  campaign_id: string;
  campaign_name: string;
  platform: string;
  vertical: string | null;
  market: string | null;
  period_start: string;
  period_end: string;
  amount_spent: number | string | null;
  currency: Currency;
  notes: string | null;
};

// PostgREST can hand back `numeric` as a string to preserve precision, so every
// money / rate column goes through these rather than being trusted as-is.
function toNumber(value: number | string | null): number {
  const n = typeof value === "string" ? Number(value) : value;
  return n === null || Number.isNaN(n) ? 0 : n;
}

// Same, but a null stays null: the report views use null for "no denominator",
// which must not collapse into 0.
function toNullableNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isNaN(n) ? null : n;
}

// ── Mappers ──────────────────────────────────────────────────────────────────
export function mapCampaign(row: DbAdCampaign): AdCampaign {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    vertical: row.vertical,
    market: row.market,
    currency: row.currency,
    createdAt: row.created_at,
  };
}

export function mapSpendEntry(row: DbAdSpendEntry): AdSpendEntry {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    amountSpent: toNumber(row.amount_spent),
    currency: row.currency,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapMetrics(row: DbMetrics): CampaignMetrics {
  return {
    totalLeads: row.total_leads,
    qualifiedLeads: row.qualified_leads,
    unqualifiedLeads: row.unqualified_leads,
    pendingLeads: row.pending_leads,
    bookedCount: row.booked_count,
    wonCount: row.won_count,
    lostCount: row.lost_count,
    revenueCollected: toNumber(row.revenue_collected),
    revenueOutstanding: toNumber(row.revenue_outstanding),
    revenueCurrencies: row.revenue_currencies ?? [],
    qualifiedRate: toNullableNumber(row.qualified_rate),
    costPerLead: toNullableNumber(row.cost_per_lead),
    costPerQualifiedLead: toNullableNumber(row.cost_per_qualified_lead),
    costPerBooking: toNullableNumber(row.cost_per_booking),
    costPerWin: toNullableNumber(row.cost_per_win),
    roas: toNullableNumber(row.roas),
  };
}

export function mapCampaignTotals(row: DbCampaignTotals): CampaignTotals {
  return {
    ...mapMetrics(row),
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    platform: row.platform,
    vertical: row.vertical,
    market: row.market,
    currency: row.currency,
    totalSpend: toNumber(row.total_spend),
    entryCount: row.entry_count,
    currencies: row.currencies ?? [],
    firstPeriodStart: row.first_period_start,
    lastPeriodEnd: row.last_period_end,
  };
}

export function mapPeriodReport(
  row: DbCampaignPeriodReport
): CampaignPeriodReport {
  return {
    ...mapMetrics(row),
    spendEntryId: row.spend_entry_id,
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    platform: row.platform,
    vertical: row.vertical,
    market: row.market,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    amountSpent: toNumber(row.amount_spent),
    currency: row.currency,
    notes: row.notes,
  };
}

// ── Fetchers ─────────────────────────────────────────────────────────────────
export async function fetchAdCampaigns(): Promise<AdCampaign[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ad_campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapCampaign(r as DbAdCampaign));
}

// Every entry for every campaign — the whole set is small (one row per campaign
// per week) and the spend modal filters it client-side.
export async function fetchSpendEntries(): Promise<AdSpendEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ad_spend_entries")
    .select("*")
    .order("period_start", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapSpendEntry(r as DbAdSpendEntry));
}

export async function fetchCampaignTotals(): Promise<CampaignTotals[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ad_campaign_totals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapCampaignTotals(r as DbCampaignTotals));
}

export async function fetchPeriodReport(): Promise<CampaignPeriodReport[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ad_campaign_period_report")
    .select("*")
    .order("period_start", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapPeriodReport(r as DbCampaignPeriodReport));
}

// ── Derived helpers ──────────────────────────────────────────────────────────
export function entriesForCampaign(
  entries: AdSpendEntry[],
  campaignId: string
): AdSpendEntry[] {
  return entries.filter((e) => e.campaignId === campaignId);
}

// A campaign whose entries were logged in more than one currency. Its spend
// total is the sum of unlike amounts, so the report shows it but refuses to
// derive cost-per-X from it.
export function hasMixedCurrencies(totals: CampaignTotals): boolean {
  return totals.currencies.length > 1;
}

// ROAS puts revenue over spend, so it only means something when the client paid
// in the currency the ads were bought in. Revenue logged in dollars against a
// rand campaign gets shown, but never divided.
export function revenueComparable(row: {
  currency: Currency;
  revenueCurrencies: Currency[];
}): boolean {
  return row.revenueCurrencies.every((c) => c === row.currency);
}
