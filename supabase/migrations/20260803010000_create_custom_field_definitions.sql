-- ==============================================================
-- CUSTOM FIELD DEFINITIONS
-- ==============================================================
-- Lets a board carry a field nobody thought of when the table was written. A
-- definition row says what the field is called and what type it holds; the
-- values live in a `custom_fields` jsonb blob on the board's own table. Adding
-- a field is one insert here, not a migration.
--
-- What this deliberately does not do: constrain or index the values. A jsonb
-- blob can't be checked the way a column can, so a field's type is enforced in
-- the app (lib/custom/values.ts) on the way in. Anything that needs a real
-- constraint, a foreign key, or an index — money, dates the app sorts on,
-- statuses the report counts — still wants a proper column.
--
-- `board_key` is the table the field belongs to ('inbound_leads' today). It is
-- text rather than an FK so a board can be added without touching this table.

create table if not exists public.custom_field_definitions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,

  board_key      text not null,
  -- The key inside the jsonb blob. Slug-shaped so it stays readable in raw
  -- Postgres output and can't collide with jsonb path syntax.
  field_key      text not null check (field_key ~ '^[a-z][a-z0-9_]*$'),
  label          text not null,
  field_type     text not null default 'text'
                 check (field_type in ('text','number','date','select','boolean')),
  -- For 'select': a JSON array of the allowed option strings. Null otherwise.
  select_options jsonb,
  display_order  int not null default 0,

  created_at     timestamptz not null default now(),

  -- One definition per key per board, or two fields would fight over the same
  -- slot in the blob.
  constraint custom_field_definitions_unique_key unique (user_id, board_key, field_key)
);

create index if not exists custom_field_definitions_board_idx
  on public.custom_field_definitions(user_id, board_key, display_order);

-- ── inbound_leads: the value blob ────────────────────────────
-- `not null default '{}'` so reading a lead never has to guard against null
-- before looking a key up.
alter table public.inbound_leads
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;

-- ==============================================================
-- ROW LEVEL SECURITY
-- ==============================================================
alter table public.custom_field_definitions enable row level security;

drop policy if exists "custom_field_definitions_select_own" on public.custom_field_definitions;
create policy "custom_field_definitions_select_own" on public.custom_field_definitions for select
  using (auth.uid() = user_id);

drop policy if exists "custom_field_definitions_insert_own" on public.custom_field_definitions;
create policy "custom_field_definitions_insert_own" on public.custom_field_definitions for insert
  with check (auth.uid() = user_id);

drop policy if exists "custom_field_definitions_update_own" on public.custom_field_definitions;
create policy "custom_field_definitions_update_own" on public.custom_field_definitions for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "custom_field_definitions_delete_own" on public.custom_field_definitions;
create policy "custom_field_definitions_delete_own" on public.custom_field_definitions for delete
  using (auth.uid() = user_id);
