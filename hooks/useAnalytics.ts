"use client";

import { useMemo } from "react";
import { Lead, CallStatus } from "@/types/lead";
import { ALL_STATUSES } from "@/lib/constants/statuses";

interface DayBucket {
  date: string; // YYYY-MM-DD
  count: number;
}

export function useAnalytics(leads: Lead[]) {
  return useMemo(() => {
    const allAttempts = leads.flatMap((l) => l.history);

    // KPI Row 1
    const totalLeads = leads.length;
    const dialsLogged = allAttempts.length;
    const uniqueContacted = leads.filter((l) => l.history.length > 0).length;
    const discoveryBooked = leads.filter((l) => l.currentStatus === "discovery_booked").length;
    const closedWon = leads.filter((l) => l.currentStatus === "closed_won").length;

    // KPI Row 2
    const contactedStatuses: CallStatus[] = [
      "callback",
      "not_interested",
      "nurture",
      "discovery_booked",
      "gatekeeper",
      "closed_won",
      "closed_lost",
    ];
    const actualContactAttempts = allAttempts.filter((a) =>
      contactedStatuses.includes(a.status)
    ).length;
    const contactRate = dialsLogged > 0 ? actualContactAttempts / dialsLogged : 0;
    const bookingRate = actualContactAttempts > 0 ? discoveryBooked / actualContactAttempts : 0;

    const inNurtureOrCallback = leads.filter(
      (l) => l.currentStatus === "nurture" || l.currentStatus === "callback"
    ).length;
    const dead = leads.filter(
      (l) => l.currentStatus === "dnc" || l.currentStatus === "wrong_number"
    ).length;

    // Status breakdown
    const statusBreakdown = ALL_STATUSES.map((status) => ({
      status,
      count: leads.filter((l) => l.currentStatus === status).length,
    }));

    // Tier performance
    const tierPerf = (["TIER 1", "TIER 2", "TIER 3"] as const).map((tier) => {
      const tierLeads = leads.filter((l) => l.tier === tier);
      const total = tierLeads.length;
      const contacted = tierLeads.filter((l) =>
        contactedStatuses.includes(l.currentStatus)
      ).length;
      const booked = tierLeads.filter(
        (l) => l.currentStatus === "discovery_booked"
      ).length;
      const rate = contacted > 0 ? booked / contacted : 0;
      return { tier, total, contacted, booked, rate };
    });

    // Daily dials — last 14 days
    const now = Date.now();
    const msPerDay = 86400000;
    const days: DayBucket[] = [];
    for (let i = 13; i >= 0; i--) {
      const dayStart = now - i * msPerDay;
      const dayEnd = dayStart + msPerDay;
      const date = new Date(dayStart).toISOString().split("T")[0];
      const count = allAttempts.filter(
        (a) => a.timestamp >= dayStart && a.timestamp < dayEnd
      ).length;
      days.push({ date, count });
    }

    return {
      totalLeads,
      dialsLogged,
      uniqueContacted,
      discoveryBooked,
      closedWon,
      contactRate,
      bookingRate,
      inNurtureOrCallback,
      dead,
      statusBreakdown,
      tierPerf,
      dailyDials: days,
    };
  }, [leads]);
}
