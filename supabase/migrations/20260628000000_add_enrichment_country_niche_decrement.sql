-- Lead enrichment pipeline follow-up: stamp each lead with its country and
-- niche (niche is copied from the parent job at insert time so it survives
-- even if the job's niche is ever changed later), plus the decrement RPC
-- needed by single-lead deletion.

alter table public.enrichment_leads
  add column if not exists lead_country text,
  add column if not exists niche text check (niche in ('flooring', 'remodeling'));

create or replace function public.decrement_enrichment_count(job_id uuid)
returns void as $$
  update public.enrichment_jobs
  set total_leads = total_leads - 1
  where id = job_id;
$$ language sql;
