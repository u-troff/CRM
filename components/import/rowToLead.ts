import { Lead, CallAttempt } from "@/types/lead";
import { normalizeTier, normalizePhone, mapProgressToStatus } from "@/lib/leads/normalize";
import { ParsedRow } from "./CsvParser";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizeKey(raw: string): string {
  return raw.toLowerCase().replace(/[\s_\-]/g, "");
}

// Flexible column key lookup
function pick(row: ParsedRow, ...candidates: string[]): string {
  for (const key of candidates) {
    const normalized = normalizeKey(key);
    const match = Object.keys(row).find((k) => normalizeKey(k) === normalized);
    if (match !== undefined && row[match] !== undefined) return row[match];
  }
  return "";
}

export function rowToLead(row: ParsedRow, source: Lead["source"] = "csv_import"): Lead {
  const now = Date.now();

  const businessName = pick(row, "businessname", "business name", "business", "name", "company");
  const city = pick(row, "city", "location", "area");
  const phoneRaw = pick(row, "phone", "phonenumber", "phone number", "tel");
  const website = pick(row, "website", "url", "site", "web");
  const ratingRaw = pick(row, "rating", "stars", "googlerating");
  const reviewCountRaw = pick(row, "reviewcount", "review count", "reviews", "numreviews");
  const franchiseRaw = pick(row, "isfranchise", "franchise", "is franchise");
  const tierRaw = pick(row, "tier");
  const websiteNotes = pick(row, "notes", "websitenotes", "website notes", "audit notes", "description");
  const ownerName = pick(row, "names", "ownername", "owner name", "owner", "contact");
  const progressRaw = pick(row, "progress", "status", "callstatus");

  const phone = normalizePhone(phoneRaw);
  const rating = ratingRaw && !isNaN(parseFloat(ratingRaw)) ? parseFloat(ratingRaw) : null;
  const reviewCount = reviewCountRaw && !isNaN(parseInt(reviewCountRaw)) ? parseInt(reviewCountRaw) : null;
  const isFranchise = franchiseRaw.toUpperCase() === "YES" || franchiseRaw === "1" || franchiseRaw.toLowerCase() === "true";
  const tier = normalizeTier(tierRaw);

  const history: CallAttempt[] = [];
  let currentStatus = mapProgressToStatus(progressRaw);

  // If there was a progress/status logged in the sheet, create a historical attempt
  if (progressRaw && progressRaw.trim() && currentStatus !== "new") {
    history.push({
      id: uuid(),
      timestamp: now,
      status: currentStatus,
      notes: `Imported from sheet: "${progressRaw}"`,
    });
  }

  return {
    id: uuid(),
    businessName: businessName || "Unknown Business",
    city,
    phone,
    phoneRaw,
    website,
    rating,
    reviewCount,
    isFranchise,
    tier,
    websiteNotes,
    ownerName,
    currentStatus,
    history,
    createdAt: now,
    updatedAt: now,
    source,
  };
}

export function rowsToLeads(rows: ParsedRow[], source: Lead["source"] = "csv_import"): Lead[] {
  return rows
    .filter((row) => {
      // Skip empty rows
      const name = pick(row, "businessname", "business name", "business", "name", "company");
      return name && name.trim().length > 0;
    })
    .map((row) => rowToLead(row, source));
}
