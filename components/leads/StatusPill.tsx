import { CallStatus } from "@/types/lead";
import { STATUS_META } from "@/lib/constants/statuses";

export default function StatusPill({ status }: { status: CallStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="status-pill"
      style={{ color: meta.color, borderColor: "transparent", background: meta.bgColor }}
      title={meta.label}
    >
      {meta.label}
    </span>
  );
}
