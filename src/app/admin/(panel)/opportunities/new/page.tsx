import { OpportunityEditor } from "@/components/admin/OpportunityEditor";
import { isGroqConfigured } from "@/lib/env";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "Add opportunity" };

export default function NewOpportunityPage() {
  return <OpportunityEditor siteUrl={SITE_URL} aiReady={isGroqConfigured()} />;
}
