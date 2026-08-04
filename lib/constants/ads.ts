import { Currency } from "@/types/ads";
import { OutcomeStatus, QualificationStatus } from "@/types/inbound";

// ── Currencies ───────────────────────────────────────────────────────────────
// Constrained (unlike platform/vertical/market) because these drive money
// formatting. Adding one means adding it here, to the Currency type, and to the
// check constraint on ad_campaigns.currency + ad_spend_entries.currency.
export const CURRENCIES: { id: Currency; label: string }[] = [
  { id: "ZAR", label: "ZAR (R)" },
  { id: "USD", label: "USD ($)" },
];

// ── Free-text suggestions ────────────────────────────────────────────────────
// Offered as datalist options, not enforced. A campaign on a platform nobody
// thought of yet should not need a migration.
export const PLATFORM_SUGGESTIONS = [
  "meta",
  "google",
  "tiktok",
  "linkedin",
  "youtube",
];

export const VERTICAL_SUGGESTIONS = [
  "plumbing",
  "flooring_remodeling_epoxy",
  "roofing",
  "hvac",
  "electrical",
];

export const MARKET_SUGGESTIONS = ["SA", "US"];

// ── Qualification ────────────────────────────────────────────────────────────
export interface QualificationDef {
  id: QualificationStatus;
  label: string;
  color: string;
}

export const QUALIFICATION_STATUSES: QualificationDef[] = [
  { id: "pending", label: "Pending", color: "var(--text-muted)" },
  { id: "qualified", label: "Qualified", color: "var(--accent-lime)" },
  { id: "unqualified", label: "Unqualified", color: "var(--accent-red)" },
];

export const QUALIFICATION_MAP: Record<QualificationStatus, QualificationDef> =
  Object.fromEntries(
    QUALIFICATION_STATUSES.map((s) => [s.id, s])
  ) as Record<QualificationStatus, QualificationDef>;

// ── Outcome ──────────────────────────────────────────────────────────────────
export interface OutcomeDef {
  id: OutcomeStatus;
  label: string;
  color: string;
}

export const OUTCOME_STATUSES: OutcomeDef[] = [
  { id: "new", label: "New", color: "var(--text-muted)" },
  { id: "contacted", label: "Contacted", color: "var(--accent-cyan)" },
  { id: "booked", label: "Booked", color: "var(--accent-emerald)" },
  { id: "won", label: "Won", color: "var(--accent-lime)" },
  { id: "lost", label: "Lost", color: "var(--accent-red)" },
];

export const OUTCOME_MAP: Record<OutcomeStatus, OutcomeDef> =
  Object.fromEntries(OUTCOME_STATUSES.map((s) => [s.id, s])) as Record<
    OutcomeStatus,
    OutcomeDef
  >;

// Common reasons, offered as a datalist on the disqualification field. Free
// text underneath — the point is to make the usual four one keystroke away.
export const DISQUALIFICATION_REASONS = [
  "not decision maker",
  "wrong vertical",
  "too small",
  "no budget",
  "bad timing",
  "spam / test submission",
];
