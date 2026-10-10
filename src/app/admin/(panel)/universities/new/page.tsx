import { UniversityEditor } from "@/components/admin/UniversityEditor";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "Add university" };

export default function NewUniversityPage() {
  return <UniversityEditor siteUrl={SITE_URL} />;
}
