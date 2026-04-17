import { storage } from "@/lib/storage";
import { redirect } from "next/navigation";
import { buildDialQueue } from "@/lib/leads/queue";
import DialDeepLink from "./DialDeepLink";

export default async function DialLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leads = await storage.getLeads();
  const queue = buildDialQueue(leads);
  const idx = queue.findIndex((l) => l.id === id);

  if (idx < 0) {
    redirect("/dial");
  }

  return <DialDeepLink startIndex={idx} />;
}
