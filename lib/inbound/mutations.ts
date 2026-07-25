import { createClient } from "@/lib/supabase/client";
import {
  ActivityType,
  InboundLead,
  InboundLeadInput,
  InboundStage,
  NurtureChannel,
  NurtureStep,
} from "@/types/inbound";
import { addDays } from "./date";
import { mapLead, stepsForSequence } from "./queries";

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// Trim empty strings down to null so optional columns stay clean.
function nullify(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

// ── Activity ─────────────────────────────────────────────────────────────────
export async function logActivity(params: {
  leadId: string;
  type: ActivityType;
  channel?: string | null;
  content?: string | null;
  stepId?: string | null;
}): Promise<void> {
  const supabase = createClient();
  const userId = await requireUserId();
  const { error } = await supabase.from("lead_activity").insert({
    user_id: userId,
    lead_id: params.leadId,
    type: params.type,
    channel: params.channel ?? null,
    content: params.content ?? null,
    step_id: params.stepId ?? null,
  });
  if (error) throw error;
}

// ── Lead CRUD ────────────────────────────────────────────────────────────────
export async function createInboundLead(
  input: InboundLeadInput
): Promise<InboundLead> {
  const supabase = createClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("inbound_leads")
    .insert({
      user_id: userId,
      full_name: input.fullName.trim(),
      email: nullify(input.email),
      phone: nullify(input.phone),
      website: nullify(input.website),
      business_name: nullify(input.businessName),
      city: nullify(input.city),
      source: input.source,
      source_detail: nullify(input.sourceDetail),
      notes: nullify(input.notes),
      stage: "new",
      next_followup_at: input.nextFollowupAt,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapLead(data);
}

export async function updateInboundLead(
  id: string,
  input: InboundLeadInput
): Promise<InboundLead> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("inbound_leads")
    .update({
      full_name: input.fullName.trim(),
      email: nullify(input.email),
      phone: nullify(input.phone),
      website: nullify(input.website),
      business_name: nullify(input.businessName),
      city: nullify(input.city),
      source: input.source,
      source_detail: nullify(input.sourceDetail),
      notes: nullify(input.notes),
      next_followup_at: input.nextFollowupAt,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapLead(data);
}

export async function deleteInboundLead(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("inbound_leads").delete().eq("id", id);
  if (error) throw error;
}

// Move a card between columns. Persists the stage and records a stage_change.
export async function updateLeadStage(
  id: string,
  newStage: InboundStage,
  prevStage: InboundStage
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("inbound_leads")
    .update({ stage: newStage })
    .eq("id", id);
  if (error) throw error;

  await logActivity({
    leadId: id,
    type: "stage_change",
    content: `${prevStage} → ${newStage}`,
  });
}

// Free-form note from the Activity tab.
export async function addNote(leadId: string, content: string): Promise<void> {
  await logActivity({ leadId, type: "note", content: content.trim() });
}

// ── Nurture sequence lifecycle ───────────────────────────────────────────────
export async function startSequence(
  lead: InboundLead,
  sequenceId: string,
  steps: NurtureStep[]
): Promise<InboundLead> {
  const supabase = createClient();
  const startedAt = new Date().toISOString();
  const seqSteps = stepsForSequence(steps, sequenceId);
  const firstStep = seqSteps[0] ?? null;
  const nextFollowup = firstStep ? addDays(startedAt, firstStep.dayOffset) : null;

  const { data, error } = await supabase
    .from("inbound_leads")
    .update({
      sequence_id: sequenceId,
      sequence_step: 0,
      sequence_started_at: startedAt,
      next_followup_at: nextFollowup,
    })
    .eq("id", lead.id)
    .select("*")
    .single();
  if (error) throw error;

  await logActivity({
    leadId: lead.id,
    type: "sequence_started",
    stepId: firstStep?.id ?? null,
  });
  return mapLead(data);
}

// Move to the next step without sending (recomputes the follow-up date).
export async function advanceStep(
  lead: InboundLead,
  steps: NurtureStep[]
): Promise<InboundLead> {
  const supabase = createClient();
  const seqSteps = stepsForSequence(steps, lead.sequenceId);
  const newStep = Math.min(lead.sequenceStep + 1, seqSteps.length);
  const nextStep = seqSteps[newStep] ?? null;
  const anchor = lead.sequenceStartedAt ?? new Date().toISOString();
  const nextFollowup = nextStep ? addDays(anchor, nextStep.dayOffset) : null;

  const { data, error } = await supabase
    .from("inbound_leads")
    .update({ sequence_step: newStep, next_followup_at: nextFollowup })
    .eq("id", lead.id)
    .select("*")
    .single();
  if (error) throw error;
  return mapLead(data);
}

export async function stopSequence(lead: InboundLead): Promise<InboundLead> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("inbound_leads")
    .update({
      sequence_id: null,
      sequence_step: 0,
      sequence_started_at: null,
      next_followup_at: null,
    })
    .eq("id", lead.id)
    .select("*")
    .single();
  if (error) throw error;

  await logActivity({ leadId: lead.id, type: "sequence_stopped" });
  return mapLead(data);
}

// Record that the currently-due step was sent: log it, advance the counter,
// and schedule the next follow-up from the next step's day offset.
export async function markMessageSent(
  lead: InboundLead,
  step: NurtureStep,
  finalText: string,
  steps: NurtureStep[]
): Promise<InboundLead> {
  const supabase = createClient();
  const seqSteps = stepsForSequence(steps, lead.sequenceId);
  const newStep = lead.sequenceStep + 1;
  const nextStep = seqSteps[newStep] ?? null;
  const anchor = lead.sequenceStartedAt ?? new Date().toISOString();
  const nextFollowup = nextStep ? addDays(anchor, nextStep.dayOffset) : null;

  await logActivity({
    leadId: lead.id,
    type: "message_sent",
    channel: step.channel,
    content: finalText,
    stepId: step.id,
  });

  const { data, error } = await supabase
    .from("inbound_leads")
    .update({ sequence_step: newStep, next_followup_at: nextFollowup })
    .eq("id", lead.id)
    .select("*")
    .single();
  if (error) throw error;
  return mapLead(data);
}

// ── Sequence manager CRUD ────────────────────────────────────────────────────
export async function createSequence(
  name: string,
  description: string
): Promise<string> {
  const supabase = createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("nurture_sequences")
    .insert({ user_id: userId, name: name.trim(), description: nullify(description) })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateSequence(
  id: string,
  name: string,
  description: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("nurture_sequences")
    .update({ name: name.trim(), description: nullify(description) })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSequence(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("nurture_sequences").delete().eq("id", id);
  if (error) throw error;
}

export interface StepInput {
  stepNumber: number;
  dayOffset: number;
  channel: NurtureChannel;
  subject: string;
  body: string;
}

export async function createStep(
  sequenceId: string,
  input: StepInput
): Promise<void> {
  const supabase = createClient();
  const userId = await requireUserId();
  const { error } = await supabase.from("nurture_steps").insert({
    user_id: userId,
    sequence_id: sequenceId,
    step_number: input.stepNumber,
    day_offset: input.dayOffset,
    channel: input.channel,
    subject: nullify(input.subject),
    body: input.body,
  });
  if (error) throw error;
}

export async function updateStep(id: string, input: StepInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("nurture_steps")
    .update({
      step_number: input.stepNumber,
      day_offset: input.dayOffset,
      channel: input.channel,
      subject: nullify(input.subject),
      body: input.body,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteStep(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("nurture_steps").delete().eq("id", id);
  if (error) throw error;
}

// Persist a new ordering (writes each step's step_number).
export async function reorderSteps(
  ordered: { id: string; stepNumber: number }[]
): Promise<void> {
  const supabase = createClient();
  for (const { id, stepNumber } of ordered) {
    const { error } = await supabase
      .from("nurture_steps")
      .update({ step_number: stepNumber })
      .eq("id", id);
    if (error) throw error;
  }
}

// Fallback used by the "Create starter sequence" button when a user has none
// (mirrors the SQL seed, e.g. for accounts created after the migration ran).
export async function seedStarterSequence(): Promise<void> {
  const sequenceId = await createSequence(
    "Inbound lead nurture",
    "Default 3-week drip for new inbound leads. Rewrite the copy to sound like you."
  );
  const bodies = [
    "Hey {{first_name}}, thanks for reaching out about {{business_name}}! When's a good time for a quick chat about what you're after?",
    "Hi {{first_name}}, just checking you got my last message. Happy to answer any questions whenever you're ready.",
    "Hey {{first_name}}, I put together a few quick ideas for {{business_name}}. Want me to send them over?",
    "Hi {{first_name}}, still keen to help out. Would a short call this week work for you?",
    "Hey {{first_name}}, last nudge from me for now. If the timing's better down the line, just reply here and we'll pick it up.",
  ];
  const offsets = [0, 2, 5, 10, 21];
  for (let i = 0; i < bodies.length; i++) {
    await createStep(sequenceId, {
      stepNumber: i + 1,
      dayOffset: offsets[i],
      channel: "whatsapp",
      subject: "",
      body: bodies[i],
    });
  }
}
