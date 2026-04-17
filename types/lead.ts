// ─── Enums ────────────────────────────────────────────────────────────────────

export type LeadTier = "TIER 1" | "TIER 2" | "TIER 3";

export type CallStatus =
  | "new"
  | "no_answer"
  | "voicemail"
  | "gatekeeper"
  | "callback"
  | "not_interested"
  | "nurture"
  | "discovery_booked"
  | "wrong_number"
  | "dnc"
  | "closed_won"
  | "closed_lost";

// ─── Core Interfaces ──────────────────────────────────────────────────────────

export interface CallAttempt {
  id: string; // uuid
  timestamp: number; // unix ms
  status: CallStatus;
  notes: string;
  durationSeconds?: number; // optional
}

export interface Lead {
  id: string; // uuid, generated on import if not present
  businessName: string;
  city: string;
  phone: string; // normalized — strip non-digits except leading +
  phoneRaw: string; // original value from sheet
  website: string;
  rating: number | null;
  reviewCount: number | null;
  isFranchise: boolean;
  tier: LeadTier;
  websiteNotes: string; // from "Notes" column — your audit
  ownerName: string; // from "Names" column
  currentStatus: CallStatus;
  history: CallAttempt[];
  createdAt: number;
  updatedAt: number;
  // Reserved for future Google Sheets sync
  externalId?: string; // row ID from source sheet
  source?: "manual" | "csv_import" | "xlsx_import" | "sheets_sync";
}
