"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface DialDeepLinkProps {
  startIndex: number;
}

// Client component that redirects to /dial — the session index is managed client-side
// For MVP this is a passthrough redirect since session state lives in the hook
export default function DialDeepLink({ startIndex }: DialDeepLinkProps) {
  const router = useRouter();

  useEffect(() => {
    // TODO: When session management supports it, initialize at startIndex
    router.replace("/dial");
  }, [router, startIndex]);

  return (
    <div style={{ padding: 40, color: "var(--text-muted)" }}>
      Redirecting to dial session...
    </div>
  );
}
