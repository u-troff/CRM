"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";

// Public-facing routes (the prospect-facing lead-magnet report) render
// full-bleed with no CRM chrome. Everything else gets the sidebar shell.
const CHROMELESS_PREFIXES = ["/report"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chromeless = CHROMELESS_PREFIXES.some((p) => pathname?.startsWith(p));

  if (chromeless) return <>{children}</>;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">{children}</div>
    </div>
  );
}
