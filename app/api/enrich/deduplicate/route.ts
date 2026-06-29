import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  // job_id is optional — when omitted, deduplication runs across every lead
  // in the database rather than a single job.
  const body = await req.json().catch(() => ({}));
  const jobId: string | undefined = body.job_id;

  // Created lazily — see app/api/intelligence/[leadId]/trigger/route.ts for why
  // this isn't module-scoped (avoids crashing Next's build-time data collection).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Deduplication runs on ALL leads regardless of enrichment_status — a
  // pending lead can still be a duplicate.
  let leadsQuery = supabase
    .from("enrichment_leads")
    .select("id, job_id, email, company_name, created_at")
    .order("created_at", { ascending: true });
  if (jobId) leadsQuery = leadsQuery.eq("job_id", jobId);

  const { data: leads, error: fetchError } = await leadsQuery;

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const seenEmails = new Set<string>();
  const seenCompanies = new Set<string>();
  const toDelete: string[] = [];

  for (const lead of leads ?? []) {
    const email = lead.email?.toLowerCase().trim();
    const company = lead.company_name?.toLowerCase().trim();

    if ((email && seenEmails.has(email)) || (company && seenCompanies.has(company))) {
      toDelete.push(lead.id);
    } else {
      if (email) seenEmails.add(email);
      if (company) seenCompanies.add(company);
    }
  }

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("enrichment_leads")
      .delete()
      .in("id", toDelete);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
  }

  // Recompute total_leads for every job touched by this scan — a global
  // dedupe can span many jobs at once.
  const affectedJobIds = jobId ? [jobId] : Array.from(new Set((leads ?? []).map((l) => l.job_id)));

  await Promise.all(
    affectedJobIds.map(async (jid) => {
      const { count } = await supabase
        .from("enrichment_leads")
        .select("*", { count: "exact", head: true })
        .eq("job_id", jid);

      await supabase.from("enrichment_jobs").update({ total_leads: count ?? 0 }).eq("id", jid);
    })
  );

  return NextResponse.json({ removed: toDelete.length });
}
