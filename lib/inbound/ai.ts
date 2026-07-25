import { SequenceBrief, SequenceDraft } from "@/types/inbound";
import { createSequence, createStep } from "./mutations";

// Ask the AI to draft a nurture sequence. Returns the draft for previewing;
// nothing is persisted until createSequenceFromDraft is called.
export async function generateSequenceDraft(
  brief: SequenceBrief
): Promise<SequenceDraft> {
  const res = await fetch("/api/nurture/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(brief),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Generation failed (${res.status})`);
  }
  return data as SequenceDraft;
}

// Persist an (optionally user-edited) draft as a real sequence + steps.
// Returns the new sequence id so the caller can select it for tweaking.
export async function createSequenceFromDraft(
  draft: SequenceDraft
): Promise<string> {
  const sequenceId = await createSequence(draft.name, draft.description ?? "");
  for (let i = 0; i < draft.steps.length; i++) {
    const step = draft.steps[i];
    await createStep(sequenceId, {
      stepNumber: i + 1,
      dayOffset: step.day_offset,
      channel: step.channel,
      subject: step.subject ?? "",
      body: step.body,
    });
  }
  return sequenceId;
}
