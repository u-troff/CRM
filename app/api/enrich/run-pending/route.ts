import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Kicks off the enrich-leads Edge Function for every job that currently has
// at least one pending lead — covers CSV jobs that never finished as well as
// leads added manually through the UI, which otherwise never get enriched.
export async function POST() {
  // Created lazily — see app/api/intelligence/[leadId]/trigger/route.ts for why
  // this isn't module-scoped (avoids crashing Next's build-time data collection).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: pending, error } = await supabase
    .from("enrichment_leads")
    .select("job_id")
    .eq("enrichment_status", "pending");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const jobIds = Array.from(new Set((pending ?? []).map((l) => l.job_id)));

  await Promise.all(
    jobIds.map((jobId) =>
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/enrich-leads`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ job_id: jobId }),
      }).catch(console.error)
    )
  );

  return NextResponse.json({ pending_count: pending?.length ?? 0, job_count: jobIds.length });
}
