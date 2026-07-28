"use client";

import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { ClientProject, ClientProjectInput, ProjectStatus } from "@/types/client";
import { PROJECT_STATUSES } from "@/lib/constants/clients";
import { formatCurrency, parseCurrencyInput } from "@/lib/clients/format";
import { getErrorMessage } from "@/lib/errors";

interface ClientFormModalProps {
  // Absent = create, present = edit that project.
  project?: ClientProject | null;
  onClose: () => void;
  onSave: (input: ClientProjectInput) => Promise<void>;
}

// Money is held as text while editing so a field can be cleared mid-typing
// without snapping back to 0.
interface FormState {
  clientName: string;
  projectDescription: string;
  totalProjectValue: string;
  amountReceived: string;
  deliveryCost: string;
  status: ProjectStatus;
}

const EMPTY: FormState = {
  clientName: "",
  projectDescription: "",
  totalProjectValue: "",
  amountReceived: "",
  deliveryCost: "",
  status: "not_started",
};

function toFormState(project: ClientProject): FormState {
  return {
    clientName: project.clientName,
    projectDescription: project.projectDescription ?? "",
    totalProjectValue: String(project.totalProjectValue),
    amountReceived: String(project.amountReceived),
    deliveryCost: String(project.deliveryCost),
    status: project.status,
  };
}

export default function ClientFormModal({ project, onClose, onSave }: ClientFormModalProps) {
  const [form, setForm] = useState<FormState>(project ? toFormState(project) : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  // Mirrors the two generated columns so the numbers are visible before saving.
  const total = parseCurrencyInput(form.totalProjectValue);
  const outstanding = total - parseCurrencyInput(form.amountReceived);
  const profit = total - parseCurrencyInput(form.deliveryCost);

  const handleSave = useCallback(async () => {
    if (!form.clientName.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        clientName: form.clientName,
        projectDescription: form.projectDescription,
        totalProjectValue: parseCurrencyInput(form.totalProjectValue),
        amountReceived: parseCurrencyInput(form.amountReceived),
        deliveryCost: parseCurrencyInput(form.deliveryCost),
        status: form.status,
      });
      onClose();
    } catch (e) {
      setError(getErrorMessage(e, "Could not save client project."));
      setSaving(false);
    }
  }, [form, saving, onSave, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: 560, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span style={{ fontSize: 12, fontWeight: 600 }}>
            {project ? "Edit Client Project" : "Add Client Project"}
          </span>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Client Name *</label>
              <input
                className="form-input"
                value={form.clientName}
                onChange={(e) => set("clientName", e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={form.status}
                onChange={(e) => set("status", e.target.value as ProjectStatus)}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Total Value</label>
              <input
                className="form-input"
                inputMode="decimal"
                placeholder="0"
                value={form.totalProjectValue}
                onChange={(e) => set("totalProjectValue", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Amount Received</label>
              <input
                className="form-input"
                inputMode="decimal"
                placeholder="0"
                value={form.amountReceived}
                onChange={(e) => set("amountReceived", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Delivery Cost</label>
              <input
                className="form-input"
                inputMode="decimal"
                placeholder="0"
                value={form.deliveryCost}
                onChange={(e) => set("deliveryCost", e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Project Description</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="What's being delivered…"
              value={form.projectDescription}
              onChange={(e) => set("projectDescription", e.target.value)}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 24,
              marginBottom: 16,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            <span>
              Outstanding{" "}
              <span style={{ color: outstanding > 0 ? "var(--accent-amber)" : "var(--text-secondary)" }}>
                {formatCurrency(outstanding)}
              </span>
            </span>
            <span>
              Profit{" "}
              <span style={{ color: profit < 0 ? "var(--accent-red)" : "var(--accent-lime)" }}>
                {formatCurrency(profit)}
              </span>
            </span>
          </div>

          {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || !form.clientName.trim()}
            >
              {saving ? "Saving…" : project ? "Save Changes" : "Add Client"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
