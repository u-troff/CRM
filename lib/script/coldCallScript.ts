export const COLD_CALL_SCRIPT = {
  greeting: {
    title: "GREETING",
    note: "Casual, confident. Sound like a client, not a salesman. Inflection at end of questions.",
    lines: [
      "Hey, is this [Business Name]?",
      "Hey [First Name], how's it going man?",
      "If they ask 'Who is this?' → 'You don't know me yet.'",
    ],
  },
  patternBreak: {
    title: "PATTERN BREAK",
    note: "Keep it fast. Do not belabor the good news / bad news setup.",
    lines: [
      "I've got some good news and some bad news — which do you want first?",
      "GOOD: 'I've got something built specifically for plumbers you'll want to hear about.'",
      "BAD: 'This is a cold call.'",
      "MORE GOOD: 'Well-researched call — I've got a $25 gift card with your name on it if what I show you isn't worth 20 minutes. Fair enough?'",
    ],
  },
  validation: {
    title: "VALIDATION",
    note: "Ask questions. Let them identify their own pain. Do not praise — validate.",
    lines: [
      "How many calls do you miss on a busy day?",
      "When someone calls and you can't get to it — what happens to that lead?",
      "When you do call back, are they still available, or have they called the next guy?",
      "Right. Every missed call is a job going to your competitor.",
    ],
  },
  solution: {
    title: "SOLUTION",
    note: "Two wounds, two tools. Do not pitch price. Pitch outcomes.",
    lines: [
      "Two things we do. First — we build you a Trust Blueprint website.",
      "It's based on how homeowners actually choose a plumber — they shortlist 3 sites in 45 seconds and call the one they can trust before anyone picks up.",
      "Second — PlumbFlow. Built specifically for plumbers — scheduling, auto follow-up, review requests, payments.",
      "Your website brings them in. PlumbFlow makes sure you never lose them.",
    ],
  },
  close: {
    title: "CLOSE",
    note: "Book the discovery call. ALWAYS offer two specific times.",
    lines: [
      "I don't want to sell you anything on this call — I want 20 minutes with you.",
      "Pull up your site side-by-side with what we build. Show you PlumbFlow live.",
      "If it's not for you, $25 gift card is yours — no questions asked.",
      "Tomorrow at 10am or 2pm Pacific — which works?",
    ],
  },
  objections: {
    title: "OBJECTIONS",
    note: "Handle, don't argue. Refer back to the $25 gift card safety net.",
    items: [
      {
        trigger: "I already have a website / I like my website",
        response:
          "That's good — first step. Quick question — do you know how many people land on it and actually call you? Most plumbing sites are getting traffic that bounces. I'd love to show you what I mean — 5 minutes.",
      },
      {
        trigger: "Not interested / too busy",
        response:
          "I hear you. This isn't a generic call. $25 gift card is yours no questions asked if what I show you isn't worth your time. 20 minutes, not a day.",
      },
      {
        trigger: "How much does it cost?",
        response:
          "That's exactly what the discovery call is for — I want to understand your business first before I throw a number at you. We don't do one-size-fits-all.",
      },
      {
        trigger: "I already use [software] for scheduling",
        response:
          "Great — how's the automated follow-up working on it? Most scheduling tools don't close the loop on leads that didn't book. That's the gap PlumbFlow fills.",
      },
      {
        trigger: "Thanks bro but I don't want to hear more",
        response:
          "Fair enough — and that $25 gift card is still yours, no questions asked. I know you've got a problem right now. 2 minutes and you'll either beat your competitors or leave money on the table.",
      },
    ],
  },
} as const;

export type ScriptSection = keyof typeof COLD_CALL_SCRIPT;
