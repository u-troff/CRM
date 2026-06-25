export interface ColdEmailCopy {
  custom_subject: string;
  custom_intro: string;
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
  return `
You are a cold email copywriter for U-Flow Solutions, a web design and lead generation agency targeting home service contractors in the US.

Your job: write a personalized subject line AND one-sentence opening paragraph for a cold email to this business owner.

LEAD INFO:
- First name: ${lead.first_name}
- Company: ${lead.company_name}
- Industry: ${lead.industry}
- Location: ${lead.lead_city}, ${lead.lead_state}
- Website: ${lead.company_website}

SCRAPED HOMEPAGE CONTENT:
${scrapedContent || '[Could not scrape — use company name, location, and industry to infer the best angle]'}

WHAT THE EMAIL SAYS AFTER YOUR INTRO (do NOT repeat or reference this):
"I went ahead and put together a modern homepage concept for your business and recorded a quick SEO audit showing how you're currently performing on Google. No pitch, just thought you'd want to see it. Want me to send it over?"

---

YOUR TASK:

1. SUBJECT LINE STRATEGY:
Scan the scraped content and pick the SINGLE strongest angle from this list:
- SEO gap: they're not ranking for obvious local keywords (e.g. "[city] + [trade]")
- Trust signals missing: no reviews visible, no team photos, no badges, no social proof on homepage
- Mobile/conversion issue: cluttered layout, no clear CTA, contact buried
- Specific service buried: they do a high-value service (epoxy, custom remodel, etc.) that isn't prominently featured
- Outdated design: site looks pre-2018, generic template, low-trust aesthetic

Write a subject line that:
- Is 4-8 words maximum
- Sounds like it was written specifically for them — not a template
- Can optionally weave in their first name OR company name naturally — but ONLY if it makes the line feel more direct, not more generic. Example of BAD name use: "Hey Eddie, quick question" — too obviously automated. Example of GOOD name use: "Distinctive Remodeling's Google presence" or "quick thing, Eddie" (used sparingly, peer tone)
- Does NOT use clickbait, ALL CAPS, emojis, or exclamation marks
- Does NOT mention "website", "homepage", "SEO audit", or "leads" explicitly — leave those for the email body
- Sounds like a peer tipping them off, not a vendor pitching them

2. OPENING PARAGRAPH (custom_intro):
Write exactly ONE sentence that:
- References something SPECIFIC from their actual homepage content — a service they offer, their location, their branding, a gap you spotted
- If scrape failed, use their industry + city + company name to write a plausible specific observation
- Leads naturally into the next sentence about the homepage concept (which you do NOT write)
- Does NOT use the phrases: "I noticed your website", "I came across your site", "I wanted to reach out", "I hope this finds you well"
- Does NOT mention the homepage concept, SEO audit, or anything from the email continuation
- Sounds like one contractor tipping off another — direct, specific, zero fluff
- Maximum 35 words

TONE REFERENCE — this is the voice to match:
Good: "Spotted that [Company] isn't showing up for '[city] epoxy garage floor' despite doing solid work in the area."
Good: "Your [city] remodeling page leads with a contact form — most homeowners need to see the work before they'll fill that out."
Bad: "I noticed your website could use some improvements to help generate more leads for your business."
Bad: "I came across Distinctive Remodeling and thought I'd reach out about your online presence."

---

Respond ONLY with valid JSON. No markdown fences, no explanation, nothing else:
{"custom_subject": "...", "custom_intro": "..."}
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
      max_tokens: 250,
      temperature: 0.75,
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
    custom_intro: parsed.custom_intro,
  };
}
