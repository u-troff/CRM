import { InboundLead } from "@/types/inbound";

// Supported merge fields in nurture step bodies (and subjects).
// {{first_name}}, {{full_name}}, {{business_name}}, {{website}}, {{city}}
export function mergeFields(template: string, lead: InboundLead): string {
  const fullName = lead.fullName?.trim() ?? "";
  const firstName = fullName.split(/\s+/)[0] ?? "";

  const values: Record<string, string> = {
    first_name: firstName,
    full_name: fullName,
    business_name: lead.businessName ?? "",
    website: lead.website ?? "",
    city: lead.city ?? "",
  };

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const replacement = values[key];
    return replacement !== undefined ? replacement : match;
  });
}

// Strip everything but digits from a phone number for wa.me links.
export function phoneDigits(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}
