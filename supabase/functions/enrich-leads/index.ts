import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { scrapeUrl } from "../_shared/scraper.ts";
import { generateColdEmailCopy } from "../_shared/copywriter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 3;
const SCRAPE_CHAR_LIMIT = 2500;

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

function normalizeUrl(rawUrl: string | null): string {
  let url = rawUrl?.trim();
  if (!url) throw new Error("No website URL");
  if (!url.startsWith("http")) url = "https://" + url;
  return url.replace(/^http:\/\//, "https://");
}

async function processLead(supabase: SupabaseClient, lead: EnrichmentLead) {
  await supabase
    .from("enrichment_leads")
    .update({ enrichment_status: "processing" })
    .eq("id", lead.id);

  try {
    const url = normalizeUrl(lead.company_website);

    const markdown = await scrapeUrl(url);
    const scrapedContent = (markdown ?? "").slice(0, SCRAPE_CHAR_LIMIT);

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

  // Always increment — even on failure
  await supabase.rpc("increment_enrichment_count", { job_id: lead.job_id });
}

async function processJob(supabase: SupabaseClient, jobId: string) {
  try {
    await supabase.from("enrichment_jobs").update({ status: "processing" }).eq("id", jobId);

    const { data: leads, error } = await supabase
      .from("enrichment_leads")
      .select("id, job_id, first_name, company_name, industry, lead_city, lead_state, company_website")
      .eq("job_id", jobId)
      .eq("enrichment_status", "pending");

    if (error) throw error;

    for (let i = 0; i < (leads?.length ?? 0); i += BATCH_SIZE) {
      const batch = leads!.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map((lead) => processLead(supabase, lead as EnrichmentLead)));
    }

    await supabase.from("enrichment_jobs").update({ status: "complete" }).eq("id", jobId);
  } catch {
    await supabase.from("enrichment_jobs").update({ status: "failed" }).eq("id", jobId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { job_id } = await req.json();

  if (!job_id) {
    return new Response(JSON.stringify({ error: "job_id is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // @ts-ignore — EdgeRuntime is a global provided by Supabase's Deno runtime
  EdgeRuntime.waitUntil(processJob(supabase, job_id));

  return new Response(JSON.stringify({ received: true }), {
    status: 202,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
