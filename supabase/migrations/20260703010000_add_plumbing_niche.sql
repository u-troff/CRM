-- Adds "plumbing" as a third enrichment niche alongside flooring/remodeling.

alter table public.enrichment_jobs drop constraint if exists enrichment_jobs_niche_check;
alter table public.enrichment_jobs add constraint enrichment_jobs_niche_check
  check (niche in ('flooring', 'remodeling', 'plumbing'));

alter table public.enrichment_leads drop constraint if exists enrichment_leads_niche_check;
alter table public.enrichment_leads add constraint enrichment_leads_niche_check
  check (niche in ('flooring', 'remodeling', 'plumbing'));
