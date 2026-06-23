-- 1. Allow the new Kanban statuses
alter table public.leads drop constraint leads_current_status_check;
alter table public.leads add constraint leads_current_status_check check (current_status in (
  'new','no_answer','voicemail','gatekeeper','callback',
  'not_interested','nurture','discovery_booked','wrong_number',
  'dnc','closed_won','closed_lost','called','booked','sold','lost'
));

alter table public.call_attempts drop constraint call_attempts_status_check;
alter table public.call_attempts add constraint call_attempts_status_check check (status in (
  'new','no_answer','voicemail','gatekeeper','callback',
  'not_interested','nurture','discovery_booked','wrong_number',
  'dnc','closed_won','closed_lost','called','booked','sold','lost'
));

-- 2. Add columns for the new Apollo/MillionVerifier import fields
alter table public.leads add column if not exists email text;
alter table public.leads add column if not exists first_name text;
alter table public.leads add column if not exists last_name text;
alter table public.leads add column if not exists owner_title text;
alter table public.leads add column if not exists state text;
alter table public.leads add column if not exists email_quality text;
alter table public.leads add column if not exists email_result text;
