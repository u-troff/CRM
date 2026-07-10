-- Lead-magnet report pipeline. When a prospect opts in via the Tally form
-- (the CTA in the cold email links there), Tally webhooks the generate-report
-- Edge Function, which scrapes their local Google Maps rankings (Apify), site
-- speed (PageSpeed), and homepage (Firecrawl), then has gpt-4o assemble a
-- personalized "competitor teardown / visibility scorecard" rendered at
-- /report/[id].

create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  -- Prospect input, straight off the Tally submission.
  email         text,
  contact_name  text,
  business_name text,
  website       text,
  trade         text,
  city          text,
  state         text,

  -- Pipeline state (mirrors enrichment_leads' status style).
  status        text not null default 'pending'
                check (status in ('pending', 'processing', 'done', 'failed')),
  error         text,
  completed_at  timestamptz,

  -- Everything the /report/[id] page renders: computed facts (their rank,
  -- top-3 competitors, review gap, PageSpeed scores) plus the gpt-4o narrative.
  report_data   jsonb
);

create index if not exists reports_email_idx on public.reports (email);
create index if not exists reports_created_at_idx on public.reports (created_at desc);

alter table public.reports enable row level security;

-- No public policy on purpose: only the service role touches this table — the
-- generate-report Edge Function writes it, and the /report/[id] server
-- component reads a single row by id with the service key (RLS is bypassed).
