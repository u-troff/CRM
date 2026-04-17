-- ==============================================================
-- U-FLOW CRM SCHEMA
-- ==============================================================

create extension if not exists "uuid-ossp";

-- ==============================================================
-- LEADS TABLE
-- ==============================================================
create table if not exists public.leads (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,

  business_name   text not null,
  city            text default '',
  phone           text default '',
  phone_raw       text default '',
  website         text default '',
  rating          numeric,
  review_count    integer,
  is_franchise    boolean default false,
  tier            text not null default 'TIER 2' check (tier in ('TIER 1', 'TIER 2', 'TIER 3')),
  website_notes   text default '',
  owner_name      text default '',

  current_status  text not null default 'new' check (current_status in (
    'new','no_answer','voicemail','gatekeeper','callback',
    'not_interested','nurture','discovery_booked','wrong_number',
    'dnc','closed_won','closed_lost'
  )),

  external_id     text,
  source          text default 'manual' check (source in (
    'manual','csv_import','xlsx_import','sheets_sync'
  )),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists leads_user_id_idx on public.leads(user_id);
create index if not exists leads_tier_status_idx on public.leads(user_id, tier, current_status);

-- ==============================================================
-- CALL ATTEMPTS TABLE
-- ==============================================================
create table if not exists public.call_attempts (
  id                uuid primary key default uuid_generate_v4(),
  lead_id           uuid not null references public.leads(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,

  status            text not null check (status in (
    'new','no_answer','voicemail','gatekeeper','callback',
    'not_interested','nurture','discovery_booked','wrong_number',
    'dnc','closed_won','closed_lost'
  )),
  notes             text default '',
  duration_seconds  integer,

  created_at        timestamptz not null default now()
);

create index if not exists call_attempts_lead_id_idx on public.call_attempts(lead_id);
create index if not exists call_attempts_user_id_idx on public.call_attempts(user_id);

-- ==============================================================
-- AUTO-UPDATE updated_at ON leads
-- ==============================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at
  before update on public.leads
  for each row
  execute function public.handle_updated_at();

-- ==============================================================
-- ROW LEVEL SECURITY
-- ==============================================================
alter table public.leads enable row level security;
alter table public.call_attempts enable row level security;

-- Leads policies
drop policy if exists "leads_select_own" on public.leads;
create policy "leads_select_own" on public.leads for select
  using (auth.uid() = user_id);

drop policy if exists "leads_insert_own" on public.leads;
create policy "leads_insert_own" on public.leads for insert
  with check (auth.uid() = user_id);

drop policy if exists "leads_update_own" on public.leads;
create policy "leads_update_own" on public.leads for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "leads_delete_own" on public.leads;
create policy "leads_delete_own" on public.leads for delete
  using (auth.uid() = user_id);

-- Call attempts policies
drop policy if exists "call_attempts_select_own" on public.call_attempts;
create policy "call_attempts_select_own" on public.call_attempts for select
  using (auth.uid() = user_id);

drop policy if exists "call_attempts_insert_own" on public.call_attempts;
create policy "call_attempts_insert_own" on public.call_attempts for insert
  with check (auth.uid() = user_id);

drop policy if exists "call_attempts_update_own" on public.call_attempts;
create policy "call_attempts_update_own" on public.call_attempts for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "call_attempts_delete_own" on public.call_attempts;
create policy "call_attempts_delete_own" on public.call_attempts for delete
  using (auth.uid() = user_id);
