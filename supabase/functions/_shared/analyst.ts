export interface IntelligenceReport {
  business_summary: string;
  website_pain_points: string[];
  linkedin_insights: string;
  facebook_insights: string;
  gbp_insights: string;
  cold_call_intro: string;
  cold_email_intro: string;
}

interface ScrapedContent {
  businessName: string;
  ownerName: string;
  ownerTitle: string;
  city: string;
  state: string;
  website: string | null;
  websiteContent: string | null;
  linkedinContent: string | null;
  companyLinkedinContent: string | null;
  facebookContent: string | null;
  gbpContent: string | null;
}

export async function analyseLeadIntelligence(
  scraped: ScrapedContent
): Promise<IntelligenceReport> {
  const prompt = `
You are a senior sales researcher preparing a brief for a cold outreach specialist
targeting US trade contractors (flooring, remodeling, construction, epoxy coating).

The specialist sells: high-converting websites, local SEO, and AI automation to
owner-operated contractors. They use a value-first approach — leading with a free
website audit and mockup. Tone: understated, direct, human. Never pushy.

Analyse the scraped data below and return ONLY a valid JSON object — no markdown,
no explanation, no preamble.

## Lead Details
- Business: ${scraped.businessName}
- Owner: ${scraped.ownerName} (${scraped.ownerTitle})
- Location: ${scraped.city}, ${scraped.state}
- Website: ${scraped.website ?? "unknown"}

## Scraped Content

### Website
${scraped.websiteContent ? scraped.websiteContent.slice(0, 3000) : "Not available"}

### Owner LinkedIn
${scraped.linkedinContent ? scraped.linkedinContent.slice(0, 1500) : "Not available"}

### Company LinkedIn
${scraped.companyLinkedinContent ? scraped.companyLinkedinContent.slice(0, 1500) : "Not available"}

### Facebook
${scraped.facebookContent ? scraped.facebookContent.slice(0, 1500) : "Not available"}

### Google Business Profile
${scraped.gbpContent ? scraped.gbpContent.slice(0, 1500) : "Not available"}

## Required JSON output — use these exact keys:

{
  "business_summary": "2-3 sentences: what they do, who they serve, market position",
  "website_pain_points": [
    "Specific pain point 1 — reference what you actually saw on their site",
    "Specific pain point 2",
    "Specific pain point 3"
  ],
  "linkedin_insights": "1-2 sentences on LinkedIn presence — activity, last post topic, positioning. Say 'No LinkedIn presence found' if unavailable.",
  "facebook_insights": "1-2 sentences on Facebook — follower count, last post, engagement. Say 'No Facebook presence found' if unavailable.",
  "gbp_insights": "1-2 sentences on GBP — rating, review count, completeness, last review. Say 'No GBP data found' if unavailable.",
  "cold_call_intro": "One opening line for a cold call. Sound like a human noticing something specific about their business. Max 2 sentences. Do NOT mention your agency or services — just open a natural conversation. Reference something real and specific you found.",
  "cold_email_intro": "One opening line for a cold email or LinkedIn DM. Conversational, specific, never salesy. Max 2 sentences. Do NOT start with 'I' and do NOT say 'I came across your website'. Reference something real."
}
`.trim();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as IntelligenceReport;
}
