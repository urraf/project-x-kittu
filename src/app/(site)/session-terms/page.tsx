import { LegalPage, legalMetadata } from "@/components/site/LegalPage";

export const revalidate = 3600;
export const metadata = legalMetadata("sessionTerms");

export default function Page() {
  return <LegalPage doc="sessionTerms" />;
}
