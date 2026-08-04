"use client";

import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { AdCampaign, AdCampaignInput, Currency } from "@/types/ads";
import {
  CURRENCIES,
  MARKET_SUGGESTIONS,
  PLATFORM_SUGGESTIONS,
  VERTICAL_SUGGESTIONS,
} from "@/lib/constants/ads";
import { getErrorMessage } from "@/lib/errors";

interface CampaignFormModalProps {
  // Absent = create, present = edit that campaign.
  campaign?: AdCampaign | null;
  onClose: () => void;
  onSave: (input: AdCampaignInput) => Promise<void>;
}

const EMPTY: AdCampaignInput = {
  name: "",
  platform: "meta",
  vertical: "",
  market: "",
  currency: "ZAR",
};

function toFormState(campaign: AdCampaign): AdCampaignInput {
  return {
    name: campaign.name,
    platform: campaign.platform,
    vertical: campaign.vertical ?? "",
    market: campaign.market ?? "",
    currency: campaign.currency,
  };
}

export default function CampaignFormModal({
  campaign,
  onClose,
  onSave,
}: CampaignFormModalProps) {
  const [form, setForm] = useState<AdCampaignInput>(
    campaign ? toFormState(campaign) : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof AdCampaignInput>(key: K, val: AdCampaignInput[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSave = useCallback(async () => {
    if (!form.name.trim() || !form.platform.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      setError(getErrorMessage(e, "Could not save campaign."));
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
            {campaign ? "Edit Campaign" : "Add Campaign"}
          </span>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Campaign Name *</label>
            <input
              className="form-input"
              placeholder="SA Plumbing B2B"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              autoFocus
            />
          </div>

          {/* Platform / vertical / market are free text with suggestions —
              running an ad somewhere new shouldn't need a schema change. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <div className="form-group">
              <label className="form-label">Platform *</label>
              <input
                className="form-input"
                list="ad-platform-options"
                placeholder="meta"
                value={form.platform}
                onChange={(e) => set("platform", e.target.value)}
              />
              <datalist id="ad-platform-options">
                {PLATFORM_SUGGESTIONS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label">Vertical</label>
              <input
                className="form-input"
                list="ad-vertical-options"
                placeholder="plumbing"
                value={form.vertical}
                onChange={(e) => set("vertical", e.target.value)}
              />
              <datalist id="ad-vertical-options">
                {VERTICAL_SUGGESTIONS.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label">Market</label>
              <input
                className="form-input"
                list="ad-market-options"
                placeholder="SA"
                value={form.market}
                onChange={(e) => set("market", e.target.value)}
              />
              <datalist id="ad-market-options">
                {MARKET_SUGGESTIONS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select
                className="form-select"
                value={form.currency}
                onChange={(e) => set("currency", e.target.value as Currency)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 16 }}>
            The currency this campaign is billed in. New spend entries default to
            it, and the report reads the campaign in it.
          </p>

          {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.platform.trim()}
            >
              {saving ? "Saving…" : campaign ? "Save Changes" : "Add Campaign"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
