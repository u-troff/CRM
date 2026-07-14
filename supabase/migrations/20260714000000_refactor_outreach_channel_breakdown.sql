-- Refactors the existing 150/day tracker (outreach_targets: emails/dms/calls)
-- into the 6-channel daily outreach log used by the /outreach page.
alter table public.outreach_targets rename to daily_outreach_log;
alter table public.daily_outreach_log rename column date to log_date;

alter index if exists outreach_targets_pkey rename to daily_outreach_log_pkey;
alter index if exists outreach_targets_date_key rename to daily_outreach_log_log_date_key;
alter index if exists outreach_targets_date_idx rename to daily_outreach_log_log_date_idx;

drop trigger if exists outreach_targets_updated_at on public.daily_outreach_log;
create trigger daily_outreach_log_updated_at
  before update on public.daily_outreach_log
  for each row execute function update_updated_at_column();

-- Old 3-bucket channel model is replaced by the 6-channel breakdown below.
-- Renamed (not dropped) so historical 150/day counts aren't lost — the new
-- UI/queries don't read these, but the data stays in the table if ever needed.
alter table public.daily_outreach_log rename column emails to legacy_emails;
alter table public.daily_outreach_log rename column dms to legacy_dms;
alter table public.daily_outreach_log rename column calls to legacy_calls;

alter table public.daily_outreach_log add column if not exists fb_leads_contacted integer not null default 0 check (fb_leads_contacted >= 0);
alter table public.daily_outreach_log add column if not exists ig_dms integer not null default 0 check (ig_dms >= 0);
alter table public.daily_outreach_log add column if not exists whatsapp_touches integer not null default 0 check (whatsapp_touches >= 0);
alter table public.daily_outreach_log add column if not exists us_cold_dials integer not null default 0 check (us_cold_dials >= 0);
alter table public.daily_outreach_log add column if not exists conversations_held integer not null default 0 check (conversations_held >= 0);
alter table public.daily_outreach_log add column if not exists booked_calls integer not null default 0 check (booked_calls >= 0);
alter table public.daily_outreach_log add column if not exists notes text;

-- Per-field RPC increment is no longer used — the new UI does a single
-- debounced upsert of whichever fields changed (see lib/outreach/mutations.ts).
drop function if exists public.adjust_outreach_count(date, text, integer);

-- Powers the Friday Scoreboard's "signed clients this month" metric. A lead
-- counts once, on the date its most recent sold/closed_won call_attempt was
-- logged, so re-editing a lead's history doesn't create duplicate credit and
-- a lead that was later moved off "sold" no longer counts.
create or replace function public.count_signed_clients_in_range(p_start date, p_end date)
returns integer
language sql
stable
as $$
  select count(*)::integer
  from (
    select ca.lead_id, max(ca.created_at) as last_sold_at
    from public.call_attempts ca
    join public.leads l on l.id = ca.lead_id
    where ca.status in ('sold', 'closed_won')
      and l.current_status in ('sold', 'closed_won')
    group by ca.lead_id
  ) latest
  where latest.last_sold_at >= p_start::timestamptz
    and latest.last_sold_at < (p_end + 1)::timestamptz
$$;
