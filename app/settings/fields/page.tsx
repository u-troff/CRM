"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import CustomFieldManager from "@/components/custom/CustomFieldManager";

export default function CustomFieldsSettingsPage() {
  return (
    <>
      <TopBar title="Custom Fields">
        <Link href="/inbound" className="btn-secondary" style={{ textDecoration: "none" }}>
          <ArrowLeft size={13} />
          Board
        </Link>
      </TopBar>
      <div className="page-content">
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>
          Extra fields for the inbound leads board. Add one here and it shows up
          on every lead immediately — no migration, no deploy.
        </p>
        <p style={{ color: "var(--text-faint)", fontSize: 11, marginBottom: 20 }}>
          Custom values are stored as JSON, so they can't be filtered on the
          board or counted in the campaign report. Anything you need to report on
          — money, statuses, dates you sort by — is worth asking for as a real
          column instead.
        </p>
        <CustomFieldManager boardKey="inbound_leads" />
      </div>
    </>
  );
}
