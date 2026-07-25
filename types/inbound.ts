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

// Values accepted by the Add Lead form / inline detail editor.
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
  nextFollowupAt: string | null; // ISO string or null
}
