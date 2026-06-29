import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Manually-added leads (i.e. typed in via the UI rather than uploaded as a
// CSV) still need a parent job to satisfy enrichment_leads' job_id FK, so
// they're grouped under a dedicated "Manually Added" job per niche.
const MANUAL_CSV_FILENAME = "Manually Added";

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.niche !== "flooring" && body.niche !== "remodeling") {
    return NextResponse.json({ error: "niche must be 'flooring' or 'remodeling'" }, { status: 400 });
  }

  const companyName = typeof body.company_name === "string" ? body.company_name.trim() : "";
  if (!companyName) {
    return NextResponse.json({ error: "company_name is required" }, { status: 400 });
  }

  // Created lazily — see app/api/intelligence/[leadId]/trigger/route.ts for why
  // this isn't module-scoped (avoids crashing Next's build-time data collection).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let { data: job } = await supabase
    .from("enrichment_jobs")
    .select("id, total_leads")
    .eq("csv_filename", MANUAL_CSV_FILENAME)
    .eq("niche", body.niche)
    .maybeSingle();

  if (!job) {
    const { data: newJob, error: jobError } = await supabase
      .from("enrichment_jobs")
      .insert({
        csv_filename: MANUAL_CSV_FILENAME,
        niche: body.niche,
        status: "complete",
        total_leads: 0,
        processed_leads: 0,
      })
      .select("id, total_leads")
      .single();

    if (jobError || !newJob) {
      return NextResponse.json({ error: jobError?.message ?? "Failed to create manual job" }, { status: 500 });
    }
    job = newJob;
  }

  const { data: lead, error: leadError } = await supabase
    .from("enrichment_leads")
    .insert({
      job_id: job.id,
      niche: body.niche,
      first_name: body.first_name ?? "",
      last_name: body.last_name ?? "",
      email: body.email ?? "",
      company_name: companyName,
      lead_city: body.lead_city ?? "",
      lead_state: body.lead_state ?? "",
      lead_country: body.lead_country ?? "",
      company_website: body.company_website ?? "",
      company_phone: body.company_phone ?? "",
      enrichment_status: "pending",
    })
    .select("*")
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: leadError?.message ?? "Failed to create lead" }, { status: 500 });
  }

  await supabase
    .from("enrichment_jobs")
    .update({ total_leads: (job.total_leads ?? 0) + 1 })
    .eq("id", job.id);

  return NextResponse.json(lead, { status: 201 });
}
