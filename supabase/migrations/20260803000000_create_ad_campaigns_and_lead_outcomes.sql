-- ==============================================================
-- AD CAMPAIGNS, AD SPEND + LEAD QUALIFICATION / OUTCOME TRACKING
-- ==============================================================
-- Ties an inbound lead back to the paid campaign that produced it, records what
-- each campaign cost per period, and tracks whether a lead was qualified and
-- how it ended up. Together these answer the weekly question the board could
-- not: what did the spend buy — leads, qualified leads, bookings, wins.
--
-- Mirrors the existing security model: `user_id` references auth.users and
-- every table is guarded by per-row select/insert/update/delete policies keyed
-- on `auth.uid() = user_id`. Status columns follow the schema's convention —
-- text with a check constraint over snake_case values (labels live in
-- lib/constants/ads.ts).
--
-- `platform`, `vertical` and `market` are deliberately free text: they are
-- labels the operator invents ("meta", "flooring_remodeling_epoxy", "SA"), and
-- a check constraint there would mean a migration every time a new platform or
-- vertical is tried. `currency` is the exception — it drives money formatting,
-- so it is constrained to the currencies actually in use. Add to the check on
-- both tables to support another.

-- ── ad_campaigns ─────────────────────────────────────────────
create table if not exists public.ad_campaigns (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,

  name         text not null,
  platform     text not null default 'meta',
  vertical     text,
  market       text,

  -- The campaign's billing currency. Spend entries default to it; the report
  -- flags a campaign whose entries disagree rather than summing across rates.
  currency     text not null default 'ZAR' check (currency in ('ZAR','USD')),

  created_at   timestamptz not null default now()
);

create index if not exists ad_campaigns_user_id_idx on public.ad_campaigns(user_id);

-- ── ad_spend_entries ─────────────────────────────────────────
-- One row per spend period per campaign (weekly is the expected cadence),
-- because spend moves week to week. Periods are inclusive on both ends and are
-- assumed not to overlap within a campaign — the per-period report counts a
-- lead once per period it falls inside, so overlapping windows double-count.
create table if not exists public.ad_spend_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  campaign_id   uuid not null references public.ad_campaigns(id) on delete cascade,

  period_start  date not null,
  period_end    date not null,
  amount_spent  numeric not null default 0,
  currency      text not null default 'ZAR' check (currency in ('ZAR','USD')),
  notes         text,

  created_at    timestamptz not null default now(),

  constraint ad_spend_entries_period_order check (period_end >= period_start)
);

create index if not exists ad_spend_entries_user_id_idx on public.ad_spend_entries(user_id);
create index if not exists ad_spend_entries_campaign_idx
  on public.ad_spend_entries(campaign_id, period_start desc);

-- ── inbound_leads: attribution + qualification + outcome ─────
-- `stage` stays the board's source of truth for where a card sits. These
-- columns are what the report counts: `qualification_status` is a judgement the
-- operator makes (and can set on a lead sitting in any column), while
-- `outcome_status` is derived from the stage on every drag (see
-- lib/inbound/outcome.ts) and can be corrected by hand in between.
alter table public.inbound_leads
  add column if not exists campaign_id uuid references public.ad_campaigns(id) on delete set null;

alter table public.inbound_leads
  add column if not exists qualification_status text not null default 'pending'
    check (qualification_status in ('unqualified','qualified','pending'));

alter table public.inbound_leads
  add column if not exists disqualification_reason text;

alter table public.inbound_leads
  add column if not exists outcome_status text not null default 'new'
    check (outcome_status in ('new','contacted','booked','won','lost'));

-- First time each milestone was reached. Cleared only when a lead is moved back
-- below the milestone (i.e. it was recorded in error) — the report counts the
-- current status, so these are for history, not for the maths.
alter table public.inbound_leads add column if not exists qualified_at timestamptz;
alter table public.inbound_leads add column if not exists booked_at    timestamptz;
alter table public.inbound_leads add column if not exists won_at       timestamptz;

create index if not exists inbound_leads_campaign_idx
  on public.inbound_leads(user_id, campaign_id);

-- Backfill the two new status columns from the stage each lead already sits in,
-- so existing leads don't all read "new / pending". Only rows still at the
-- column defaults are touched, which makes this safe to re-run: anything edited
-- since keeps its value. Timestamps stay null — there is no trustworthy record
-- of when those leads were booked or won.
update public.inbound_leads set
  qualification_status = case
    when stage = 'disqualified'            then 'unqualified'
    when stage in ('call_booked','won')    then 'qualified'
    else 'pending'
  end,
  outcome_status = case
    when stage in ('contacted','nurturing','qualifying') then 'contacted'
    when stage = 'call_booked'                          then 'booked'
    when stage = 'won'                                  then 'won'
    when stage = 'disqualified'                         then 'lost'
    else 'new'
  end
where outcome_status = 'new' and qualification_status = 'pending';

