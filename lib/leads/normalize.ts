import { CallStatus, LeadTier } from "@/types/lead";

// ─── Tier Normalization ────────────────────────────────────────────────────────

export function normalizeTier(raw: string | null | undefined): LeadTier {
  if (!raw) return "TIER 2";
  const s = raw.trim().toUpperCase();
  if (s.includes("1") || s === "HOT") return "TIER 1";
  if (s.includes("3")) return "TIER 3";
  if (s.includes("2")) return "TIER 2";
  return "TIER 2";
}

// ─── Phone Normalization ───────────────────────────────────────────────────────

export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const s = raw.trim();
  // Handle Excel error values
  if (s.startsWith("#") || s === "") return "";
  // Keep leading + if present
  if (s.startsWith("+")) {
    return "+" + s.slice(1).replace(/\D/g, "");
  }
  return s.replace(/\D/g, "");
}

export function isPhoneMissing(normalized: string, raw: string): boolean {
  if (!normalized) return true;
  if (raw.trim().startsWith("#")) return true;
  return false;
}

// ─── Progress / CallStatus Mapping ────────────────────────────────────────────

export function mapProgressToStatus(raw: string | null | undefined): CallStatus {
  if (!raw || raw.trim() === "") return "new";
  const s = raw.trim().toLowerCase();

  if (s.includes("callback") || s.includes("call back") || s.includes("call him") || s.includes("luke warm")) {
    return "callback";
  }
  if (s.includes("not interested") || s === "no") {
    return "not_interested";
  }
  if (s.includes("voice mail") || s.includes("voicemail")) {
    return "voicemail";
  }
  if (s.includes("answering service") || s.includes("gatekeeper")) {
    return "gatekeeper";
  }
  if (s.includes("discovery") || s.includes("booked")) {
    return "discovery_booked";
  }
  if (s.includes("nurture")) {
    return "nurture";
  }
  if (s.includes("dnc") || s.includes("do not call")) {
    return "dnc";
  }
  if (s.includes("wrong")) {
    return "wrong_number";
  }
  if (s.includes("unknown")) {
    return "new";
  }

  return "new";
}
