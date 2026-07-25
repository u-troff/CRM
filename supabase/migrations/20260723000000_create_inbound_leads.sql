-- ==============================================================
-- INBOUND LEADS BOARD
-- ==============================================================
-- A second pipeline, separate from the cold-outreach `leads` board, for
-- warm inbound leads (Facebook ads, referrals, walk-ins, etc.) that get
-- qualified and nurtured by hand via drip sequences.
--
-- Mirrors the existing security model: every table carries a `user_id`
-- referencing auth.users and is guarded by per-row select/insert/update/
-- delete policies keyed on `auth.uid() = user_id`.
--
-- Note: `city` is included on inbound_leads (not in the original field list)
-- so the {{city}} merge field in nurture message bodies resolves to a value.

-- ── nurture_sequences ────────────────────────────────────────
create table if not exists public.nurture_sequences (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  description  text,
  created_at   timestamptz not null default now()
);

create index if not exists nurture_sequences_user_id_idx on public.nurture_sequences(user_id);

-- ── nurture_steps ────────────────────────────────────────────
create table if not exists public.nurture_steps (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  sequence_id  uuid not null references public.nurture_sequences(id) on delete cascade,
  step_number  int not null,
  day_offset   int not null,
  channel      text not null default 'whatsapp'
               check (channel in ('whatsapp','email','sms','call')),
  subject      text,
  body         text not null,
  created_at   timestamptz not null default now()
);

create index if not exists nurture_steps_sequence_id_idx on public.nurture_steps(sequence_id);
create index if not exists nurture_steps_user_id_idx on public.nurture_steps(user_id);

