-- The enrichment copywriter now generates a full cold email body (subject +
-- entire message) instead of a subject + one-sentence intro. Rename the column
-- so its name matches what it holds. Existing one-sentence intros carry over
-- harmlessly under the new name until those leads are re-enriched.

alter table public.enrichment_leads rename column custom_intro to custom_email;
