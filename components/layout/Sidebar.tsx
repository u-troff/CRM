"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Phone,
  BarChart2,
  Zap,
} from "lucide-react";
import StatusIndicator from "./StatusIndicator";

const NAV = [
  { href: "/pipeline", label: "Pipeline", icon: LayoutGrid },
  { href: "/dial", label: "Dial Mode", icon: Phone },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <Zap size={14} color="var(--accent-lime)" />
        <span className="sidebar-logo-text">
          U<span className="sidebar-logo-accent">-FLOW</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        <div className="sidebar-section-label">Views</div>
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-link${isActive ? " active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={14} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer with status */}
      <div className="sidebar-footer">
        <StatusIndicator />
      </div>
    </aside>
  );
}
