import { InboundStage, OutcomeStatus, QualificationStatus } from "@/types/inbound";

// Reporting status derivation for the inbound board.
//
// The board has seven columns; the ad spend report needs five outcomes and a
// yes/no/not-yet on qualification. Rather than keep three fields in sync by
// hand, `stage` stays the one thing dragged around and these functions derive
// the rest from it. Both derived fields remain editable in the Details tab for
// the cases a column can't express ("nurturing, but already qualified") —
// though the next drag re-derives the outcome, because moving a card is an
// explicit statement about where the lead got to.

// How far along an outcome is. `lost` sits outside the ladder: it is terminal
// and says nothing about how far the lead got before it died, so milestones
// already reached are kept when a lead is lost.
const OUTCOME_RANK: Record<OutcomeStatus, number> = {
  new: 0,
  contacted: 1,
  booked: 2,
  won: 3,
  lost: -1,
};

export function outcomeForStage(stage: InboundStage): OutcomeStatus {
  switch (stage) {
    case "new":
      return "new";
    case "contacted":
    case "nurturing":
    case "qualifying":
      return "contacted";
    case "call_booked":
      return "booked";
    case "won":
      return "won";
    case "disqualified":
      return "lost";
  }
}

// Only three stages settle qualification. The rest return null, meaning "leave
// whatever was set by hand alone" — a lead can be dragged from Nurturing to
// Contacted without un-qualifying it.
export function qualificationForStage(
  stage: InboundStage
): QualificationStatus | null {
  if (stage === "disqualified") return "unqualified";
  if (stage === "call_booked" || stage === "won") return "qualified";
  return null;
}

export interface MilestoneStamps {
  qualified_at: string | null;
  booked_at: string | null;
  won_at: string | null;
}

interface MilestoneSource {
  qualifiedAt: string | null;
  bookedAt: string | null;
  wonAt: string | null;
}

// The timestamps a lead should carry once it reaches these statuses. Each marks
// the *first* time that milestone was reached and is preserved from then on —
// including when the lead is later lost. It is cleared only when the lead moves
// back below the milestone, which means the milestone was recorded in error.
//
// Nothing in the report divides by these; it counts current statuses. They are
// here so "when did this lead book?" has an answer.
export function milestoneStamps(
  current: MilestoneSource,
  next: { qualificationStatus: QualificationStatus; outcomeStatus: OutcomeStatus },
  now: string = new Date().toISOString()
): MilestoneStamps {
  const rank = OUTCOME_RANK[next.outcomeStatus];
  const isLost = next.outcomeStatus === "lost";

  return {
    qualified_at:
      next.qualificationStatus === "qualified" ? current.qualifiedAt ?? now : null,
    booked_at:
      rank >= OUTCOME_RANK.booked
        ? current.bookedAt ?? now
        : isLost
          ? current.bookedAt
          : null,
    won_at:
      next.outcomeStatus === "won"
        ? current.wonAt ?? now
        : isLost
          ? current.wonAt
          : null,
  };
}
