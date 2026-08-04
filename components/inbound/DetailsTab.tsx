"use client";

import { useState, useCallback, useMemo } from "react";
import { Check } from "lucide-react";
import {
  InboundLead,
  InboundLeadInput,
  LeadSource,
  OutcomeStatus,
  QualificationStatus,
} from "@/types/inbound";
import { AdCampaign } from "@/types/ads";
import { CustomFieldValue, CustomFieldValues } from "@/types/custom";
import { useCustomFields } from "@/hooks/useCustomFields";
import { readValues, writeValues } from "@/lib/custom/values";
import CustomFieldInputs from "@/components/custom/CustomFieldInputs";
import { SOURCES } from "@/lib/constants/inbound";
import {
  DISQUALIFICATION_REASONS,
  OUTCOME_STATUSES,
  QUALIFICATION_MAP,
  QUALIFICATION_STATUSES,
} from "@/lib/constants/ads";
import { updateInboundLead } from "@/lib/inbound/mutations";
import { dateInputToIso, isoToDateInput } from "@/lib/inbound/date";
import { getErrorMessage } from "@/lib/errors";

interface DetailsTabProps {
  lead: InboundLead;
  campaigns: AdCampaign[];
  onLeadUpdated: (updated: InboundLead) => void;
}

export default function DetailsTab({ lead, campaigns, onLeadUpdated }: DetailsTabProps) {
  const [form, setForm] = useState({
    fullName: lead.fullName ?? "",
    businessName: lead.businessName ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    website: lead.website ?? "",
    city: lead.city ?? "",
    source: lead.source,
    sourceDetail: lead.sourceDetail ?? "",
    notes: lead.notes ?? "",
    campaignId: lead.campaignId ?? "",
    qualificationStatus: lead.qualificationStatus,
    disqualificationReason: lead.disqualificationReason ?? "",
    outcomeStatus: lead.outcomeStatus,
    followupDate: isoToDateInput(lead.nextFollowupAt),
  });
  const { definitions } = useCustomFields("inbound_leads");
  // Held as an overlay on the saved blob rather than copied into state: the
  // definitions arrive from a query, so what the saved values *mean* isn't
  // known on first render.
  const [customEdits, setCustomEdits] = useState<CustomFieldValues>({});
  const customValues = useMemo(
    () => ({ ...readValues(definitions, lead.customFields), ...customEdits }),
    [definitions, lead.customFields, customEdits]
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const setCustom = (fieldKey: string, value: CustomFieldValue) =>
    setCustomEdits((v) => ({ ...v, [fieldKey]: value }));

  const handleSave = useCallback(async () => {
    if (!form.fullName.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const input: InboundLeadInput = {
        fullName: form.fullName,
        businessName: form.businessName,
        email: form.email,
        phone: form.phone,
        website: form.website,
        city: form.city,
        source: form.source,
        sourceDetail: form.sourceDetail,
        notes: form.notes,
        campaignId: form.campaignId || null,
        qualificationStatus: form.qualificationStatus,
        disqualificationReason: form.disqualificationReason,
        outcomeStatus: form.outcomeStatus,
        customFields: writeValues(definitions, lead.customFields, customValues),
        nextFollowupAt: dateInputToIso(form.followupDate),
      };
      const updated = await updateInboundLead(lead, input);
      onLeadUpdated(updated);
      setCustomEdits({});
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setError(getErrorMessage(e, "Could not save changes."));
    } finally {
      setSaving(false);
    }
  }, [form, saving, lead, definitions, customValues, onLeadUpdated]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input className="form-input" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Business Name</label>
          <input className="form-input" value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Website</label>
          <input className="form-input" value={form.website} onChange={(e) => set("website", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">City</label>
          <input className="form-input" value={form.city} onChange={(e) => set("city", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Source</label>
          <select
            className="form-select"
            value={form.source}
            onChange={(e) => set("source", e.target.value as LeadSource)}
          >
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Source Detail</label>
          <input className="form-input" value={form.sourceDetail} onChange={(e) => set("sourceDetail", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Next Follow-up</label>
          <input
            className="form-input"
            type="date"
            value={form.followupDate}
            onChange={(e) => set("followupDate", e.target.value)}
          />
        </div>
      </div>

      {/* Attribution + outcome — what the ad spend report counts. Both status
          fields are editable here, but dragging the card re-derives the outcome
          from the column it lands in. */}
      <div
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Attribution &amp; Outcome
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Ad Campaign</label>
            <select
              className="form-select"
              value={form.campaignId}
              onChange={(e) => set("campaignId", e.target.value)}
            >
              <option value="">None (not from a paid ad)</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Qualification</label>
            <select
              className="form-select"
              value={form.qualificationStatus}
              onChange={(e) =>
                set("qualificationStatus", e.target.value as QualificationStatus)
              }
              style={{ color: QUALIFICATION_MAP[form.qualificationStatus].color }}
            >
              {QUALIFICATION_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Outcome</label>
            <select
              className="form-select"
              value={form.outcomeStatus}
              onChange={(e) => set("outcomeStatus", e.target.value as OutcomeStatus)}
            >
              {OUTCOME_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {form.qualificationStatus === "unqualified" && (
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Why not qualified</label>
            <input
              className="form-input"
              list="disqualification-reasons"
              placeholder="not decision maker, wrong vertical…"
              value={form.disqualificationReason}
              onChange={(e) => set("disqualificationReason", e.target.value)}
            />
            <datalist id="disqualification-reasons">
              {DISQUALIFICATION_REASONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>
        )}

        {(lead.qualifiedAt || lead.bookedAt || lead.wonAt) && (
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 10,
              fontSize: 10,
              color: "var(--text-faint)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {lead.qualifiedAt && (
              <span>Qualified {new Date(lead.qualifiedAt).toLocaleDateString()}</span>
            )}
            {lead.bookedAt && (
              <span>Booked {new Date(lead.bookedAt).toLocaleDateString()}</span>
            )}
            {lead.wonAt && <span>Won {new Date(lead.wonAt).toLocaleDateString()}</span>}
          </div>
        )}
      </div>

      {/* Whatever fields this board has been given in Settings → Custom Fields. */}
      {definitions.length > 0 && (
        <div
          style={{
            marginTop: 18,
            paddingTop: 14,
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            Custom Fields
          </div>
          <CustomFieldInputs
            definitions={definitions}
            values={customValues}
            onChange={setCustom}
          />
        </div>
      )}

      <div className="form-group" style={{ marginTop: 12 }}>
        <label className="form-label">Notes</label>
        <textarea className="form-input" rows={4} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>

      {error && <div className="error-banner" style={{ marginTop: 12 }}>{error}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <button className="btn-primary" onClick={handleSave} disabled={saving || !form.fullName.trim()}>
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent-lime)", fontSize: 12 }}>
            <Check size={14} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
