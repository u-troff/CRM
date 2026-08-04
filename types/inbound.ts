// ── Inbound leads board domain types ────────────────────────────────────────

export type InboundStage =
  | "new"
  | "contacted"
  | "nurturing"
  | "qualifying"
  | "call_booked"
  | "won"
  | "disqualified";

export type LeadSource =
  | "facebook"
  | "google"
  | "referral"
  | "walk_in"
  | "instagram"
  | "cold_email"
  | "cold_call"
  | "other";

// Whether this lead is worth spending time on. Set by hand — a lead can be
// qualified while sitting in any column — and forced by the two stages that
// settle the question ("Call Booked"/"Won" qualify, "Disqualified" does not).
export type QualificationStatus = "unqualified" | "qualified" | "pending";

// How far the lead got. Derived from `stage` on every board move (see
// lib/inbound/outcome.ts) and correctable by hand in between. This — not
// `stage` — is what the ad spend report counts.
export type OutcomeStatus = "new" | "contacted" | "booked" | "won" | "lost";

export type NurtureChannel = "whatsapp" | "email" | "sms" | "call";

export type ActivityType =
  | "message_sent"
  | "note"
  | "stage_change"
  | "call_logged"
  | "sequence_started"
  | "sequence_stopped";

export interface InboundLead {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  businessName: string | null;
  city: string | null;
  source: LeadSource;
  sourceDetail: string | null;
  notes: string | null;
  stage: InboundStage;

  // Attribution + reporting. `campaignId` is only set for leads that came from
  // a paid ad; everything else (referrals, walk-ins) leaves it null.
  campaignId: string | null;
  qualificationStatus: QualificationStatus;
  disqualificationReason: string | null;
  outcomeStatus: OutcomeStatus;
  qualifiedAt: string | null; // ISO string
  bookedAt: string | null; // ISO string
  wonAt: string | null; // ISO string

  // Values for whatever fields this board has been given in
  // custom_field_definitions. Untyped here on purpose — the definitions decide
  // what the keys mean (see lib/custom/values.ts).
  customFields: unknown;

  nextFollowupAt: string | null; // ISO string
  sequenceId: string | null;
  sequenceStep: number;
  sequenceStartedAt: string | null; // ISO string
  createdAt: string;
  updatedAt: string;
}

export interface NurtureSequence {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface NurtureStep {
  id: string;
  sequenceId: string;
  stepNumber: number;
  dayOffset: number;
  channel: NurtureChannel;
  subject: string | null;
  body: string;
  createdAt: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: ActivityType;
  channel: string | null;
  content: string | null;
  stepId: string | null;
  createdAt: string;
}

// AI-generated draft returned by /api/nurture/generate (before it is saved).
export interface SequenceDraftStep {
  step_number: number;
  day_offset: number;
  channel: NurtureChannel;
  subject: string | null;
  body: string;
}

export interface SequenceDraft {
  name: string;
  description: string | null;
  steps: SequenceDraftStep[];
}

export interface SequenceBrief {
  goal: string;
  audience: string;
  tone: string;
  channel: NurtureChannel;
  stepCount: number;
}

// Values accepted by the Add Lead form / inline detail editor. The three
// milestone timestamps are absent: they are stamped from the status fields
// rather than typed in (see lib/inbound/outcome.ts).
export interface InboundLeadInput {
  fullName: string;
  email: string;
  phone: string;
  website: string;
  businessName: string;
  city: string;
  source: LeadSource;
  sourceDetail: string;
  notes: string;
  campaignId: string | null;
  qualificationStatus: QualificationStatus;
  disqualificationReason: string;
  outcomeStatus: OutcomeStatus;
  customFields: Record<string, unknown>;
  nextFollowupAt: string | null; // ISO string or null
}
