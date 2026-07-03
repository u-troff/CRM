-- Adds Apify as an alternate scraping provider for the enrichment pipeline
-- (see ENRICHMENT_PROVIDER env var). Firecrawl path (enrichment_jobs /
-- enrichment_leads columns used by enrich-leads) is untouched.

-- One row per Apify actor run, which now covers a batch of leads (not 1:1).
create table if not exists public.enrichment_apify_runs (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references public.enrichment_jobs(id) on delete cascade,
  apify_run_id    text not null,
  status          text not null default 'pending'
                  check (status in ('pending', 'succeeded', 'failed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists enrichment_apify_runs_job_id_idx
  on public.enrichment_apify_runs(job_id);
create index if not exists enrichment_apify_runs_apify_run_id_idx
  on public.enrichment_apify_runs(apify_run_id);

alter table public.enrichment_apify_runs enable row level security;
drop policy if exists "Authenticated full access" on public.enrichment_apify_runs;
create policy "Authenticated full access" on public.enrichment_apify_runs
  for all to authenticated using (true) with check (true);

-- Reuses update_updated_at_column(), created by the outreach_targets migration.
drop trigger if exists enrichment_apify_runs_updated_at on public.enrichment_apify_runs;
create trigger enrichment_apify_runs_updated_at
  before update on public.enrichment_apify_runs
  for each row execute function update_updated_at_column();

-- Links each lead to the Apify run scraping its website, and adds a
-- 'scraping' status for leads whose Apify run has started but whose webhook
-- hasn't landed yet.
alter table public.enrichment_leads add column if not exists apify_run_id text;

alter table public.enrichment_leads drop constraint if exists enrichment_leads_enrichment_status_check;
alter table public.enrichment_leads add constraint enrichment_leads_enrichment_status_check
  check (enrichment_status in ('pending', 'processing', 'scraping', 'done', 'failed', 'no_website'));
