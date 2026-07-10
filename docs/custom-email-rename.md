# Migration: `custom_intro` → `custom_email`

**File:** `supabase/migrations/20260710000000_rename_custom_intro_to_custom_email.sql`

```sql
alter table public.enrichment_leads rename column custom_intro to custom_email;
```

## Why

The enrichment copywriter changed scope. It used to output a subject + a **one-sentence
intro** (`custom_intro`), with the rest of the cold email being a fixed template pasted
into Smartlead. It now outputs a subject + the **entire email body** (`custom_email`) —
gpt-4o writes the whole message per lead. The column was renamed so its name matches what
it holds.

## What the column holds now

The complete cold-email body (multi-paragraph, `\n` breaks): greeting with the lead's real
first name, a lead-specific observation, the homepage-concept/SEO-audit offer, a "No pitch"
line, and a final standalone CTA question. **No URLs** — the Tally link is hyperlinked onto
the CTA manually in Smartlead. Generated in
`supabase/functions/_shared/copywriter.ts` (`generateColdEmailCopy`, model `gpt-4o`).

## Data impact

Non-destructive. It's a pure rename — existing rows keep their data, now under
`custom_email`. Old rows still contain short one-sentence intros (harmless) until those
leads are re-enriched, which overwrites them with a full body.

## Everything that references the column (all updated in lockstep)

| Layer | File | What uses it |
|---|---|---|
| Copywriter | `supabase/functions/_shared/copywriter.ts` | `ColdEmailCopy.custom_email`, prompt output |
| Edge writer | `supabase/functions/enrich-leads/index.ts` | `.update({ custom_email })` (Firecrawl path) |
| Edge writer | `supabase/functions/apify-webhook-handler/index.ts` | `.update({ custom_email })` (Apify path) |
| API export | `app/api/enrich/download/route.ts` | CSV COLUMNS (Smartlead, single job) |
| API export | `app/api/enrich/download/all/route.ts` | CSV COLUMNS (full backup) |
| API export | `app/api/enrich/download/filtered/route.ts` | CSV COLUMNS (Smartlead, filtered) |
| API edit | `app/api/enrich/leads/[id]/route.ts` | `EDITABLE_STRING_FIELDS` |
| API read | `app/api/enrich/leads/all/route.ts` | select column string |
| Type | `types/enrichment.ts` | `AllLeadsRow.custom_email` |
| UI | `components/enrich/AllLeadsTable.tsx` | editable cell, flash key, `Email` header, `handleFieldChange` union |

## Gotcha for future work

`custom_intro` no longer exists anywhere in the codebase — grep confirms zero references.
Any new code that reads enrichment email copy must use **`custom_email`**. Deploy order:
apply this migration **before** deploying the updated `enrich-leads` /
`apify-webhook-handler` functions (they write the new column name).

## Related: the lead magnet the CTA sends them to

The whole point of the `custom_email` CTA is to drive a click to a **Tally form**. When a
prospect fills it out, they get a personalized **"Competitor Teardown / Visibility
Scorecard"** — that report *is* the lead magnet. It is generated automatically and hosted
at `/report/[id]`.

> Important: this is a **different trigger** from enrichment. Enrichment runs on a *batch*
> of leads at CSV-upload time. The lead magnet runs *per prospect, on demand*, the moment
> someone opts in via Tally. Same Apify tooling, separate entry point.

### Flow

```
custom_email CTA ─► Tally form ─► [prospect submits: name, email, website, trade, city]
                                     │ Tally webhook (?secret=TALLY_WEBHOOK_SECRET)
                                     ▼
                          generate-report edge function
                          (insert pending row, respond 202, work in background)
                                     │
                 ┌───────────────────┼────────────────────┐
                 ▼                   ▼                     ▼
        Apify Google Maps    Google PageSpeed       Firecrawl (scrapeUrl)
        (local rankings +    (mobile perf + SEO      (homepage content
         top-3 competitors)   scores)                 gaps)
                 └───────────────────┼────────────────────┘
                                     ▼
                        compute facts (rank, review gap)
                                     ▼
                          gpt-4o writes the narrative
                                     ▼
                    reports.report_data = { facts, narrative }
                                     ▼
                        prospect views  /report/[id]
```

### What the report contains

- **Scorecard tiles:** their local-pack rank (or "Not ranking"), review count, PageSpeed
  mobile score, SEO score.
- **Competitor table:** top-3 local competitors with ratings/reviews, and the prospect's
  own row highlighted — plus the **review gap** to #1.
- **Narrative sections** (gpt-4o): Google visibility, the competition, their website.
- **Recommendations** + a **"Book a call" CTA** (`NEXT_PUBLIC_BOOKING_URL`).

