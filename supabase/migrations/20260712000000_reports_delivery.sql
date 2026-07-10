-- Track email delivery of the finished report (Resend, sent from the
-- generate-report Edge Function once a report flips to 'done').
-- delivered_at: set when Resend accepted the send.
-- delivery_error: reason it didn't send — either "skipped: <why>" (no
-- recipient email / Resend not configured) or the Resend API error text.
-- Neither affects report status: the report is still done and viewable.

alter table public.reports
  add column if not exists delivered_at   timestamptz,
  add column if not exists delivery_error text;
