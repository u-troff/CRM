import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { scrapeUrl, findGbpUrl } from "../_shared/scraper.ts";
import { analyseLeadIntelligence } from "../_shared/analyst.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Initialise Supabase client with service role (can write to any table)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let leadId: string | null = null;

  try {
    const body = await req.json();
    leadId = body.leadId;

    if (!leadId) {
      return new Response(
        JSON.stringify({ error: "leadId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch the lead — columns are the normalized snake_case names from
    // the `leads` table (see supabase/schema.sql), not raw CSV headers.
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    // 2. Mark as running
    await supabase
      .from("lead_intelligence")
      .upsert({ lead_id: leadId, status: "running" }, { onConflict: "lead_id" });

    // 3. Extract URLs from the lead row
    const websiteUrl: string | null = lead.website || null;
    const linkedinUrl: string | null = lead.linkedin_link || null;
    const companyLinkedinUrl: string | null = lead.company_linkedin_link || null;
    const facebookUrl: string | null = lead.company_facebook_link || null;
    const businessName: string = lead.business_name || "";
    const city: string = lead.city || "";

    // 4. Scrape all sources in parallel — failures return null, never throw
    const [
      websiteContent,
      linkedinContent,
      companyLinkedinContent,
      facebookContent,
      gbpUrl,
    ] = await Promise.all([
      scrapeUrl(websiteUrl),
      scrapeUrl(linkedinUrl),
      scrapeUrl(companyLinkedinUrl),
      scrapeUrl(facebookUrl),
      findGbpUrl(businessName, city),
    ]);

    // GBP needs a second scrape once we have the URL
    const gbpContent = gbpUrl ? await scrapeUrl(gbpUrl) : null;

    // 5. Analyse with OpenAI
    const report = await analyseLeadIntelligence({
      businessName,
      ownerName: lead.owner_name || "",
      ownerTitle: lead.owner_title || "",
      city,
      state: lead.state || "",
      website: websiteUrl,
      websiteContent,
      linkedinContent,
      companyLinkedinContent,
      facebookContent,
      gbpContent,
    });

    // 6. Save completed report
    await supabase
      .from("lead_intelligence")
      .upsert(
        {
          lead_id: leadId,
          website_content: websiteContent,
          linkedin_content: linkedinContent,
          company_linkedin_content: companyLinkedinContent,
          facebook_content: facebookContent,
          gbp_content: gbpContent,
          business_summary: report.business_summary,
          website_pain_points: report.website_pain_points,
          linkedin_insights: report.linkedin_insights,
          facebook_insights: report.facebook_insights,
          gbp_insights: report.gbp_insights,
          cold_call_intro: report.cold_call_intro,
          cold_email_intro: report.cold_email_intro,
          status: "done",
          error_message: null,
          scraped_at: new Date().toISOString(),
        },
        { onConflict: "lead_id" }
      );

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    // Write error state so client stops polling
    if (leadId) {
      await supabase
        .from("lead_intelligence")
        .upsert(
          {
            lead_id: leadId,
            status: "error",
            error_message: err instanceof Error ? err.message : "Unknown error",
          },
          { onConflict: "lead_id" }
        );
    }

    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
