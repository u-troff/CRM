import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { startWebsiteCrawlerRun } from "../_shared/apify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Apify path counterpart to enrich-leads' Firecrawl path — CHUNK_SIZE leads
// per Apify run. Unlike enrich-leads, chunks are NOT fired back-to-back here:
// once a chunk's Apify run is dispatched, this function does not advance to
// the next chunk itself. apify-webhook-handler re-invokes this function for
// the next chunk only after the current run resolves, so at most one Apify
// run from this job is ever in flight at a time — firing many runs at once
// blows through Apify's per-account concurrent-run/memory limits.
const CHUNK_SIZE = 25;

interface EnrichmentLead {
  id: string;
  job_id: string;
  company_website: string | null;
}

function normalizeUrl(rawUrl: string | null): string | null {
  const url = rawUrl?.trim();
  if (!url) return null;
  const withScheme = url.startsWith("http") ? url : `https://${url}`;
  return withScheme.replace(/^http:\/\//, "https://");
}

function invokeNextChunk(jobId: string) {
  // Fire and forget — see enrich-leads/index.ts for why this must not be awaited.
  fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/start-enrichment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ job_id: jobId }),
  }).catch(console.error);
}

async function processChunk(supabase: SupabaseClient, jobId: string) {
  try {
    await supabase.from("enrichment_jobs").update({ status: "processing" }).eq("id", jobId);

    const { data: leads, error } = await supabase
      .from("enrichment_leads")
      .select("id, job_id, company_website")
      .eq("job_id", jobId)
      .eq("enrichment_status", "pending")
      .order("created_at", { ascending: true })
      .limit(CHUNK_SIZE);

    if (error) throw error;

    if (!leads || leads.length === 0) {
      // No pending leads left to kick off — completion is decided by
      // apify-webhook-handler once every lead reaches a terminal status,
      // since leads may still be mid-scrape.
      return;
    }

    const withUrl: { lead: EnrichmentLead; url: string }[] = [];
    const withoutUrl: EnrichmentLead[] = [];

    for (const lead of leads as EnrichmentLead[]) {
      const url = normalizeUrl(lead.company_website);
      if (url) withUrl.push({ lead, url });
      else withoutUrl.push(lead);
    }

    // Same as enrich-leads: a lead with no usable website URL never reaches
    // GPT-4o at all — mark it failed immediately.
    for (const lead of withoutUrl) {
      await supabase
        .from("enrichment_leads")
        .update({ enrichment_status: "failed", enrichment_error: "No website URL" })
        .eq("id", lead.id);
      await supabase.rpc("increment_enrichment_count", { job_id: lead.job_id });
    }

    if (withUrl.length > 0) {
      const webhookSecret = Deno.env.get("APIFY_WEBHOOK_SECRET");
      const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/apify-webhook-handler?secret=${encodeURIComponent(webhookSecret ?? "")}`;

      const apifyRunId = await startWebsiteCrawlerRun({
        urls: withUrl.map((x) => x.url),
        webhookUrl,
      });

      const { error: runError } = await supabase
        .from("enrichment_apify_runs")
        .insert({ job_id: jobId, apify_run_id: apifyRunId, status: "pending" });
      if (runError) throw runError;

      await supabase
        .from("enrichment_leads")
        .update({ enrichment_status: "scraping", apify_run_id: apifyRunId })
        .in("id", withUrl.map((x) => x.lead.id));

      // Do NOT advance to the next chunk here — apify-webhook-handler
      // invokes start-enrichment again once THIS run resolves, so only one
      // Apify run from this job is ever in flight at a time.
      return;
    }

    // This chunk was entirely leads with no website — nothing was dispatched
    // to Apify, so it's safe to move on to the next chunk immediately.
    const { count: pendingCount } = await supabase
      .from("enrichment_leads")
      .select("*", { count: "exact", head: true })
      .eq("job_id", jobId)
      .eq("enrichment_status", "pending");

    if (pendingCount && pendingCount > 0) {
      invokeNextChunk(jobId);
      return;
    }

    // No pending leads left. Only mark the job complete if nothing is still
    // out scraping via Apify from an earlier chunk — that path is resolved
    // by apify-webhook-handler instead.
    const { count: scrapingCount } = await supabase
      .from("enrichment_leads")
      .select("*", { count: "exact", head: true })
      .eq("job_id", jobId)
      .eq("enrichment_status", "scraping");

    if (!scrapingCount || scrapingCount === 0) {
      await supabase.from("enrichment_jobs").update({ status: "complete" }).eq("id", jobId);
    }
  } catch (err) {
    console.error("processChunk error:", err);
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
  EdgeRuntime.waitUntil(processChunk(supabase, job_id));

  return new Response(JSON.stringify({ received: true }), {
    status: 202,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
