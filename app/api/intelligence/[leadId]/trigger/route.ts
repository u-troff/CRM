import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params;

  // Created lazily (not at module scope) so this doesn't run during Next's
  // build-time page-data collection, before env vars are necessarily set.
  // Server-only — uses the service role key so this route works regardless
  // of the caller's session, and so it can write to lead_intelligence directly.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Prevent duplicate invocations while one is already in flight
  const { data: existing } = await supabase
    .from("lead_intelligence")
    .select("status")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (existing?.status === "running") {
    return NextResponse.json(
      { error: "Research already in progress" },
      { status: 409 }
    );
  }

  // Write running status immediately so the client can start polling
  await supabase
    .from("lead_intelligence")
    .upsert({ lead_id: leadId, status: "running" }, { onConflict: "lead_id" });

  // Invoke the Edge Function — fire and forget, do NOT await the result.
  // It runs independently in Supabase's infrastructure and writes back when done.
  supabase.functions.invoke("research-lead", { body: { leadId } }).catch(() => {
    // Swallow — the Edge Function writes its own error state on failure
  });

  return NextResponse.json({ status: "running" }, { status: 202 });
}
