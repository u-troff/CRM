import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDatasetItems } from "../_shared/apify.ts";
import { generateColdEmailCopy } from "../_shared/copywriter.ts";

const BATCH_SIZE = 3;
const SCRAPE_CHAR_LIMIT = 2500;

interface WebhookPayload {
  eventType: string;
  resource: { id: string; defaultDatasetId?: string; status: string };
}

interface EnrichmentLead {
  id: string;
  job_id: string;
  first_name: string | null;
  company_name: string | null;
  industry: string | null;
  lead_city: string | null;
  lead_state: string | null;
  company_website: string | null;
}

function normalizeUrl(rawUrl: string | null): string | null {
  const url = rawUrl?.trim();
  if (!url) return null;
  const withScheme = url.startsWith("http") ? url : `https://${url}`;
  return withScheme.replace(/^http:\/\//, "https://").replace(/\/$/, "");
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Matches a dataset item back to the lead whose site it scraped. Apify's
 * Website Content Crawler doesn't pass custom userData through to dataset
 * items, so this matches on the (normalized) URL, falling back to a
 * hostname-only match to tolerate redirects (http->https, trailing slash,
 * www). */
function findScrapedContent(
  lead: EnrichmentLead,
  items: { url: string; crawl?: { loadedUrl?: string }; markdown?: string; text?: string }[]
): string | null {
  const leadUrl = normalizeUrl(lead.company_website);
  if (!leadUrl) return null;
  const leadHost = hostnameOf(leadUrl);

  const exact = items.find((item) => {
    const itemUrl = normalizeUrl(item.url) ?? normalizeUrl(item.crawl?.loadedUrl ?? null);
    return itemUrl === leadUrl;
  });
  if (exact) return exact.markdown ?? exact.text ?? null;

  const byHost = items.find((item) => hostnameOf(item.url) === leadHost);
  return byHost ? byHost.markdown ?? byHost.text ?? null : null;
}

function invokeNextChunk(jobId: string) {
  // Fire and forget — see enrich-leads/index.ts for why this must not be
  // awaited. This is what actually advances the job: start-enrichment no
  // longer chains chunks itself once an Apify run is dispatched, so the next
  // chunk only starts once THIS run has fully resolved (keeping at most one
  // Apify run per job in flight at a time).
  fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/start-enrichment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ job_id: jobId }),
  }).catch(console.error);
}

async function processLead(
  supabase: SupabaseClient,
  lead: EnrichmentLead,
  scrapedContent: string
) {
  try {
    const { custom_subject, custom_intro } = await generateColdEmailCopy(lead, scrapedContent);

    await supabase
      .from("enrichment_leads")
      .update({
        scraped_content: scrapedContent,
        custom_subject,
        custom_intro,
        enrichment_status: "done",
        enriched_at: new Date().toISOString(),
      })
      .eq("id", lead.id);
  } catch (err) {
    await supabase
      .from("enrichment_leads")
      .update({
        enrichment_status: "failed",
        enrichment_error: (err instanceof Error ? err.message : "Unknown error").slice(0, 500),
      })
      .eq("id", lead.id);
  }

  await supabase.rpc("increment_enrichment_count", { job_id: lead.job_id });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");

  if (!secret || secret !== Deno.env.get("APIFY_WEBHOOK_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const payload: WebhookPayload = await req.json();
  const runId = payload.resource?.id;
  const datasetId = payload.resource?.defaultDatasetId;
  const runSucceeded = payload.eventType === "ACTOR.RUN.SUCCEEDED";

  if (!runId) {
    return new Response(JSON.stringify({ error: "Missing resource.id" }), { status: 400 });
  }

  const { data: leads, error } = await supabase
    .from("enrichment_leads")
    .select("id, job_id, first_name, company_name, industry, lead_city, lead_state, company_website")
    .eq("apify_run_id", runId)
    .eq("enrichment_status", "scraping");

  if (error) {
    console.error("Failed to load leads for apify run", runId, error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!leads || leads.length === 0) {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  // Run failed/timed-out/aborted, or succeeded with no dataset — every lead
  // in this run falls back to empty scraped content (same as a per-lead
  // scrape failure in enrich-leads: GPT-4o still runs, using its own
  // built-in fallback instruction).
  const items = runSucceeded && datasetId ? await getDatasetItems(datasetId) : [];

  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = (leads as EnrichmentLead[]).slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((lead) => {
        const scrapedContent = (findScrapedContent(lead, items) ?? "").slice(0, SCRAPE_CHAR_LIMIT);
        return processLead(supabase, lead, scrapedContent);
      })
    );
  }

  await supabase
    .from("enrichment_apify_runs")
    .update({ status: runSucceeded ? "succeeded" : "failed" })
    .eq("apify_run_id", runId);

  const jobId = (leads as EnrichmentLead[])[0].job_id;

  const { count: pendingCount } = await supabase
    .from("enrichment_leads")
    .select("*", { count: "exact", head: true })
    .eq("job_id", jobId)
    .eq("enrichment_status", "pending");

  if (pendingCount && pendingCount > 0) {
    // More leads waiting — this run resolving is what unblocks the next
    // chunk (see start-enrichment/index.ts for why chunks don't self-chain).
    invokeNextChunk(jobId);
  } else {
    const { count: scrapingCount } = await supabase
      .from("enrichment_leads")
      .select("*", { count: "exact", head: true })
      .eq("job_id", jobId)
      .eq("enrichment_status", "scraping");

    if (!scrapingCount || scrapingCount === 0) {
      await supabase.from("enrichment_jobs").update({ status: "complete" }).eq("id", jobId);
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
