// gpt-4o turns the computed facts (rankings, competitor gap, PageSpeed scores,
// homepage content) into the prose for the report page. It writes ONLY the
// narrative framing + recommendations — every hard number is computed in code
// and passed in, so GPT never invents a stat.

export interface ReportFacts {
  business_name: string | null;
  trade: string | null;
  city: string | null;
  found_in_rankings: boolean;
  rank: number | null;
  rating: number | null;
  reviews: number | null;
  top_competitors: { name: string; rating: number | null; reviews: number | null }[];
  review_gap: number | null;
  pagespeed_performance: number | null;
  pagespeed_seo: number | null;
  homepage_excerpt: string;
}

export interface ReportNarrative {
  headline: string;
  summary: string;
  ranking_insight: string;
  competitor_insight: string;
  site_insight: string;
  recommendations: string[];
  cta: string;
}

function buildPrompt(facts: ReportFacts): string {
  return `
You are a local-SEO analyst at U-Flow Solutions writing a short, punchy "Competitor Teardown" report for a home service contractor who just requested it. Direct, peer-to-peer, zero fluff, no hype. You are writing the NARRATIVE only — all numbers are already computed and shown on the page, so reference them but never invent new ones.

FACTS (JSON):
${JSON.stringify(facts, null, 2)}

Write these fields:
- headline: 4-8 words naming the core problem (e.g. "You're invisible for the searches that matter").
- summary: 2 sentences framing where they stand in ${facts.city ?? "their area"} for "${facts.trade ?? "their trade"}".
- ranking_insight: 2-3 sentences on their local pack position. If found_in_rankings is false, that's the headline problem — say plainly they don't appear in the top results at all.
- competitor_insight: 2-3 sentences comparing them to the top competitors, using the review_gap and competitor ratings/reviews.
- site_insight: 2-3 sentences on their website — use pagespeed_performance / pagespeed_seo (call out a low mobile score) and anything concrete from homepage_excerpt (missing reviews, no clear CTA, dated). If homepage_excerpt is empty, focus on the PageSpeed scores.
- recommendations: 3-4 short, specific, actionable bullet strings — the fixes that would move them up. No fluff verbs.
- cta: ONE sentence inviting them to book a call to get the homepage concept + full audit walkthrough. Do NOT include a URL.

Rules: plain text, no markdown, no emojis, second person. Be specific to their trade and city. Respond ONLY with valid JSON:
{"headline":"...","summary":"...","ranking_insight":"...","competitor_insight":"...","site_insight":"...","recommendations":["...","..."],"cta":"..."}
`;
}

export async function generateReportNarrative(facts: ReportFacts): Promise<ReportNarrative> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      // gpt-4o (not GPT-5) — fast, non-reasoning. Same reasoning-latency reason
      // as the cold-email copywriter.
      temperature: 0.6,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: buildPrompt(facts) }],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const raw = data.choices[0].message.content.trim();
  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());

  return {
    headline: parsed.headline ?? "",
    summary: parsed.summary ?? "",
    ranking_insight: parsed.ranking_insight ?? "",
    competitor_insight: parsed.competitor_insight ?? "",
    site_insight: parsed.site_insight ?? "",
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    cta: parsed.cta ?? "",
  };
}
