import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";

interface ApolloRow {
  [key: string]: string;
}

interface MappedLead {
  job_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  title: string;
  email: string;
  linkedin_url: string;
  lead_city: string;
  lead_state: string;
  company_name: string;
  industry: string;
  employee_count: number | null;
  company_website: string;
  company_linkedin: string;
  company_phone: string;
}

function mapRow(row: ApolloRow, jobId: string): MappedLead {
  const employeeCountRaw = row["Employee Count"]?.trim();
  return {
    job_id: jobId,
    first_name: row["First Name"] ?? "",
    last_name: row["Last Name"] ?? "",
    full_name: row["Full Name"] ?? "",
    title: row["Title"] ?? "",
    email: row["Email"] ?? "",
    linkedin_url: row["LinkedIn Link"] ?? "",
    lead_city: row["Lead City"] ?? "",
    lead_state: row["Lead State"] ?? "",
    company_name: row["Company Name"] ?? "",
    industry: row["Industry"] ?? "",
    employee_count: employeeCountRaw ? parseInt(employeeCountRaw, 10) || null : null,
    company_website: row["Company Website Full"] ?? "",
    company_linkedin: row["Company LinkedIn Link"] ?? "",
    company_phone: row["Company Phone Number"] ?? "",
  };
}

export async function POST(req: NextRequest) {
  // Created lazily — see app/api/intelligence/[leadId]/trigger/route.ts for why
  // this isn't module-scoped (avoids crashing Next's build-time data collection).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const formData = await req.formData();
  const file = formData.get("file");
  const niche = formData.get("niche");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (niche !== "flooring" && niche !== "remodeling") {
    return NextResponse.json({ error: "niche must be 'flooring' or 'remodeling'" }, { status: 400 });
  }

  const text = await file.text();
  const { data: rows } = Papa.parse<ApolloRow>(text, { header: true, skipEmptyLines: true });

  const { data: job, error: jobError } = await supabase
    .from("enrichment_jobs")
    .insert({ csv_filename: file.name, niche, status: "pending" })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message ?? "Failed to create job" }, { status: 500 });
  }

  const leads = rows
    .map((row) => mapRow(row, job.id))
    .filter((lead) => lead.company_website.trim() !== "");

  if (leads.length === 0) {
    return NextResponse.json({ error: "No leads with a company website found in CSV" }, { status: 400 });
  }

  const { error: leadsError } = await supabase.from("enrichment_leads").insert(leads);

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  await supabase.from("enrichment_jobs").update({ total_leads: leads.length }).eq("id", job.id);

  fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/enrich-leads`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ job_id: job.id }),
  }).catch(console.error); // fire and forget

  return NextResponse.json({ job_id: job.id }, { status: 202 });
}
