"use client";

import { AlertTriangle, X } from "lucide-react";

export default function DedupeConfirmModal({
  loading,
  onCancel,
  onConfirm,
}: {
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-container" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={14} color="var(--accent-amber)" />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Remove Duplicates</span>
          </div>
          <button className="icon-btn" aria-label="Cancel" onClick={onCancel}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6 }}>
            Scan all leads for duplicate emails or company names, keeping the first match and
            permanently deleting the rest. This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button className="btn-secondary" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button className="btn-danger" onClick={onConfirm} disabled={loading}>
              {loading ? "Removing..." : "Remove Duplicates"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
