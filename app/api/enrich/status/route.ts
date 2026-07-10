import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("job_id");

  if (!jobId) {
    return NextResponse.json({ error: "job_id is required" }, { status: 400 });
  }

  // Created lazily — see app/api/intelligence/[leadId]/trigger/route.ts for why
  // this isn't module-scoped (avoids crashing Next's build-time data collection).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: job, error: jobError } = await supabase
    .from("enrichment_jobs")
    .select("status, total_leads, processed_leads")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message ?? "Job not found" }, { status: 404 });
  }

  const { data: counts } = await supabase
    .from("enrichment_leads")
    .select("enrichment_status")
    .eq("job_id", jobId);

  const doneCount = counts?.filter((c) => c.enrichment_status === "done").length ?? 0;
  const failedCount = counts?.filter((c) => c.enrichment_status === "failed" || c.enrichment_status === "no_website").length ?? 0;
  // pending/processing/scraping are the only non-terminal lead states — anything
  // else can never advance the job on its own.
  const inFlightCount = counts?.filter(
    (c) => c.enrichment_status === "pending" || c.enrichment_status === "processing" || c.enrichment_status === "scraping"
  ).length ?? 0;

  // Self-heal orphaned jobs: a job left at pending/processing with no leads
  // still in flight can never be completed by a chunk/webhook (e.g. its leads
  // were deleted mid-run, or an Apify run died). Mark it complete so the UI's
  // status poll resolves instead of looping forever.
  let status = job.status;
  if ((status === "pending" || status === "processing") && inFlightCount === 0) {
    await supabase.from("enrichment_jobs").update({ status: "complete" }).eq("id", jobId);
    status = "complete";
  }

  const percentage = job.total_leads > 0
    ? Math.round((job.processed_leads / job.total_leads) * 100)
    : 0;

  return NextResponse.json({
    status,
    total_leads: job.total_leads,
    processed_leads: job.processed_leads,
    percentage,
    done_count: doneCount,
    failed_count: failedCount,
  });
}
