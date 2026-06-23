import { createClient } from "@supabase/supabase-js";
import IntelligenceQueue from "@/components/intelligence/IntelligenceQueue";

// No cookies()/headers() call here to give Next an automatic dynamic signal,
// so force it explicitly — this page must always read fresh lead data.
export const dynamic = "force-dynamic";

export default async function IntelligencePage() {
  // Created lazily — see app/api/intelligence/[leadId]/trigger/route.ts for why
  // this isn't module-scoped (avoids crashing Next's build-time data collection).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: leads } = await supabase
    .from("leads")
    .select(
      `
      id,
      business_name,
      owner_name,
      city,
      state,
      website,
      lead_intelligence (
        status,
        scraped_at,
        cold_call_intro,
        cold_email_intro
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(200);

  return <IntelligenceQueue leads={leads ?? []} />;
}
