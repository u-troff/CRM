-- Adds a service `niche` to the main CRM leads table so pipeline leads can be
-- filtered, deleted, or contacted by trade (flooring / remodeling / plumbing).
--
-- Unlike enrichment_leads, the pipeline `leads` table never stored a niche, so
-- existing rows are backfilled best-effort by matching email to enrichment_leads
-- (the source those leads were exported from). Rows with no email match stay
-- NULL (untagged) and can be tagged from the Pipeline UI's bulk "Assign niche".

alter table public.leads
  add column if not exists niche text
    check (niche in ('flooring', 'remodeling', 'plumbing'));

create index if not exists leads_user_niche_idx
  on public.leads (user_id, niche);

-- Best-effort backfill: copy niche from the enrichment lead with the same email.
-- DISTINCT ON keeps one niche per email so the UPDATE has a single source row.
update public.leads l
set niche = e.niche
from (
  select distinct on (lower(email)) lower(email) as email_key, niche
  from public.enrichment_leads
  where email is not null and niche is not null
  order by lower(email), created_at desc
) e
where l.niche is null
  and l.email is not null
  and lower(l.email) = e.email_key;
