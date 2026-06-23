create table if not exists public.outreach_targets (
  id          uuid primary key default gen_random_uuid(),
  date        date not null unique,   -- one row per calendar day, enforced
  emails      integer not null default 0 check (emails >= 0),
  dms         integer not null default 0 check (dms >= 0),
  calls       integer not null default 0 check (calls >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for fast date lookups and range queries
create index if not exists outreach_targets_date_idx on public.outreach_targets(date desc);

-- Auto-update updated_at on every row change
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists outreach_targets_updated_at on public.outreach_targets;
create trigger outreach_targets_updated_at
  before update on public.outreach_targets
  for each row execute function update_updated_at_column();

-- RLS: enable but allow all for now (single-user CRM)
alter table public.outreach_targets enable row level security;
drop policy if exists "Allow all" on public.outreach_targets;
create policy "Allow all" on public.outreach_targets for all using (true) with check (true);

-- Atomic increment/decrement for a single channel
create or replace function adjust_outreach_count(
  p_date    date,
  p_channel text,
  p_delta   integer
) returns json language plpgsql as $$
declare
  result record;
begin
  insert into public.outreach_targets (date, emails, dms, calls)
  values (p_date, 0, 0, 0)
  on conflict (date) do nothing;

  if p_channel = 'emails' then
    update public.outreach_targets
    set emails = greatest(0, emails + p_delta)
    where date = p_date
    returning emails, dms, calls into result;
  elsif p_channel = 'dms' then
    update public.outreach_targets
    set dms = greatest(0, dms + p_delta)
    where date = p_date
    returning emails, dms, calls into result;
  elsif p_channel = 'calls' then
    update public.outreach_targets
    set calls = greatest(0, calls + p_delta)
    where date = p_date
    returning emails, dms, calls into result;
  else
    raise exception 'Invalid channel: %', p_channel;
  end if;

  return row_to_json(result);
end;
$$;
