import { getBookedCallsTrend, getSignedClientsThisMonth, getTodayLog, getWeekLogs } from "@/lib/outreach/queries";
import { getWeekdayDates, todayISO } from "@/lib/outreach/date";
import DailyTargetTracker from "@/components/outreach/DailyTargetTracker";
import WeekTable from "@/components/outreach/WeekTable";
import FridayScoreboard from "@/components/outreach/FridayScoreboard";
import TopBar from "@/components/layout/TopBar";

export default async function OutreachPage() {
  const today = todayISO();
  const weekDates = getWeekdayDates(today);

  const [todayLog, weekLogs, trend, signedClientsThisMonth] = await Promise.all([
    getTodayLog(),
    getWeekLogs(today),
    getBookedCallsTrend(4),
    getSignedClientsThisMonth(),
  ]);

  const bookedCallsThisWeek = weekLogs.reduce((sum, log) => sum + log.booked_calls, 0);

  return (
    <>
      <TopBar title="Outreach" />
      <div className="page-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ maxWidth: 480 }}>
          <DailyTargetTracker initialData={todayLog} showNotes />
        </div>

        <WeekTable weekDates={weekDates} logs={weekLogs} today={today} />

        <FridayScoreboard bookedCallsThisWeek={bookedCallsThisWeek} signedClientsThisMonth={signedClientsThisMonth} trend={trend} />
      </div>
    </>
  );
}
