export type EnrichmentNiche = "flooring" | "remodeling";
export type EnrichmentStatus = "pending" | "processing" | "done" | "failed";

// Row shape for the cross-job "all leads in the database" view. Supabase's
// untyped client infers the embedded enrichment_jobs relation as an array at
// the type level even though job_id is a to-one FK at runtime — accept
// either shape and normalize via getCsvFilename().
export interface AllLeadsRow {
  id: string;
  job_id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  lead_city: string | null;
  lead_state: string | null;
  lead_country: string | null;
  company_name: string | null;
  company_website: string | null;
  company_phone: string | null;
  niche: EnrichmentNiche | null;
  custom_subject: string | null;
  custom_intro: string | null;
  enrichment_status: EnrichmentStatus;
  enrichment_error: string | null;
  enrichment_jobs: { csv_filename: string | null } | { csv_filename: string | null }[] | null;
}

// Editable fields for the Add/Edit Lead form shared by the create and
// update flows in the "all leads" database view.
export interface LeadFormValues {
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  lead_city: string;
  lead_state: string;
  lead_country: string;
  company_website: string;
  company_phone: string;
  niche: EnrichmentNiche;
}
