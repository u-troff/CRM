import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";

// Smartlead-ready columns — same set as /api/enrich/download, just not
// scoped to a single job_id.
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

export async function GET(req: NextRequest) {
  const niche = req.nextUrl.searchParams.get("niche");
  const search = req.nextUrl.searchParams.get("search")?.trim();

  // Created lazily — see app/api/intelligence/[leadId]/trigger/route.ts for why
  // this isn't module-scoped (avoids crashing Next's build-time data collection).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // "Enriched" always means done — a pending/failed lead has no
  // custom_subject/custom_email to put in a Smartlead-ready file.
  let query = supabase.from("enrichment_leads").select(COLUMNS.join(", ")).eq("enrichment_status", "done");

  if (niche === "flooring" || niche === "remodeling" || niche === "plumbing") {
    query = query.eq("niche", niche);
  }
  if (search) {
    const escaped = search.replace(/[%,()]/g, "");
    if (escaped) {
      query = query.or(
        `company_name.ilike.%${escaped}%,email.ilike.%${escaped}%,first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%`
      );
    }
  }

  const { data: leads, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const csv = Papa.unparse(leads ?? [], { columns: COLUMNS as unknown as string[] });
  const date = new Date().toISOString().slice(0, 10);
  const nicheLabel = niche === "flooring" || niche === "remodeling" || niche === "plumbing" ? niche : "all";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="enriched_${nicheLabel}_${date}.csv"`,
    },
  });
}
