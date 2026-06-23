import { getTodayTargets, getTargetHistory } from "@/lib/outreach/queries";
import DailyTargetTracker from "@/components/outreach/DailyTargetTracker";
import OutreachHistory from "@/components/outreach/OutreachHistory";
import TopBar from "@/components/layout/TopBar";

export default async function OutreachPage() {
  const [today, history] = await Promise.all([getTodayTargets(), getTargetHistory(30)]);

  return (
    <>
      <TopBar title="Outreach" />
      <div className="page-content">
        <div style={{ marginBottom: 24, maxWidth: 480 }}>
          <DailyTargetTracker initialData={today} />
        </div>
        <OutreachHistory history={history} />
      </div>
    </>
  );
}
