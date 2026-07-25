import { LeadSource } from "@/types/inbound";
import { SOURCE_MAP } from "@/lib/constants/inbound";

export default function SourceTag({ source }: { source: LeadSource }) {
  const def = SOURCE_MAP[source];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 6px",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: def.color,
        border: `1px solid ${def.color}`,
      }}
    >
      {def.label}
    </span>
  );
}
