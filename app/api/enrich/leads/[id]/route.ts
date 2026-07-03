import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EDITABLE_STRING_FIELDS = [
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
  "company_website",
  "company_linkedin",
  "company_phone",
  "custom_subject",
  "custom_intro",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  for (const field of EDITABLE_STRING_FIELDS) {
    if (typeof body[field] === "string") update[field] = body[field];
  }
  if (body.niche === "flooring" || body.niche === "remodeling" || body.niche === "plumbing") {
    update.niche = body.niche;
  }
  if (typeof body.employee_count === "number") {
    update.employee_count = body.employee_count;
  }

  // Created lazily — see app/api/intelligence/[leadId]/trigger/route.ts for why
  // this isn't module-scoped (avoids crashing Next's build-time data collection).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("enrichment_leads")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Created lazily — see app/api/intelligence/[leadId]/trigger/route.ts for why
  // this isn't module-scoped (avoids crashing Next's build-time data collection).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: lead, error: fetchError } = await supabase
    .from("enrichment_leads")
    .select("job_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !lead) {
    return NextResponse.json({ error: fetchError?.message ?? "Lead not found" }, { status: 404 });
  }

  const { error: deleteError } = await supabase.from("enrichment_leads").delete().eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await supabase.rpc("decrement_enrichment_count", { job_id: lead.job_id });

  return NextResponse.json({ success: true });
}
