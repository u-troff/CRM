import LeadDetailGate from "./LeadDetailGate";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LeadDetailGate leadId={id} />;
}
