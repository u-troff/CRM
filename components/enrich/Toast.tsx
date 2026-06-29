"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

export default function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timeout = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timeout);
  }, [onDismiss]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        color: "var(--text-primary)",
        fontSize: 12,
      }}
    >
      <CheckCircle2 size={14} color="var(--accent-lime)" />
      {message}
    </div>
  );
}
