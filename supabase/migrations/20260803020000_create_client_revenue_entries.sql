-- ==============================================================
-- CLIENT REVENUE ENTRIES + REVENUE IN THE CAMPAIGN REPORT
-- ==============================================================
-- What a won client is actually worth, logged one payment at a time. A log of
-- amounts against a lead rather than a billing structure, so a setup fee, a
-- monthly retainer and a commission-only arrangement are all just rows —
-- nothing here assumes a client bills the same way twice.
--
-- `collected_date` is what separates a promise from cash: null means expected
-- but still outstanding, set means it landed. Only collected money counts
-- towards return on ad spend.
--
-- Depends on 20260803000000, which created the campaign report views; both are
-- dropped and rebuilt at the bottom of this file to add revenue and ROAS. It is
-- written to run whether or not those views already exist.

create table if not exists public.client_revenue_entries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  -- The client this revenue belongs to. A won lead *is* the client — deleting
  -- the lead takes its revenue history with it.
  lead_id        uuid not null references public.inbound_leads(id) on delete cascade,

  entry_type     text not null default 'setup_fee'
                 check (entry_type in ('setup_fee','monthly_retainer','commission','other')),
  description    text,

  amount         numeric not null default 0,
  currency       text not null default 'ZAR' check (currency in ('ZAR','USD')),

  -- The month (or other window) a retainer or commission entry covers. Null on
  -- a one-off like a setup fee, which isn't "for" a period.
  period_start   date,
  period_end     date,

  expected_date  date not null,
  collected_date date,

  created_at     timestamptz not null default now(),

  constraint client_revenue_entries_period_order
    check (period_start is null or period_end is null or period_end >= period_start)
);

create index if not exists client_revenue_entries_user_id_idx
  on public.client_revenue_entries(user_id);
create index if not exists client_revenue_entries_lead_idx
  on public.client_revenue_entries(lead_id, expected_date desc);
-- Outstanding money is the list that gets chased, so it gets its own index.
create index if not exists client_revenue_entries_outstanding_idx
  on public.client_revenue_entries(user_id, expected_date)
  where collected_date is null;

-- ==============================================================
-- ROW LEVEL SECURITY
-- ==============================================================
alter table public.client_revenue_entries enable row level security;

drop policy if exists "client_revenue_entries_select_own" on public.client_revenue_entries;
create policy "client_revenue_entries_select_own" on public.client_revenue_entries for select
  using (auth.uid() = user_id);

drop policy if exists "client_revenue_entries_insert_own" on public.client_revenue_entries;
create policy "client_revenue_entries_insert_own" on public.client_revenue_entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "client_revenue_entries_update_own" on public.client_revenue_entries;
create policy "client_revenue_entries_update_own" on public.client_revenue_entries for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "client_revenue_entries_delete_own" on public.client_revenue_entries;
create policy "client_revenue_entries_delete_own" on public.client_revenue_entries for delete
  using (auth.uid() = user_id);

-- ==============================================================
-- REPORTING VIEWS (rebuilt with revenue + ROAS)
-- ==============================================================
-- Both views are `security_invoker` so the underlying RLS policies apply to
-- whoever queries them — a view is otherwise evaluated as its owner and would
-- hand every user the whole table.
--
-- Cost-per-X and ROAS are null rather than 0 when the denominator is 0: "no
-- wins yet" and "each win cost nothing" are very different statements, and the
-- UI renders the null as an em dash.
--
-- `booked_count` counts leads that are booked *or* won, since a win went
-- through a booking to get there. Without that, closing a booked lead would
-- make the booking count — and cost per booking — go backwards.
--
-- Revenue is attributed through the lead: an entry counts towards a campaign
-- when the client it belongs to came from that campaign. `revenue_currencies`
-- travels with it so the UI can refuse to divide rand by dollars.

-- Per campaign, per spend period. A lead belongs to a period when it was
-- created inside the period's window, and revenue follows its lead — so a
-- period's ROAS is what that week's *cohort* has paid back, whenever the cash
-- actually arrived, measured against what that week cost.
drop view if exists public.ad_campaign_period_report;
create view public.ad_campaign_period_report
with (security_invoker = true) as
select
  e.id                    as spend_entry_id,
  e.user_id,
  c.id                    as campaign_id,
  c.name                  as campaign_name,
  c.platform,
  c.vertical,
  c.market,
  e.period_start,
  e.period_end,
  e.amount_spent,
  e.currency,
  e.notes,
  m.total_leads,
  m.qualified_leads,
  m.unqualified_leads,
  m.pending_leads,
  m.booked_count,
  m.won_count,
  m.lost_count,
  rev.revenue_collected,
  rev.revenue_outstanding,
  rev.revenue_currencies,
  case when m.total_leads     > 0 then m.qualified_leads::numeric / m.total_leads end as qualified_rate,
  case when m.total_leads     > 0 then e.amount_spent / m.total_leads     end as cost_per_lead,
  case when m.qualified_leads > 0 then e.amount_spent / m.qualified_leads end as cost_per_qualified_lead,
  case when m.booked_count    > 0 then e.amount_spent / m.booked_count    end as cost_per_booking,
  case when m.won_count       > 0 then e.amount_spent / m.won_count       end as cost_per_win,
  case when e.amount_spent    > 0 then rev.revenue_collected / e.amount_spent end as roas
