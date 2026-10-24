import { notFound } from "next/navigation";
import { IdSchema } from "@/contracts";
import { InvestigationDetail } from "@/components/investigation/InvestigationDetail";

export default async function InvestigationPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = IdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  return <InvestigationDetail key={parsed.data} investigationId={parsed.data} />;
}
