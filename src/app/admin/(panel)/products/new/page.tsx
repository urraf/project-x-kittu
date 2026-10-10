import { ProductEditor } from "@/components/admin/ProductEditor";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "New product" };

export default function NewProductPage() {
  return <ProductEditor siteUrl={SITE_URL} />;
}
