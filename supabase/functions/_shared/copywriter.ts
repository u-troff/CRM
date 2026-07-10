export interface ColdEmailCopy {
  custom_subject: string;
  custom_email: string;
}

interface EnrichmentLead {
  first_name: string | null;
  company_name: string | null;
  industry: string | null;
  lead_city: string | null;
  lead_state: string | null;
  company_website: string | null;
}

function buildPrompt(lead: EnrichmentLead, scrapedContent: string): string {
  const greetingName = lead.first_name?.trim() ? lead.first_name.trim() : null;

  return `
You are a cold email copywriter for U-Flow Solutions, a web design and lead generation agency targeting home service contractors in the US.

Your job: write a personalized subject line AND the COMPLETE body of a short cold email to this business owner. The email's only goal is to earn a reply or click. It offers a free modern homepage concept plus a quick SEO audit of how they're currently performing on Google.

LEAD INFO:
- First name: ${lead.first_name}
- Company: ${lead.company_name}
- Industry: ${lead.industry}
- Location: ${lead.lead_city}, ${lead.lead_state}
- Website: ${lead.company_website}

SCRAPED HOMEPAGE CONTENT:
${scrapedContent || '[Could not scrape. Use company name, location, and industry to infer the best angle]'}

---

TASK 1: SUBJECT LINE
Scan the scraped content and pick the SINGLE strongest angle:
- SEO gap: not ranking for obvious local keywords (e.g. "[city] + [trade]")
- Trust signals missing: no reviews, no team photos, no badges, no social proof
- Mobile/conversion issue: cluttered layout, no clear CTA, contact buried
- Specific high-value service buried (epoxy, custom remodel, etc.)
- Outdated design: pre-2018, generic template, low-trust aesthetic

Write a subject line that:
- Is 4-8 words maximum
- Sounds written specifically for them, not a template
- Can weave in their first name OR company name ONLY if it feels more direct, not more generic
- Does NOT use clickbait, ALL CAPS, emojis, or exclamation marks
- Sounds like a peer tipping them off, not a vendor pitching

TASK 2: EMAIL BODY (custom_email)
Write the COMPLETE email body, plain text, using real line breaks (\\n). Follow this structure EXACTLY:

1. Greeting line: ${greetingName ? `"Hi ${greetingName}," (use their real first name exactly as given)` : `"Hi there," (no name was available)`}
2. Blank line, then ONE line that names ${lead.company_name ?? 'their business'} and points out something SPECIFIC on their site that is costing them leads. Ground it in the scraped homepage content (a service they offer, their branding, a visible gap). If the scrape is empty, infer a plausible specific observation from their industry + city + company name.
3. Blank line, then ONE line offering the value: that you put together a modern homepage concept for their business and recorded a quick SEO audit showing how they're currently performing on Google.
4. Blank line, then this exact line: "No pitch, just thought you'd want to see it."
5. Blank line, then the FINAL line: a short standalone CTA question, for example "Want me to send it over?". This MUST be the very last line.

HARD CONSTRAINTS (violating any is a failure):
- Total body 90-120 words.
- NEVER use em-dashes (—), en-dashes (–), or double hyphens (--) anywhere. They read as AI-written. Use a comma, a period, or two separate sentences instead. Plain hyphens inside a compound word (like "peer-to-peer") are fine.
- NO URLs, links, or placeholders of ANY kind (the link is added later, so do not invent one, do not write "[link]", do not say "click here").
- NO markdown, bullet points, or formatting characters. Plain sentences only.
- NO signature, name, sign-off, or company block after the CTA. The CTA question is the last thing.
- Second person, peer-to-peer tone, one contractor tipping off another. Zero fluff.
- Do NOT use: "I noticed your website", "I came across your site", "I wanted to reach out", "I hope this finds you well".

TONE REFERENCE:
Good: "Spotted that [Company] isn't showing up for '[city] epoxy garage floor' despite doing solid work in the area."
Bad: "I noticed your website could use some improvements to help generate more leads."

---

Respond ONLY with valid JSON. No markdown fences, no explanation, nothing else:
{"custom_subject": "...", "custom_email": "..."}
`;
}

export async function generateColdEmailCopy(
  lead: EnrichmentLead,
  scrapedContent: string
): Promise<ColdEmailCopy> {
  const prompt = buildPrompt(lead, scrapedContent);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      // gpt-4o (not GPT-5): fast, non-reasoning — the right fit for high-volume
      // cold-email copy. GPT-5's reasoning made per-lead generation too slow,
      // piling up in the webhook handler and timing out. json_object mode keeps
      // the output parseable (the prompt contains "JSON", which that requires).
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const raw = data.choices[0].message.content.trim();
  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());

  return {
    custom_subject: parsed.custom_subject,
    custom_email: parsed.custom_email,
  };
}