-- ==============================================================
-- ROW LEVEL SECURITY
-- ==============================================================
alter table public.ad_campaigns      enable row level security;
alter table public.ad_spend_entries  enable row level security;

-- ad_campaigns
drop policy if exists "ad_campaigns_select_own" on public.ad_campaigns;
create policy "ad_campaigns_select_own" on public.ad_campaigns for select
  using (auth.uid() = user_id);
drop policy if exists "ad_campaigns_insert_own" on public.ad_campaigns;
create policy "ad_campaigns_insert_own" on public.ad_campaigns for insert
  with check (auth.uid() = user_id);
drop policy if exists "ad_campaigns_update_own" on public.ad_campaigns;
create policy "ad_campaigns_update_own" on public.ad_campaigns for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "ad_campaigns_delete_own" on public.ad_campaigns;
create policy "ad_campaigns_delete_own" on public.ad_campaigns for delete
  using (auth.uid() = user_id);

-- ad_spend_entries
drop policy if exists "ad_spend_entries_select_own" on public.ad_spend_entries;
create policy "ad_spend_entries_select_own" on public.ad_spend_entries for select
  using (auth.uid() = user_id);
drop policy if exists "ad_spend_entries_insert_own" on public.ad_spend_entries;
create policy "ad_spend_entries_insert_own" on public.ad_spend_entries for insert
  with check (auth.uid() = user_id);
drop policy if exists "ad_spend_entries_update_own" on public.ad_spend_entries;
create policy "ad_spend_entries_update_own" on public.ad_spend_entries for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "ad_spend_entries_delete_own" on public.ad_spend_entries;
create policy "ad_spend_entries_delete_own" on public.ad_spend_entries for delete
  using (auth.uid() = user_id);

-- ==============================================================
-- REPORTING VIEWS
-- ==============================================================
-- Both views are `security_invoker` so the underlying RLS policies apply to
-- whoever queries them — a view is otherwise evaluated as its owner and would
-- hand every user the whole table.
--
-- Cost-per-X is null rather than 0 when the denominator is 0: "no wins yet"
-- and "each win cost nothing" are very different statements, and the UI renders
-- the null as an em dash.
--
-- `booked_count` counts leads that are booked *or* won, since a win went
-- through a booking to get there. Without that, closing a booked lead would
-- make the booking count — and cost per booking — go backwards.

-- Per campaign, per spend period. A lead belongs to a period when it was
-- created inside the period's window.
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
  case when m.total_leads     > 0 then m.qualified_leads::numeric / m.total_leads end as qualified_rate,
  case when m.total_leads     > 0 then e.amount_spent / m.total_leads     end as cost_per_lead,
  case when m.qualified_leads > 0 then e.amount_spent / m.qualified_leads end as cost_per_qualified_lead,
  case when m.booked_count    > 0 then e.amount_spent / m.booked_count    end as cost_per_booking,
  case when m.won_count       > 0 then e.amount_spent / m.won_count       end as cost_per_win
from public.ad_spend_entries e
join public.ad_campaigns c on c.id = e.campaign_id
cross join lateral (
  select
    count(*)::int                                                      as total_leads,
    count(*) filter (where l.qualification_status = 'qualified')::int  as qualified_leads,
    count(*) filter (where l.qualification_status = 'unqualified')::int as unqualified_leads,
    count(*) filter (where l.qualification_status = 'pending')::int    as pending_leads,
    count(*) filter (where l.outcome_status in ('booked','won'))::int  as booked_count,
    count(*) filter (where l.outcome_status = 'won')::int              as won_count,
    count(*) filter (where l.outcome_status = 'lost')::int             as lost_count
  from public.inbound_leads l
  where l.campaign_id = e.campaign_id
    and l.user_id = e.user_id
    and l.created_at >= e.period_start::timestamptz
    and l.created_at <  (e.period_end + 1)::timestamptz
) m;

-- Per campaign, all time. Counts every lead attributed to the campaign and
-- every rand/dollar recorded against it, so leads that landed outside a spend
-- window still show up — this is the number to read weekly.
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
  case when m.total_leads     > 0 then m.qualified_leads::numeric / m.total_leads end as qualified_rate,
  case when m.total_leads     > 0 then s.total_spend / m.total_leads     end as cost_per_lead,
  case when m.qualified_leads > 0 then s.total_spend / m.qualified_leads end as cost_per_qualified_lead,
  case when m.booked_count    > 0 then s.total_spend / m.booked_count    end as cost_per_booking,
  case when m.won_count       > 0 then s.total_spend / m.won_count       end as cost_per_win
from public.ad_campaigns c
cross join lateral (
  select
    coalesce(sum(e.amount_spent), 0)                        as total_spend,
    count(*)::int                                           as entry_count,
    coalesce(array_agg(distinct e.currency), '{}'::text[])  as currencies,
    min(e.period_start)                             as first_period_start,
    max(e.period_end)                               as last_period_end
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
) m;

grant select on public.ad_campaign_period_report to authenticated;
grant select on public.ad_campaign_totals        to authenticated;
