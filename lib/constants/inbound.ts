import { InboundStage, LeadSource, NurtureChannel } from "@/types/inbound";

// ── Board columns ────────────────────────────────────────────────────────────
export interface InboundColumnDef {
  id: InboundStage;
  label: string;
  color: string | null; // CSS var used for the column accent, or null
}

export const INBOUND_COLUMNS: InboundColumnDef[] = [
  { id: "new", label: "New", color: null },
  { id: "contacted", label: "Contacted", color: "var(--accent-cyan)" },
  { id: "nurturing", label: "Nurturing", color: "var(--accent-violet)" },
  { id: "qualifying", label: "Qualifying", color: "var(--accent-amber)" },
  { id: "call_booked", label: "Call Booked", color: "var(--accent-emerald)" },
  { id: "won", label: "Won", color: "var(--accent-lime)" },
  { id: "disqualified", label: "Disqualified", color: "var(--accent-red)" },
];

export const STAGE_LABELS: Record<InboundStage, string> = Object.fromEntries(
  INBOUND_COLUMNS.map((c) => [c.id, c.label])
) as Record<InboundStage, string>;

// ── Sources ──────────────────────────────────────────────────────────────────
export interface SourceDef {
  id: LeadSource;
  label: string;
  color: string; // CSS var for the small coloured tag
}

export const SOURCES: SourceDef[] = [
  { id: "facebook", label: "Facebook", color: "var(--accent-cyan)" },
  { id: "instagram", label: "Instagram", color: "var(--accent-violet)" },
  { id: "google", label: "Google", color: "var(--accent-amber)" },
  { id: "referral", label: "Referral", color: "var(--accent-lime)" },
  { id: "walk_in", label: "Walk-in", color: "var(--accent-emerald)" },
  { id: "cold_email", label: "Cold Email", color: "var(--text-secondary)" },
  { id: "cold_call", label: "Cold Call", color: "var(--text-secondary)" },
  { id: "other", label: "Other", color: "var(--text-muted)" },
];

export const SOURCE_MAP: Record<LeadSource, SourceDef> = Object.fromEntries(
  SOURCES.map((s) => [s.id, s])
) as Record<LeadSource, SourceDef>;

// ── Channels ─────────────────────────────────────────────────────────────────
export const CHANNELS: { id: NurtureChannel; label: string }[] = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "Email" },
  { id: "sms", label: "SMS" },
  { id: "call", label: "Call" },
];

export const CHANNEL_LABELS: Record<NurtureChannel, string> = Object.fromEntries(
  CHANNELS.map((c) => [c.id, c.label])
) as Record<NurtureChannel, string>;
