import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchLocalRankings, domainOf, MapsPlace } from "../_shared/googleMaps.ts";
import { fetchPageSpeed } from "../_shared/pagespeed.ts";
import { scrapeUrl } from "../_shared/scraper.ts";
import { generateReportNarrative, ReportFacts } from "../_shared/reporter.ts";
import { sendReportEmail } from "../_shared/email.ts";

const HOMEPAGE_CHAR_LIMIT = 2500;

// ---- Tally payload parsing -------------------------------------------------

interface TallyField {
  key: string;
  label: string;
  type: string;
  value: unknown;
  options?: { id: string; text: string }[];
}
interface TallyPayload {
  eventType?: string;
  data?: { fields?: TallyField[] };
}

/** Tally values are strings for text inputs, or arrays of option ids for
 * dropdowns/multiple-choice — resolve those back to their option text. */
function fieldValue(f: TallyField): string {
  if (f.value == null) return "";
  if (Array.isArray(f.value)) {
    return f.value
      .map((v) => f.options?.find((o) => o.id === v)?.text ?? String(v))
      .join(", ");
  }
  return String(f.value).trim();
}

/** First field whose label contains any keyword and none of `not`. */
function findField(fields: TallyField[], keywords: string[], not: string[] = []): string {
  const f = fields.find((f) => {
    const label = (f.label ?? "").toLowerCase();
    return keywords.some((k) => label.includes(k)) && !not.some((n) => label.includes(n));
  });
  return f ? fieldValue(f) : "";
}

interface ProspectInput {
  email: string;
  contact_name: string;
  business_name: string;
  website: string;
  trade: string;
  city: string;
  state: string;
}

function parseTally(payload: TallyPayload): ProspectInput {
  const fields = payload.data?.fields ?? [];
  return {
    email: findField(fields, ["email"]),
    contact_name: findField(fields, ["name"], ["business", "company"]),
    business_name: findField(fields, ["business", "company"]),
    website: findField(fields, ["website", "url", "site"]),
    trade: findField(fields, ["trade", "service", "industry", "niche"]),
    city: findField(fields, ["city", "town", "location", "area"]),
    state: findField(fields, ["state", "region"]),
  };
}

// ---- Fact computation ------------------------------------------------------

function computeFacts(input: ProspectInput, places: MapsPlace[], homepage: string, ps: { performance: number | null; seo: number | null }): ReportFacts {
  const prospectDomain = domainOf(input.website);
  const nameLower = input.business_name.toLowerCase();

  const prospectIdx = places.findIndex((p) => {
    if (prospectDomain && domainOf(p.website) === prospectDomain) return true;
    if (nameLower && p.title && (p.title.toLowerCase().includes(nameLower) || nameLower.includes(p.title.toLowerCase()))) return true;
    return false;
  });

  const prospect = prospectIdx >= 0 ? places[prospectIdx] : null;
  const competitors = places.filter((_, i) => i !== prospectIdx).slice(0, 3);
  const topReviews = competitors[0]?.reviews ?? null;
  const reviewGap =
    topReviews != null && prospect?.reviews != null ? topReviews - prospect.reviews : null;

  return {
    business_name: input.business_name || null,
    trade: input.trade || null,
    city: input.city || null,
    found_in_rankings: !!prospect,
    rank: prospect?.rank ?? null,
    rating: prospect?.rating ?? null,
    reviews: prospect?.reviews ?? null,
    top_competitors: competitors.map((c) => ({ name: c.title, rating: c.rating, reviews: c.reviews })),
    review_gap: reviewGap,
    pagespeed_performance: ps.performance,
    pagespeed_seo: ps.seo,
    homepage_excerpt: homepage,
  };
}

// ---- Pipeline --------------------------------------------------------------

async function processReport(supabase: SupabaseClient, reportId: string, input: ProspectInput) {
  try {
    await supabase.from("reports").update({ status: "processing" }).eq("id", reportId);

    const website = input.website && !input.website.startsWith("http") ? `https://${input.website}` : input.website;

    // All three data sources are independent — run them together.
    const [places, ps, homepageRaw] = await Promise.all([
      fetchLocalRankings(input.trade, input.city, input.state),
      fetchPageSpeed(website),
      scrapeUrl(website),
    ]);

    const homepage = (homepageRaw ?? "").slice(0, HOMEPAGE_CHAR_LIMIT);
    const facts = computeFacts(input, places, homepage, ps);
    const narrative = await generateReportNarrative(facts);

    await supabase
      .from("reports")
      .update({
        status: "done",
        completed_at: new Date().toISOString(),
        report_data: { facts, narrative },
      })
      .eq("id", reportId);

    // Email the finished report link. Best-effort: a delivery failure must not
    // mark the report failed (it's already done and viewable). Record the
    // outcome on the row so we can tell delivered vs skipped vs errored.
    const base = (Deno.env.get("REPORT_BASE_URL") ?? "").replace(/\/$/, "");
    const reportUrl = base ? `${base}/report/${reportId}` : "";
    const result = await sendReportEmail({
      to: input.email,
      contactName: input.contact_name,
      businessName: input.business_name,
      headline: narrative.headline,
      summary: narrative.summary,
      reportUrl,
    });
    if (result.ok) {
      await supabase.from("reports").update({ delivered_at: new Date().toISOString() }).eq("id", reportId);
    } else {
      const delivery_error = result.skipped ? `skipped: ${result.reason}` : result.error;
      await supabase.from("reports").update({ delivery_error }).eq("id", reportId);
    }
  } catch (err) {
    await supabase
      .from("reports")
      .update({
        status: "failed",
        error: (err instanceof Error ? err.message : "Unknown error").slice(0, 500),
      })
      .eq("id", reportId);
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== Deno.env.get("TALLY_WEBHOOK_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const payload = (await req.json()) as TallyPayload;
  const input = parseTally(payload);

  // Forms are niche-specific (one Tally form per trade) and usually have no
  // "trade" field, so the trade comes from the webhook URL: append &trade=plumber
  // (falls back to a form field if one happens to match).
  input.trade = input.trade || url.searchParams.get("trade") || "";

  if (!input.trade || !input.city) {
    return new Response(
      JSON.stringify({
        error:
          "Missing required fields: trade and city. Pass trade via the webhook URL (&trade=plumber) and make sure the form has a Location/City field with a value. Note: Tally's 'Test' button sends null text inputs — submit the real form to test with actual values.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      email: input.email || null,
      contact_name: input.contact_name || null,
      business_name: input.business_name || null,
      website: input.website || null,
      trade: input.trade || null,
      city: input.city || null,
      state: input.state || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !report) {
    return new Response(JSON.stringify({ error: error?.message ?? "Insert failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Respond to Tally immediately; do the scraping/GPT work in the background.
  // @ts-ignore — EdgeRuntime is a global provided by Supabase's Deno runtime
  EdgeRuntime.waitUntil(processReport(supabase, report.id, input));

  return new Response(JSON.stringify({ received: true, report_id: report.id }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
});
