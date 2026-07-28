import { ProjectStatus } from "@/types/client";
import { PROJECT_STATUS_MAP } from "@/lib/constants/clients";

export default function ProjectStatusPill({ status }: { status: ProjectStatus }) {
  const meta = PROJECT_STATUS_MAP[status];
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
