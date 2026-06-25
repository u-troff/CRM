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

  const percentage = job.total_leads > 0
    ? Math.round((job.processed_leads / job.total_leads) * 100)
    : 0;

  return NextResponse.json({
    status: job.status,
    total_leads: job.total_leads,
    processed_leads: job.processed_leads,
    percentage,
    done_count: doneCount,
    failed_count: failedCount,
  });
}
