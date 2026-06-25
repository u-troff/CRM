-- Lead enrichment pipeline: upload a CSV, scrape each company's homepage via
-- Firecrawl, write a personalized subject/intro via GPT-4o, download the result.

create table if not exists public.enrichment_jobs (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  status          text not null default 'pending'
                  check (status in ('pending', 'processing', 'complete', 'failed')),
  total_leads     int not null default 0,
  processed_leads int not null default 0,
  csv_filename    text,
  niche           text check (niche in ('flooring', 'remodeling'))
);

create table if not exists public.enrichment_leads (
  id                 uuid primary key default gen_random_uuid(),
  job_id             uuid not null references public.enrichment_jobs(id) on delete cascade,
  created_at         timestamptz not null default now(),

  -- Apollo CSV fields
  first_name         text,
  last_name          text,
  full_name          text,
  title              text,
  email              text,
  linkedin_url       text,
  lead_city          text,
  lead_state         text,
  company_name       text,
  industry           text,
  employee_count     int,
  company_website    text,
  company_linkedin   text,
  company_phone      text,

  -- Enrichment outputs
  scraped_content    text,
  custom_subject     text,
  custom_intro       text,
  enrichment_status  text not null default 'pending'
                     check (enrichment_status in ('pending', 'processing', 'done', 'failed', 'no_website')),
  enrichment_error   text,
  enriched_at        timestamptz
);

create index if not exists enrichment_leads_job_id_idx on public.enrichment_leads(job_id);

alter table public.enrichment_jobs enable row level security;
alter table public.enrichment_leads enable row level security;

drop policy if exists "Authenticated full access" on public.enrichment_jobs;
create policy "Authenticated full access" on public.enrichment_jobs
  for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full access" on public.enrichment_leads;
create policy "Authenticated full access" on public.enrichment_leads
  for all to authenticated using (true) with check (true);

create or replace function public.increment_enrichment_count(job_id uuid)
returns void as $$
  update public.enrichment_jobs
  set processed_leads = processed_leads + 1
  where id = job_id;
$$ language sql;