Key design rule: **GPT never invents numbers.** All stats (rank, reviews, scores, gap) are
computed in code from the API data and passed in; GPT only writes the prose framing around
them.

### Files

| Piece | File |
|---|---|
| DB table | `supabase/migrations/20260711000000_create_reports.sql` (`reports`) |
| Local rankings (Apify) | `supabase/functions/_shared/googleMaps.ts` — `compass~crawler-google-places` via `run-sync-get-dataset-items` |
| Site scores | `supabase/functions/_shared/pagespeed.ts` — Google PageSpeed Insights |
| Homepage scrape | reuses `supabase/functions/_shared/scraper.ts` (`scrapeUrl`, Firecrawl) |
| gpt-4o narrative | `supabase/functions/_shared/reporter.ts` |
| Orchestrator / webhook | `supabase/functions/generate-report/index.ts` (parses Tally payload, matches prospect vs competitors, runs the 3 sources in parallel, saves) |
| Public page | `app/report/[id]/page.tsx` (server component, service-role read by id, meta-refresh while `pending`/`processing`) |
| Chrome toggle | `components/layout/AppShell.tsx` — `/report/*` renders with no CRM sidebar |

### `reports` table shape

Prospect input (`email`, `contact_name`, `business_name`, `website`, `trade`, `city`,
`state`), a `status` (`pending` → `processing` → `done` \| `failed`), and `report_data`
jsonb = `{ facts, narrative }`. RLS is on with **no public policy** — only the service role
touches it (edge fn writes; the `/report/[id]` server component reads one row by id).

### Secrets / config

- `TALLY_WEBHOOK_SECRET` — edge secret; Tally webhook URL must be
  `…/functions/v1/generate-report?secret=<value>`.
- `PAGESPEED_API_KEY` — edge secret, **optional** (PageSpeed works keyless at lower quota).
- Reuses existing edge secrets: `APIFY_API_TOKEN`, `OPENAI_API_KEY`, `FIRECRAWL_API_KEY`.
- `NEXT_PUBLIC_BOOKING_URL` — Next.js env; where the report's CTA button points.
- `RESEND_API_KEY` — edge secret; sends the finished report link to the prospect.
- `REPORT_FROM_EMAIL` — edge secret; the `From` (e.g. `U-Flow <reports@yourdomain.com>`),
  must be a **Resend-verified** sender/domain.
- `REPORT_BASE_URL` — edge secret; the deployed app origin (no trailing slash) used to
  build the emailed link `<REPORT_BASE_URL>/report/<id>`.

### Email delivery (`_shared/email.ts`)

Once a report flips to `done`, `generate-report` calls `sendReportEmail()` (Resend REST
API) with the prospect's email, the narrative headline/summary, and the report link. It's
**best-effort**: a send failure never marks the report failed. The outcome is recorded on
the row — `delivered_at` on success, else `delivery_error` (`"skipped: <why>"` when there's
no recipient email or Resend isn't configured, otherwise the Resend error text).

> **Requires an Email field on the Tally form.** Delivery is skipped whenever the
> submission has no email (`reports.email` is null). Add an Email question to the form so
> `parseTally()` (`email` keyword) captures it.

### Tally field parsing

`parseTally()` matches fields by **label keyword** (case-insensitive, loose): `business`/
`company`, `website`/`url`/`site`, `city`/`town`/**`location`**/`area`, `state`,
`name` (excluding "business"/"company"), `email`. Dropdown/multiple-choice values (arrays
of option ids) are resolved back to option text.

**Trade comes from the webhook URL, not a form field.** The forms are niche-specific (one
per trade) and the live plumbing form has no trade question, so the webhook URL must carry
it: `…/generate-report?secret=<secret>&trade=plumber`. Parser falls back to a form field
if one happens to match.

`trade` and `city` are required; a submission missing them 400s. **Caveat:** Tally's
"Test" button sends `null` for all text inputs (Business Name / Website Url / Location),
so a test event will 400 on the empty city — submit the real form to test with values.
The live form also has **no email field**, so auto-emailing the report link isn't possible
until one is added.

### Status / caveats (as of this writing)

- **Not yet run end-to-end** — needs the deployed function + live Apify/OpenAI keys.
- First-run risk spot: the Apify Maps output field names (`totalScore` / `reviewsCount` /
  `website`) — if competitors come back empty, inspect the real dataset shape.
- **Auto-email is now wired** (`_shared/email.ts`, Resend) — the report link is emailed on
  `done`. It only fires when the submission has an email and `RESEND_API_KEY` /
  `REPORT_FROM_EMAIL` / `REPORT_BASE_URL` are set; otherwise it's skipped (recorded in
  `delivery_error`). The prospect can still always reach the report by visiting the link.