-- ── inbound_leads ────────────────────────────────────────────
create table if not exists public.inbound_leads (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,

  full_name           text not null,
  email               text,
  phone               text,
  website             text,
  business_name       text,
  city                text,

  source              text not null default 'facebook'
                      check (source in (
                        'facebook','google','referral','walk_in',
                        'instagram','cold_email','cold_call','other'
                      )),
  source_detail       text,
  notes               text,

  stage               text not null default 'new'
                      check (stage in (
                        'new','contacted','nurturing','qualifying',
                        'call_booked','won','disqualified'
                      )),

  next_followup_at    timestamptz,

  sequence_id         uuid references public.nurture_sequences(id),
  sequence_step       int default 0,
  sequence_started_at timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists inbound_leads_user_id_idx on public.inbound_leads(user_id);
create index if not exists inbound_leads_stage_idx on public.inbound_leads(user_id, stage);
create index if not exists inbound_leads_followup_idx on public.inbound_leads(user_id, next_followup_at);

-- ── lead_activity ────────────────────────────────────────────
create table if not exists public.lead_activity (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  lead_id      uuid not null references public.inbound_leads(id) on delete cascade,
  type         text not null
               check (type in (
                 'message_sent','note','stage_change',
                 'call_logged','sequence_started','sequence_stopped'
               )),
  channel      text,
  content      text,
  step_id      uuid references public.nurture_steps(id),
  created_at   timestamptz not null default now()
);

create index if not exists lead_activity_lead_id_idx on public.lead_activity(lead_id, created_at desc);
create index if not exists lead_activity_user_id_idx on public.lead_activity(user_id);

-- ── auto-update updated_at on inbound_leads ──────────────────
-- Reuses public.handle_updated_at() defined in the base schema.
drop trigger if exists inbound_leads_updated_at on public.inbound_leads;
create trigger inbound_leads_updated_at
  before update on public.inbound_leads
  for each row
  execute function public.handle_updated_at();

-- ==============================================================
-- ROW LEVEL SECURITY
-- ==============================================================
alter table public.nurture_sequences enable row level security;
alter table public.nurture_steps     enable row level security;
alter table public.inbound_leads      enable row level security;
alter table public.lead_activity      enable row level security;

-- nurture_sequences
drop policy if exists "nurture_sequences_select_own" on public.nurture_sequences;
create policy "nurture_sequences_select_own" on public.nurture_sequences for select
  using (auth.uid() = user_id);
drop policy if exists "nurture_sequences_insert_own" on public.nurture_sequences;
create policy "nurture_sequences_insert_own" on public.nurture_sequences for insert
  with check (auth.uid() = user_id);
drop policy if exists "nurture_sequences_update_own" on public.nurture_sequences;
create policy "nurture_sequences_update_own" on public.nurture_sequences for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "nurture_sequences_delete_own" on public.nurture_sequences;
create policy "nurture_sequences_delete_own" on public.nurture_sequences for delete
  using (auth.uid() = user_id);

-- nurture_steps
drop policy if exists "nurture_steps_select_own" on public.nurture_steps;
create policy "nurture_steps_select_own" on public.nurture_steps for select
  using (auth.uid() = user_id);
drop policy if exists "nurture_steps_insert_own" on public.nurture_steps;
create policy "nurture_steps_insert_own" on public.nurture_steps for insert
  with check (auth.uid() = user_id);
drop policy if exists "nurture_steps_update_own" on public.nurture_steps;
create policy "nurture_steps_update_own" on public.nurture_steps for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "nurture_steps_delete_own" on public.nurture_steps;
create policy "nurture_steps_delete_own" on public.nurture_steps for delete
  using (auth.uid() = user_id);

-- inbound_leads
drop policy if exists "inbound_leads_select_own" on public.inbound_leads;
create policy "inbound_leads_select_own" on public.inbound_leads for select
  using (auth.uid() = user_id);
drop policy if exists "inbound_leads_insert_own" on public.inbound_leads;
create policy "inbound_leads_insert_own" on public.inbound_leads for insert
  with check (auth.uid() = user_id);
drop policy if exists "inbound_leads_update_own" on public.inbound_leads;
create policy "inbound_leads_update_own" on public.inbound_leads for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "inbound_leads_delete_own" on public.inbound_leads;
create policy "inbound_leads_delete_own" on public.inbound_leads for delete
  using (auth.uid() = user_id);

-- lead_activity
drop policy if exists "lead_activity_select_own" on public.lead_activity;
create policy "lead_activity_select_own" on public.lead_activity for select
  using (auth.uid() = user_id);
drop policy if exists "lead_activity_insert_own" on public.lead_activity;
create policy "lead_activity_insert_own" on public.lead_activity for insert
  with check (auth.uid() = user_id);
drop policy if exists "lead_activity_update_own" on public.lead_activity;
create policy "lead_activity_update_own" on public.lead_activity for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "lead_activity_delete_own" on public.lead_activity;
create policy "lead_activity_delete_own" on public.lead_activity for delete
  using (auth.uid() = user_id);

-- ==============================================================
-- SEED: "Inbound lead nurture" starter sequence (5 steps)
-- ==============================================================
-- Seeded for every existing user. RLS requires a user_id, so we can't seed a
-- userless global row; instead we create one per auth user. The app also
-- offers a "Create starter sequence" button when a user has none (e.g. users
-- created after this migration ran).
do $$
declare
  u record;
  seq_id uuid;
begin
  for u in select id from auth.users loop
    -- Skip if this user already has the starter sequence.
    if exists (
      select 1 from public.nurture_sequences
      where user_id = u.id and name = 'Inbound lead nurture'
    ) then
      continue;
    end if;

    insert into public.nurture_sequences (user_id, name, description)
    values (u.id, 'Inbound lead nurture',
            'Default 3-week drip for new inbound leads. Rewrite the copy to sound like you.')
    returning id into seq_id;

    insert into public.nurture_steps (user_id, sequence_id, step_number, day_offset, channel, subject, body)
    values
      (u.id, seq_id, 1, 0,  'whatsapp', null,
       'Hey {{first_name}}, thanks for reaching out about {{business_name}}! When''s a good time for a quick chat about what you''re after?'),
      (u.id, seq_id, 2, 2,  'whatsapp', null,
       'Hi {{first_name}}, just checking you got my last message. Happy to answer any questions whenever you''re ready.'),
      (u.id, seq_id, 3, 5,  'whatsapp', null,
       'Hey {{first_name}}, I put together a few quick ideas for {{business_name}}. Want me to send them over?'),
      (u.id, seq_id, 4, 10, 'whatsapp', null,
       'Hi {{first_name}}, still keen to help out. Would a short call this week work for you?'),
      (u.id, seq_id, 5, 21, 'whatsapp', null,
       'Hey {{first_name}}, last nudge from me for now. If the timing''s better down the line, just reply here and we''ll pick it up.');
  end loop;
end $$;
