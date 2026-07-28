-- ==============================================================
-- CLIENT PROJECTS
-- ==============================================================
-- Financial + delivery tracker for signed clients: what a project is worth,
-- what has actually landed in the bank, what it costs us to deliver, and how
-- far along the delivery is. Separate from the `leads` / `inbound_leads`
-- pipelines, which stop at the point a deal is won.
--
-- Mirrors the existing security model: `user_id` references auth.users and the
-- table is guarded by per-row select/insert/update/delete policies keyed on
-- `auth.uid() = user_id`. `status` follows the schema's existing convention for
-- status-type fields — a text column with a check constraint over snake_case
-- values (labels live in lib/constants/clients.ts).
--
-- Note: the money columns are `not null default 0` rather than nullable. The
-- two derived columns are stored generated columns, and a null input would make
-- them null too, so an unfilled cost silently erases the profit figure. 0 is
-- the honest default for "nothing recorded yet".

create table if not exists public.client_projects (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,

  client_name          text not null,
  project_description  text,

  total_project_value  numeric not null default 0,
  amount_received      numeric not null default 0,
  amount_outstanding   numeric generated always as (total_project_value - amount_received) stored,
  delivery_cost        numeric not null default 0,
  net_profit           numeric generated always as (total_project_value - delivery_cost) stored,

  status               text not null default 'not_started'
                       check (status in (
                         'not_started','in_progress','delivered','paid_in_full'
                       )),

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists client_projects_user_id_idx on public.client_projects(user_id);
create index if not exists client_projects_status_idx on public.client_projects(user_id, status);

-- ── auto-update updated_at ───────────────────────────────────
-- Reuses public.handle_updated_at() defined in the base schema.
drop trigger if exists client_projects_updated_at on public.client_projects;
create trigger client_projects_updated_at
  before update on public.client_projects
  for each row
  execute function public.handle_updated_at();

-- ==============================================================
-- ROW LEVEL SECURITY
-- ==============================================================
alter table public.client_projects enable row level security;

drop policy if exists "client_projects_select_own" on public.client_projects;
create policy "client_projects_select_own" on public.client_projects for select
  using (auth.uid() = user_id);

drop policy if exists "client_projects_insert_own" on public.client_projects;
create policy "client_projects_insert_own" on public.client_projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "client_projects_update_own" on public.client_projects;
create policy "client_projects_update_own" on public.client_projects for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "client_projects_delete_own" on public.client_projects;
create policy "client_projects_delete_own" on public.client_projects for delete
  using (auth.uid() = user_id);
