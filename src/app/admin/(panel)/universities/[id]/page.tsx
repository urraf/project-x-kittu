import { notFound } from "next/navigation";
import { UniversityEditor } from "@/components/admin/UniversityEditor";
import { getAdminUniversity } from "@/lib/services/universities";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "University" };
export const dynamic = "force-dynamic";

export default async function EditUniversityPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await getAdminUniversity((await params).id);
  if (!u) notFound();
  return <UniversityEditor key={u.id} university={u} siteUrl={SITE_URL} />;
}
