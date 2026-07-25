"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import SequenceManager from "@/components/inbound/sequences/SequenceManager";

export default function SequencesSettingsPage() {
  return (
    <>
      <TopBar title="Nurture Sequences">
        <Link href="/inbound" className="btn-secondary" style={{ textDecoration: "none" }}>
          <ArrowLeft size={13} />
          Board
        </Link>
      </TopBar>
      <div className="page-content">
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 16 }}>
          Build the drip sequences your inbound leads run through. Use merge fields like{" "}
          <code style={{ color: "var(--accent-cyan)" }}>{"{{first_name}}"}</code> in step bodies.
        </p>
        <SequenceManager />
      </div>
    </>
  );
}
