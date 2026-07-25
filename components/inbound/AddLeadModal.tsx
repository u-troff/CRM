"use client";

import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { InboundLeadInput, LeadSource } from "@/types/inbound";
import { SOURCES } from "@/lib/constants/inbound";
import { dateInputToIso } from "@/lib/inbound/date";
import { getErrorMessage } from "@/lib/errors";

interface AddLeadModalProps {
  onClose: () => void;
  onCreate: (input: InboundLeadInput) => Promise<void>;
}

interface FormState {
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  website: string;
  source: LeadSource;
  sourceDetail: string;
  notes: string;
  followupDate: string; // YYYY-MM-DD
}

const EMPTY: FormState = {
  fullName: "",
  businessName: "",
  email: "",
  phone: "",
  website: "",
  source: "facebook",
  sourceDetail: "",
  notes: "",
  followupDate: "",
};

export default function AddLeadModal({ onClose, onCreate }: AddLeadModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSave = useCallback(async () => {
    if (!form.fullName.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        fullName: form.fullName,
        businessName: form.businessName,
        email: form.email,
        phone: form.phone,
        website: form.website,
        city: "",
        source: form.source,
        sourceDetail: form.sourceDetail,
        notes: form.notes,
        nextFollowupAt: dateInputToIso(form.followupDate),
      });
      onClose();
    } catch (e) {
      setError(getErrorMessage(e, "Could not create lead."));
      setSaving(false);
    }
  }, [form, saving, onCreate, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: 560, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span style={{ fontSize: 12, fontWeight: 600 }}>Add Inbound Lead</span>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                className="form-input"
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Business Name</label>
              <input
                className="form-input"
                value={form.businessName}
                onChange={(e) => set("businessName", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                className="form-input"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input
                className="form-input"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
              />
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
              <input
                className="form-input"
                placeholder="Campaign, who referred…"
                value={form.sourceDetail}
                onChange={(e) => set("sourceDetail", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">First Follow-up</label>
              <input
                className="form-input"
                type="date"
                value={form.followupDate}
                onChange={(e) => set("followupDate", e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Notes</label>
            <textarea
              className="form-input"
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || !form.fullName.trim()}
            >
              {saving ? "Saving…" : "Add Lead"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
