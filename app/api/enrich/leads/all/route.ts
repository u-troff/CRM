import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PER_PAGE = 50;

export async function GET(req: NextRequest) {
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
  const search = req.nextUrl.searchParams.get("search")?.trim();
  const niche = req.nextUrl.searchParams.get("niche");
  const status = req.nextUrl.searchParams.get("status");

  // Created lazily — see app/api/intelligence/[leadId]/trigger/route.ts for why
  // this isn't module-scoped (avoids crashing Next's build-time data collection).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  let query = supabase
    .from("enrichment_leads")
    .select(
      "id, job_id, created_at, first_name, last_name, email, lead_city, lead_state, lead_country, company_name, company_website, company_phone, niche, custom_subject, custom_intro, enrichment_status, enrichment_error, enrichment_jobs(csv_filename)",
      { count: "exact" }
    );

  if (niche === "flooring" || niche === "remodeling" || niche === "plumbing") {
    query = query.eq("niche", niche);
  }
  if (
    status === "done" ||
    status === "pending" ||
    status === "processing" ||
    status === "scraping" ||
    status === "failed" ||
    status === "no_website"
  ) {
    query = query.eq("enrichment_status", status);
  }
  if (search) {
    // Strip characters that would break Postgrest's .or() filter syntax.
    const escaped = search.replace(/[%,()]/g, "");
    if (escaped) {
      query = query.or(
        `company_name.ilike.%${escaped}%,email.ilike.%${escaped}%,first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%`
      );
    }
  }

  const { data: leads, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    leads: leads ?? [],
    total: count ?? 0,
    page,
    per_page: PER_PAGE,
  });
}
