import { CampaignTotals, Currency } from "@/types/ads";
import { hasMixedCurrencies, revenueComparable } from "./queries";

// Roll several campaigns up into the KPI row at the top of the report.
export interface ReportSummary {
  spendByCurrency: { currency: Currency; amount: number }[];
  // The one currency every campaign in the selection is billed in, or null when
  // they disagree. Cost-per-X is only meaningful in the first case: adding rand
  // to dollars would need an exchange rate this app deliberately doesn't hold.
  singleCurrency: Currency | null;
  totalLeads: number;
  qualifiedLeads: number;
  unqualifiedLeads: number;
  pendingLeads: number;
  bookedCount: number;
  wonCount: number;
  revenueCollected: number;
  revenueOutstanding: number;
  qualifiedRate: number | null;
  costPerLead: number | null;
  costPerQualifiedLead: number | null;
  costPerBooking: number | null;
  costPerWin: number | null;
  roas: number | null;
}

function divide(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

export function summariseTotals(rows: CampaignTotals[]): ReportSummary {
  const spend = new Map<Currency, number>();
  let totalSpend = 0;
  let totalLeads = 0;
  let qualifiedLeads = 0;
  let unqualifiedLeads = 0;
  let pendingLeads = 0;
  let bookedCount = 0;
  let wonCount = 0;
  let revenueCollected = 0;
  let revenueOutstanding = 0;
  // A campaign with entries in two currencies poisons the roll-up the same way
  // two campaigns in different currencies would — and so does a client who paid
  // in a currency the ads weren't bought in.
  let mixed = rows.some((r) => hasMixedCurrencies(r) || !revenueComparable(r));

  for (const row of rows) {
    spend.set(row.currency, (spend.get(row.currency) ?? 0) + row.totalSpend);
    totalSpend += row.totalSpend;
    totalLeads += row.totalLeads;
    qualifiedLeads += row.qualifiedLeads;
    unqualifiedLeads += row.unqualifiedLeads;
    pendingLeads += row.pendingLeads;
    bookedCount += row.bookedCount;
    wonCount += row.wonCount;
    revenueCollected += row.revenueCollected;
    revenueOutstanding += row.revenueOutstanding;
  }

  if (spend.size > 1) mixed = true;
  const singleCurrency = mixed ? null : ([...spend.keys()][0] ?? null);

  return {
    spendByCurrency: [...spend.entries()].map(([currency, amount]) => ({
      currency,
      amount,
    })),
    singleCurrency,
    totalLeads,
    qualifiedLeads,
    unqualifiedLeads,
    pendingLeads,
    bookedCount,
    wonCount,
    revenueCollected,
    revenueOutstanding,
    qualifiedRate: divide(qualifiedLeads, totalLeads),
    costPerLead: singleCurrency ? divide(totalSpend, totalLeads) : null,
    costPerQualifiedLead: singleCurrency ? divide(totalSpend, qualifiedLeads) : null,
    costPerBooking: singleCurrency ? divide(totalSpend, bookedCount) : null,
    costPerWin: singleCurrency ? divide(totalSpend, wonCount) : null,
    roas: singleCurrency ? divide(revenueCollected, totalSpend) : null,
  };
}
