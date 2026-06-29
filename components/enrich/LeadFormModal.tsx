"use client";

import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { EnrichmentNiche, LeadFormValues } from "@/types/enrichment";

const EMPTY_FORM: LeadFormValues = {
  first_name: "",
  last_name: "",
  email: "",
  company_name: "",
  lead_city: "",
  lead_state: "",
  lead_country: "",
  company_website: "",
  company_phone: "",
  niche: "flooring",
};

interface LeadFormModalProps {
  mode: "create" | "edit";
  initial?: Partial<LeadFormValues>;
  saving: boolean;
  error?: string | null;
  onCancel: () => void;
  onSave: (values: LeadFormValues) => void;
}

export default function LeadFormModal({
  mode,
  initial,
  saving,
  error,
  onCancel,
  onSave,
}: LeadFormModalProps) {
  const [form, setForm] = useState<LeadFormValues>({ ...EMPTY_FORM, ...initial });

  const field = <K extends keyof LeadFormValues>(key: K) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const handleSubmit = useCallback(() => {
    onSave(form);
  }, [form, onSave]);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-container"
        style={{ maxWidth: 560, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span style={{ fontSize: 12, fontWeight: 600 }}>
            {mode === "create" ? "Add Lead" : "Edit Lead"}
          </span>
          <button className="icon-btn" aria-label="Close" onClick={onCancel}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-input" {...field("first_name")} />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-input" {...field("last_name")} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" {...field("email")} />
            </div>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input className="form-input" {...field("company_name")} />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" {...field("lead_city")} />
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <input className="form-input" {...field("lead_state")} />
            </div>
            <div className="form-group">
              <label className="form-label">Country</label>
              <input className="form-input" {...field("lead_country")} />
            </div>
            <div className="form-group">
              <label className="form-label">Niche</label>
              <select
                className="form-select"
                value={form.niche}
                onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value as EnrichmentNiche }))}
              >
                <option value="flooring">Flooring</option>
                <option value="remodeling">Remodeling</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Company Website</label>
              <input className="form-input" {...field("company_website")} />
            </div>
            <div className="form-group">
              <label className="form-label">Company Phone</label>
              <input className="form-input" {...field("company_phone")} />
            </div>
          </div>

          {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn-secondary" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={saving || !form.company_name.trim()}
            >
              {saving ? "Saving..." : mode === "create" ? "Add Lead" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