from public.ad_spend_entries e
join public.ad_campaigns c on c.id = e.campaign_id
cross join lateral (
  select
    count(*)::int                                                       as total_leads,
    count(*) filter (where l.qualification_status = 'qualified')::int   as qualified_leads,
    count(*) filter (where l.qualification_status = 'unqualified')::int as unqualified_leads,
    count(*) filter (where l.qualification_status = 'pending')::int     as pending_leads,
    count(*) filter (where l.outcome_status in ('booked','won'))::int   as booked_count,
    count(*) filter (where l.outcome_status = 'won')::int               as won_count,
    count(*) filter (where l.outcome_status = 'lost')::int              as lost_count
  from public.inbound_leads l
  where l.campaign_id = e.campaign_id
    and l.user_id = e.user_id
    and l.created_at >= e.period_start::timestamptz
    and l.created_at <  (e.period_end + 1)::timestamptz
) m
cross join lateral (
  select
    coalesce(sum(r.amount) filter (where r.collected_date is not null), 0) as revenue_collected,
    coalesce(sum(r.amount) filter (where r.collected_date is null), 0)     as revenue_outstanding,
    coalesce(array_agg(distinct r.currency), '{}'::text[])                 as revenue_currencies
  from public.client_revenue_entries r
  join public.inbound_leads rl on rl.id = r.lead_id
  where rl.campaign_id = e.campaign_id
    and rl.user_id = e.user_id
    and r.user_id = e.user_id
    and rl.created_at >= e.period_start::timestamptz
    and rl.created_at <  (e.period_end + 1)::timestamptz
) rev;

-- Per campaign, all time. Counts every lead attributed to the campaign, every
-- rand/dollar recorded against it, and everything those leads have paid — this
-- is the number to read weekly.
drop view if exists public.ad_campaign_totals;
create view public.ad_campaign_totals
with (security_invoker = true) as
select
  c.id        as campaign_id,
  c.user_id,
  c.name      as campaign_name,
  c.platform,
  c.vertical,
  c.market,
  c.currency,
  c.created_at,
  s.total_spend,
  s.entry_count,
  s.currencies,
  s.first_period_start,
  s.last_period_end,
  m.total_leads,
  m.qualified_leads,
  m.unqualified_leads,
  m.pending_leads,
  m.booked_count,
  m.won_count,
  m.lost_count,
  rev.revenue_collected,
  rev.revenue_outstanding,
  rev.revenue_currencies,
  case when m.total_leads     > 0 then m.qualified_leads::numeric / m.total_leads end as qualified_rate,
  case when m.total_leads     > 0 then s.total_spend / m.total_leads     end as cost_per_lead,
  case when m.qualified_leads > 0 then s.total_spend / m.qualified_leads end as cost_per_qualified_lead,
  case when m.booked_count    > 0 then s.total_spend / m.booked_count    end as cost_per_booking,
  case when m.won_count       > 0 then s.total_spend / m.won_count       end as cost_per_win,
  case when s.total_spend     > 0 then rev.revenue_collected / s.total_spend end as roas
from public.ad_campaigns c
cross join lateral (
  select
    coalesce(sum(e.amount_spent), 0)                        as total_spend,
    count(*)::int                                           as entry_count,
    coalesce(array_agg(distinct e.currency), '{}'::text[])  as currencies,
    min(e.period_start)                                     as first_period_start,
    max(e.period_end)                                       as last_period_end
  from public.ad_spend_entries e
  where e.campaign_id = c.id and e.user_id = c.user_id
) s
cross join lateral (
  select
    count(*)::int                                                       as total_leads,
    count(*) filter (where l.qualification_status = 'qualified')::int   as qualified_leads,
    count(*) filter (where l.qualification_status = 'unqualified')::int as unqualified_leads,
    count(*) filter (where l.qualification_status = 'pending')::int     as pending_leads,
    count(*) filter (where l.outcome_status in ('booked','won'))::int   as booked_count,
    count(*) filter (where l.outcome_status = 'won')::int               as won_count,
    count(*) filter (where l.outcome_status = 'lost')::int              as lost_count
  from public.inbound_leads l
  where l.campaign_id = c.id and l.user_id = c.user_id
) m
cross join lateral (
  select
    coalesce(sum(r.amount) filter (where r.collected_date is not null), 0) as revenue_collected,
    coalesce(sum(r.amount) filter (where r.collected_date is null), 0)     as revenue_outstanding,
    coalesce(array_agg(distinct r.currency), '{}'::text[])                 as revenue_currencies
  from public.client_revenue_entries r
  join public.inbound_leads rl on rl.id = r.lead_id
  where rl.campaign_id = c.id
    and rl.user_id = c.user_id
    and r.user_id = c.user_id
) rev;

grant select on public.ad_campaign_period_report to authenticated;
grant select on public.ad_campaign_totals        to authenticated;
