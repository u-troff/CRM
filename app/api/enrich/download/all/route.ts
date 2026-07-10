import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";

const COLUMNS = [
  "first_name",
  "last_name",
  "full_name",
  "title",
  "email",
  "linkedin_url",
  "lead_city",
  "lead_state",
  "lead_country",
  "company_name",
  "industry",
  "employee_count",
  "company_website",
  "company_linkedin",
  "company_phone",
  "niche",
  "custom_subject",
  "custom_email",
  "enrichment_status",
  "enrichment_error",
] as const;

export async function GET() {
  // Created lazily — see app/api/intelligence/[leadId]/trigger/route.ts for why
  // this isn't module-scoped (avoids crashing Next's build-time data collection).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Unlike /api/enrich/download (Smartlead-ready, done-only, single job),
  // this pulls every lead across every job regardless of status — a full
  // export for backup/review rather than an upload-ready list.
  const { data: leads, error } = await supabase
    .from("enrichment_leads")
    .select(COLUMNS.join(", "))
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const csv = Papa.unparse(leads ?? [], { columns: COLUMNS as unknown as string[] });
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="all_leads_${date}.csv"`,
    },
  });
}
