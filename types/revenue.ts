import { Currency } from "./ads";

// ── Client revenue domain types ─────────────────────────────────────────────
// One row per payment expected or received from a won client. Deliberately a
// log rather than a billing structure: a setup fee, a monthly retainer and a
// commission cheque are the same shape, so a client who bills unusually needs
// no special case.

export type RevenueEntryType =
  | "setup_fee"
  | "monthly_retainer"
  | "commission"
  | "other";

export interface ClientRevenueEntry {
  id: string;
  leadId: string;
  entryType: RevenueEntryType;
  description: string | null;
  amount: number;
  currency: Currency;
  periodStart: string | null; // YYYY-MM-DD, for retainer/commission entries
  periodEnd: string | null; // YYYY-MM-DD
  expectedDate: string; // YYYY-MM-DD — when it's due
  collectedDate: string | null; // null while still outstanding
  createdAt: string;
}

export interface ClientRevenueEntryInput {
  entryType: RevenueEntryType;
  description: string;
  amount: number;
  currency: Currency;
  periodStart: string | null;
  periodEnd: string | null;
  expectedDate: string;
  collectedDate: string | null;
}
