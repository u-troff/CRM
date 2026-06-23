-- 1. Social link columns captured from Apollo/MillionVerifier imports,
--    needed by the Lead Intelligence Edge Function to know what to scrape.
alter table public.leads add column if not exists linkedin_link text;
alter table public.leads add column if not exists company_linkedin_link text;
alter table public.leads add column if not exists company_facebook_link text;

-- 2. Lead Intelligence table — one row per lead, holds scraped content + AI report.
create table if not exists public.lead_intelligence (
  id                       uuid primary key default gen_random_uuid(),
  lead_id                  uuid not null unique references public.leads(id) on delete cascade,
  website_content          text,
  linkedin_content         text,
  company_linkedin_content text,
  facebook_content         text,
  gbp_content              text,
  business_summary         text,
  website_pain_points      text[],
  linkedin_insights        text,
  facebook_insights        text,
  gbp_insights             text,
  cold_call_intro          text,
  cold_email_intro         text,
  status                   text not null default 'pending'
                           check (status in ('pending', 'running', 'done', 'error')),
  error_message            text,
  scraped_at               timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists lead_intelligence_lead_id_idx
  on public.lead_intelligence(lead_id);

alter table public.lead_intelligence enable row level security;
drop policy if exists "Allow all" on public.lead_intelligence;
create policy "Allow all" on public.lead_intelligence
  for all using (true) with check (true);

-- Reuses update_updated_at_column(), created by the outreach_targets migration.
drop trigger if exists lead_intelligence_updated_at on public.lead_intelligence;
create trigger lead_intelligence_updated_at
  before update on public.lead_intelligence
  for each row execute function update_updated_at_column();
