import { notFound } from "next/navigation";
import { OpportunityEditor } from "@/components/admin/OpportunityEditor";
import { isGroqConfigured } from "@/lib/env";
import { getAdminOpportunity } from "@/lib/services/opportunities";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "Opportunity" };
export const dynamic = "force-dynamic";

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const o = await getAdminOpportunity((await params).id);
  if (!o) notFound();
  return <OpportunityEditor key={o.id + o.updatedAt} opportunity={o} siteUrl={SITE_URL} aiReady={isGroqConfigured()} />;
}
