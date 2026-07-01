"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ACTIVE_LEAD_KEY } from "@/hooks/useDialSession";

interface DialDeepLinkProps {
  leadId: string;
}

// Stamps the deep-linked lead as the active dial session lead (the same
// key useDialSession reads on mount), then hands off to /dial so it opens
// directly on this lead instead of the front of the queue.
export default function DialDeepLink({ leadId }: DialDeepLinkProps) {
  const router = useRouter();

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_LEAD_KEY, leadId);
    router.replace("/dial");
  }, [router, leadId]);

  return (
    <div style={{ padding: 40, color: "var(--text-muted)" }}>
      Opening dial session...
    </div>
  );
}
