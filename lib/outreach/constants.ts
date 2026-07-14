export const CHANNELS = [
  { key: "fb_leads_contacted", label: "FB Leads Contacted" },
  { key: "ig_dms", label: "IG DMs" },
  { key: "whatsapp_touches", label: "WhatsApp Touches" },
  { key: "us_cold_dials", label: "US Cold Dials" },
  { key: "conversations_held", label: "Conversations Held" },
  { key: "booked_calls", label: "Booked Calls" },
] as const;

export type ChannelKey = (typeof CHANNELS)[number]["key"];

// Channels that represent an outreach "touch" — used for the Today total.
// conversations_held and booked_calls are downstream outcomes, not touches.
export const TOUCH_CHANNELS: ChannelKey[] = ["fb_leads_contacted", "ig_dms", "whatsapp_touches", "us_cold_dials"];

export const WEEKLY_BOOKED_CALLS_TARGET = { min: 3, max: 5 } as const;
export const MONTHLY_SIGNED_CLIENTS_TARGET = { min: 2, max: 3 } as const;
