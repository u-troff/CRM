// ── Ad campaign / spend domain types ────────────────────────────────────────

export type Currency = "ZAR" | "USD";

export interface AdCampaign {
  id: string;
  name: string;
  platform: string;
  vertical: string | null;
  market: string | null;
  currency: Currency;
  createdAt: string;
}

export interface AdCampaignInput {
  name: string;
  platform: string;
  vertical: string;
  market: string;
  currency: Currency;
}

export interface AdSpendEntry {
  id: string;
  campaignId: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  amountSpent: number;
  currency: Currency;
  notes: string | null;
  createdAt: string;
}

export interface AdSpendEntryInput {
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  amountSpent: number;
  currency: Currency;
  notes: string;
}

// ── Reporting ────────────────────────────────────────────────────────────────
// The counts and rates every report row carries, whatever it is grouped by.
// Cost-per-X is null when nothing has happened yet in that denominator —
// "no wins yet" is not "each win was free".
export interface CampaignMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  unqualifiedLeads: number;
  pendingLeads: number;
  bookedCount: number; // booked or won — a win passed through a booking
  wonCount: number;
  lostCount: number;

  // Money in, from client_revenue_entries logged against this campaign's leads.
  revenueCollected: number; // cash that actually landed
  revenueOutstanding: number; // expected but not yet collected
  revenueCurrencies: Currency[]; // distinct currencies the revenue was logged in

  qualifiedRate: number | null;
  costPerLead: number | null;
  costPerQualifiedLead: number | null;
  costPerBooking: number | null;
  costPerWin: number | null;
  roas: number | null; // revenue collected ÷ spend
}

// One row per campaign, all time (public.ad_campaign_totals).
export interface CampaignTotals extends CampaignMetrics {
  campaignId: string;
  campaignName: string;
  platform: string;
  vertical: string | null;
  market: string | null;
  currency: Currency;
  totalSpend: number;
  entryCount: number;
  currencies: Currency[]; // distinct currencies across this campaign's entries
  firstPeriodStart: string | null;
  lastPeriodEnd: string | null;
}

// One row per spend period (public.ad_campaign_period_report).
export interface CampaignPeriodReport extends CampaignMetrics {
  spendEntryId: string;
  campaignId: string;
  campaignName: string;
  platform: string;
  vertical: string | null;
  market: string | null;
  periodStart: string;
  periodEnd: string;
  amountSpent: number;
  currency: Currency;
  notes: string | null;
}
