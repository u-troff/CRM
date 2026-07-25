import {
  NurtureChannel,
  SequenceBrief,
  SequenceDraft,
  SequenceDraftStep,
} from "@/types/inbound";

// Server-only nurture-sequence generator (import only from route handlers /
// server code — it reads OPEN_AI_API). Calls OpenAI directly (gpt-4o, JSON
// mode) using the key from the Next.js environment — no Edge Function involved. Stateless: returns a draft for the client to preview and
// tweak; nothing is written to the database here.

const CHANNELS: NurtureChannel[] = ["whatsapp", "email", "sms", "call"];

function coerceChannel(value: unknown, fallback: NurtureChannel): NurtureChannel {
  return CHANNELS.includes(value as NurtureChannel)
    ? (value as NurtureChannel)
    : fallback;
}

// Clamp/normalise whatever arrives from the client before it reaches the model.
function normaliseBrief(raw: Partial<SequenceBrief>): SequenceBrief {
  return {
    goal: String(raw.goal ?? "").slice(0, 500),
    audience: String(raw.audience ?? "").slice(0, 500),
    tone: String(raw.tone ?? "").slice(0, 300),
    channel: coerceChannel(raw.channel, "whatsapp"),
    stepCount: Math.min(Math.max(Number(raw.stepCount) || 5, 2), 8),
  };
}

function buildPrompt(brief: SequenceBrief): string {
  return `
You are a copywriter building a lead-nurture drip sequence for a small business owner who follows up with inbound leads by hand (Facebook ads, referrals, walk-ins).

Write a sequence of exactly ${brief.stepCount} messages.

BRIEF:
- Goal of the sequence: ${brief.goal || "book a quick call with the lead"}
- Who the leads are: ${brief.audience || "warm inbound leads who just enquired"}
- Tone: ${brief.tone || "friendly, plain-spoken, human — like texting a person, not a marketing blast"}
- Primary channel: ${brief.channel}

RULES FOR EACH MESSAGE:
- Escalating day offsets, starting at day 0. Space them sensibly over ~2-3 weeks (e.g. 0, 2, 5, 10, 21). The first step MUST be day_offset 0.
- Short and conversational. WhatsApp/SMS steps: 1-3 sentences, no subject. Email steps: may include a short subject line.
- Sound like a real person wrote it. NO corporate filler, NO emojis, NO exclamation-mark spam, NO em-dashes.
- You MAY use these merge fields where natural (they get filled from the lead record): {{first_name}}, {{full_name}}, {{business_name}}, {{website}}, {{city}}. Do not invent other merge fields. Do not include links or placeholders.
- The last message should be a light, low-pressure "breakup" nudge.

Also produce a short sequence "name" (3-6 words) and a one-sentence "description".

Respond ONLY with valid JSON, no markdown fences, in exactly this shape:
{
  "name": "...",
  "description": "...",
  "steps": [
    { "step_number": 1, "day_offset": 0, "channel": "${brief.channel}", "subject": null, "body": "..." }
  ]
}
`;
}

export async function generateSequenceWithOpenAI(
  rawBrief: Partial<SequenceBrief>
): Promise<SequenceDraft> {
  const brief = normaliseBrief(rawBrief);

  const apiKey = process.env.OPEN_AI_API;
  if (!apiKey) {
    throw new Error("OPEN_AI_API is not configured");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.7,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: buildPrompt(brief) }],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content?.trim() ?? "{}";
  const parsed = JSON.parse(content.replace(/```json|```/g, "").trim());

  // Normalise the model output so the client always gets a clean shape.
  const rawSteps: unknown[] = Array.isArray(parsed.steps) ? parsed.steps : [];
  const steps: SequenceDraftStep[] = rawSteps
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s, i) => ({
      step_number: Number(s.step_number) || i + 1,
      day_offset: Math.max(0, Number(s.day_offset) || 0),
      channel: coerceChannel(s.channel, brief.channel),
      subject:
        typeof s.subject === "string" && s.subject.trim() ? s.subject.trim() : null,
      body: String(s.body ?? "").trim(),
    }))
    .filter((s) => s.body.length > 0)
    .map((s, i) => ({ ...s, step_number: i + 1 }));

  if (steps.length === 0) {
    throw new Error("Model returned no usable steps");
  }
  // Guarantee the first step fires immediately.
  steps[0].day_offset = 0;

  return {
    name: String(parsed.name ?? "AI nurture sequence").slice(0, 120),
    description:
      typeof parsed.description === "string" ? parsed.description.slice(0, 300) : null,
    steps,
  };
}
