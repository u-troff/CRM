import { createClient } from "@/lib/supabase/client";
import type { CallAttempt, Lead } from "@/types/lead";
import type { StorageAdapter } from "./types";

type DbCallAttempt = {
  id: string;
  created_at: string;
  status: CallAttempt["status"];
  notes: string | null;
  duration_seconds: number | null;
};

type DbLead = {
  id: string;
  business_name: string;
  city: string | null;
  phone: string | null;
  phone_raw: string | null;
  website: string | null;
  rating: number | null;
  review_count: number | null;
  is_franchise: boolean | null;
  tier: Lead["tier"];
  website_notes: string | null;
  owner_name: string | null;
  current_status: Lead["currentStatus"];
  niche: Lead["niche"] | null;
  external_id: string | null;
  source: Lead["source"] | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  owner_title: string | null;
  state: string | null;
  email_quality: string | null;
  email_result: string | null;
  linkedin_link: string | null;
  company_linkedin_link: string | null;
  company_facebook_link: string | null;
  created_at: string;
  updated_at: string;
  call_attempts?: DbCallAttempt[];
};

function mapDbRowToLead(row: DbLead): Lead {
  return {
    id: row.id,
    businessName: row.business_name,
    city: row.city ?? "",
    phone: row.phone ?? "",
    phoneRaw: row.phone_raw ?? "",
    website: row.website ?? "",
    rating: row.rating,
    reviewCount: row.review_count,
    isFranchise: row.is_franchise ?? false,
    tier: row.tier,
    websiteNotes: row.website_notes ?? "",
    ownerName: row.owner_name ?? "",
    currentStatus: row.current_status,
    niche: row.niche ?? null,
    externalId: row.external_id ?? undefined,
    source: row.source ?? "manual",
    email: row.email ?? undefined,
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    ownerTitle: row.owner_title ?? undefined,
    state: row.state ?? undefined,
    emailQuality: row.email_quality ?? undefined,
    emailResult: row.email_result ?? undefined,
    linkedinLink: row.linkedin_link ?? undefined,
    companyLinkedinLink: row.company_linkedin_link ?? undefined,
    companyFacebookLink: row.company_facebook_link ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    history: (row.call_attempts ?? [])
      .map(
        (attempt): CallAttempt => ({
          id: attempt.id,
          timestamp: new Date(attempt.created_at).getTime(),
          status: attempt.status,
          notes: attempt.notes ?? "",
          durationSeconds: attempt.duration_seconds ?? undefined,
        })
      )
      .sort((a, b) => a.timestamp - b.timestamp),
  };
}

function mapLeadToDbRow(lead: Lead, userId: string) {
  return {
    id: lead.id,
    user_id: userId,
    business_name: lead.businessName,
    city: lead.city,
    phone: lead.phone,
    phone_raw: lead.phoneRaw,
    website: lead.website,
    rating: lead.rating,
    review_count: lead.reviewCount,
    is_franchise: lead.isFranchise,
    tier: lead.tier,
    website_notes: lead.websiteNotes,
    owner_name: lead.ownerName,
    current_status: lead.currentStatus,
    niche: lead.niche ?? null,
    external_id: lead.externalId ?? null,
    source: lead.source ?? "manual",
    email: lead.email ?? null,
    first_name: lead.firstName ?? null,
    last_name: lead.lastName ?? null,
    owner_title: lead.ownerTitle ?? null,
    state: lead.state ?? null,
    email_quality: lead.emailQuality ?? null,
    email_result: lead.emailResult ?? null,
    linkedin_link: lead.linkedinLink ?? null,
    company_linkedin_link: lead.companyLinkedinLink ?? null,
    company_facebook_link: lead.companyFacebookLink ?? null,
    created_at: new Date(lead.createdAt).toISOString(),
    updated_at: new Date(lead.updatedAt).toISOString(),
  };
}

export class SupabaseAdapter implements StorageAdapter {
  async getLeads(): Promise<Lead[]> {
    const supabase = createClient();
    // PostgREST caps each response at 1000 rows (max-rows), so page through
    // with .range() until a short batch signals we've fetched everything.
    const BATCH = 1000;
    const rows: DbLead[] = [];
    for (let from = 0; ; from += BATCH) {
      const { data, error } = await supabase
        .from("leads")
        .select("*, call_attempts(*)")
        .order("created_at", { ascending: false })
        .range(from, from + BATCH - 1);

      if (error) throw error;
      const batch = (data ?? []) as DbLead[];
      rows.push(...batch);
      if (batch.length < BATCH) break;
    }
    return rows.map((row) => mapDbRowToLead(row));
  }

  async getLead(id: string): Promise<Lead | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("leads")
      .select("*, call_attempts(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapDbRowToLead(data as DbLead) : null;
  }

  async saveLead(lead: Lead): Promise<void> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const row = mapLeadToDbRow(lead, user.id);

    const { error: leadError } = await supabase.from("leads").upsert(row, { onConflict: "id" });
    if (leadError) throw leadError;

    const { error: deleteAttemptsError } = await supabase
      .from("call_attempts")
      .delete()
      .eq("lead_id", lead.id);

    if (deleteAttemptsError) throw deleteAttemptsError;

    if (lead.history.length > 0) {
      const attempts = lead.history.map((attempt) => ({
        id: attempt.id,
        lead_id: lead.id,
        user_id: user.id,
        status: attempt.status,
        notes: attempt.notes,
        duration_seconds: attempt.durationSeconds ?? null,
        created_at: new Date(attempt.timestamp).toISOString(),
      }));

      const { error: insertAttemptsError } = await supabase.from("call_attempts").insert(attempts);
      if (insertAttemptsError) throw insertAttemptsError;
    }
  }

  async saveLeads(leads: Lead[]): Promise<void> {
    if (leads.length === 0) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const CHUNK = 500;

    for (let i = 0; i < leads.length; i += CHUNK) {
      const chunk = leads.slice(i, i + CHUNK);
      const rows = chunk.map((lead) => mapLeadToDbRow(lead, user.id));

      const { error: leadsError } = await supabase
        .from("leads")
        .upsert(rows, { onConflict: "id" });
      if (leadsError) throw leadsError;

      const chunkIds = chunk.map((l) => l.id);
      const { error: deleteError } = await supabase
        .from("call_attempts")
        .delete()
        .in("lead_id", chunkIds);
      if (deleteError) throw deleteError;

      const attempts = chunk.flatMap((lead) =>
        lead.history.map((attempt) => ({
          id: attempt.id,
          lead_id: lead.id,
          user_id: user.id,
          status: attempt.status,
          notes: attempt.notes,
          duration_seconds: attempt.durationSeconds ?? null,
          created_at: new Date(attempt.timestamp).toISOString(),
        }))
      );

      if (attempts.length > 0) {
        const { error: attemptsError } = await supabase
          .from("call_attempts")
          .insert(attempts);
        if (attemptsError) throw attemptsError;
      }
    }
  }

  async deleteLead(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) throw error;
  }

  async deleteLeads(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const supabase = createClient();
    const { error } = await supabase.from("leads").delete().in("id", ids);
    if (error) throw error;
  }

  async assignNiche(ids: string[], niche: Lead["niche"]): Promise<void> {
    if (ids.length === 0) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ niche: niche ?? null, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (error) throw error;
  }

  async clearAll(): Promise<void> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase.from("leads").delete().eq("user_id", user.id);
    if (error) throw error;
  }
}
