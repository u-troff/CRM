import { RevenueEntryType } from "@/types/revenue";

// ── Revenue entry types ──────────────────────────────────────────────────────
// How U-Flow actually bills. `periodic` marks the types that cover a month (or
// other window) rather than being a one-off, which is what the form uses to
// decide whether to ask for a period.
export interface RevenueTypeDef {
  id: RevenueEntryType;
  label: string;
  color: string;
  periodic: boolean;
}

export const REVENUE_TYPES: RevenueTypeDef[] = [
  { id: "setup_fee", label: "Setup Fee", color: "var(--accent-cyan)", periodic: false },
  {
    id: "monthly_retainer",
    label: "Monthly Retainer",
    color: "var(--accent-lime)",
    periodic: true,
  },
  { id: "commission", label: "Commission", color: "var(--accent-violet)", periodic: true },
  { id: "other", label: "Other", color: "var(--text-muted)", periodic: false },
];

export const REVENUE_TYPE_MAP: Record<RevenueEntryType, RevenueTypeDef> =
  Object.fromEntries(REVENUE_TYPES.map((t) => [t.id, t])) as Record<
    RevenueEntryType,
    RevenueTypeDef
  >;
