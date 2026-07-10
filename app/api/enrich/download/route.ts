import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";

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
    .select("niche")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message ?? "Job not found" }, { status: 404 });
  }

  const COLUMNS = [
    "first_name",
    "last_name",
    "email",
    "company_name",
    "lead_city",
    "lead_state",
    "lead_country",
    "company_website",
    "company_phone",
    "niche",
    "custom_subject",
    "custom_email",
  ] as const;

  const { data: leads, error: leadsError } = await supabase
    .from("enrichment_leads")
    .select(COLUMNS.join(", "))
    .eq("job_id", jobId)
    .eq("enrichment_status", "done");

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  const csv = Papa.unparse(leads ?? [], { columns: COLUMNS as unknown as string[] });
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="enriched_${job.niche}_${date}.csv"`,
    },
  });
}
