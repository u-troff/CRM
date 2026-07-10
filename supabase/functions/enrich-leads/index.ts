import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { scrapeUrl } from "../_shared/scraper.ts";
import { generateColdEmailCopy } from "../_shared/copywriter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Each chunk processes CHUNK_SIZE leads (in batches of BATCH_SIZE concurrent
// requests) then re-invokes itself before exiting, to stay well under the
// Edge Function's 2.5 minute wall-clock limit on long lead lists.
const CHUNK_SIZE = 25;
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

    const { custom_subject, custom_email } = await generateColdEmailCopy(lead, scrapedContent);

    await supabase
      .from("enrichment_leads")
      .update({
        scraped_content: scrapedContent,
        custom_subject,
        custom_email,
        enrichment_status: "done",
        enriched_at: new Date().toISOString(),
      })
      .eq("id", lead.id);
  } catch (err) {
    // Per-lead errors must never fail the chunk — mark this lead failed and
    // keep going.
    await supabase
      .from("enrichment_leads")
      .update({
        enrichment_status: "failed",
        enrichment_error: (err instanceof Error ? err.message : "Unknown error").slice(0, 500),
      })
      .eq("id", lead.id);
  }

  // Always increment — even on failure — using the atomic RPC (never read-then-write).
  await supabase.rpc("increment_enrichment_count", { job_id: lead.job_id });
}

function invokeNextChunk(jobId: string) {
  // Fire and forget — do NOT await. Awaiting would keep this invocation
  // alive until the next one finishes, defeating the whole point of
  // chunking around the wall-clock limit.
  fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/enrich-leads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ job_id: jobId }),
  }).catch(console.error);
}

async function processJob(supabase: SupabaseClient, jobId: string) {
  try {
    // Idempotent — safe to call on every chunk, not just the first.
    await supabase.from("enrichment_jobs").update({ status: "processing" }).eq("id", jobId);

    // Always pull the next CHUNK_SIZE pending leads from the top. No offset
    // is needed: leads that finish this chunk flip to done/failed and fall
    // out of the pending filter, so the next chunk naturally picks up where
    // this one left off.
    const { data: leads, error } = await supabase
      .from("enrichment_leads")
      .select("id, job_id, first_name, company_name, industry, lead_city, lead_state, company_website")
      .eq("job_id", jobId)
      .eq("enrichment_status", "pending")
      .order("created_at", { ascending: true })
      .limit(CHUNK_SIZE);

    if (error) throw error;

    if (!leads || leads.length === 0) {
      await supabase.from("enrichment_jobs").update({ status: "complete" }).eq("id", jobId);
      return;
    }

    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map((lead) => processLead(supabase, lead as EnrichmentLead)));
    }

    const { count } = await supabase
      .from("enrichment_leads")
      .select("*", { count: "exact", head: true })
      .eq("job_id", jobId)
      .eq("enrichment_status", "pending");

    if (count && count > 0) {
      // More pending leads remain — hand off to the next chunk and exit.
      // Do NOT set status to complete here; the job is still running.
      invokeNextChunk(jobId);
    } else {
      await supabase.from("enrichment_jobs").update({ status: "complete" }).eq("id", jobId);
    }
  } catch (err) {
    console.error("processJob error:", err);
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
