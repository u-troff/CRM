"use client";

import { useState, useCallback } from "react";
import { Check } from "lucide-react";
import { InboundLead, InboundLeadInput, LeadSource } from "@/types/inbound";
import { SOURCES } from "@/lib/constants/inbound";
import { updateInboundLead } from "@/lib/inbound/mutations";
import { dateInputToIso, isoToDateInput } from "@/lib/inbound/date";
import { getErrorMessage } from "@/lib/errors";

interface DetailsTabProps {
  lead: InboundLead;
  onLeadUpdated: (updated: InboundLead) => void;
}

export default function DetailsTab({ lead, onLeadUpdated }: DetailsTabProps) {
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
    followupDate: isoToDateInput(lead.nextFollowupAt),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

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
        nextFollowupAt: dateInputToIso(form.followupDate),
      };
      const updated = await updateInboundLead(lead.id, input);
      onLeadUpdated(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setError(getErrorMessage(e, "Could not save changes."));
    } finally {
      setSaving(false);
    }
  }, [form, saving, lead.id, onLeadUpdated]);

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
