"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Copy, Check, MessageCircle, Mail, Send } from "lucide-react";
import { InboundLead, NurtureStep } from "@/types/inbound";
import { mergeFields, phoneDigits } from "@/lib/inbound/merge";
import { markMessageSent } from "@/lib/inbound/mutations";
import { getErrorMessage } from "@/lib/errors";

interface MessageComposerProps {
  lead: InboundLead;
  step: NurtureStep;
  steps: NurtureStep[];
  isDue: boolean;
  onSent: (updated: InboundLead) => void;
}

// Copy text to the clipboard, reliably across mobile Safari + Chrome. The
// async Clipboard API is preferred, but it needs a secure context and can be
// blocked; the hidden-textarea + execCommand fallback works everywhere.
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    const selection = document.getSelection();
    const savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    ta.select();
    ta.setSelectionRange(0, ta.value.length); // iOS Safari
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (savedRange && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }
    return ok;
  } catch {
    return false;
  }
}

export default function MessageComposer({ lead, step, steps, isDue, onSent }: MessageComposerProps) {
  const filled = useMemo(() => mergeFields(step.body, lead), [step.body, lead]);
  const filledSubject = useMemo(
    () => (step.subject ? mergeFields(step.subject, lead) : ""),
    [step.subject, lead]
  );

  const [text, setText] = useState(filled);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the editable draft whenever the target step (or merged output) changes.
  useEffect(() => {
    setText(filled);
  }, [filled]);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } else {
      setError("Copy failed — select the text and copy manually.");
    }
  }, [text]);

  const openWhatsApp = useCallback(() => {
    const digits = phoneDigits(lead.phone);
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [lead.phone, text]);

  const openEmail = useCallback(() => {
    const params = new URLSearchParams();
    if (filledSubject) params.set("subject", filledSubject);
    params.set("body", text);
    // mailto wants %20 for spaces, not "+".
    const query = params.toString().replace(/\+/g, "%20");
    window.location.href = `mailto:${lead.email ?? ""}?${query}`;
  }, [lead.email, filledSubject, text]);

  const handleMarkSent = useCallback(async () => {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const updated = await markMessageSent(lead, step, text, steps);
      onSent(updated);
    } catch (e) {
      setError(getErrorMessage(e, "Could not mark as sent."));
      setSending(false);
    }
  }, [sending, lead, step, text, steps, onSent]);

  const digits = phoneDigits(lead.phone);

  return (
    <div
      style={{
        border: `1px solid ${isDue ? "var(--accent-cyan)" : "var(--border-default)"}`,
        background: "var(--bg-elevated)",
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 700,
            color: isDue ? "var(--accent-cyan)" : "var(--text-muted)",
          }}
        >
          Step {step.stepNumber} · {step.channel}
          {isDue ? " · due" : ""}
        </span>
      </div>

      {filledSubject && (
        <input
          className="form-input"
          value={filledSubject}
          readOnly
          style={{ marginBottom: 8, color: "var(--text-secondary)" }}
          aria-label="Message subject"
        />
      )}

      <textarea
        className="form-input"
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ width: "100%", resize: "vertical", marginBottom: 10, lineHeight: 1.6 }}
        aria-label="Message body"
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button className="btn-secondary" onClick={handleCopy}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          className="btn-secondary"
          onClick={openWhatsApp}
          disabled={!digits}
          title={digits ? undefined : "No phone number on this lead"}
        >
          <MessageCircle size={13} />
          WhatsApp
        </button>
        <button
          className="btn-secondary"
          onClick={openEmail}
          disabled={!lead.email}
          title={lead.email ? undefined : "No email on this lead"}
        >
          <Mail size={13} />
          Email
        </button>
        <button className="btn-primary" onClick={handleMarkSent} disabled={sending}>
          <Send size={13} />
          {sending ? "Saving…" : "Mark as sent"}
        </button>
      </div>

      {error && <div className="error-banner" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
