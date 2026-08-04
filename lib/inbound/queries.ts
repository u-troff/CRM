import { createClient } from "@/lib/supabase/client";
import {
  InboundLead,
  LeadActivity,
  NurtureSequence,
  NurtureStep,
} from "@/types/inbound";

// ── Row shapes (snake_case, as returned by PostgREST) ────────────────────────
type DbInboundLead = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  business_name: string | null;
  city: string | null;
  source: InboundLead["source"];
  source_detail: string | null;
  notes: string | null;
  stage: InboundLead["stage"];
  campaign_id: string | null;
  qualification_status: InboundLead["qualificationStatus"];
  disqualification_reason: string | null;
  outcome_status: InboundLead["outcomeStatus"];
  qualified_at: string | null;
  booked_at: string | null;
  won_at: string | null;
  custom_fields: unknown;
  next_followup_at: string | null;
  sequence_id: string | null;
  sequence_step: number | null;
  sequence_started_at: string | null;
  created_at: string;
  updated_at: string;
};

type DbSequence = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type DbStep = {
  id: string;
  sequence_id: string;
  step_number: number;
  day_offset: number;
  channel: NurtureStep["channel"];
  subject: string | null;
  body: string;
  created_at: string;
};

type DbActivity = {
  id: string;
  lead_id: string;
  type: LeadActivity["type"];
  channel: string | null;
  content: string | null;
  step_id: string | null;
  created_at: string;
};

// ── Mappers ──────────────────────────────────────────────────────────────────
export function mapLead(row: DbInboundLead): InboundLead {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    website: row.website,
    businessName: row.business_name,
    city: row.city,
    source: row.source,
    sourceDetail: row.source_detail,
    notes: row.notes,
    stage: row.stage,
    campaignId: row.campaign_id,
    qualificationStatus: row.qualification_status,
    disqualificationReason: row.disqualification_reason,
    outcomeStatus: row.outcome_status,
    qualifiedAt: row.qualified_at,
    bookedAt: row.booked_at,
    wonAt: row.won_at,
    customFields: row.custom_fields ?? {},
    nextFollowupAt: row.next_followup_at,
    sequenceId: row.sequence_id,
    sequenceStep: row.sequence_step ?? 0,
    sequenceStartedAt: row.sequence_started_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSequence(row: DbSequence): NurtureSequence {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
  };
}

export function mapStep(row: DbStep): NurtureStep {
  return {
    id: row.id,
    sequenceId: row.sequence_id,
    stepNumber: row.step_number,
    dayOffset: row.day_offset,
    channel: row.channel,
    subject: row.subject,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function mapActivity(row: DbActivity): LeadActivity {
  return {
    id: row.id,
    leadId: row.lead_id,
    type: row.type,
    channel: row.channel,
    content: row.content,
    stepId: row.step_id,
    createdAt: row.created_at,
  };
}

// ── Fetchers ─────────────────────────────────────────────────────────────────
export async function fetchInboundLeads(): Promise<InboundLead[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("inbound_leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapLead(r as DbInboundLead));
}

export async function fetchSequences(): Promise<NurtureSequence[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("nurture_sequences")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => mapSequence(r as DbSequence));
}

export async function fetchSteps(): Promise<NurtureStep[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("nurture_steps")
    .select("*")
    .order("step_number", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => mapStep(r as DbStep));
}

export async function fetchActivity(leadId: string): Promise<LeadActivity[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lead_activity")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapActivity(r as DbActivity));
}

// ── Derived helpers ──────────────────────────────────────────────────────────
export function stepsForSequence(
  steps: NurtureStep[],
  sequenceId: string | null
): NurtureStep[] {
  if (!sequenceId) return [];
  return steps
    .filter((s) => s.sequenceId === sequenceId)
    .sort((a, b) => a.stepNumber - b.stepNumber);
}

// The next step a lead is due to send, given their 0-based sequence_step
// (= number of steps already completed). Returns null when the sequence is
// finished or the lead is not on one.
export function nextDueStep(
  lead: { sequenceId: string | null; sequenceStep: number },
  steps: NurtureStep[]
): NurtureStep | null {
  const seq = stepsForSequence(steps, lead.sequenceId);
  return seq[lead.sequenceStep] ?? null;
}
